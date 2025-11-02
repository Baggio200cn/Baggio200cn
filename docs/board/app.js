// ============================================================================
// TED 英语私教 Board - app.js
// ============================================================================

// Global State
let YTPlayer = null;
let materials = [];
let currentMaterial = null;
let segsEn = [];
let segsZh = [];
let curIdx = -1;
let lastCapturedIdx = -1;
let generatedPackage = null;
let chatHistory = [];

// DOM helpers
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

// ============================================================================
// Utility Functions
// ============================================================================

function parseSRT(srt) {
  const lines = srt.replace(/\r/g, '').split('\n');
  const items = [];
  let i = 0;
  while (i < lines.length) {
    while (i < lines.length && !/^\d+$/.test(lines[i].trim())) i++;
    i++;
    if (i >= lines.length) break;
    const m = lines[i].match(/(\d+):(\d+):(\d+),(\d+)\s+-->\s+(\d+):(\d+):(\d+),(\d+)/);
    if (!m) { i++; continue; }
    const start = toSec(m[1], m[2], m[3], m[4]);
    const end = toSec(m[5], m[6], m[7], m[8]);
    i++;
    const buf = [];
    while (i < lines.length && lines[i].trim() !== '') { buf.push(lines[i]); i++; }
    // Sanitize text by using a DOM element to escape any HTML/script content
    const div = document.createElement('div');
    div.textContent = buf.join(' ').trim();
    const text = div.textContent;
    items.push({ start, end, text });
    while (i < lines.length && lines[i].trim() === '') i++;
  }
  return items;
}

function parsePlainText(text) {
  // Split by lines, create synthetic segments with 3s spacing
  const lines = text.split('\n').filter(l => l.trim());
  const items = [];
  let time = 0;
  lines.forEach((line, idx) => {
    const start = time;
    const end = time + 3;
    items.push({ start, end, text: line.trim() });
    time = end;
  });
  return items;
}

function toSec(h, m, s, ms) {
  return (+h) * 3600 + (+m) * 60 + (+s) + (+ms) / 1000;
}

function formatTime(sec) {
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  const m = Math.floor((sec / 60) % 60).toString().padStart(2, '0');
  const h = Math.floor(sec / 3600).toString().padStart(2, '0');
  return (h !== '00' ? h + ':' : '') + m + ':' + s;
}

function getIndexAtTime(t) {
  if (!segsEn.length) return -1;
  const last = segsEn[segsEn.length - 1];
  if (t > (last.end + 0.6)) return -1;
  let i = segsEn.findIndex(s => t >= s.start - 0.15 && t <= s.end + 0.35);
  if (i !== -1) return i;
  for (let k = segsEn.length - 1; k >= 0; k--) {
    if (t >= segsEn[k].start - 0.15) return k;
  }
  return -1;
}

async function safeFetchText(url) {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return { ok: false, text: '', status: r.status };
    const text = await r.text();
    return { ok: true, text };
  } catch (e) {
    console.warn('fetch failed', url, e);
    return { ok: false, text: '' };
  }
}

// ============================================================================
// localStorage Management
// ============================================================================

function saveMaterialsToStorage() {
  localStorage.setItem('tedboard_materials', JSON.stringify(materials));
}

function loadMaterialsFromStorage() {
  const stored = localStorage.getItem('tedboard_materials');
  if (stored) {
    try {
      materials = JSON.parse(stored);
    } catch (e) {
      materials = [];
    }
  }
}

function saveCurrentMaterialToStorage() {
  if (currentMaterial) {
    localStorage.setItem('tedboard_current', JSON.stringify(currentMaterial));
  }
}

function loadCurrentMaterialFromStorage() {
  const stored = localStorage.getItem('tedboard_current');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return null;
    }
  }
  return null;
}

function savePackageToStorage() {
  if (generatedPackage) {
    localStorage.setItem('tedboard_package', JSON.stringify(generatedPackage));
  }
}

function loadPackageFromStorage() {
  const stored = localStorage.getItem('tedboard_package');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return null;
    }
  }
  return null;
}

