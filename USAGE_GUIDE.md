# TED English Learning SOP - Usage Guide

## Complete Workflow

This guide walks you through the complete process of using the TED English Learning SOP system.

## 1. Adding URLs to Material Library

### Using Python
```python
from ted_material_library import MaterialLibrary

# Create or load library
library = MaterialLibrary()

# Add a TED talk
library.add_url(
    url="https://www.ted.com/talks/speaker_name_talk_title",
    title="The Power of Innovation",
    description="A compelling talk about innovation in the 21st century"
)

# View all materials
print(library.list_materials())
```

### Using Command Line
```bash
# Add material interactively
python3 -c "
from ted_material_library import MaterialLibrary
lib = MaterialLibrary()
lib.add_url('https://ted.com/talks/...', 'Talk Title', 'Description')
print('Material added successfully!')
"
```

## 2. Generating Learning Materials

### Step 1: Get the Transcript
You can obtain TED transcripts in several ways:
- Download from TED.com (available on most talk pages)
- Use YouTube auto-generated captions
- Copy from transcript view on TED website

Save the transcript as a `.txt` file.

### Step 2: Generate Learning Package

#### Using Python API
```python
from ted_learning_sop import TEDTranscriptProcessor, LearnerProfile

# Configure your profile
profile = LearnerProfile(
    level="B2 (CET-6 / IELTS 6-6.5 / TOEFL 70-90)",
    vocabulary_size=8000,
    goals=["listening", "speaking", "vocabulary"],
    output_language="bilingual",
    subtitle_format="plain_text",
    output_style="complete"
)

# Load transcript
with open("my_transcript.txt", "r") as f:
    transcript = f.read()

# Process
processor = TEDTranscriptProcessor(profile)
output = processor.generate_markdown_output(transcript)

# Save
with open("learning_package.md", "w") as f:
    f.write(output)
```

#### Using Command Line Interface
```bash
# Basic usage
python3 ted_cli.py -i transcript.txt -o learning_package.md

# With custom settings
python3 ted_cli.py \
  -i transcript.txt \
  -o learning_package.md \
  --level C1 \
  --vocab 12000 \
  --goals listening speaking writing \
  --lang bilingual
```

## 3. Real-Time Learning Chat (Conceptual)

While the chat feature is not fully implemented, here's how it would work:

```python
# Future implementation concept
from ted_learning_chat import LearningChatBot

# Load your learning package
bot = LearningChatBot("learning_package.md")

# Ask questions
response = bot.chat("What does 'sustainable' mean in this context?")
print(response)

# Practice vocabulary
bot.vocabulary_quiz()

# Request explanations
bot.explain_phrase("on the other hand")
```

## 4. Comprehensive Testing and Archiving

### Using the Review Kit

The generated learning package includes:

1. **Anki Cards** (Section 9)
   - Export the CSV table
   - Import into Anki
   - Study daily

2. **7-Day Plan** (Section 9)
   - Follow the daily schedule
   - Check off completed tasks
   - Track your progress

### Creating Custom Tests

```python
# Example: Extract vocabulary for custom quiz
import json

def create_vocabulary_test(learning_package_md):
    """Extract vocabulary from markdown for testing"""
    # Parse vocabulary table
    # Generate quiz questions
    # Return test format
    pass

# Use with your learning package
test = create_vocabulary_test("learning_package.md")
```

## 5. Complete Learning Workflow

### Week 1: Initial Learning
```
Day 1-2: Read through entire learning package
- Review Parameter Echo (Section 0)
- Read Content Overview (Section 1)
- Study Core Vocabulary (Section 2)
- Note difficult words

Day 3-4: Active Practice
- Complete Listening Training (Section 5)
- Try Speaking Cards (Section 6)
- Practice one Dialogue (Section 7)

Day 5-7: Shadowing and Review
- Shadow with script (Section 8)
- Review Anki cards (Section 9)
- Self-test with listening exercises
```

### Week 2: Consolidation
```
Day 1: Vocabulary Review
- Go through all vocabulary
- Create example sentences
- Check collocations

Day 2-3: Speaking Practice
- Record yourself with speaking cards
- Practice dialogues with partner
- Focus on pronunciation

Day 4-5: Writing Practice
- Complete writing task (Section 6)
- Use target phrases
- Get feedback

Day 6-7: Comprehensive Test
- Redo all exercises without looking at answers
- Time yourself
- Identify weak areas
```

