import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "source");
const lessonsDir = path.join(root, "lessons");
const toolsDir = path.join(root, "tools");

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });
const readUtf8 = (file) => fs.readFileSync(file, "utf8");
const copyIfExists = (from, to) => {
  if (fs.existsSync(from)) {
    ensureDir(path.dirname(to));
    fs.copyFileSync(from, to);
  }
};

ensureDir(lessonsDir);
ensureDir(toolsDir);

if (fs.existsSync(sourceDir)) {
  for (const entry of fs.readdirSync(sourceDir)) {
    const from = path.join(sourceDir, entry);
    if (/^pixel-lesson-\d+\.html$/i.test(entry)) {
      copyIfExists(from, path.join(lessonsDir, entry));
    } else if (entry === "pixelart.py") {
      copyIfExists(from, path.join(toolsDir, entry));
    }
  }
}

const lessonScrollbarCss = `

  /* Tutorial scrollbar polish */
  * {
    scrollbar-width: thin;
    scrollbar-color: #3a4054 #0b0d14;
  }

  *::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  *::-webkit-scrollbar-track {
    background: #0b0d14;
    border-left: 1px solid #252b3d;
  }

  *::-webkit-scrollbar-thumb {
    min-height: 56px;
    background: #3a4054;
    border: 2px solid #0b0d14;
  }

  *::-webkit-scrollbar-thumb:hover {
    background: #4ac7d8;
  }

  *::-webkit-scrollbar-button {
    display: none;
    width: 0;
    height: 0;
  }
`;

const injectLessonScrollbarStyles = (file) => {
  const lessonPath = path.join(lessonsDir, file);
  const html = readUtf8(lessonPath);
  if (html.includes("Tutorial scrollbar polish")) return;
  fs.writeFileSync(lessonPath, html.replace("</style>", `${lessonScrollbarCss}</style>`), "utf8");
};

const stripTags = (value) =>
  value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

const escapeHtml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const lessonFiles = fs
  .readdirSync(lessonsDir)
  .filter((file) => /^pixel-lesson-\d+\.html$/i.test(file))
  .sort((a, b) => a.localeCompare(b, "zh-CN"));

lessonFiles.forEach(injectLessonScrollbarStyles);

