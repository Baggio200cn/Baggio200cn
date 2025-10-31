# TED English Learning SOP — Learning Packages

欢迎！本仓库会把 data/transcripts 目录下的字幕文件（.txt 或 .srt）自动转换成 Markdown 学习包并发布到 GitHub Pages。

## 🎓 在线互动测试 / Interactive Online Test
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
  ## 演示与入口

- 测试视频（YouTube + 双语字幕，自动加载播放器）
  - 使用你自己的字幕（推荐）：
    - [一键播放 gN9dlisaQVM](./embed/?videoId=gN9dlisaQVM&en=/Baggio200cn/ted/gN9dlisaQVM/en.srt&zh=/Baggio200cn/ted/gN9dlisaQVM/zh.srt&title=TED%20Test%20Video)
  - 若你还没放好该视频的 .srt，可临时用示例字幕验证功能：
    - [用示例字幕打开 gN9dlisaQVM](./embed/?videoId=gN9dlisaQVM&en=/Baggio200cn/ted/sample/en.srt&zh=/Baggio200cn/ted/sample/zh.srt&title=TED%20Test%20Video)

- 在线测试（完形填空）
  - [点击进入在线测试页](./test/)
  - 在播放器内暂停时也可点击“在在线测试中打开当前片段”，会把当前英文句子自动带到测试页并立即生成题目。
