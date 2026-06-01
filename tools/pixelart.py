#!/usr/bin/env python3
"""
pixelart.py — 把"看着像素化但其实有杂色/未对齐"的图（典型如 AI 生成的伪像素图）
重建成网格对齐、纯色块、固定调色板的真像素画。

核心三步：
  1) 估计真实块尺寸（行/列差分能量的自相关，找基频周期）
  2) 偏移对齐 + 每块取「众数色」（块内方差最小的对齐位置 + 分箱众数，干掉杂色/过渡色）
  3) 全局颜色量化（KMeans 自动调色板，或对齐到你指定的固定调色板）

依赖: numpy, Pillow, scikit-learn
    pip install numpy pillow scikit-learn

用法示例:
  # 自动估计块尺寸，量化到 32 色
  python pixelart.py in.png out.png --colors 32

  # 手动指定块大小为 8，量化到 16 色，并放大 8 倍方便看
  python pixelart.py in.png out.png --block 8 --colors 16 --upscale 8

  # 用固定调色板（十六进制列表或一张调色板图）
  python pixelart.py in.png out.png --block 8 --palette "#1a1c2c,#5d275d,#b13e53,#ef7d57"
  python pixelart.py in.png out.png --block 8 --palette mypalette.png
"""

import argparse
import numpy as np
from PIL import Image


# ---------------------------------------------------------------------------
# 1. 块尺寸估计
# ---------------------------------------------------------------------------
def _first_prominent_peak(signal, min_lag=2, max_lag=64):
    """对 1D 信号做自相关，返回第一个显著峰对应的 lag（即基频周期）。"""
    s = signal.astype(np.float64)
    s = s - s.mean()
    if np.allclose(s, 0):
        return None
    max_lag = min(max_lag, len(s) - 1)
    ac = np.array([np.dot(s[:-lag], s[lag:]) for lag in range(1, max_lag + 1)])
    if ac.max() <= 0:
        return None
    ac = ac / ac.max()
    thresh = 0.5  # 峰必须达到最大自相关的一半才算数
    for lag in range(min_lag, max_lag + 1):
        i = lag - 1
        left = ac[i - 1] if i - 1 >= 0 else -np.inf
        right = ac[i + 1] if i + 1 < len(ac) else -np.inf
        if ac[i] >= thresh and ac[i] >= left and ac[i] >= right:
            return lag
    return int(np.argmax(ac[min_lag - 1:])) + min_lag


def estimate_block_size(rgb):
    """从边界周期性估计块尺寸（取 x/y 方向估计的中位/较稳值）。"""
    g = rgb.astype(np.float64).mean(axis=2)
    # 竖直边界 -> 沿 x 的能量曲线
    col_energy = np.abs(np.diff(g, axis=1)).sum(axis=0)
    # 水平边界 -> 沿 y 的能量曲线
    row_energy = np.abs(np.diff(g, axis=0)).sum(axis=1)
    bx = _first_prominent_peak(col_energy)
    by = _first_prominent_peak(row_energy)
    cands = [b for b in (bx, by) if b]
    if not cands:
        return 8  # 兜底
    return int(round(np.mean(cands)))


