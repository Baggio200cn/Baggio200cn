# Transcripts Directory

This directory is for TED talk transcripts that will be automatically converted into learning packages.

## Usage

1. Add your TED transcript files here in either:
   - Plain text format (`.txt`)
   - SRT subtitle format (`.srt`)

2. When you commit and push transcript files to the `main` branch, the GitHub Actions workflow will automatically:
   - Process each transcript using `ted_cli.py`
   - Generate a comprehensive learning package in Markdown format
   - Save the output to the `docs/` directory
   - Commit and push the generated files back to the repository

3. The generated learning packages will be available in the `docs/` directory and can be hosted via GitHub Pages.

## Example

If you add a file named `innovation_talk.txt` here, the workflow will generate `docs/innovation_talk.md` with:
- Vocabulary lists with IPA and definitions
- Listening exercises
- Speaking and writing tasks
- Shadowing scripts
- Review materials (Anki cards, study plans)

## Transcript Format

### Plain Text Format
```
Innovation is the key to solving global challenges.
We must embrace change and think creatively about solutions.
```

### SRT Format
```
1
00:00:01,000 --> 00:00:05,000
Innovation is the key to solving global challenges.

2
00:00:06,000 --> 00:00:10,000
We must embrace change and think creatively.
```

The system automatically detects and processes both formats.

## Manual Processing

You can also manually generate learning packages using the command line:

```bash
python3 ted_cli.py -i data/transcripts/your_transcript.txt -o docs/your_output.md
```

For more options, see:
```bash
python3 ted_cli.py --help
```