function saveChatToStorage() {
  localStorage.setItem('tedboard_chat', JSON.stringify(chatHistory));
}

function loadChatFromStorage() {
  const stored = localStorage.getItem('tedboard_chat');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return [];
    }
  }
  return [];
}

// ============================================================================
// Materials Library
// ============================================================================

function renderMaterialsList(filter = '') {
  const list = $('#materialsList');
  list.innerHTML = '';
  
  const filtered = filter
    ? materials.filter(m => m.title.toLowerCase().includes(filter.toLowerCase()))
    : materials;

  if (filtered.length === 0) {
    list.innerHTML = '<div style="padding:16px;text-align:center;color:var(--fg-muted)">暂无素材</div>';
    return;
  }

  filtered.forEach(mat => {
    const item = document.createElement('div');
    item.className = 'material-item';
    if (currentMaterial && currentMaterial.id === mat.id) {
      item.classList.add('active');
    }
    const titleDiv = document.createElement('div');
    titleDiv.className = 'material-title';
    titleDiv.textContent = mat.title;
    item.appendChild(titleDiv);
    const metaDiv = document.createElement('div');
    metaDiv.className = 'material-meta';
    metaDiv.textContent = mat.videoId ? '视频: ' + mat.videoId : '仅字幕';
    item.appendChild(metaDiv);
    item.addEventListener('click', () => loadMaterial(mat));
    list.appendChild(item);
  });
}

async function loadMaterial(mat) {
  currentMaterial = mat;
  saveCurrentMaterialToStorage();
  renderMaterialsList();
  
  // Update workspace header
  $('#currentTitle').textContent = mat.title;
  
  // Load subtitles
  const enRes = await safeFetchText(mat.enUrl);
  if (!enRes.ok) {
    addChatMessage('system', `加载英文字幕失败: ${mat.enUrl}`);
    segsEn = [];
  } else {
    const isEnSRT = mat.enUrl.toLowerCase().endsWith('.srt');
    segsEn = isEnSRT ? parseSRT(enRes.text) : parsePlainText(enRes.text);
  }

  segsZh = [];
  if (mat.zhUrl) {
    const zhRes = await safeFetchText(mat.zhUrl);
    if (zhRes.ok && mat.zhUrl.toLowerCase().endsWith('.srt')) {
      segsZh = parseSRT(zhRes.text);
    }
  }

  curIdx = -1;
  lastCapturedIdx = -1;
  
  // Render timeline
  renderTimeline();
  
  // Initialize or reload YouTube player
  if (mat.videoId) {
    initYouTubePlayer(mat.videoId);
  } else {
    // No video, just show timeline
    $('#player').innerHTML = '<div style="padding:40px;text-align:center;color:var(--fg-muted)">此素材无视频，仅包含字幕</div>';
  }
  
  addChatMessage('system', `已加载素材: ${mat.title}`);
}

function renderTimeline() {
  const timeline = $('#timeline');
  timeline.innerHTML = '';
  
  if (segsEn.length === 0) {
    timeline.innerHTML = '<div style="padding:16px;text-align:center;color:var(--fg-muted)">无字幕数据</div>';
    return;
  }

  segsEn.forEach((seg, idx) => {
    const item = document.createElement('div');
    item.className = 'timeline-item';

    const timeDiv = document.createElement('div');
    timeDiv.className = 'timeline-time';
    timeDiv.textContent = formatTime(seg.start);

    const textDiv = document.createElement('div');
    textDiv.className = 'timeline-text';
    textDiv.textContent = seg.text;

    item.appendChild(timeDiv);
    item.appendChild(textDiv);
    item.addEventListener('click', () => {
      if (YTPlayer && YTPlayer.seekTo) {
        YTPlayer.seekTo(seg.start, true);
      }
      setCurIdx(idx);
    });
    timeline.appendChild(item);
  });
}