const lessons = lessonFiles.map((file, index) => {
  const html = readUtf8(path.join(lessonsDir, file));
  const title = stripTags((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || `第 ${index + 1} 课`);
  const h1 = stripTags((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || title);
  const sections = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean);
  return {
    file,
    slug: file.replace(/\.html$/i, ""),
    number: String(index + 1).padStart(2, "0"),
    title,
    h1,
    sections,
  };
});

const lessonCards = lessons
  .map(
    (lesson, index) => `
          <button class="lesson-link${index === 0 ? " is-active" : ""}" type="button" data-file="${escapeHtml(lesson.file)}">
            <span class="lesson-number">${lesson.number}</span>
            <span>
              <strong>${escapeHtml(lesson.title)}</strong>
              <small>${escapeHtml(lesson.sections.slice(0, 2).join(" / "))}</small>
            </span>
          </button>`
  )
  .join("");

const lessonJson = JSON.stringify(lessons, null, 2);

const indexHtml = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>像素游戏学习教程</title>
  <meta name="description" content="像素游戏美术与工作流学习教程：从像素基础、动画、瓦片地图，到调色板、材质、VFX、场景、引擎导入和收尾工作流。">
  <style>
    :root {
      color-scheme: dark;
      --bg: #090b10;
      --panel: #10131c;
      --panel-2: #151927;
      --ink: #f0ecdf;
      --muted: #9ca3b5;
      --line: #2b3144;
      --accent: #f5b849;
      --accent-2: #4ac7d8;
      --danger: #ff5e7c;
      --shadow: #050609;
      --radius: 8px;
    }

    * { box-sizing: border-box; }

    html, body { height: 100%; }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans SC", system-ui, sans-serif;
      line-height: 1.5;
      scrollbar-width: thin;
      scrollbar-color: #3a4054 #0b0d14;
    }

    a { color: inherit; }

    * {
      scrollbar-width: thin;
      scrollbar-color: #3a4054 #0b0d14;
    }

    *::-webkit-scrollbar {
      width: 10px;
      height: 10px;
    }

    *::-webkit-scrollbar-track {
      background: #0b0d14;
      border-left: 1px solid var(--line);
    }

    *::-webkit-scrollbar-thumb {
      min-height: 56px;
      background: #3a4054;
      border: 2px solid #0b0d14;
    }

    *::-webkit-scrollbar-thumb:hover {
      background: var(--accent-2);
    }

    *::-webkit-scrollbar-button {
      display: none;
      width: 0;
      height: 0;
    }

    .app {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 338px minmax(0, 1fr);
    }

    .sidebar {
      position: sticky;
      top: 0;
      height: 100vh;
      overflow: auto;
      background: var(--panel);
      border-right: 1px solid var(--line);
      padding: 24px 18px;
    }

    .brand {
      padding: 0 6px 22px;
      border-bottom: 1px solid var(--line);
    }

    .brand h1 {
      margin: 0;
      font-size: 25px;
      line-height: 1.25;
      letter-spacing: 0;
    }

    .brand p {
      margin: 12px 0 0;
      color: var(--muted);
      font-size: 14px;
    }

    .quick-links {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
      margin: 18px 0 20px;
    }

    .quick-links a {
      min-height: 38px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--panel-2);
      color: var(--ink);
      text-decoration: none;
      font-size: 13px;
      font-weight: 700;
    }

    .quick-links a:hover,
    .quick-links a:focus-visible {
      border-color: var(--accent);
      outline: none;
    }

    .toc-label {
      margin: 18px 6px 10px;
      color: var(--accent);
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .08em;
    }

    .lesson-list {
      display: grid;
      gap: 8px;
    }

    .lesson-link {
      width: 100%;
      min-height: 68px;
      display: grid;
      grid-template-columns: 38px minmax(0, 1fr);
      gap: 10px;
      align-items: center;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: transparent;
      color: var(--ink);
      text-align: left;
      cursor: pointer;
      font: inherit;
    }

    .lesson-link:hover,
    .lesson-link:focus-visible {
      border-color: var(--accent-2);
      background: #141927;
      outline: none;
    }

    .lesson-link.is-active {
      border-color: var(--accent);
      background: #1b1b21;
      box-shadow: 4px 4px 0 var(--shadow);
    }

    .lesson-number {
      width: 34px;
      height: 34px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--line);
      color: var(--accent);
      font-size: 13px;
      font-weight: 800;
    }

    .lesson-link strong,
    .lesson-link small {
      display: block;
      overflow-wrap: anywhere;
    }

    .lesson-link strong {
      font-size: 14px;
      line-height: 1.35;
    }

    .lesson-link small {
      margin-top: 4px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.35;
    }

    .reader {
      min-width: 0;
      min-height: 100vh;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
    }

    .reader-bar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 18px;
      background: rgba(9, 11, 16, .96);
      border-bottom: 1px solid var(--line);
    }

    .current-title {
      min-width: 0;
    }

    .current-title strong,
    .current-title span {
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .current-title strong {
      font-size: 15px;
    }

    .current-title span {
      color: var(--muted);
      font-size: 12px;
      margin-top: 2px;
    }

    .reader-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 8px;
    }

    .reader-actions a,
    .reader-actions button {
      min-height: 36px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--panel);
      color: var(--ink);
      padding: 0 12px;
      font: inherit;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
    }

    .reader-actions a:hover,
    .reader-actions button:hover,
    .reader-actions a:focus-visible,
    .reader-actions button:focus-visible {
      border-color: var(--accent);
      outline: none;
    }

    .lesson-frame-wrap {
      min-height: 0;
      padding: 18px;
    }

    .lesson-frame {
      width: 100%;
      height: calc(100vh - 75px);
      min-height: 640px;
      display: block;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: #0e1018;
      box-shadow: 8px 8px 0 var(--shadow);
    }

    @media (max-width: 980px) {
      .app {
        grid-template-columns: 1fr;
      }

      .sidebar {
        position: relative;
        height: auto;
        border-right: none;
        border-bottom: 1px solid var(--line);
      }

      .lesson-list {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .reader-bar {
        position: relative;
      }

      .lesson-frame {
        height: 76vh;
      }
    }

    @media (max-width: 620px) {
      .sidebar {
        padding: 18px 12px;
      }

      .brand h1 {
        font-size: 22px;
      }

      .lesson-list {
        grid-template-columns: 1fr;
      }

      .reader-bar {
        align-items: stretch;
        flex-direction: column;
      }

      .reader-actions {
        justify-content: stretch;
      }

      .reader-actions a,
      .reader-actions button {
        flex: 1 1 auto;
      }

      .lesson-frame-wrap {
        padding: 10px;
      }

      .lesson-frame {
        min-height: 600px;
        height: 78vh;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="app">
    <aside class="sidebar">
      <div class="brand">
        <h1>像素游戏学习教程</h1>
        <p>11 节交互课件，覆盖像素基础、角色动画、瓦片地图、调色板、特效、场景、像素完美和发布工作流。</p>
      </div>

      <div class="quick-links" aria-label="资源入口">
        <a href="tools/pixelart.py">像素化工具</a>
      </div>

      <div class="toc-label">课程目录</div>
      <nav class="lesson-list" aria-label="课程目录">
${lessonCards}
      </nav>
    </aside>

    <main class="reader">
      <div class="reader-bar">
        <div class="current-title">
          <strong id="currentTitle">${escapeHtml(lessons[0]?.title || "像素游戏学习教程")}</strong>
          <span id="currentSubtitle">${escapeHtml(lessons[0]?.sections.join(" / ") || "")}</span>
        </div>
        <div class="reader-actions">
          <a id="openLesson" href="lessons/${escapeHtml(lessons[0]?.file || "")}" target="_blank" rel="noreferrer">新窗口打开</a>
          <button type="button" id="copyLink">复制链接</button>
        </div>
      </div>
      <div class="lesson-frame-wrap">
        <iframe class="lesson-frame" id="lessonFrame" title="课程内容" src="lessons/${escapeHtml(lessons[0]?.file || "")}"></iframe>
      </div>
    </main>
  </div>

  <script>
    const lessons = ${lessonJson};
    const frame = document.querySelector("#lessonFrame");
    const title = document.querySelector("#currentTitle");
    const subtitle = document.querySelector("#currentSubtitle");
    const openLesson = document.querySelector("#openLesson");
    const copyLink = document.querySelector("#copyLink");
    const buttons = Array.from(document.querySelectorAll(".lesson-link"));

    function setActive(file, updateHash = true) {
      const lesson = lessons.find((item) => item.file === file) || lessons[0];
      if (!lesson) return;

      frame.src = "lessons/" + lesson.file;
      openLesson.href = "lessons/" + lesson.file;
      title.textContent = lesson.title;
      subtitle.textContent = lesson.sections.join(" / ");

      buttons.forEach((button) => {
        const active = button.dataset.file === lesson.file;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-current", active ? "page" : "false");
      });

      if (updateHash) {
        history.replaceState(null, "", "#" + lesson.slug);
      }
    }

    buttons.forEach((button) => {
      button.addEventListener("click", () => setActive(button.dataset.file));
    });

    copyLink.addEventListener("click", async () => {
      const lesson = lessons.find((item) => "lessons/" + item.file === frame.getAttribute("src")) || lessons[0];
      const url = new URL(location.href);
      url.hash = lesson.slug;
      try {
        await navigator.clipboard.writeText(url.toString());
        copyLink.textContent = "已复制";
        setTimeout(() => { copyLink.textContent = "复制链接"; }, 1200);
      } catch {
        copyLink.textContent = "复制失败";
        setTimeout(() => { copyLink.textContent = "复制链接"; }, 1200);
      }
    });

    const initialSlug = location.hash.replace(/^#/, "");
    const initialLesson = lessons.find((item) => item.slug === initialSlug);
    if (initialLesson) setActive(initialLesson.file, false);
  </script>
</body>
</html>
`;

const readme = `# 像素游戏学习教程

这是从 \`files.zip\` 整理出的像素游戏学习教程仓库。入口页是一个静态 HTML：左侧是课程目录，右侧加载每一课的完整交互内容。

## 打开方式

- 本地入口：打开 \`index.html\`
- 课程原文：\`lessons/pixel-lesson-01.html\` 到 \`lessons/pixel-lesson-11.html\`
- 像素化工具：\`tools/pixelart.py\`

## 课程目录

${lessons
  .map((lesson) => `- ${lesson.number}. [${lesson.title}](lessons/${lesson.file})：${lesson.sections.join("、")}`)
  .join("\n")}

## 目录结构

\`\`\`text
.
├─ index.html
├─ lessons/
└─ tools/
   └─ pixelart.py
\`\`\`

## License

MIT
`;

const license = `MIT License

Copyright (c) 2026 qaqwowqaq

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

const gitignore = `.DS_Store
Thumbs.db
.idea/
.vscode/
`;

fs.writeFileSync(path.join(root, "index.html"), indexHtml, "utf8");
fs.writeFileSync(path.join(root, "README.md"), readme, "utf8");
fs.writeFileSync(path.join(root, "LICENSE"), license, "utf8");
fs.writeFileSync(path.join(root, ".gitignore"), gitignore, "utf8");

console.log(`Generated ${lessons.length} lessons into ${root}`);
