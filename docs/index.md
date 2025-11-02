# TED English Learning SOP — Learning Packages

欢迎！本仓库会把 data/transcripts 目录下的字幕文件（.txt 或 .srt）自动转换成 Markdown 学习包并发布到 GitHub Pages。

## 演示与入口
- 测试视频（可直接在首页播放）
  <iframe
    src="./embed/?videoId=gN9dlisaQVM&en=/Baggio200cn/ted/gN9dlisaQVM/en.srt&zh=/Baggio200cn/ted/gN9dlisaQVM/zh.srt&title=TED%20Test%20Video&zhGloss=/Baggio200cn/ted/gN9dlisaQVM/glossary_zh.json&compact=1&autoplay=1"
    width="100%" height="820" frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen
  ></iframe>

### 🚀 TED 英语私教 Board — 三栏工作台
👉 **[点击进入 TED 英语私教 Board](./board/)** 

全新三栏学习工作台：素材库管理、视频字幕播放、离线练习生成（词汇/完形填空/跟读）、AI 学习包生成、智能对话助手。支持本地存储、导入导出，完全静态运行。

### 🎓 在线互动测试 / Interactive Online Test
👉 **[点击这里进入在线英语完形填空测试](./test/)** / **[Click here for Interactive English Cloze Test](./test/)**

粘贴任何英文文本，自动生成选择题形式的完形填空测试，立即提交答案并查看得分！
Paste any English text to automatically generate multiple-choice cloze questions for instant practice!

---

如何使用
- 把你的字幕文件放到 `data/transcripts/` 下（例如 `data/transcripts/my_talk.txt`）。
- 推送到 main 分支后，GitHub Actions 会自动生成 `docs/my_talk.md` 并提交回仓库。
- 启用 Pages（Settings → Pages → Deploy from a branch → main /docs）后，网页会自动更新展示生成的学习包。

已生成的学习包
- [my_talk](./my_talk.md)

参考
- 使用指南：[USAGE_GUIDE.md](../USAGE_GUIDE.md)
- 功能说明：[FEATURES.md](../FEATURES.md)
- 示例输出（静态示例）：[example_output.md](../example_output.md)

提示
- 默认生成参数：`--level B2 --vocab 8000 --goals listening speaking vocabulary --subtitle-format plain_text --output-language bilingual --output-style complete`。
- 你可以修改工作流 `.github/workflows/publish-learning-packages.yml` 来更改默认参数。
- my_talk_20251031T035028Z git add docs/index.md git commit -m docs: add link to my_talk_20251031T035028Z on Pages index git push
- [my_talk_20251031T035028Z](./my_talk_20251031T035028Z)
- [my_talk_20251031T035028Z](./my_talk_20251031T035028Z)
  - [Online Test（在线测试）](./test/)


- 测试视频（可直接在首页播放）
  <iframe
    src="./embed/?videoId=gN9dlisaQVM&en=/Baggio200cn/ted/gN9dlisaQVM/en.srt&zh=/Baggio200cn/ted/gN9dlisaQVM/zh.srt&title=TED%20Test%20Video&zhGloss=/Baggio200cn/ted/gN9dlisaQVM/glossary_zh.json&compact=1"
    width="100%" height="820" frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen
  ></iframe>

- 在线测试（完形填空）
  - [点击进入在线测试页](./test/)
  - 在上方播放器“手动暂停”后，右侧对话框会自动写入当前英文句子；点击“在在线测试中生成题目”即可把该句带到测试页并自动出题。

---

## 首页视频清单（可自行扩充）

> 把对应字幕文件放到 docs/ted/<你的目录>/en.srt 与 zh.srt，然后按下面链接格式添加一行即可。

- gN9dlisaQVM（当前示例）  
  [打开播放页（紧凑）](./embed/?videoId=gN9dlisaQVM&en=/Baggio200cn/ted/gN9dlisaQVM/en.srt&zh=/Baggio200cn/ted/gN9dlisaQVM/zh.srt&title=TED%20Test%20Video&zhGloss=/Baggio200cn/ted/gN9dlisaQVM/glossary_zh.json&compact=1)
