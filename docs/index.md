# TED English Learning SOP — Learning Packages

欢迎！本仓库会把 data/transcripts 目录下的字幕文件（.txt 或 .srt）自动转换成 Markdown 学习包并发布到 GitHub Pages。

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
