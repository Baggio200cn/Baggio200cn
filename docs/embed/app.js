let YTPlayer, segsEn = [], segsZh = [], curIdx = -1, gParams, zhGloss = {};
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

function getParams() {
  const u = new URL(location.href);
  const p = {
    videoId: u.searchParams.get('videoId') || 'iG9CE55wbtY',
    en: u.searchParams.get('en') || '../ted/sample/en.srt',
    zh: u.searchParams.get('zh') || '../ted/sample/zh.srt',
    title: u.searchParams.get('title') || '示例演讲',
    zhGloss: u.searchParams.get('zhGloss') || '',
    compact: (u.searchParams.get('compact') || '') === '1'
  };
  // 若未显式提供 zhGloss，尝试从 zh 路径猜测 glossary_zh.json
  if (!p.zhGloss && p.zh) {
    try {
      const url = new URL(p.zh, location.href);
      const guessed = url.pathname.replace(/\/[^\/]+$/, '/glossary_zh.json');
      p.zhGloss = guessed;
    } catch (_) {}
  }
  return p;
}

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
    const start = toSec(m[1],m[2],m[3],m[4]);
    const end   = toSec(m[5],m[6],m[7],m[8]);
    i++;
    const buf = [];
    while (i < lines.length && lines[i].trim() !== '') { buf.push(lines[i]); i++; }
    const text = buf.join(' ').replace(/<[^>]+>/g,'').trim();
    items.push({ start, end, text });
    while (i < lines.length && lines[i].trim() === '') i++;
  }
  return items;
}
function toSec(h,m,s,ms){ return (+h)*3600+(+m)*60+(+s)+(+ms)/1000; }
function formatTime(sec){
  const s = Math.floor(sec % 60).toString().padStart(2,'0');
  const m = Math.floor((sec/60)%60).toString().padStart(2,'0');
  const h = Math.floor(sec/3600).toString().padStart(2,'0');
  return (h!=='00'?h+':':'')+m+':'+s;
}

// 宽松定位：优先“包围区间”，退化为“最后一个 start<=t”
function getIndexAtTime(t) {
  let i = segsEn.findIndex(s => t >= s.start - 0.15 && t <= s.end + 0.35);
  if (i !== -1) return i;
  for (let k = segsEn.length - 1; k >= 0; k--) {
    if (t >= segsEn[k].start - 0.15) return k;
  }
  return -1;
}

// 安全取文本
async function safeFetchText(url) {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return { ok:false, text:'', status:r.status };
    const text = await r.text();
    return { ok:true, text };
  } catch (e) {
    console.warn('fetch failed', url, e);
    return { ok:false, text:'' };
  }
}

// IFrame API 需要该全局函数存在
function onYouTubeIframeAPIReady() {}