function setCurIdx(idx) {
  if (idx === curIdx) return;
  curIdx = idx;
  
  // Update timeline highlight
  $$('.timeline-item').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });
  
  // Update subtitle overlays
  if (idx >= 0 && idx < segsEn.length) {
    $('#sub-en').textContent = segsEn[idx].text;
    $('#sub-zh').textContent = (idx < segsZh.length) ? segsZh[idx].text : '';
    
    // Update current snippet
    const snippet = $('#currentSnippet');
    snippet.textContent = segsEn[idx].text;
    if (idx < segsZh.length && segsZh[idx].text) {
      snippet.textContent += '\n\n' + segsZh[idx].text;
    }
    
    // Auto-scroll timeline
    if ($('#autoScroll').checked) {
      const activeItem = $$('.timeline-item')[idx];
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }
}

// ============================================================================
// YouTube Player
// ============================================================================

function onYouTubeIframeAPIReady() {
  // Will be called when YouTube API is ready
}

function initYouTubePlayer(videoId) {
  if (YTPlayer && YTPlayer.destroy) {
    YTPlayer.destroy();
    YTPlayer = null;
  }
  
  const playerDiv = $('#player');
  playerDiv.innerHTML = '';
  
  if (!window.YT || !window.YT.Player) {
    // API not loaded yet, wait and retry
    setTimeout(() => initYouTubePlayer(videoId), 500);
    return;
  }
  
  YTPlayer = new YT.Player('player', {
    videoId: videoId,
    playerVars: {
      autoplay: 0,
      controls: 1,
      rel: 0,
      modestbranding: 1
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange
    }
  });
}

function onPlayerReady(event) {
  console.log('YouTube player ready');
  startPolling();
}

function onPlayerStateChange(event) {
  // YT.PlayerState.PAUSED = 2
  if (event.data === 2) {
    handlePause();
  }
}

let pollingInterval = null;

function startPolling() {
  if (pollingInterval) clearInterval(pollingInterval);
  pollingInterval = setInterval(() => {
    if (!YTPlayer || !YTPlayer.getCurrentTime) return;
    const t = YTPlayer.getCurrentTime();
    const idx = getIndexAtTime(t);
    if (idx !== -1 && idx !== curIdx) {
      setCurIdx(idx);
      
      // Auto-pause at sentence end
      if ($('#autoPause').checked) {
        const seg = segsEn[idx];
        if (t >= seg.end - 0.1) {
          YTPlayer.pauseVideo();
        }
      }
    }
  }, 200);
}

function handlePause() {
  if (!YTPlayer || !YTPlayer.getCurrentTime) return;
  const t = YTPlayer.getCurrentTime();
  const idx = getIndexAtTime(t);
  if (idx !== -1 && idx !== lastCapturedIdx) {
    lastCapturedIdx = idx;
    const text = segsEn[idx].text;
    addChatMessage('system', `[暂停] ${text}`);
  }
}

// ============================================================================
// Controls
// ============================================================================

$('#prevSentence').addEventListener('click', () => {
  if (curIdx > 0) {
    const newIdx = curIdx - 1;
    if (YTPlayer && YTPlayer.seekTo) {
      YTPlayer.seekTo(segsEn[newIdx].start, true);
    }
    setCurIdx(newIdx);
  }
});

$('#nextSentence').addEventListener('click', () => {
  if (curIdx < segsEn.length - 1) {
    const newIdx = curIdx + 1;
    if (YTPlayer && YTPlayer.seekTo) {
      YTPlayer.seekTo(segsEn[newIdx].start, true);
    }
    setCurIdx(newIdx);
  }
});

$('#speakCurrent').addEventListener('click', () => {
  if (curIdx >= 0 && curIdx < segsEn.length) {
    const text = segsEn[curIdx].text;
    speakText(text);
  }
});

function speakText(text) {
  if (!window.speechSynthesis) {
    alert('浏览器不支持 TTS');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

// ============================================================================
// Tabs
// ============================================================================

$$('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    $$('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    $$('.tab-content').forEach(tc => tc.classList.remove('active'));
    $(`#${target}Tab`).classList.add('active');
  });
});

// ============================================================================
// Practice Generators
// ============================================================================

