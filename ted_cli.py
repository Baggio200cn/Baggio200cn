#!/usr/bin/env python3
"""
Command-line interface for TED English Learning SOP System
"""

import argparse
import sys
from pathlib import Path
from ted_learning_sop import TEDTranscriptProcessor, LearnerProfile


def main():
    parser = argparse.ArgumentParser(
        description="Generate comprehensive English learning materials from TED transcripts",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Generate from a transcript file
  python3 ted_cli.py -i transcript.txt -o learning_package.md
  
  # Specify learner level and vocabulary
  python3 ted_cli.py -i transcript.txt -o output.md --level B2 --vocab 8000
  
  # Focus on specific skills
  python3 ted_cli.py -i transcript.txt -o output.md --goals listening speaking
  
  # English-only output
  python3 ted_cli.py -i transcript.txt -o output.md --lang english_only

Learner Levels:
  A1-A2: Beginner (vocab: 1000-2000)
  B1: Intermediate / CET-4 (vocab: 4000-6000)
  B2: Upper-Intermediate / CET-6 / IELTS 6-6.5 (vocab: 6000-10000)
  C1: Advanced / IELTS 7-8 / TOEFL 90-110 (vocab: 10000-15000)
  C2: Expert / TOEFL 110+ (vocab: 15000+)
        """
    )
    
    # Required arguments
    parser.add_argument(
        "-i", "--input",
        required=True,
        help="Input transcript file (plain text or SRT format)"
    )
    
    parser.add_argument(
        "-o", "--output",
        required=True,
        help="Output markdown file for learning package"
    )
    
    # Optional arguments
    parser.add_argument(
        "--level",
        default="B2",
        choices=["A1", "A2", "B1", "B2", "C1", "C2"],
        help="Learner's CEFR level (default: B2)"
    )
    
    parser.add_argument(
        "--vocab",
        type=int,
        default=8000,
        help="Learner's vocabulary size (default: 8000)"
    )
    
    parser.add_argument(
        "--goals",
        nargs="+",
        default=["listening", "speaking", "vocabulary"],
        choices=["listening", "speaking", "vocabulary", "grammar", "writing", "presentation"],
        help="Learning goals (default: listening speaking vocabulary)"
    )
    
    parser.add_argument(
        "--lang",
        default="bilingual",
        choices=["bilingual", "english_only"],
        help="Output language preference (default: bilingual)"
    )
    
    parser.add_argument(
        "--format",
        default="auto",
        choices=["auto", "srt", "plain_text"],
        help="Input subtitle format (default: auto-detect)"
    )
    
    parser.add_argument(
        "--style",
        default="complete",
        choices=["complete", "simplified"],
        help="Output style (default: complete)"
    )
    
    args = parser.parse_args()
    
    # Validate input file
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: Input file not found: {args.input}", file=sys.stderr)
        sys.exit(1)
    
    # Read transcript
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            transcript = f.read()
    except Exception as e:
        print(f"Error reading input file: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Map level to description
    level_descriptions = {
        "A1": "A1 (Beginner)",
        "A2": "A2 (Elementary)",
        "B1": "B1 (Intermediate / CET-4)",
        "B2": "B2 (Upper-Intermediate / CET-6 / IELTS 6-6.5 / TOEFL 70-90)",
        "C1": "C1 (Advanced / IELTS 7-8 / TOEFL 90-110)",
        "C2": "C2 (Expert / TOEFL 110+)"
    }
    
    # Auto-detect format if needed
    subtitle_format = args.format
    if subtitle_format == "auto":
        # Simple heuristic: if contains SRT timestamp pattern, it's SRT
        if "-->" in transcript and any(c.isdigit() for c in transcript[:100]):
            subtitle_format = "srt"
        else:
            subtitle_format = "plain_text"
    
    # Create learner profile
    profile = LearnerProfile(
        level=level_descriptions[args.level],
        vocabulary_size=args.vocab,
        goals=args.goals,
        output_language=args.lang,
        subtitle_format=subtitle_format,
        output_style=args.style
    )
    
    # Process transcript
    print(f"Processing transcript: {args.input}")
    print(f"Learner level: {args.level}")
    print(f"Vocabulary size: {args.vocab}")
    print(f"Goals: {', '.join(args.goals)}")
    print(f"Generating learning package...")
    
    try:
        processor = TEDTranscriptProcessor(profile)
        output = processor.generate_markdown_output(transcript)
        
        # Write output
        output_path = Path(args.output)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(output)
        
        print(f"\n✓ Learning package generated successfully!")
        print(f"  Output: {args.output}")
        print(f"  Duration: {processor.duration:.1f} minutes")
        print(f"  Difficulty: {processor.difficulty_score}/100")
        
    except Exception as e:
        print(f"Error generating learning package: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
