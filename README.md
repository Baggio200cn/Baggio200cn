# TED English Learning SOP System

A comprehensive, automated system for transforming TED talk transcripts into structured learning materials with adaptive difficulty levels.

## 🎯 Overview

This system implements a complete Standard Operating Procedure (SOP) for English language learning using TED talks. It automatically generates:

- **Vocabulary lists** with IPA, definitions, collocations, and contextual examples
- **Listening exercises** including fill-in-the-blank and comprehension questions
- **Speaking & writing tasks** with evaluation criteria and scaffolding
- **Scenario-based dialogues** for practical application
- **Shadowing scripts** with prosody markers for pronunciation practice
- **Review materials** including Anki flashcards and 7-day study plans

## ✨ Key Features

### 1. **Adaptive Difficulty**
- Automatically adjusts content based on learner level (from beginner to TOEFL)
- Vocabulary selection matches learner's current range (6,000-10,000 words)
- Three-tier examples: Simple, Natural, and Stretch

### 2. **Comprehensive Materials**
- Core vocabulary with authentic usage examples
- High-frequency phrases and sentence patterns
- Grammar mini-lessons extracted from actual content
- Multiple exercise types for different skills

### 3. **Structured Learning Path**
- Pre-listening warm-up activities
- Active listening exercises
- Speaking and writing tasks
- Review and consolidation materials

### 4. **Professional Output**
- Clean, formatted Markdown documents
- Bilingual explanations (English/Chinese)
- Timestamp references to original content
- Ready-to-use Anki card exports

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/Baggio200cn/Baggio200cn.git
cd Baggio200cn

# No additional dependencies required - uses Python 3 standard library
```

### Basic Usage

```python
from ted_learning_sop import TEDTranscriptProcessor, LearnerProfile

# Configure learner profile
profile = LearnerProfile(
    level="B2 (CET-6 / IELTS 6-6.5 / TOEFL 70-90)",
    vocabulary_size=8000,
    goals=["listening", "speaking", "vocabulary"],
    output_language="bilingual",
    subtitle_format="plain_text",
    output_style="complete"
)

# Load your TED transcript
with open("transcript.txt", "r") as f:
    transcript = f.read()

# Process and generate learning materials
processor = TEDTranscriptProcessor(profile)
output = processor.generate_markdown_output(transcript)

# Save the output
with open("learning_package.md", "w") as f:
    f.write(output)
```

### Command Line Usage

```bash
# Run with sample data
python3 ted_learning_sop.py > sample_output.md

# Or use the CLI tool (see ted_cli.py)
python3 ted_cli.py --input transcript.txt --output learning_package.md --level B2 --vocab 8000
```

## 📋 Learning Package Structure

Each generated learning package includes:

### 0. Parameter Echo
- Displays learner profile settings
- Shows difficulty score and learning strategy

### 1. Content Overview
- Simplified and natural summaries
- Key themes and speaker's main points

### 2. Core Vocabulary (核心词汇表)
- Word, IPA pronunciation, part of speech
- Bilingual definitions
- Common collocations
- Original and teaching examples with timestamps

### 3. High-Frequency Phrases & Patterns
- Usage notes and variants
- Transfer examples at three difficulty levels

### 4. Grammar & Expression Mini-Lessons
- Real usage patterns from the transcript
- Rules, templates, and examples

### 5. Listening Training
- Pre-listening warm-up questions
- Fill-in-the-blank exercises
- True/False/Not Given questions
- Answers with explanations

### 6. Speaking & Writing
- Summary outline with linking words
- Speaking prompts with evaluation criteria
- Writing task with scaffolding

### 7. Extended Scenarios & Dialogues
- Real-world application scenarios
- Role-play dialogues (12-16 turns)
- Replaceable expressions guide

### 8. Shadowing & Prosody
- Segmented script with pause markers
- Stress patterns highlighted
- Practice at three speeds

### 9. Review Kit
- Anki flashcard deck (CSV format)
- 7-day micro-learning plan

## 🎓 Learner Levels Supported

| Level | Description | CEFR | Tests | Vocabulary |
|-------|-------------|------|-------|------------|
| Beginner | Basic English | A1-A2 | - | 1,000-2,000 |
| Intermediate | Everyday English | B1 | CET-4 | 4,000-6,000 |
| Upper-Intermediate | Academic English | B2 | CET-6, IELTS 6-6.5 | 6,000-10,000 |
| Advanced | Professional English | C1 | IELTS 7-8, TOEFL 90-110 | 10,000-15,000 |
| Expert | Near-native | C2 | TOEFL 110+ | 15,000+ |

## 📝 Input Format

### Plain Text
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

The system automatically detects and cleans both formats.

## 🔧 Configuration Options

```python
LearnerProfile(
    level="B2 (CET-6 / IELTS 6-6.5 / TOEFL 70-90)",  # Learner level
    vocabulary_size=8000,                              # Current vocabulary
    goals=["listening", "speaking", "vocabulary"],     # Learning objectives
    output_language="bilingual",                       # bilingual or english_only
    subtitle_format="plain_text",                      # plain_text or srt
    output_style="complete"                            # complete or simplified
)
```

## 📊 Example Output

See `example_output.md` for a complete sample learning package.

Key features in the output:
- ✅ Bilingual vocabulary tables
- ✅ Collapsible answer sections
- ✅ Timestamp references
- ✅ Progressive difficulty examples
- ✅ Ready-to-export Anki cards

## 🛠️ Advanced Features

### Custom Vocabulary Extraction
The system can be extended with NLP libraries for more sophisticated vocabulary extraction:

```python
# Example with spaCy integration (optional)
import spacy
nlp = spacy.load("en_core_web_md")

def advanced_extract_vocabulary(text):
    doc = nlp(text)
    # Extract based on frequency, POS tags, semantic similarity
    # ... custom logic
```

### URL Material Library
Add TED talks directly from URLs (requires additional setup):

```python
from ted_material_library import MaterialLibrary

library = MaterialLibrary()
library.add_url("https://www.ted.com/talks/...")
materials = library.get_all_materials()
```

### Real-time Learning Chat
Integration point for conversational learning (requires LLM API):

```python
from ted_learning_chat import LearningChatBot

bot = LearningChatBot(learning_package)
response = bot.chat("What does 'sustainable' mean in this context?")
```

## 📚 Use Cases

1. **Self-Directed Learning**: Generate personalized study materials from any TED talk
2. **Classroom Teaching**: Create consistent, high-quality handouts for students
3. **Test Preparation**: Focus on academic vocabulary for IELTS, TOEFL, etc.
4. **Professional Development**: Learn industry-specific terminology and presentation skills
5. **Language Coaching**: Provide structured materials for 1-on-1 tutoring

## 🤝 Contributing

This is an educational project. Suggestions for improvement:

- [ ] Integration with TED API for direct video/transcript fetching
- [ ] Machine learning-based vocabulary importance scoring
- [ ] Audio generation for pronunciation examples
- [ ] Progress tracking and spaced repetition scheduling
- [ ] Multi-language support (currently English learning for Chinese speakers)

## 📄 License

This project is for educational purposes. TED content is subject to TED's terms of use.

## 🙏 Acknowledgments

- Inspired by effective language learning methodologies
- Built for learners preparing for international English proficiency tests
- Designed to maximize learning output in minimal time

## 📞 Support

For questions or issues, please open a GitHub issue in this repository.

---

**Goal**: Use the least time to achieve the most productive learning. (目标：用最少时间，做最有产出的学习。)