// Stopwords for vocabulary
const STOPWORDS = new Set([
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "i", "it", "for", "not", "on", "with",
  "he", "as", "you", "do", "at", "this", "but", "his", "by", "from", "they", "we", "say", "her",
  "she", "or", "an", "will", "my", "one", "all", "would", "there", "their", "what", "so", "up",
  "out", "if", "about", "who", "get", "which", "go", "me", "when", "make", "can", "like", "no",
  "just", "him", "know", "take", "into", "your", "good", "some", "could", "them", "see", "other",
  "than", "then", "now", "look", "only", "come", "its", "over", "think", "also", "back", "after",
  "use", "two", "how", "our", "work", "first", "well", "way", "even", "new", "want", "because",
  "any", "these", "give", "day", "most", "us"
]);

// Vocabulary Generator
$('#vocabCount').addEventListener('input', (e) => {
  $('#vocabCountValue').textContent = e.target.value;
});

$('#generateVocab').addEventListener('click', () => {
  if (segsEn.length === 0) {
    alert('请先加载素材');
    return;
  }
  
  const targetCount = parseInt($('#vocabCount').value);
  const fullText = segsEn.map(s => s.text).join(' ');
  const words = fullText.match(/[A-Za-z']+/g) || [];
  const wordLower = words.map(w => w.toLowerCase());
  
  // Count frequency
  const freq = {};
  wordLower.forEach(w => {
    if (w.length >= 4 && !STOPWORDS.has(w)) {
      freq[w] = (freq[w] || 0) + 1;
    }
  });
  
  // Sort by frequency
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, targetCount);
  
  // Render
  const result = $('#vocabResult');
  result.innerHTML = '<div class="vocab-list"></div>';
  const list = result.querySelector('.vocab-list');
  
  top.forEach(([word, count]) => {
    const item = document.createElement('div');
    item.className = 'vocab-item';
    const wordSpan = document.createElement('span');
    wordSpan.className = 'vocab-word';
    wordSpan.textContent = word;
    const freqSpan = document.createElement('span');
    freqSpan.className = 'vocab-freq';
    freqSpan.textContent = `x${count}`;
    item.appendChild(wordSpan);
    item.appendChild(freqSpan);
    list.appendChild(item);
  });
});

$('#exportVocabCSV').addEventListener('click', () => {
  const items = $$('#vocabResult .vocab-item');
  if (items.length === 0) {
    alert('请先生成词汇表');
    return;
  }
  
  let csv = 'Word,Frequency\n';
  items.forEach(item => {
    const word = item.querySelector('.vocab-word').textContent;
    const freq = item.querySelector('.vocab-freq').textContent.replace('x', '');
    csv += `${word},${freq}\n`;
  });
  
  downloadFile('vocabulary.csv', csv);
});

// Cloze Generator
let clozeQuestions = [];

$('#generateCloze').addEventListener('click', () => {
  if (segsEn.length === 0) {
    alert('请先加载素材');
    return;
  }
  
  const count = parseInt($('#clozeCount').value) || 8;
  const options = parseInt($('#clozeOptions').value) || 4;
  const mode = document.querySelector('input[name="clozeMode"]:checked').value;
  
  let text = '';
  if (mode === 'full') {
    text = segsEn.map(s => s.text).join(' ');
  } else {
    // Neighborhood: current +/- 5 sentences
    const start = Math.max(0, curIdx - 5);
    const end = Math.min(segsEn.length, curIdx + 6);
    text = segsEn.slice(start, end).map(s => s.text).join(' ');
  }
  
  if (!text) {
    alert('无可用文本');
    return;
  }
  
  clozeQuestions = makeClozeQuiz(text, count, options);
  renderClozeQuiz();
});

function makeClozeQuiz(originalText, n, k) {
  const words = (originalText.match(/[A-Za-z']+/g) || []);
  if (words.length < n) {
    n = words.length;
  }
  
  const candidates = words.filter(w => w.length >= 4 && !STOPWORDS.has(w.toLowerCase()));
  const uniqueCandidates = Array.from(new Set(candidates.map(w => w.toLowerCase())));
  
  // Shuffle and pick n
  const shuffled = uniqueCandidates.sort(() => Math.random() - 0.5);
  const blanks = shuffled.slice(0, n);
  
  const questions = [];
  const usedWords = new Set();
  
  blanks.forEach((blank, idx) => {
    if (usedWords.has(blank)) return;
    
    // Find first occurrence in original text
    const regex = new RegExp(`\\b${blank}\\b`, 'i');
    const match = originalText.match(regex);
    if (!match) return;
    
    const answer = match[0];
    
    // Generate distractors
    const distractors = uniqueCandidates
      .filter(w => w !== blank && !usedWords.has(w))
      .sort(() => Math.random() - 0.5)
      .slice(0, k - 1);
    
    const choices = [answer, ...distractors].sort(() => Math.random() - 0.5);
    
    // Create question text with blank (keep original text intact)
    const questionText = originalText.replace(regex, '_____');
    
    questions.push({
      id: `q${idx}`,
      text: questionText,
      answer: answer,
      choices: choices,
      userAnswer: null
    });
    
    usedWords.add(blank);
  });
  
  return questions;
}

function renderClozeQuiz() {
  const result = $('#clozeResult');
  result.innerHTML = '';
  
  clozeQuestions.forEach((q, idx) => {
    const qDiv = document.createElement('div');
    qDiv.className = 'cloze-question';
    qDiv.id = q.id;
    
    const textDiv = document.createElement('div');
    textDiv.className = 'cloze-text';
    // Show only a snippet around the blank
    const snippet = q.text.split('_____');
    const before = snippet[0].slice(-100);
    const after = snippet[1].slice(0, 100);
    textDiv.innerHTML = `${before}<span class="cloze-blank" id="${q.id}_blank">_____</span>${after}`;
    
    const choicesDiv = document.createElement('div');
    choicesDiv.className = 'cloze-choices';
    
    q.choices.forEach(choice => {
      const btn = document.createElement('button');
      btn.className = 'cloze-choice';
      btn.textContent = choice;
      btn.addEventListener('click', () => {
        q.userAnswer = choice;
        qDiv.querySelectorAll('.cloze-choice').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        $(`#${q.id}_blank`).textContent = choice;
      });
      choicesDiv.appendChild(btn);
    });
    
    qDiv.appendChild(textDiv);
    qDiv.appendChild(choicesDiv);
    result.appendChild(qDiv);
  });
}

$('#showClozeAnswers').addEventListener('click', () => {
  if (clozeQuestions.length === 0) {
    alert('请先生成题目');
    return;
  }
  
  clozeQuestions.forEach(q => {
    const qDiv = $(`#${q.id}`);
    qDiv.querySelectorAll('.cloze-choice').forEach(btn => {
      btn.classList.remove('correct', 'incorrect');
      if (btn.textContent === q.answer) {
        btn.classList.add('correct');
      } else if (btn.classList.contains('selected')) {
        btn.classList.add('incorrect');
      }
    });
  });
});

// Shadowing Generator
$('#generateShadowing').addEventListener('click', () => {
  if (segsEn.length === 0) {
    alert('请先加载素材');
    return;
  }
  
  const result = $('#shadowingResult');
  result.innerHTML = '';
  
  segsEn.forEach((seg, idx) => {
    const line = document.createElement('div');
    line.className = 'shadowing-line';
    line.innerHTML = `<span class="shadowing-index">${idx + 1}.</span> ${seg.text}`;
    result.appendChild(line);
  });
});

$('#exportShadowing').addEventListener('click', () => {
  if (segsEn.length === 0) {
    alert('请先加载素材');
    return;
  }
  
  let text = segsEn.map((seg, idx) => `${idx + 1}. ${seg.text}`).join('\n');
  downloadFile('shadowing.txt', text);
});

// ============================================================================
// Learning Package
// ============================================================================

$('#generateOfflinePackage').addEventListener('click', () => {
  if (segsEn.length === 0) {
    alert('请先加载素材');
    return;
  }
  
  generatedPackage = generateOfflinePackage();
  savePackageToStorage();
  renderPackage();
});

function generateOfflinePackage() {
  const title = currentMaterial ? currentMaterial.title : '未命名素材';
  const fullText = segsEn.map(s => s.text).join(' ');
  
  // Extract key vocabulary (top 30)
  const words = fullText.match(/[A-Za-z']+/g) || [];
  const wordLower = words.map(w => w.toLowerCase());
  const freq = {};
  wordLower.forEach(w => {
    if (w.length >= 4 && !STOPWORDS.has(w)) {
      freq[w] = (freq[w] || 0) + 1;
    }
  });
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const keyVocab = sorted.slice(0, 30).map(([word, count]) => `${word} (x${count})`);
  
  // Key phrases: random sentences
  const keyPhrases = segsEn
    .filter(s => s.text.split(' ').length > 6)
    .sort(() => Math.random() - 0.5)
    .slice(0, 7)
    .map(s => s.text);
  
  // Discussion questions
  const discussionQuestions = [
    'What is the main idea of this material?',
    'Do you agree with the speaker\'s perspective? Why or why not?',
    'What examples or evidence does the speaker provide?',
    'How can you apply this information to your own life?',
    'What questions do you still have after reviewing this material?',
    'What was the most interesting or surprising point?',
    'How does this topic relate to current events or trends?',
    'What would you like to learn more about?'
  ];
  
  // Key takeaways: random sentences
  const keyTakeaways = segsEn
    .sort(() => Math.random() - 0.5)
    .slice(0, 7)
    .map(s => s.text);
  
  // Learning objectives
  const learningObjectives = [
    'Understand the main concepts presented in the material',
    'Identify and use key vocabulary in context',
    'Practice listening comprehension and pronunciation'
  ];
  
  const sections = [
    { id: 'info', title: '视频信息', content: `**标题**: ${title}\n\n**来源**: ${currentMaterial?.videoId || '仅字幕'}` },
    { id: 'vocab', title: '关键词汇 (30)', content: keyVocab.map(v => `- ${v}`).join('\n') },
    { id: 'phrases', title: '关键短语 (7)', content: keyPhrases.map(p => `- ${p}`).join('\n') },
    { id: 'transcript', title: '完整字幕', content: segsEn.map((s, i) => `${i + 1}. ${s.text}`).join('\n\n') },
    { id: 'discussion', title: '讨论问题 (8)', content: discussionQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n\n') },
    { id: 'takeaways', title: '关键要点 (7)', content: keyTakeaways.map((t, i) => `${i + 1}. ${t}`).join('\n\n') },
    { id: 'objectives', title: '学习目标 (3)', content: learningObjectives.map((o, i) => `${i + 1}. ${o}`).join('\n\n') }
  ];
  
  return { title, sections };
}

$('#generateLLMPackage').addEventListener('click', async () => {
  if (segsEn.length === 0) {
    alert('请先加载素材');
    return;
  }
  
  const apiBase = $('#apiBase').value.trim();
  const apiKey = $('#apiKey').value.trim();
  
  if (!apiKey) {
    alert('请先配置 API Key');
    return;
  }
  
  const title = currentMaterial ? currentMaterial.title : '未命名素材';
  const fullText = segsEn.map(s => s.text).join(' ');
  
  // Limit text length for API
  const textSnippet = fullText.slice(0, 4000);
  
  const prompt = `Please create a comprehensive learning package for the following English material titled "${title}". Include the following sections:

1. Video Information (brief summary)
2. Key Vocabulary (30 words with definitions)
3. Key Phrases (7 important phrases)
4. Full Transcript Summary
5. Discussion Questions (8 questions)
6. Key Takeaways (7 main points)
7. Learning Objectives (3 objectives)

Material excerpt:
${textSnippet}

Please format the output in Markdown with clear section headers.`;

  try {
    $('#generateLLMPackage').disabled = true;
    $('#generateLLMPackage').textContent = '生成中...';
    
    const response = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse markdown into sections
    const sections = parseMarkdownSections(content);
    
    generatedPackage = { title, sections };
    savePackageToStorage();
    renderPackage();
    
    addChatMessage('assistant', '学习包生成成功！');
  } catch (error) {
    alert('生成失败: ' + error.message);
    addChatMessage('system', '生成失败: ' + error.message);
  } finally {
    $('#generateLLMPackage').disabled = false;
    $('#generateLLMPackage').textContent = '使用 LLM 生成学习包';
  }
});

function parseMarkdownSections(markdown) {
  const lines = markdown.split('\n');
  const sections = [];
  let currentSection = null;
  
  lines.forEach(line => {
    if (line.match(/^#+\s+(.+)/)) {
      if (currentSection) {
        sections.push(currentSection);
      }
      const title = line.replace(/^#+\s+/, '').trim();
      currentSection = {
        id: `section${sections.length}`,
        title: title,
        content: ''
      };
    } else if (currentSection) {
      currentSection.content += line + '\n';
    }
  });
  
  if (currentSection) {
    sections.push(currentSection);
  }
  
  return sections;
}

function renderPackage() {
  if (!generatedPackage) return;
  
  const sectionsList = $('#packageSections');
  const contentDisplay = $('#packageContent');
  
  sectionsList.innerHTML = '';
  contentDisplay.innerHTML = '';
  
  generatedPackage.sections.forEach((section, idx) => {
    const item = document.createElement('div');
    item.className = 'section-item';
    if (idx === 0) item.classList.add('active');
    item.textContent = section.title;
    item.addEventListener('click', () => {
      $$('.section-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      displayPackageSection(section);
    });
    sectionsList.appendChild(item);
  });
  
  if (generatedPackage.sections.length > 0) {
    displayPackageSection(generatedPackage.sections[0]);
  }
}

function displayPackageSection(section) {
  const contentDisplay = $('#packageContent');
  
  // Simple markdown rendering
  let html = section.content;
  
  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Lists - properly wrap consecutive li elements
  html = html.replace(/^\- (.+)$/gm, '<li>$1</li>');
  // Group consecutive li elements into ul
  html = html.replace(/((?:<li>.*?<\/li>\n?)+)/g, '<ul>$1</ul>');
  
  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Line breaks
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';
  
  contentDisplay.innerHTML = html;
}

$('#exportPackageMD').addEventListener('click', () => {
  if (!generatedPackage) {
    alert('请先生成学习包');
    return;
  }
  
  let markdown = `# ${generatedPackage.title}\n\n`;
  generatedPackage.sections.forEach(section => {
    markdown += `## ${section.title}\n\n${section.content}\n\n`;
  });
  
  downloadFile('learning_package.md', markdown);
});

// ============================================================================
// Chat
// ============================================================================

function addChatMessage(role, content) {
  const msg = { role, content, timestamp: Date.now() };
  chatHistory.push(msg);
  saveChatToStorage();
  
  const chatMessages = $('#chatMessages');
  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-message ${role}`;
  msgDiv.textContent = content;
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

$('#sendChat').addEventListener('click', () => sendChatMessage());
$('#chatInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendChatMessage();
});

async function sendChatMessage() {
  const input = $('#chatInput');
  const text = input.value.trim();
  if (!text) return;
  
  input.value = '';
  addChatMessage('user', text);
  
  const apiBase = $('#apiBase').value.trim();
  const apiKey = $('#apiKey').value.trim();
  
  if (!apiKey) {
    addChatMessage('system', '(离线模式，仅记录)');
    return;
  }
  
  // Build context
  const context = currentMaterial ? `当前学习素材: ${currentMaterial.title}` : '';
  const currentSentence = (curIdx >= 0 && curIdx < segsEn.length) ? segsEn[curIdx].text : '';
  
  const systemPrompt = `You are an English learning assistant. ${context}. Current sentence: ${currentSentence}`;
  
  try {
    const response = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status}`);
    }
    
    const data = await response.json();
    const reply = data.choices[0].message.content;
    addChatMessage('assistant', reply);
  } catch (error) {
    addChatMessage('system', '请求失败: ' + error.message);
  }
}

$('#clearChat').addEventListener('click', () => {
  chatHistory = [];
  saveChatToStorage();
  $('#chatMessages').innerHTML = '';
});

// API status indicator
function updateAPIStatus() {
  const apiKey = $('#apiKey').value.trim();
  const status = $('#apiStatus');
  if (apiKey) {
    status.textContent = '在线模式';
    status.style.color = 'var(--success)';
  } else {
    status.textContent = '离线模式';
    status.style.color = 'var(--fg-muted)';
  }
}

$('#apiKey').addEventListener('input', updateAPIStatus);
$('#apiBase').addEventListener('input', updateAPIStatus);

// ============================================================================
// Material Management
// ============================================================================

$('#addMaterial').addEventListener('click', () => {
  $('#addMaterialModal').classList.add('active');
});

$('#cancelMaterial').addEventListener('click', () => {
  $('#addMaterialModal').classList.remove('active');
  clearMaterialForm();
});

$('#saveMaterial').addEventListener('click', () => {
  const title = $('#materialTitle').value.trim();
  const videoId = $('#materialVideoId').value.trim();
  const enUrl = $('#materialEnUrl').value.trim();
  const zhUrl = $('#materialZhUrl').value.trim();
  
  if (!title || !enUrl) {
    alert('请填写标题和英文字幕 URL');
    return;
  }
  
  const material = {
    id: Date.now().toString(),
    title,
    videoId: videoId || null,
    enUrl,
    zhUrl: zhUrl || null
  };
  
  materials.push(material);
  saveMaterialsToStorage();
  renderMaterialsList();
  
  $('#addMaterialModal').classList.remove('active');
  clearMaterialForm();
  
  addChatMessage('system', `已添加素材: ${title}`);
});

function clearMaterialForm() {
  $('#materialTitle').value = '';
  $('#materialVideoId').value = '';
  $('#materialEnUrl').value = '';
  $('#materialZhUrl').value = '';
}

$('#searchMaterials').addEventListener('input', (e) => {
  renderMaterialsList(e.target.value);
});

// ============================================================================
// Export / Import
// ============================================================================

$('#exportJSON').addEventListener('click', () => {
  const state = {
    materials,
    currentMaterial,
    package: generatedPackage,
    chatHistory
  };
  const json = JSON.stringify(state, null, 2);
  downloadFile('tedboard_state.json', json);
});

$('#importJSON').addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const state = JSON.parse(ev.target.result);
        
        if (state.materials) {
          materials = state.materials;
          saveMaterialsToStorage();
          renderMaterialsList();
        }
        
        if (state.currentMaterial) {
          loadMaterial(state.currentMaterial);
        }
        
        if (state.package) {
          generatedPackage = state.package;
          savePackageToStorage();
          renderPackage();
        }
        
        if (state.chatHistory) {
          chatHistory = state.chatHistory;
          saveChatToStorage();
          $('#chatMessages').innerHTML = '';
          chatHistory.forEach(msg => {
            const msgDiv = document.createElement('div');
            msgDiv.className = `chat-message ${msg.role}`;
            msgDiv.textContent = msg.content;
            $('#chatMessages').appendChild(msgDiv);
          });
        }
        
        alert('导入成功！');
      } catch (error) {
        alert('导入失败: ' + error.message);
      }
    };
    reader.readAsText(file);
  });
  input.click();
});

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================================
// Initialization
// ============================================================================

function init() {
  loadMaterialsFromStorage();
  renderMaterialsList();
  
  const savedCurrent = loadCurrentMaterialFromStorage();
  if (savedCurrent) {
    loadMaterial(savedCurrent);
  }
  
  const savedPackage = loadPackageFromStorage();
  if (savedPackage) {
    generatedPackage = savedPackage;
    renderPackage();
  }
  
  chatHistory = loadChatFromStorage();
  chatHistory.forEach(msg => {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${msg.role}`;
    msgDiv.textContent = msg.content;
    $('#chatMessages').appendChild(msgDiv);
  });
  
  updateAPIStatus();
  
  // Add sample materials if empty
  if (materials.length === 0) {
    materials.push({
      id: '1',
      title: '示例素材 - gN9dlisaQVM',
      videoId: 'gN9dlisaQVM',
      enUrl: '../ted/gN9dlisaQVM/en.srt',
      zhUrl: '../ted/gN9dlisaQVM/zh.srt'
    });
    saveMaterialsToStorage();
    renderMaterialsList();
  }
}

// Start
init();