async function setup() {
  gParams = getParams();
  $('#title').textContent = 'YouTube 双语字幕播放器 — ' + gParams.title;

  // 紧凑模式：隐藏用法和时间轴
  if (gParams.compact) {
    const usage = $('#usage'); if (usage) usage.style.display = 'none';
    const tlc = $('#timelineCard'); if (tlc) tlc.style.display = 'none';
  }

  // 加载字幕
  const enRes = await safeFetchText(gParams.en);
  if (!enRes.ok || !enRes.text.trim()) {
    const msg = `英文字幕加载失败：${gParams.en}（状态 ${enRes.status ?? '未知'}）。请检查路径或确保文件存在。`;
    console.error(msg);
    $('#snippet').textContent = msg;
    // 没有英文字幕就无法逐句定位，提前返回
    return;
  }
  const zhRes = await safeFetchText(gParams.zh);

  segsEn = parseSRT(enRes.text);
  if (!Array.isArray(segsEn) || segsEn.length === 0) {
    const msg = '英文字幕解析失败，请确认 .srt 格式是否正确。';
    console.error(msg);
    $('#snippet').textContent = msg;
    return;
  }

  segsZh = [];
  if (zhRes.ok && zhRes.text.trim()) {
    segsZh = parseSRT(zhRes.text) || [];
  } else {
    console.warn('中文字幕缺失或加载失败，将仅显示英文。', gParams.zh);
  }

  // 时间轴（非紧凑模式才渲染）
  const tl = $('#timeline');
  if (tl && (!gParams.compact)) {
    tl.innerHTML = '';
    segsEn.forEach((s, idx) => {
      const zh = segsZh[idx]?.text || '';
      const div = document.createElement('div');
      div.className = 'seg';
      div.dataset.idx = String(idx);
      div.innerHTML = `<div class="muted">${formatTime(s.start)} → ${formatTime(s.end)}</div><div>${escapeHtml(s.text)}</div><div class="muted">${escapeHtml(zh)}</div>`;
      div.addEventListener('click', () => seekTo(idx));
      tl.appendChild(div);
    });
  }

  // 可选中文注释
  try {
    if (gParams.zhGloss) {
      const res = await safeFetchText(gParams.zhGloss);
      if (res.ok) zhGloss = JSON.parse(res.text);
    }
  } catch (e) { console.warn('加载中文注释失败', e); }

  // 播放器
  YTPlayer = new YT.Player('player', {
    videoId: gParams.videoId,
    playerVars: { rel:0, modestbranding:1, playsinline:1, controls:1 },
    events: {
      onReady: () => { tick(); },
      onStateChange: (e) => { if (e.data === YT.PlayerState.PAUSED) onPaused(); }
    }
  });

  // 控件
  $('#prev').addEventListener('click', () => jump(-1));
  $('#next').addEventListener('click', () => jump(+1));
  $('#speak').addEventListener('click', speakCurrent);
  $('#clearChat').addEventListener('click', () => { $('#chat').innerHTML=''; $('#snippet').textContent=''; });

  $('#extractVocab').addEventListener('click', extractVocabFromCurrent);

  updateTestLink('');
}
window.addEventListener('load', setup);

function tick() {
  if (!YTPlayer || typeof YTPlayer.getCurrentTime !== 'function') return requestAnimationFrame(tick);
  const t = YTPlayer.getCurrentTime();
  const i = getIndexAtTime(t);
  if (i !== -1) setActive(i);

  $('#sub-en').textContent = segsEn[curIdx]?.text || '';
  $('#sub-zh').textContent = segsZh[curIdx]?.text || '';

  if ($('#autoPause').checked && curIdx !== -1) {
    const end = segsEn[curIdx].end;
    if (t >= end - 0.02 && YTPlayer.getPlayerState() === YT.PlayerState.PLAYING) {
      YTPlayer.pauseVideo();
    }
  }
  requestAnimationFrame(tick);
}

function setActive(i) {
  if (i === curIdx) return;
  curIdx = i;
  $$('.seg').forEach(el => el.classList.toggle('active', +el.dataset.idx === i));
  if ($('#autoscroll').checked) {
    const el = document.querySelector(`.seg[data-idx="${i}"]`);
    if (el) el.scrollIntoView({ block:'nearest', behavior:'smooth' });
  }
  updateTestLink(segsEn[curIdx]?.text || '');
}

function seekTo(i) {
  if (i < 0 || i >= segsEn.length) return;
  setActive(i);
  YTPlayer.seekTo(segsEn[i].start + 0.01, true);
  YTPlayer.playVideo();
}
function jump(delta) {
  const i = Math.min(Math.max((curIdx === -1 ? 0 : curIdx) + delta, 0), segsEn.length-1);
  seekTo(i);
}

function onPaused() {
  // 暂停瞬间再强定位一次，确保 curIdx 有效
  const t = YTPlayer?.getCurrentTime?.() || 0;
  const i = getIndexAtTime(t);
  if (i !== -1) setActive(i);

  if (curIdx === -1) {
    console.warn('暂停时未能定位到字幕片段，t=', t);
    return;
  }
  const en = segsEn[curIdx]?.text || '';
  const zh = segsZh[curIdx]?.text || '';
  addMsg('user', en + (zh ? `\n${zh}` : ''));
  $('#snippet').textContent = `${en}\n${zh ? zh : ''}`;
  updateTestLink(en);
}

