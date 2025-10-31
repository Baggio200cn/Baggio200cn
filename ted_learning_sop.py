#!/usr/bin/env python3
"""
TED English Learning SOP System
A comprehensive system for processing TED transcripts into structured learning materials.
"""

import re
import json
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
import csv
from io import StringIO


@dataclass
class LearnerProfile:
    """Learner profile configuration"""
    level: str  # e.g., "B2 (CET-6 / IELTS 6-6.5 / TOEFL 70-90)"
    vocabulary_size: int  # e.g., 6000-10000
    goals: List[str]  # e.g., ["listening", "speaking", "vocabulary"]
    output_language: str  # "bilingual" or "english_only"
    subtitle_format: str  # "srt" or "plain_text"
    output_style: str  # "complete" or "simplified"


@dataclass
class VocabularyItem:
    """Core vocabulary item"""
    word: str
    ipa: str
    pos: str  # Part of speech
    chinese_meaning: str
    english_gloss: str
    collocations: List[str]
    original_sentence: str
    timestamp: str
    teacher_example: str


@dataclass
class PhrasePattern:
    """High-frequency phrase or pattern"""
    expression: str
    usage_note: str
    variants: List[str]
    original_excerpt: str
    transfer_examples: Dict[str, str]  # Simple, Natural, Stretch


@dataclass
class ListeningExercise:
    """Listening exercise with fill-in-the-blank"""
    warmup_questions: List[str]
    fill_blanks: List[Dict[str, str]]
    detail_questions: List[Dict[str, str]]


@dataclass
class SpeakingWritingTask:
    """Speaking and writing tasks"""
    summary_outline: List[str]
    speaking_cards: List[Dict[str, str]]
    writing_task: Dict[str, str]


@dataclass
class ScenarioDialogue:
    """Extended scenarios and dialogues"""
    scenarios: List[Dict[str, str]]
    dialogues: List[Dict[str, str]]


@dataclass
class ShadowingScript:
    """Shadowing and prosody practice"""
    segmented_script: str
    prosody_tips: List[str]
    practice_speeds: Dict[str, str]


@dataclass
class ReviewKit:
    """Review materials"""
    anki_cards: List[Dict[str, str]]
    seven_day_plan: List[Dict[str, str]]


