# 像素游戏学习教程

这是从 `files.zip` 整理出的像素游戏学习教程仓库。入口页是一个静态 HTML：左侧是课程目录，右侧加载每一课的完整交互内容。

## 打开方式

- 本地入口：打开 `index.html`
- 课程原文：`lessons/pixel-lesson-01.html` 到 `lessons/pixel-lesson-11.html`
- 像素化工具：`tools/pixelart.py`
- 效果对比图：`assets/comparison.png`

## 课程目录

- 01. [像素游戏基础 · 第一课](lessons/pixel-lesson-01.html)：像素是什么、画布分辨率：故意画得很小、整数缩放与"最近邻"、调色板与索引色
- 02. [像素游戏基础 · 第二课](lessons/pixel-lesson-02.html)：剪影优先、轮廓线与锯齿、明暗与体积：定一个光源、抖动：用两种颜色骗出渐变
- 03. [像素游戏基础 · 第三课](lessons/pixel-lesson-03.html)：帧与精灵表、帧率与节奏、洋葱皮、只动该动的：防止「像素沸腾」
- 04. [像素游戏基础 · 第四课（完结）](lessons/pixel-lesson-04.html)：瓦片与瓦片地图、无缝拼接、自动连接（auto-tiling）、把角色放进世界
- 05. [像素游戏进阶 · 第五课](lessons/pixel-lesson-05.html)：三个旋钮，明度为王、色相偏移：让颜色"活"过来、色阶：可复用的颜色梯队、有限调色板：约束即风格
- 06. [像素游戏进阶 · 第六课](lessons/pixel-lesson-06.html)：不是形状变了，是光变了、高光，决定一切、对比度与反光、手工抗锯齿与色阶断层
- 07. [像素游戏进阶 · 第七课](lessons/pixel-lesson-07.html)：走路 = 四个关键姿势的循环、重心起伏 = 重量感、手脚对侧摆动、跟随动作，以及走 vs 跑
- 08. [像素游戏进阶 · 第八课](lessons/pixel-lesson-08.html)：特效的节奏：又快又脆、生命周期：形状在演变、发光与热色阶、粒子与"可控随机"
- 09. [像素游戏进阶 · 第九课](lessons/pixel-lesson-09.html)：场景是一叠有深度的图层、视差滚动：用速度差造纵深、大气透视：越远越淡、光与氛围：一层色罩定情绪
- 10. [像素游戏进阶 · 第十课](lessons/pixel-lesson-10.html)：整数缩放、像素完美相机与亚像素抖动、导入设置：把过滤关成"最近邻"、精灵图集与自动连接
- 11. [像素游戏进阶 · 第十一课（完结）](lessons/pixel-lesson-11.html)：Aseprite 进阶工作流、素材管理与导出、AI 在流程的哪一环、版权与心态

## 目录结构

```text
.
├─ index.html
├─ lessons/
├─ tools/
│  └─ pixelart.py
└─ assets/
   └─ comparison.png
```

## License

MIT