/* 对话框与朗读 */
function addMsg(role, text) {
  const box = $('#chat');
  const div = document.createElement('div');
  div.className = 'msg';
  div.innerHTML = `<span class="role">${role === 'user' ? '你' : 'Bot'}：</span><span>${escapeHtml(text).replace(/\n/g,'<br>')}</span>`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}
function speak(text) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    // 尝试选择英语语音，失败则用默认
    const voices = speechSynthesis.getVoices();
    const v = voices.find(x => /en/i.test(x.lang)) || voices[0];
    if (v) u.voice = v;
    u.lang = (v?.lang) || 'en-US';
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch (e) { console.warn('speech synthesis error', e); }
}
function speakCurrent() {
  const en = segsEn[curIdx]?.text || '';
  if (en) speak(en);
}

/* 生词提取与注释 */
function tokenizeEN(s){ return (s.match(/[A-Za-z']+/g) || []).map(w=>w.toLowerCase()); }
function pickKeywords(s) {
  const stop = new Set(['the','be','to','of','and','a','in','that','have','i','it','for','not','on','with','he','as','you','do','at','this','but','his','by','from','they','we','say','her','she','or','an','will','my','one','all','would','there','their','what','so','up','out','if','about','who','get','which','go','me','when','make','can','like','no','just','him','know','take','into','your','good','some','could','them','see','other','than','then','now','look','only','come','its','over','think','also','back','after','use','two','how','our','work','first','well','way','even','new','want','because','any','these','give','day','most','us']);
  const words = tokenizeEN(s).filter(w => w.length >= 5 && !stop.has(w));
  const uniq = Array.from(new Set(words));
  return uniq.slice(0, 12);
}
async function fetchEnDef(word) {
  try {
    const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    const def = j?.[0]?.meanings?.[0]?.definitions?.[0]?.definition || '';
    const pos = j?.[0]?.meanings?.[0]?.partOfSpeech || '';
    return { def, pos };
  } catch { return null; }
}
function getZhGloss(word) {
  const w = word.toLowerCase();
  return zhGloss?.[w] || zhGloss?.[word] || '';
}
async function extractVocabFromCurrent() {
  const en = segsEn[curIdx]?.text || '';
  if (!en) return;
  const keys = pickKeywords(en);
  const list = $('#vocabList');
  list.innerHTML = '<div class="muted">正在提取与加载释义…</div>';
  const rows = [];
  for (const w of keys) {
    const info = await fetchEnDef(w);
    const zh = getZhGloss(w);
    rows.push({ w, info, zh });
  }
  list.innerHTML = '';
  if (rows.length === 0) {
    list.innerHTML = '<div class="muted">本句未找到合适的候选生词。</div>';
    return;
  }
  for (const r of rows) {
    const div = document.createElement('div');
    div.className = 'vocab-item';
    const pos = r.info?.pos ? `<span class="badge">${escapeHtml(r.info.pos)}</span>` : '';
    const enDef = r.info?.def ? `<div class="muted">${escapeHtml(r.info.def)}</div>` : '';
    const zh = r.zh ? `<div>中文：${escapeHtml(r.zh)}</div>` : `<div class="muted">中文注释：未提供</div>`;
    div.innerHTML = `<div><strong>${escapeHtml(r.w)}</strong>${pos}</div>${enDef}${zh}`;
    list.appendChild(div);
  }
}

/* 跳转到在线测试（把当前英文句子带过去并自动出题） */
function updateTestLink(text) {
  const btn = $('#toTest');
  if (!btn) return;
  const q = new URLSearchParams({
    autogen: '1',
    text,
    title: gParams?.title || ''
  });
  btn.href = `../test/?${q.toString()}`;
}

/* 工具 */
function escapeHtml(s){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