## 6. Tips for Maximum Learning Efficiency

### Vocabulary Learning
1. **Context is Key**: Always learn words in context, not isolation
2. **Use Spaced Repetition**: Review at increasing intervals
3. **Active Recall**: Test yourself before checking answers
4. **Create Personal Examples**: Make sentences relevant to your life

### Listening Skills
1. **Multiple Passes**: Listen 3+ times
   - First: General understanding
   - Second: Details and vocabulary
   - Third: Pronunciation and intonation
2. **Shadow Without Script**: Try mimicking before reading
3. **Predict Content**: Use warm-up questions effectively

### Speaking Practice
1. **Record Yourself**: Compare with original speaker
2. **Focus on Chunks**: Learn phrases, not individual words
3. **Vary Speed**: Practice at different speeds
4. **Use Natural Pauses**: Follow the prosody markers

### Writing Development
1. **Model First**: Study the example structures
2. **Substitute Vocabulary**: Replace words while keeping structure
3. **Expand Gradually**: Start simple, add complexity
4. **Self-Edit**: Wait a day, then review your writing

## 7. Customization Options

### Adjusting Difficulty

For **easier** content:
```python
profile = LearnerProfile(
    level="B1 (Intermediate / CET-4)",
    vocabulary_size=5000,
    goals=["listening", "vocabulary"],
    output_language="bilingual",
    subtitle_format="plain_text",
    output_style="simplified"  # Less detail
)
```

For **harder** content:
```python
profile = LearnerProfile(
    level="C1 (Advanced / IELTS 7-8 / TOEFL 90-110)",
    vocabulary_size=12000,
    goals=["listening", "speaking", "vocabulary", "grammar", "writing"],
    output_language="english_only",  # Challenge yourself
    subtitle_format="plain_text",
    output_style="complete"
)
```

### Focus Areas

**Exam Preparation**:
```python
goals=["listening", "vocabulary", "grammar", "writing"]
# Focus on these sections: 2, 3, 4, 5, 6, 9
```

**Conversational Fluency**:
```python
goals=["listening", "speaking"]
# Focus on these sections: 5, 7, 8
```

**Professional Presentation**:
```python
goals=["speaking", "vocabulary", "presentation"]
# Focus on these sections: 2, 3, 7, 8
```

## 8. Troubleshooting

### Issue: Transcript formatting problems
**Solution**: Clean the transcript manually or use the automatic cleaning:
```python
processor = TEDTranscriptProcessor(profile)
clean_text = processor.clean_transcript(messy_transcript)
```

### Issue: Vocabulary too difficult/easy
**Solution**: Adjust vocabulary_size parameter:
- Too difficult: Reduce by 2000
- Too easy: Increase by 2000

### Issue: Too much/little content
**Solution**: Adjust output_style:
- Too much: Use `output_style="simplified"`
- Too little: Use `output_style="complete"`

## 9. Best Practices

1. **Consistency**: Study 15-30 minutes daily rather than cramming
2. **Active Engagement**: Don't just read—speak, write, listen
3. **Track Progress**: Keep a learning journal
4. **Mix Skills**: Don't focus on just one area
5. **Real Usage**: Try to use new vocabulary in real conversations
6. **Review Regularly**: Use the 7-day plan in Section 9
7. **Personalize**: Adapt materials to your interests and needs

## 10. Integration with Other Tools

### Anki
1. Export vocabulary table from Section 9
2. Import into Anki
3. Sync across devices
4. Study during commute

### Language Exchange
1. Use dialogues (Section 7) as conversation starters
2. Practice speaking cards with language partner
3. Get feedback on pronunciation

### Note-Taking Apps
1. Copy relevant sections to Notion/Evernote
2. Add personal notes and examples
3. Create linked notes for related concepts

### Video Player
1. Watch original TED talk
2. Follow along with shadowing script (Section 8)
3. Pause and repeat challenging sections

## Support and Resources

- **GitHub Issues**: Report bugs or request features
- **Example Files**: Check `sample_learning_package.md`
- **TED.com**: Original source for transcripts
- **Language Learning Communities**: Share your generated materials

---

**Remember**: The goal is to use the least time to achieve the most productive learning. Quality over quantity, consistency over intensity!
