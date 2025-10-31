/* 全局变量（与 YouTube IFrame API 交互） */
let YTPlayer, segsEn = [], segsZh = [], curIdx = -1;

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

/* 读取 URL 参数：?videoId=xxx&en=/path/en.srt&zh=/path/zh.srt&title=... */
function getParams() {
  const u = new URL(location.href);
  return {
    videoId: u.searchParams.get('videoId') || 'iG9CE55wbtY', // 默认：Ken Robinson talk（示例）
    en: u.searchParams.get('en') || '../ted/sample/en.srt',
    zh: u.searchParams.get('zh') || '../ted/sample/zh.srt',
    title: u.searchParams.get('title') || '示例演讲（可通过 URL title 参数修改）'
  };
}

/* 解析 SRT */
function parseSRT(srt) {
  const lines = srt.replace(/\r/g, '').split('\n');
  const items = [];
  let i = 0;
  while (i < lines.length) {
    // 跳过序号
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

/* IFrame API 要求的全局回调（加载完 API 后会调用） */
function onYouTubeIframeAPIReady() {
  // 真正初始化在 setup() 里
}

/* 初始化：加载字幕 + 创建播放器 + 挂事件 */
async function setup() {
  const params = getParams();
  $('#title').textContent = 'YouTube 双语字幕播放器 — ' + params.title;

  // 加载字幕
  const [enText, zhText] = await Promise.all([
    fetch(params.en).then(r => r.text()),
    fetch(params.zh).then(r => r.text())
  ]);
  segsEn = parseSRT(enText);
  segsZh = parseSRT(zhText);

  // 时间轴
  const tl = $('#timeline');
  tl.innerHTML = '';
  segsEn.forEach((s, idx) => {
    const zh = segsZh[idx]?.text || '';
    const div = document.createElement('div');
    div.className = 'seg';
    div.dataset.idx = String(idx);
    div.innerHTML = `<div class="muted">${formatTime(s.start)} → ${formatTime(s.end)}</div><div>${s.text}</div><div class="muted">${zh}</div>`;
    div.addEventListener('click', () => seekTo(idx));
    tl.appendChild(div);
  });

  // 创建 YouTube 播放器（与你截图里的 API 用法一致）
  YTPlayer = new YT.Player('player', {
    videoId: params.videoId,
    playerVars: { rel:0, modestbranding:1, playsinline:1, controls:1 },
    events: {
      onReady: () => { tick(); },
      onStateChange: (e) => {
        if (e.data === YT.PlayerState.PAUSED) onPaused();
      }
    }
  });

  // 绑定控制按钮
  $('#prev').addEventListener('click', () => jump(-1));
  $('#next').addEventListener('click', () => jump(+1));
}
window.addEventListener('load', setup);

/* 动画循环：同步字幕 + 句末自动暂停 */
function tick() {
  if (!YTPlayer || typeof YTPlayer.getCurrentTime !== 'function') return requestAnimationFrame(tick);
  const t = YTPlayer.getCurrentTime();
  const i = segsEn.findIndex(s => t >= s.start - 0.05 && t < s.end - 0.02);
  if (i !== -1) setActive(i);

  $('#sub-en').textContent = segsEn[curIdx]?.text || '';
  $('#sub-zh').textContent = segsZh[curIdx]?.text || '';

  // 句末自动暂停
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
  if (curIdx === -1) return;
  const en = segsEn[curIdx]?.text || '';
  const zh = segsZh[curIdx]?.text || '';
  $('#snippet').textContent = `${en}\n${zh ? zh : ''}`;
}