# ---------------------------------------------------------------------------
# 2. 偏移对齐 + 每块取色
# ---------------------------------------------------------------------------
def _block_variance_at_offset(g, block, ox, oy):
    """给定偏移，计算所有完整块的「块内方差」之和（越小越对齐）。"""
    H, W = g.shape
    g2 = g[oy:oy + ((H - oy) // block) * block,
           ox:ox + ((W - ox) // block) * block]
    if g2.size == 0:
        return np.inf
    h, w = g2.shape
    blocks = g2.reshape(h // block, block, w // block, block)
    blocks = blocks.transpose(0, 2, 1, 3).reshape(-1, block * block)
    return float(blocks.var(axis=1).sum())


def best_offset(rgb, block):
    """在 [0,block) x [0,block) 中搜索让块内方差最小的对齐偏移。"""
    g = rgb.astype(np.float64).mean(axis=2)
    best, best_off = np.inf, (0, 0)
    for oy in range(block):
        for ox in range(block):
            v = _block_variance_at_offset(g, block, ox, oy)
            if v < best:
                best, best_off = v, (ox, oy)
    return best_off


def _dominant_color(pixels, bin_size=16):
    """块内「分箱众数」取色：先按 bin_size 量化分箱，取最大箱，
    再返回该箱内像素的真实均值。比直接取平均更能避开过渡色/杂色。"""
    keys = (pixels // bin_size).astype(np.int64)
    flat = keys[:, 0] * 100000 + keys[:, 1] * 1000 + keys[:, 2]
    vals, counts = np.unique(flat, return_counts=True)
    top = vals[np.argmax(counts)]
    mask = flat == top
    return pixels[mask].mean(axis=0)


def downscale_dominant(rgb, block, offset):
    """按块尺寸+偏移降采样，每块取众数色，得到 1 像素=1 块 的小图。"""
    ox, oy = offset
    H, W, _ = rgb.shape
    h_blocks = (H - oy) // block
    w_blocks = (W - ox) // block
    out = np.zeros((h_blocks, w_blocks, 3), dtype=np.float64)
    for by in range(h_blocks):
        for bx in range(w_blocks):
            y0 = oy + by * block
            x0 = ox + bx * block
            patch = rgb[y0:y0 + block, x0:x0 + block].reshape(-1, 3)
            out[by, bx] = _dominant_color(patch)
    return np.clip(out, 0, 255)


# ---------------------------------------------------------------------------
# 3. 颜色量化
# ---------------------------------------------------------------------------
def _parse_palette(spec):
    """支持 '#rrggbb,#rrggbb' 列表 或 一张调色板图片路径。"""
    if "," in spec or spec.strip().startswith("#"):
        cols = []
        for tok in spec.split(","):
            tok = tok.strip().lstrip("#")
            cols.append([int(tok[i:i + 2], 16) for i in (0, 2, 4)])
        return np.array(cols, dtype=np.float64)
    # 当作调色板图片：取其中所有唯一颜色
    pal = np.array(Image.open(spec).convert("RGB")).reshape(-1, 3)
    return np.unique(pal, axis=0).astype(np.float64)


def quantize_to_palette(small, palette):
    """把每个块颜色对齐到最近的调色板颜色（RGB 欧氏距离）。"""
    flat = small.reshape(-1, 3)
    d = np.linalg.norm(flat[:, None, :] - palette[None, :, :], axis=2)
    idx = d.argmin(axis=1)
    return palette[idx].reshape(small.shape)


def quantize_kmeans(small, n_colors):
    """用 KMeans 自动生成 n_colors 色调色板并对齐。"""
    from sklearn.cluster import KMeans
    flat = small.reshape(-1, 3)
    n = min(n_colors, len(np.unique(flat, axis=0)))
    km = KMeans(n_clusters=n, n_init=4, random_state=0).fit(flat)
    centers = km.cluster_centers_
    return centers[km.labels_].reshape(small.shape)


# ---------------------------------------------------------------------------
# 主流程
# ---------------------------------------------------------------------------
def process(in_path, out_path, block=None, colors=None,
            palette=None, upscale=1):
    rgb = np.array(Image.open(in_path).convert("RGB")).astype(np.float64)

    if block is None:
        block = estimate_block_size(rgb)
        print(f"[auto] 估计块尺寸 = {block}px")
    else:
        print(f"[manual] 块尺寸 = {block}px")

    off = best_offset(rgb, block)
    print(f"[align] 最佳偏移 = {off}")

    small = downscale_dominant(rgb, block, off)
    print(f"[downscale] 输出网格 = {small.shape[1]} x {small.shape[0]} 块")

    if palette is not None:
        pal = _parse_palette(palette)
        small = quantize_to_palette(small, pal)
        print(f"[quantize] 对齐到固定调色板 ({len(pal)} 色)")
    elif colors is not None:
        small = quantize_kmeans(small, colors)
        print(f"[quantize] KMeans 量化到 {colors} 色")

    small_u8 = small.round().astype(np.uint8)
    img = Image.fromarray(small_u8, "RGB")
    if upscale > 1:
        img = img.resize(
            (img.width * upscale, img.height * upscale), Image.NEAREST
        )
    img.save(out_path)
    print(f"[done] 已保存 -> {out_path} ({img.width}x{img.height})")


def main():
    p = argparse.ArgumentParser(
        description="把 AI 伪像素图重建为真像素画"
    )
    p.add_argument("input")
    p.add_argument("output")
    p.add_argument("--block", type=int, default=None,
                   help="手动指定块尺寸(px)；省略则自动估计")
    p.add_argument("--colors", type=int, default=None,
                   help="KMeans 自动调色板色数")
    p.add_argument("--palette", type=str, default=None,
                   help="固定调色板：'#rrggbb,#rrggbb...' 或调色板图片路径")
    p.add_argument("--upscale", type=int, default=1,
                   help="输出放大倍数(最近邻)，方便预览")
    a = p.parse_args()
    process(a.input, a.output, a.block, a.colors, a.palette, a.upscale)


if __name__ == "__main__":
    main()