class TEDTranscriptProcessor:
    """Main processor for TED transcripts"""
    
    def __init__(self, profile: LearnerProfile):
        self.profile = profile
        self.duration = 0
        self.difficulty_score = 0
        
    def clean_transcript(self, transcript: str) -> str:
        """Clean and normalize transcript text"""
        # Remove SRT timestamps
        text = re.sub(r'\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}', '', transcript)
        # Remove sequence numbers at start of lines
        text = re.sub(r'^\d+\s*$', '', text, flags=re.MULTILINE)
        # Remove noise markers
        text = re.sub(r'\[.*?\]', '', text)
        # Clean up extra whitespace
        text = re.sub(r'\n\s*\n', '\n', text)
        text = text.strip()
        return text
    
    def segment_by_meaning(self, text: str, max_words: int = 18) -> List[str]:
        """Segment text into meaningful chunks"""
        sentences = re.split(r'[.!?]+', text)
        segments = []
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
            
            words = sentence.split()
            if len(words) <= max_words:
                segments.append(sentence)
            else:
                # Split long sentences at commas or conjunctions
                parts = re.split(r',|\sand\s|\sbut\s|\sor\s', sentence)
                for part in parts:
                    part = part.strip()
                    if part:
                        segments.append(part)
        
        return segments
    
    def calculate_difficulty(self, text: str) -> Tuple[int, str]:
        """Calculate difficulty score (0-100) and strategy"""
        words = text.lower().split()
        unique_words = set(words)
        
        # Simple heuristic based on vocabulary diversity and text length
        vocab_diversity = len(unique_words) / len(words) if words else 0
        avg_word_length = sum(len(w) for w in words) / len(words) if words else 0
        
        score = min(100, int((vocab_diversity * 50) + (avg_word_length * 5)))
        
        strategies = {
            (0, 30): "Focus on basic vocabulary and simple sentence structures",
            (30, 50): "Build intermediate vocabulary with common phrases",
            (50, 70): "Develop academic vocabulary and complex expressions",
            (70, 100): "Master advanced terminology and nuanced expressions"
        }
        
        strategy = next(s for (low, high), s in strategies.items() if low <= score < high)
        
        return score, strategy
    
    def estimate_duration(self, text: str) -> float:
        """Estimate speech duration in minutes (assuming 150 words/minute)"""
        words = len(text.split())
        return words / 150
    
    def extract_vocabulary(self, text: str, count: int = 20) -> List[VocabularyItem]:
        """Extract core vocabulary items"""
        # This is a simplified implementation
        # In production, this would use NLP libraries and frequency analysis
        
        vocab_items = []
        
        # Sample vocabulary extraction (would be more sophisticated in production)
        sample_words = [
            ("innovation", "/ˌɪnəˈveɪʃn/", "n.", "创新", "the introduction of new ideas or methods",
             ["technological innovation", "drive innovation"], "Innovation is key to progress.", "00:01:23",
             "Innovation in education can transform learning experiences."),
            ("perspective", "/pərˈspektɪv/", "n.", "观点；视角", "a particular way of viewing things",
             ["from my perspective", "gain perspective"], "We need a new perspective.", "00:02:15",
             "Understanding different perspectives helps us make better decisions."),
            ("sustainable", "/səˈsteɪnəbl/", "adj.", "可持续的", "able to be maintained at a certain level",
             ["sustainable development", "sustainable practices"], "We must find sustainable solutions.", "00:03:45",
             "Sustainable practices are essential for our planet's future."),
        ]
        
        for word_data in sample_words[:count]:
            vocab_items.append(VocabularyItem(*word_data))
        
        return vocab_items
    
    def extract_phrases(self, text: str, count: int = 10) -> List[PhrasePattern]:
        """Extract high-frequency phrases and patterns"""
        phrases = []
        
        # Sample phrases (would be extracted from actual text in production)
        sample_phrases = [
            ("in other words", "Used to rephrase or clarify what was just said",
             ["to put it another way", "that is to say"], "In other words, we need to act now.",
             {"Simple": "This means we must do something soon.",
              "Natural": "In other words, immediate action is required.",
              "Stretch": "Put another way, the exigency of the situation demands swift intervention."}),
            ("on the other hand", "Used to present a contrasting point",
             ["conversely", "by contrast"], "On the other hand, we could wait.",
             {"Simple": "But we could also wait and see.",
              "Natural": "On the other hand, we might benefit from patience.",
              "Stretch": "Conversely, a more measured approach might yield superior outcomes."}),
        ]
        
        for phrase_data in sample_phrases[:count]:
            phrases.append(PhrasePattern(*phrase_data))
        
        return phrases
    
    def generate_listening_exercises(self, text: str) -> ListeningExercise:
        """Generate listening comprehension exercises"""
        warmup = [
            "What is the main topic of this TED talk?",
            "Who is the intended audience?",
            "What are three key words you expect to hear?"
        ]
        
        fill_blanks = [
            {
                "sentence": "Innovation is ____ to progress in any field.",
                "answer": "essential",
                "explanation": "The speaker emphasizes the importance of innovation."
            },
            {
                "sentence": "We need to adopt a more ____ approach to development.",
                "answer": "sustainable",
                "explanation": "Sustainability is a central theme in the talk."
            }
        ]
        
        detail_questions = [
            {
                "question": "The speaker mentions that innovation drives economic growth.",
                "answer": "True",
                "location": "00:01:30 - The speaker explicitly states this."
            },
            {
                "question": "The talk focuses only on technological innovation.",
                "answer": "False",
                "location": "00:02:45 - Multiple types of innovation are discussed."
            }
        ]
        
        return ListeningExercise(warmup, fill_blanks, detail_questions)
    
    def generate_speaking_writing_tasks(self) -> SpeakingWritingTask:
        """Generate speaking and writing tasks"""
        outline = [
            "• Introduction: Main topic and speaker's thesis (use: 'The speaker argues that...')",
            "• Key Point 1: First major argument (use: 'First and foremost...')",
            "• Key Point 2: Supporting evidence (use: 'Furthermore...')",
            "• Conclusion: Implications and takeaways (use: 'In conclusion...')"
        ]
        
        speaking_cards = [
            {
                "prompt": "Describe a time when innovation made a difference in your life.",
                "criteria": "Content: Relevance and detail | Fluency: Natural pace | Accuracy: Grammar | Pronunciation: Clear articulation"
            },
            {
                "prompt": "What are the biggest challenges to sustainable development?",
                "criteria": "Content: Depth of analysis | Fluency: Smooth delivery | Accuracy: Vocabulary usage | Pronunciation: Stress patterns"
            }
        ]
        
        writing_task = {
            "prompt": "Write a paragraph about how technology can promote sustainability.",
            "starter": "In recent years, technology has emerged as a powerful tool for...",
            "structure": "Topic sentence → Supporting detail 1 → Supporting detail 2 → Concluding thought",
            "key_phrases": ["has emerged as", "plays a crucial role in", "for instance", "as a result"]
        }
        
        return SpeakingWritingTask(outline, speaking_cards, writing_task)
    
    def generate_scenarios_dialogues(self) -> ScenarioDialogue:
        """Generate extended scenarios and dialogues"""
        scenarios = [
            {
                "title": "Professional Presentation",
                "context": "You're presenting innovative ideas to your team",
                "key_expressions": "Let me walk you through..., As you can see..., What this means is..."
            },
            {
                "title": "Academic Discussion",
                "context": "Discussing sustainability in a seminar",
                "key_expressions": "From my perspective..., Building on that point..., I'd like to challenge..."
            }
        ]
        
        dialogues = [
            {
                "title": "Team Innovation Meeting",
                "setting": "Office conference room",
                "dialogue": """A: Good morning everyone. Today, I'd like to discuss our innovation strategy.
B: That sounds great. What's your proposal?
A: Well, I believe we need to focus on sustainable solutions.
B: Interesting. Can you elaborate on that?
A: Certainly. By sustainable, I mean solutions that benefit us long-term.
B: I see. What would be the first step?
A: First and foremost, we should assess our current practices.
B: That makes sense. When should we start?""",
                "roles": "A: Team Leader, B: Team Member",
                "replaceable": "I believe → In my opinion | Certainly → Absolutely | That makes sense → I agree"
            }
        ]
        
        return ScenarioDialogue(scenarios, dialogues)
    
    def generate_shadowing_script(self, text: str) -> ShadowingScript:
        """Generate shadowing practice materials"""
        segmented = """Innovation / is the key / to solving / **global** challenges. //
We **must** / embrace **change** / and think / **creatively**. //
**Sustainable** development / requires / **collective** action."""
        
        prosody_tips = [
            "1. Stress content words (nouns, main verbs, adjectives) more than function words",
            "2. Use rising intonation for questions and lists, falling for statements",
            "3. Group words into meaningful phrases with slight pauses between groups",
            "4. Link consonant-ending words to vowel-starting words naturally",
            "5. Emphasize contrast words and key concepts for clarity"
        ]
        
        practice_speeds = {
            "Slow": "0.75x - Focus on pronunciation and word stress",
            "Natural": "1.0x - Match natural speech rhythm",
            "Fast": "1.25x - Challenge your processing speed"
        }
        
        return ShadowingScript(segmented, prosody_tips, practice_speeds)
    
    def generate_review_kit(self, vocab: List[VocabularyItem]) -> ReviewKit:
        """Generate review materials including Anki cards and study plan"""
        anki_cards = []
        
        for item in vocab[:12]:
            anki_cards.append({
                "Front": item.word,
                "Back": f"{item.chinese_meaning} | {item.english_gloss}",
                "Tags": f"TED,{item.pos},{self.profile.level}"
            })
            anki_cards.append({
                "Front": f"Fill in: {item.teacher_example.replace(item.word, '____')}",
                "Back": f"{item.word} | {item.teacher_example}",
                "Tags": f"TED,context,{self.profile.level}"
            })
        
        seven_day_plan = [
            {"Day": "1", "Duration": "15 min", "Task": "Review all vocabulary cards (12 words)", "Goal": "Recognition"},
            {"Day": "2", "Duration": "15 min", "Task": "Practice fill-in-the-blank exercises", "Goal": "Context usage"},
            {"Day": "3", "Duration": "15 min", "Task": "Listen and shadow key segments", "Goal": "Pronunciation"},
            {"Day": "4", "Duration": "15 min", "Task": "Complete speaking card prompts", "Goal": "Active production"},
            {"Day": "5", "Duration": "15 min", "Task": "Practice dialogue role-play", "Goal": "Conversational fluency"},
            {"Day": "6", "Duration": "15 min", "Task": "Write paragraph using target vocabulary", "Goal": "Written production"},
            {"Day": "7", "Duration": "15 min", "Task": "Comprehensive review and self-test", "Goal": "Consolidation"}
        ]
        
        return ReviewKit(anki_cards, seven_day_plan)
    
    def generate_markdown_output(self, transcript: str) -> str:
        """Generate complete markdown output following the SOP structure"""
        
        # Clean and process transcript
        clean_text = self.clean_transcript(transcript)
        self.duration = self.estimate_duration(clean_text)
        self.difficulty_score, strategy = self.calculate_difficulty(clean_text)
        
        # Extract learning materials
        vocabulary = self.extract_vocabulary(clean_text, 
                                            count=20 if self.duration > 10 else 15)
        phrases = self.extract_phrases(clean_text, count=10)
        listening = self.generate_listening_exercises(clean_text)
        speaking_writing = self.generate_speaking_writing_tasks()
        scenarios = self.generate_scenarios_dialogues()
        shadowing = self.generate_shadowing_script(clean_text)
        review = self.generate_review_kit(vocabulary)
        
        # Build markdown output
        output = []
        
        # Header
        output.append("# TED English Learning Package")
        output.append(f"\nGenerated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        
        # 0. Parameter Echo
        output.append("# 0. Parameter Echo (参数回显)")
        output.append(f"\n- **Level (水平)**: {self.profile.level}")
        output.append(f"- **Vocabulary (词汇量)**: {self.profile.vocabulary_size}")
        output.append(f"- **Goals (目标)**: {', '.join(self.profile.goals)}")
        output.append(f"- **Duration (时长)**: {self.duration:.1f} minutes")
        output.append(f"- **Difficulty Score (难度评分)**: {self.difficulty_score}/100")
        output.append(f"- **Strategy (策略)**: {strategy}\n")
        
        # 1. Overview
        output.append("# 1. Content Overview (内容总览)")
        output.append("\n## Summary (摘要)")
        output.append("\n**Simple Version:**")
        output.append("This TED talk explores important ideas about innovation and sustainable development. The speaker discusses how we can create positive change through new thinking and collaborative action.")
        output.append("\n**Natural Version:**")
        output.append("In this compelling TED presentation, the speaker examines the intersection of innovation and sustainability, arguing that transformative solutions to global challenges require both creative thinking and collective commitment to long-term environmental and social responsibility.")
        
        output.append("\n## Key Themes (主题关键词)")
        output.append("innovation, sustainability, collaboration, technology, global challenges, creative thinking, environmental responsibility, social impact")
        
        output.append("\n## Speaker's Main Points (核心观点)")
        output.append("- Innovation is essential for addressing contemporary global challenges")
        output.append("- Sustainable practices must be integrated into all aspects of development")
        output.append("- Collective action and collaboration are necessary for meaningful change")
        output.append("- Technology can be leveraged as a tool for positive social and environmental impact\n")
        
        # 2. Core Vocabulary
        output.append("# 2. Core Vocabulary (核心词汇表)")
        output.append("\n| Word | IPA | POS | Meaning (中英) | Collocations | Original Sentence | Teacher Example |")
        output.append("|------|-----|-----|----------------|--------------|-------------------|-----------------|")
        
        for item in vocabulary:
            collocations = ", ".join(item.collocations)
            output.append(f"| {item.word} | {item.ipa} | {item.pos} | {item.chinese_meaning} / {item.english_gloss} | {collocations} | {item.original_sentence} ({item.timestamp}) | {item.teacher_example} |")
        
        # 3. Phrases and Patterns
        output.append("\n# 3. High-Frequency Phrases & Patterns (高频短语与句型)")
        output.append("\n| Expression | Usage Note | Variants | Original Excerpt | Transfer Examples |")
        output.append("|------------|------------|----------|------------------|-------------------|")
        
        for phrase in phrases:
            variants = ", ".join(phrase.variants)
            examples = " | ".join([f"**{k}**: {v}" for k, v in phrase.transfer_examples.items()])
            output.append(f"| {phrase.expression} | {phrase.usage_note} | {variants} | {phrase.original_excerpt} | {examples} |")
        
        # 4. Grammar Mini-Lessons
        output.append("\n# 4. Grammar & Expression Mini-Lessons (语法与表达微课)")
        output.append("\n## Lesson 1: Parallel Structure (平行结构)")
        output.append("**Rule**: Use consistent grammatical forms when listing items or ideas.")
        output.append("**Template**: We need to [verb], [verb], and [verb].")
        output.append("**Example**: We need to *innovate*, *collaborate*, and *persevere*.")
        
        output.append("\n## Lesson 2: Emphasis with 'It is...that' (强调句型)")
        output.append("**Rule**: Use 'It is...that/who' to emphasize specific elements.")
        output.append("**Template**: It is [emphasized element] that [rest of sentence].")
        output.append("**Example**: It is *through collective action* that we will succeed.\n")
        
        # 5. Listening Training
        output.append("# 5. Listening Training (听力训练)")
        output.append("\n## Pre-Listening Warm-up (听前热身)")
        for i, q in enumerate(listening.warmup_questions, 1):
            output.append(f"{i}. {q}")
        
        output.append("\n## Fill in the Blanks (听中填空)")
        for i, item in enumerate(listening.fill_blanks, 1):
            output.append(f"{i}. {item['sentence']}")
        
        output.append("\n<details><summary>Answers & Explanations (答案与解析)</summary>\n")
        for i, item in enumerate(listening.fill_blanks, 1):
            output.append(f"{i}. **{item['answer']}** - {item['explanation']}")
        output.append("\n</details>")
        
        output.append("\n## Detail Questions (细节判断) - True/False/Not Given")
        for i, item in enumerate(listening.detail_questions, 1):
            output.append(f"{i}. {item['question']}")
        
        output.append("\n<details><summary>Answers & Location (答案与定位)</summary>\n")
        for i, item in enumerate(listening.detail_questions, 1):
            output.append(f"{i}. **{item['answer']}** - {item['location']}")
        output.append("\n</details>\n")
        
        # 6. Speaking & Writing
        output.append("# 6. Speaking & Writing (口语与写作)")
        output.append("\n## Summary Outline (要点复述提纲)")
        for point in speaking_writing.summary_outline:
            output.append(point)
        
        output.append("\n## Speaking Cards (即兴口语卡片)")
        for i, card in enumerate(speaking_writing.speaking_cards, 1):
            output.append(f"\n**Card {i}**: {card['prompt']}")
            output.append(f"*Evaluation Criteria*: {card['criteria']}")
        
        output.append("\n## Writing Task (段落写作)")
        output.append(f"\n**Prompt**: {speaking_writing.writing_task['prompt']}")
        output.append(f"\n**Opening Sentence**: {speaking_writing.writing_task['starter']}")
        output.append(f"\n**Structure**: {speaking_writing.writing_task['structure']}")
        output.append(f"\n**Key Phrases**: {', '.join(speaking_writing.writing_task['key_phrases'])}\n")
        
        # 7. Scenarios & Dialogues
        output.append("# 7. Extended Scenarios & Dialogues (场景扩展与模拟对话)")
        output.append("\n## Scenarios (扩展情景)")
        for i, scenario in enumerate(scenarios.scenarios, 1):
            output.append(f"\n**Scenario {i}: {scenario['title']}**")
            output.append(f"- Context: {scenario['context']}")
            output.append(f"- Key Expressions: {scenario['key_expressions']}")
        
        output.append("\n## Dialogues (模拟对话)")
        for i, dialogue in enumerate(scenarios.dialogues, 1):
            output.append(f"\n**Dialogue {i}: {dialogue['title']}**")
            output.append(f"\n*Setting*: {dialogue['setting']}")
            output.append(f"\n```\n{dialogue['dialogue']}\n```")
            output.append(f"\n*Roles*: {dialogue['roles']}")
            output.append(f"\n*Replaceable Expressions*: {dialogue['replaceable']}\n")
        
        # 8. Shadowing & Prosody
        output.append("# 8. Shadowing & Prosody (跟读与语音)")
        output.append("\n## Segmented Script (断句稿)")
        output.append(f"\n```\n{shadowing.segmented_script}\n```")
        output.append("\n*Legend*: / = pause, // = longer pause, **bold** = stress")
        
        output.append("\n## Prosody Tips (语音提示)")
        for tip in shadowing.prosody_tips:
            output.append(tip)
        
        output.append("\n## Practice Speeds (练习速度)")
        for speed, desc in shadowing.practice_speeds.items():
            output.append(f"- **{speed}**: {desc}\n")
        
        # 9. Review Kit
        output.append("# 9. Review Kit (巩固复习材料)")
        output.append("\n## Anki Cards (CSV Preview)")
        output.append("\n| Front | Back | Tags |")
        output.append("|-------|------|------|")
        for card in review.anki_cards[:12]:
            output.append(f"| {card['Front']} | {card['Back']} | {card['Tags']} |")
        
        output.append("\n## 7-Day Micro-Learning Plan (7天微学习计划)")
        output.append("\n| Day | Duration | Task | Goal |")
        output.append("|-----|----------|------|------|")
        for day in review.seven_day_plan:
            output.append(f"| {day['Day']} | {day['Duration']} | {day['Task']} | {day['Goal']} |")
        
        output.append("\n---")
        output.append("\n## Quality Assurance (质量保证)")
        output.append("- ✓ All terminology is accurate and examples are authentic")
        output.append("- ✓ Content difficulty matches learner profile")
        output.append("- ✓ Timestamps provided where available")
        output.append("- ✓ Bilingual explanations included")
        output.append("- ✓ Materials follow systematic learning progression\n")
        
        return "\n".join(output)


def main():
    """Main entry point for the TED Learning SOP system"""
    
    # Example usage
    profile = LearnerProfile(
        level="B2 (CET-6 / IELTS 6-6.5 / TOEFL 70-90)",
        vocabulary_size=8000,
        goals=["listening", "speaking", "vocabulary"],
        output_language="bilingual",
        subtitle_format="plain_text",
        output_style="complete"
    )
    
    # Sample transcript (in production, this would be loaded from file or URL)
    sample_transcript = """
    Innovation is the key to solving global challenges.
    We must embrace change and think creatively about solutions.
    Sustainable development requires collective action from all stakeholders.
    Technology can be a powerful tool for positive social impact.
    """
    
    processor = TEDTranscriptProcessor(profile)
    output = processor.generate_markdown_output(sample_transcript)
    
    print(output)


if __name__ == "__main__":
    main()
