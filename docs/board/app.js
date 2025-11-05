/* ========================================================================
   TED 英语私教 Board — app.js（段落采集 + 覆盖写入 + 一键送往测试）
   - 暂停时采集“刚播放过的段落”（仅向过去聚合，防止串到下一句）
   - 滚动字幕去重：合并时移除相邻片段重复的前后缀词组
   - 覆盖写入：每次暂停覆盖上一条“片段消息”，而不是追加
   - Alt+T 一键把当前片段（段落）跳到 /test/?autogen=1&text=... 自动出题
   - 切换素材时销毁旧 YT 播放器；仍保留 DeepSeek/OpenAI 兼容、练习/学习包等
   ======================================================================== */

/* ======= 小工具 / 存储 ======= */
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const STOP = new Set("the be to of and a in that have i it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like no just him know take into your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us".split(" "));
const CONNECTORS = new Set(["and","or","but","so","for","to","of","in","on","at","from","that","which","who","whom","than","as","if","then","when","while","because","although","though","until","before","after","since","with","without","about","around","across","over","under","into","onto","off","by","near","through","between","among","per","via","like"]);

const Store = {
  key: "ted-board-v1",
  data: { talks: [], current: "", pkg: {} },
  load(){ try{ const raw=localStorage.getItem(this.key); if(raw) this.data=JSON.parse(raw); }catch{} },
  save(){ localStorage.setItem(this.key, JSON.stringify(this.data)); },
  up(fn){ fn(this.data); this.save(); renderTalkList(); },
};

const Files = {
  key: "ted-board-files",
  data: {},
  load(){ try{ const raw=localStorage.getItem(this.key); if(raw) this.data=JSON.parse(raw); }catch{} },
  save(){ localStorage.setItem(this.key, JSON.stringify(this.data)); },
  put(text, type){ const id = Math.random().toString(36).slice(2,9); this.data[id] = { type, text }; this.save(); return id; },
  get(id){ return this.data[id]; }
};

function uid(){ return Math.random().toString(36).slice(2,9); }
function escapeHtml(s){ return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }
function escapeReg(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"); }
function sample(a,n){ const x=a.slice(); const r=[]; while(r.length<Math.min(n,x.length)){ const i=Math.floor(Math.random()*x.length); r.push(x.splice(i,1)[0]); } return r; }
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

/* ======= YT IFrame API 等待器 ======= */
let YTReadyPromise = null;
function ensureYTReady() {
  if (window.YT && window.YT.Player) return Promise.resolve(true);
  if (!YTReadyPromise) {
    YTReadyPromise = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function(){ try{ prev && prev(); }catch{} resolve(true); };
      let tries=0; const timer=setInterval(()=>{ 
        if (window.YT && window.YT.Player){ clearInterval(timer); resolve(true); }
        else if(++tries>80){ clearInterval(timer); resolve(false); }
      },100);
    });
  }
  return YTReadyPromise;
}
function onYouTubeIframeAPIReady(){}

/* ======= 素材列表 ======= */
function addTalk({title, videoId="", enUrl="", zhUrl=""}) {
  const id=uid();
  Store.up(s=>s.talks.unshift({id, title, videoId, enUrl, zhUrl, addedAt:Date.now()}));
  selectTalk(id);
}
function selectTalk(id){ Store.up(s=>s.current=id); loadTalk(); }
function shortUrl(u=""){ try{ const url=new URL(u, location.href); return (url.hostname||"")+url.pathname; }catch{ return u; } }
function renderTalkList(){
  const box=$("#talkList"); const q=($("#q").value||"").toLowerCase().trim();
  const list=Store.data.talks.filter(t=>!q||(t.title||"").toLowerCase().includes(q));
  box.innerHTML = list.length? list.map(t=>{
    const active = t.id===Store.data.current? "item active":"item";
    return `<div class="${active}" data-id="${t.id}">
      <div class="title">${escapeHtml(t.title||"未命名")}</div>
      <div class="muted small">${t.videoId?`YT:${t.videoId} · `:""}${shortUrl(t.enUrl)} ${t.zhUrl?"· zh":""}</div>
    </div>`;
  }).join("") : `<div class="muted small">暂无素材。点击“添加素材”。</div>`;
  // 事件委托，避免重渲染后监听器丢失
  box.onclick = (e)=>{ const it=e.target.closest(".item"); if(it?.dataset.id) selectTalk(it.dataset.id); };
}

/* ======= 加载/解析/合并字幕 ======= */
async function fetchText(u){
  if (!u) return "";
  if (u.startsWith("local:")){
    const m = u.match(/^local:([a-z0-9]+)(?::(srt|txt|vtt))?$/i);
    const id = m?.[1]; const rec = id && Files.get(id);
    return rec?.text || "";
  }
  try{ const r=await fetch(u, {cache:"no-store"}); if(!r.ok) return ""; return await r.text(); }catch{ return ""; }
}
function parseSRT(srt){
  srt=(srt||"").replace(/\r/g,""); const lines=srt.split("\n"); const out=[]; let i=0;
  while(i<lines.length){ while(i<lines.length && !/^\d+$/.test(lines[i].trim())) i++; i++; if(i>=lines.length) break;
    const m=lines[i].match(/(\d+):(\d+):(\d+),(\d+)\s*-->\s*(\d+):(\d+):(\d+),(\d+)/); if(!m){ i++; continue; }
    const start=toSec(m[1],m[2],m[3],m[4]), end=toSec(m[5],m[6],m[7],m[8]); i++; const buf=[];
    while(i<lines.length && lines[i].trim()!==""){ buf.push(lines[i]); i++; }
    out.push({start,end,text:buf.join(" ").replace(/<[^>]+>/g,"").trim()});
    while(i<lines.length && lines[i].trim()==="") i++;
  }
  return out;
}
function parsePlain(text){
  const lines=(text||"").split(/\n+/).map(s=>s.trim()).filter(Boolean);
  let t=0; return lines.map(s=>{ const start=t, end=t+3; t=end; return {start,end,text:s}; });
}
function toSec(h,m,s,ms){ return (+h)*3600+(+m)*60+(+s)+(+ms)/1000; }
function fmt(sec){ const s=Math.floor(sec%60).toString().padStart(2,"0"), m=Math.floor((sec/60)%60).toString().padStart(2,"0"), h=Math.floor(sec/3600).toString().padStart(2,"0"); return (h!=="00"?h+":":"")+m+":"+s; }

/* —— 滚动字幕去重（最长后缀/前缀词重叠） —— */
function toTokens(text){
  return (text||"").toLowerCase().replace(/[^a-z0-9' ]+/g," ")
    .replace(/\s+/g," ").trim().split(" ").filter(Boolean);
}
function joinDedupe(prev, next){
  const A = toTokens(prev), B = toTokens(next);
  const maxK = Math.min(12, A.length, B.length);
  for(let k=maxK;k>=2;k--){ // 至少重叠2词才算滚动重复
    let ok=true; for(let i=0;i<k;i++){ if(A[A.length-k+i]!==B[i]){ ok=false; break; } }
    if(ok){ const bRest=B.slice(k).join(" "); return (prev+" "+bRest).replace(/\s+/g," ").trim(); }
  }
  // 轻量字符重叠兜底（<=20字符）
  const aTail = prev.slice(-20).toLowerCase().replace(/\s+/g," ").trim();
  const bHead = next.slice(0,20).toLowerCase().replace(/\s+/g," ").trim();
  if (aTail && bHead && aTail===bHead){ return (prev + next.slice(20)).replace(/\s+/g," ").trim(); }
  return (prev + " " + next).replace(/\s+/g," ").trim();
}

/* —— 时间→索引（超末尾取最近上一句） —— */
function getIndexAtTime(t,segs){
  if(!segs || !segs.length) return -1;
  let i=segs.findIndex(s=>t>=s.start-0.12 && t<=s.end+0.20);
  if(i!==-1) return i;
  for(let k=segs.length-1;k>=0;k--) if(t>=segs[k].start-0.12) return k;
  return -1;
}

/* —— “仅向过去”聚合成段落（不跨到将来） —— */
function buildPastParagraphAtTime(t){
  const endPunc=/[.?!。”’'")、…]$/;
  const i=getIndexAtTime(t,segsEn);
  if (i===-1) return {en:"",zh:"",from:-1,to:-1,start:0,end:0};

  let from=i, to=i;
  let acc = (segsEn[i]?.text||"").trim();
  let startTime=segsEn[i].start, endTime=segsEn[i].end;

  const MAX_CHARS=240, MAX_SECS=9.0, MAX_SEGS=6;

  let mergedCount=0;
  for(let j=i-1; j>=0 && mergedCount<MAX_SEGS; j--){
    const prev = segsEn[j];
    const gap = startTime - prev.end;
    const prevEndsPunc = endPunc.test((prev.text||"").trim());

    // 到达明显句边界或超出窗口就停
    if ((prevEndsPunc && gap>0.45) || (endTime - prev.start > MAX_SECS)) break;

    // 去重后尝试拼接
    const merged = joinDedupe(prev.text||"", acc);
    if (merged.length > MAX_CHARS && mergedCount>=1) break;

    acc = merged;
    startTime = Math.min(startTime, prev.start);
    from = j;
    mergedCount++;

    // 若前一段是句末且很贴近，则到此为止（保守不再继续向前）
    if (prevEndsPunc && gap<=0.45) break;
  }

  const zh = segsZh.length ? segsZh.slice(from,to+1).map(s=>s.text).join(" ").replace(/\s+/g," ").trim() : "";
  return {en:acc, zh, from, to, start:startTime, end:endTime};
}

/* ======= 播放/联动 ======= */
let YTPlayer=null, segsEn=[], segsZh=[], curIdx=-1;
let isAutoPausing=false, autoPausePref=false;
let lastClipMsgEl=null; // 覆盖写入：保存上一条暂停采集的消息 DOM
let lastCapturedKey="";  // 防误判重复

async function loadTalk(){
  const talk=Store.data.talks.find(t=>t.id===Store.data.current); if(!talk) return;

  // 销毁旧播放器，避免切换素材失败
  try{ if (YTPlayer && typeof YTPlayer.destroy==="function"){ YTPlayer.destroy(); } }catch{} YTPlayer=null;

  // 重置
  $("#timeline").innerHTML=""; $("#snippet").textContent=""; $("#sub-en").textContent=$("#sub-zh").textContent="";
  segsEn=[]; segsZh=[]; curIdx=-1; lastClipMsgEl=null; lastCapturedKey="";

  // 解析英文/中文
  const enRaw=await fetchText(talk.enUrl);
  const zhRaw=await fetchText(talk.zhUrl);
  const enSegsRaw = (/\.(srt|vtt)(\?|#|$)/i.test(talk.enUrl) || talk.enUrl.startsWith("local:")) ? parseSRT(enRaw) : parsePlain(enRaw||"");
  const zhSegsRaw = (zhRaw && ((/\.(srt|vtt)(\?|#|$)/i.test(talk.zhUrl)) || talk.zhUrl?.startsWith("local:"))) ? parseSRT(zhRaw) : [];

  // 更保守的合并：这里保留你之前的策略（如需严格“句级”可进一步调小阈值）
  segsEn = mergeSegments(enSegsRaw||[]);
  segsZh = mergeZhByEn(segsEn, zhSegsRaw||[]);

  // 时间轴渲染 + 事件委托
  const tl=$("#timeline");
  if (segsEn.length){
    tl.innerHTML = segsEn.map((s,i)=>`<div class="seg" data-i="${i}">
      <div class="muted small">${fmt(s.start)} → ${fmt(s.end)}</div>
      <div>${escapeHtml(s.text)}</div>
      <div class="muted small">${escapeHtml(segsZh[i]?.text||"")}</div></div>`).join("");
  }else{
    tl.innerHTML = `<div class="muted small">未能加载英文内容（请检查 URL 或改用“上传文件”）。</div>`;
  }
  tl.onclick = (e)=>{ const seg=e.target.closest(".seg"); if(seg) seekTo(+seg.dataset.i); };

  // 播放器
  const box=$("#ytPlayer"); box.innerHTML="";
  if (talk.videoId){
    const ok = await ensureYTReady();
    if (!ok) {
      box.innerHTML = `<div class="muted small" style="padding:8px">YouTube 播放器未就绪（网络/API被拦截）。时间轴等功能仍可使用。</div>`;
    } else {
      try {
        YTPlayer = new YT.Player("ytPlayer", {
          videoId: talk.videoId,
          playerVars: { rel:0, modestbranding:1, playsinline:1, controls:1, autoplay:1 },
          events: { 
            onReady:()=>{ tick(); try{ YTPlayer.mute(); YTPlayer.playVideo(); }catch{} },
            onStateChange:(e)=>{ if (e.data===YT.PlayerState.PAUSED) onPaused(); } 
          }
        });
      } catch (e) {
        console.warn("Create YT.Player failed:", e);
        box.innerHTML = `<div class="muted small" style="padding:8px">创建播放器失败：${escapeHtml(String(e.message||e))}</div>`;
      }
    }
  } else {
    box.innerHTML = `<div class="muted small" style="padding:8px">未提供视频ID。你仍可用“时间轴/练习/学习包”。</div>`;
  }

  // 在“当前片段”区域注入一个“送往测试”按钮（若结构允许）
  try{
    if (!$("#btnToTest")){
      const btn=document.createElement("button");
      btn.id="btnToTest"; btn.textContent="送往测试"; btn.className="btn small";
      btn.style.margin="6px 0";
      const host=$("#snippet")?.parentElement;
      host?.appendChild(btn);
      btn.addEventListener("click", ()=> {
        const txt=($("#snippet").textContent||"").trim();
        if(!txt) return alert("暂无当前片段可发送");
        window.open(buildTestUrl(txt), "_blank");
      });
    }
  }catch{}

  $("#pkgList").innerHTML=""; $("#pkgContent").innerHTML="";
}

/* —— 合并（用于时间轴显示）/中文对齐：沿用上一版 —— */
function mergeSegments(segs){
  const merged=[]; const endPunc=/[.?!。”’'")、…]$/;
  let buf=null;
  for(const s of (segs||[])){
    const text = (s.text||"").replace(/\s+/g," ").trim(); if(!text) continue;
    if(!buf){ buf={start:s.start,end:s.end,text:text}; continue; }
    const gap = s.start - buf.end;
    const nextFirst = (text.split(/\s+/)[0]||"").toLowerCase();
    const hardJoin = gap<=0.30;
    const noPuncJoin = !endPunc.test(buf.text.trim()) && gap<=0.90;
    const connectorJoin = CONNECTORS.has(nextFirst) && gap<=1.10;

    // 若上一段已句末，只有检测到滚动重复时才合
    let rollingOverlapOK = false;
    if (endPunc.test(buf.text.trim())){
      const A=toTokens(buf.text), B=toTokens(text);
      const maxK = Math.min(12, A.length, B.length);
      for(let k=maxK;k>=2;k--){
        let ok=true; for(let i=0;i<k;i++){ if(A[A.length-k+i]!==B[i]){ ok=false; break; } }
        if(ok){ rollingOverlapOK=true; break; }
      }
    }
    const shouldJoin = hardJoin || noPuncJoin || connectorJoin || rollingOverlapOK;
    const tooLongChars = (buf.text.length + 1 + text.length) > 140;
    const tooLongSecs  = (s.end - buf.start) > 7.5;

    if(shouldJoin && !tooLongChars && !tooLongSecs){
      buf.end = Math.max(buf.end, s.end);
      buf.text = joinDedupe(buf.text, text);
    }else{
      merged.push(buf); buf={start:s.start,end:s.end,text:text};
    }
  }
  if(buf) merged.push(buf);
  return merged;
}
function mergeZhByEn(enMerged, zhSegs){
  if(!zhSegs?.length) return enMerged.map(x=>({start:x.start,end:x.end,text:""}));
  const out=[]; let j=0;
  for(const en of enMerged){
    const texts=[];
    while(j<zhSegs.length && zhSegs[j].end<=en.end+0.15){
      if(zhSegs[j].start>=en.start-0.15) texts.push(zhSegs[j].text);
      j++;
    }
    out.push({start:en.start,end:en.end,text:texts.join(" ").replace(/\s+/g," ").trim()});
  }
  return out;
}

function tick(){
  if (!YTPlayer || typeof YTPlayer.getCurrentTime!=="function") return requestAnimationFrame(tick);
  const t=YTPlayer.getCurrentTime(); const i=getIndexAtTime(t, segsEn); if (i!==-1) setActive(i);
  $("#sub-en").textContent = segsEn[curIdx]?.text || ""; $("#sub-zh").textContent = segsZh[curIdx]?.text || "";

  if (autoPausePref && curIdx!==-1){
    const end=segsEn[curIdx].end;
    if (t>=end-0.02 && YTPlayer.getPlayerState()===YT.PlayerState.PLAYING){
      isAutoPausing = true; try { YTPlayer.pauseVideo(); } catch {}
    }
  }
  requestAnimationFrame(tick);
}

/* —— 覆盖写入：暂停时按“过去段落”覆盖上一条 —— */
function onPaused(){
  if (isAutoPausing) { isAutoPausing = false; return; }

  let t = 0;
  if (YTPlayer?.getCurrentTime){
    t = YTPlayer.getCurrentTime();
    let i=getIndexAtTime(t, segsEn);
    if (i!==-1) setActive(i);
    if (i===-1 && segsEn.length) setActive(segsEn.length-1);
  }
  // 构造“刚播放过的段落”
  const clip = buildPastParagraphAtTime(t);
  if (!clip.en) return;

  // 生成唯一 key，避免同一时刻的重复写入
  const key = `${clip.from}-${clip.to}-${Math.round(clip.start*100)}`;
  if (key === lastCapturedKey) return;
  lastCapturedKey = key;

  // 覆盖“当前片段”与右侧聊天的上一条
  const text = clip.en + (clip.zh?`\n${clip.zh}`:"");
  $("#snippet").textContent = text;
  chatSetClip(text);
}

/* —— 聊天：覆盖上一条“暂停采集”消息 —— */
function chatSetClip(text){
  const box=$("#chatBox");
  if (lastClipMsgEl && box.contains(lastClipMsgEl)){
    lastClipMsgEl.querySelector(".bubble").innerHTML = escapeHtml(text).replace(/\n/g,"<br>");
  }else{
    const el=document.createElement("div");
    el.className="msg user"; el.dataset.kind="clip";
    el.innerHTML=`<div class="role">你</div><div class="bubble">${escapeHtml(text).replace(/\n/g,"<br>")}</div>`;
    box.appendChild(el); box.scrollTop=box.scrollHeight;
    lastClipMsgEl = el;
  }
}

/* —— 其它辅助： setActive/seekTo —— */
function setActive(i){
  if (i===curIdx) return; curIdx=i;
  $$("#timeline .seg").forEach(el=>el.classList.toggle("active", +el.dataset.i===i));
  if ($("#autoScroll").checked){ const el=document.querySelector(`#timeline .seg[data-i="${i}"]`); el?.scrollIntoView({block:"nearest", behavior:"smooth"}); }
}
function seekTo(i){
  if (i<0||i>=segsEn.length) return; setActive(i);
  if (YTPlayer?.seekTo){ YTPlayer.seekTo(segsEn[i].start+0.01, true); YTPlayer.playVideo(); }
}

/* ======= 练习（保持不变） ======= */
function transcriptText(){ return segsEn.map(x=>x.text).join(" "); }
function buildVocab(text, n=40){
  const tokens=(text.match(/[A-Za-z']+/g)||[]).map(w=>w.toLowerCase());
  const freq=new Map(); tokens.forEach(w=>{ if(w.length>=4 && !STOP.has(w)) freq.set(w,(freq.get(w)||0)+1); });
  return Array.from(freq.entries()).sort((a,b)=>b[1]-a[1]).slice(0,n).map(([w,c],i)=>({i:i+1,w,c}));
}
function makeCloze(text, nQ=10, k=4){
  const words=(text.match(/[A-Za-z']+/g)||[]).map(w=>w.toLowerCase());
  const candidates=Array.from(new Set(words)).filter(w=>w.length>=5 && !STOP.has(w));
  if (!candidates.length) return {quiz:[], preview:text};
  const targets=sample(candidates, Math.min(nQ, candidates.length));
  let preview=text; targets.forEach((w,i)=>{ const rx=new RegExp(`\\b${escapeReg(w)}\\b`,"i"); preview=preview.replace(rx,`____(${i+1})____`); });
  const quiz=targets.map((ans,i)=>({ id:`q${i+1}`, stem:`(${i+1}) 选择正确单词填空`, answer:ans, options:shuffle([ans, ...sample(candidates.filter(x=>x!==ans), k-1)]) }));
  return {quiz, preview};
}
function renderCloze({quiz, preview}){
  $("#clozePreview").classList.toggle("hide", !preview); $("#clozePreview").textContent=preview||"";
  const box=$("#clozeQuiz"); box.innerHTML="";
  quiz.forEach(q=>{
    const div=document.createElement("div"); div.className="q"; div.id=q.id; div.dataset.answer=q.answer;
    const list=document.createElement("div"); list.className="choices";
    div.innerHTML = `<h4>${escapeHtml(q.stem)}</h4>`;
    q.options.forEach((opt,j)=>{ const id=`${q.id}_o${j+1}`; const label=document.createElement("label");
      label.setAttribute("for",id); label.dataset.val=opt; label.innerHTML=`<input type="radio" name="${q.id}" id="${id}" value="${escapeHtml(opt)}"> ${escapeHtml(opt)}`; list.appendChild(label); });
    div.appendChild(list); box.appendChild(div);
  });
}

/* ======= 学习包（离线/LLM） ======= */
function pkgTemplateLocal({title, text, level}){
  const vocab = buildVocab(text, 30).map(x=>x.w);
  const phrases = sample(vocab.filter(w=>!w.includes("'") && w.length>=6), 7);
  const sents = (text.match(/[^.!?]+[.!?]/g)||[]).map(s=>s.trim()).filter(s=>s.split(" ").length>=6);
  const keyPoints = sample(sents, 7);
  const qs = sample(sents, 8).map((s,i)=>`${i+1}. ${s.replace(/[.?!]$/,"?")}`);
  const obj = [
    "能够复述演讲主旨与三条支撑点",
    "掌握 10 个核心词汇并用其造句",
    "完成 10 题听力填空并达到 80% 正确率"
  ];
  return {
    meta: { title, level, mode:"local" },
    sections: [
      { key:"video_info", name:"Video Information", content:`Title: ${title}\nSpeaker: (填写演讲者)\nDuration: (可选)\nLink: (可填原视频链接)` },
      { key:"key_vocab", name:"Key Vocabulary", content: vocab.map((w,i)=>`${i+1}. ${w}`).join("\n") },
      { key:"key_phrases", name:"Key Phrases & Expressions", content: phrases.map((p,i)=>`${i+1}. ${p}`).join("\n") },
      { key:"full_transcript", name:"Full Transcript", content: text },
      { key:"discussion", name:"Discussion Questions", content: qs.join("\n") },
      { key:"takeaways", name:"Key Takeaways", content: keyPoints.map((k,i)=>`${i+1}. ${k}`).join("\n") },
      { key:"objectives", name:"Learning Objectives", content: obj.map((k,i)=>`${i+1}. ${k}`).join("\n") },
    ]
  };
}

/* ======= 右侧助手（OpenAI/DeepSeek/OpenRouter） ======= */
function pickDefaultModel(base){
  const b=(base||"").toLowerCase();
  if (b.includes("deepseek.com")) return "deepseek-chat";
  if (b.includes("openrouter.ai")) return "openai/gpt-4o-mini";
  return "gpt-4o-mini";
}
function getAIConfig(){
  const base = ($("#aiBase").value || "").trim();
  const key  = ($("#aiKey").value  || "").trim();
  const savedModel = localStorage.getItem("ai_model") || "";
  const model = savedModel || pickDefaultModel(base);
  return { base, key, model };
}
function chatAdd(role, text){
  const box=$("#chatBox"); const div=document.createElement("div"); div.className="msg "+role;
  div.innerHTML=`<div class="role">${role==="user"?"你":"助手"}</div><div class="bubble">${escapeHtml(text).replace(/\n/g,"<br>")}</div>`;
  box.appendChild(div); box.scrollTop=box.scrollHeight;
}
async function chatSend(){
  let t=$("#chatInput").value.trim(); if(!t) return;
  if (t.toLowerCase().startsWith("/model ")){ const m=t.slice(7).trim(); if(m){ localStorage.setItem("ai_model", m); chatAdd("assistant", `模型已切换为：${m}`); } $("#chatInput").value=""; return; }
  $("#chatInput").value=""; chatAdd("user", t);
  const {base,key,model} = getAIConfig();
  if (!key || !base){ chatAdd("assistant","离线模式：未配置 API Base/Key。"); return; }
  try{
    const context = `Context title: ${currentTalk()?.title||""}. Current sentence: ${($("#snippet").textContent||"").slice(0,200)}`;
    const r = await fetch(base.replace(/\/+$/,"")+"/chat/completions",{
      method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${key}`},
      body:JSON.stringify({ model, messages:[{role:"user", content: `${context}\n\nUser: ${t}`}] })
    });
    const j=await r.json();
    const msg = j?.choices?.[0]?.message?.content || j?.error?.message || JSON.stringify(j).slice(0,1200);
    chatAdd("assistant", msg);
  }catch(e){ chatAdd("assistant","调用失败："+(e?.message||"请检查 API 配置或网络。")); }
}

/* ======= 中文对齐/合并（从上一版复用） ======= */
function mergeZhByEn(enMerged, zhSegs){
  if(!zhSegs?.length) return enMerged.map(x=>({start:x.start,end:x.end,text:""}));
  const out=[]; let j=0;
  for(const en of enMerged){
    const texts=[];
    while(j<zhSegs.length && zhSegs[j].end<=en.end+0.15){
      if(zhSegs[j].start>=en.start-0.15) texts.push(zhSegs[j].text);
      j++;
    }
    out.push({start:en.start,end:en.end,text:texts.join(" ").replace(/\s+/g," ").trim()});
  }
  return out;
}

/* ======= 跳转测试 ======= */
function buildTestUrl(text){
  // /board/ → /test/（适配 GitHub Pages 的二级路径）
  let base = location.origin + location.pathname;
  base = base.replace(/\/board\/?$/, "/test/");
  if (!/\/test\/?$/.test(base)) base = location.origin + "/test/";
  return `${base}?autogen=1&text=${encodeURIComponent(text)}`;
}
// Alt+T 快捷键：把当前片段直接带到测试页
document.addEventListener("keydown",(e)=>{
  if (e.altKey && (e.key==="t" || e.key==="T")){
    const txt=($("#snippet").textContent||"").trim();
    if(!txt) return;
    window.open(buildTestUrl(txt), "_blank");
  }
});

/* ======= “添加素材”对话框 / 偏好 / 其它 ======= */
function setHint(el, text, ok){
  el.textContent = text || "";
  el.classList.toggle("ok", !!ok);
  el.classList.toggle("err", text && !ok);
}
async function testUrl(u, el){
  if(!u){ setHint(el, "未填写", false); return; }
  const t = await fetchText(u);
  if(!t){ setHint(el, "无法读取（404/CORS/网络）", false); return; }
  if(/\.(srt|vtt)(\?|#|$)/i.test(u) || u.startsWith("local:")) setHint(el, "可用字幕", true);
  else setHint(el, "已读取文本（非srt，将按纯文本处理）", true);
}
function bindDialog(){
  $("#btnAdd")?.addEventListener("click",()=>$("#dlgTalk").showModal());
  $("#btnPickEn")?.addEventListener("click",()=>$("#fEnFile").click());
  $("#btnPickZh")?.addEventListener("click",()=>$("#fZhFile").click());
  $("#fEnFile")?.addEventListener("change", async (e)=>{
    const f=e.target.files?.[0]; if(!f) return;
    const text = await f.text(); const ext = (f.name.split(".").pop()||"txt").toLowerCase();
    const id = Files.put(text, ext==="srt"?"srt":(ext==="vtt"?"vtt":"txt"));
    $("#fEn").value = `local:${id}:${ext}`;
    setHint($("#enStatus"), `本地文件：${f.name}`, true);
    e.target.value="";
  });
  $("#fZhFile")?.addEventListener("change", async (e)=>{
    const f=e.target.files?.[0]; if(!f) return;
    const text = await f.text(); const ext = (f.name.split(".").pop()||"srt").toLowerCase();
    const id = Files.put(text, ext==="srt"?"srt":(ext==="vtt"?"vtt":"txt"));
    $("#fZh").value = `local:${id}:${ext}`;
    setHint($("#zhStatus"), `本地文件：${f.name}`, true);
    e.target.value="";
  });
  $("#btnTestEn")?.addEventListener("click",()=>testUrl($("#fEn").value.trim(), $("#enStatus")));
  $("#btnTestZh")?.addEventListener("click",()=>testUrl($("#fZh").value.trim(), $("#zhStatus")));
  $("#btnFillSample")?.addEventListener("click", ()=>{
    $("#fTitle").value = "外链测试素材（raw.githubusercontent.com）";
    $("#fVid").value = "gN9dlisaQVM";
    $("#fEn").value = "https://raw.githubusercontent.com/Baggio200cn/Baggio200cn/main/docs/ted/sample/en.srt";
    $("#fZh").value = "https://raw.githubusercontent.com/Baggio200cn/Baggio200cn/main/docs/ted/sample/zh.srt";
    setHint($("#enStatus"), "示例外链", true);
    setHint($("#zhStatus"), "示例外链", true);
  });
  $("#btnSaveTalk")?.addEventListener("click",(e)=>{
    e.preventDefault();
    const title=$("#fTitle").value.trim();
    const videoId=$("#fVid").value.trim();
    const enUrl=$("#fEn").value.trim();
    const zhUrl=$("#fZh").value.trim();
    if(!title || !enUrl){ alert("请至少填写 标题 + 英文URL 或上传英文文件"); return; }
    addTalk({ title, videoId, enUrl, zhUrl });
    $("#dlgTalk").close();
    $("#fTitle").value=$("#fVid").value=$("#fEn").value=$("#fZh").value="";
    setHint($("#enStatus"), "",""); setHint($("#zhStatus"), "","");
  });
}

function bind(){
  // Tabs
  $$(".tab").forEach(btn=>btn.addEventListener("click",()=>{
    $$(".tab").forEach(b=>b.classList.remove("active")); btn.classList.add("active");
    const name=btn.dataset.tab; $$(".panel").forEach(p=>p.classList.add("hide")); $("#panel-"+name).classList.remove("hide");
  }));
  // 播控
  $("#btnPrev")?.addEventListener("click",()=>seekTo(Math.max(0,(curIdx||0)-1)));
  $("#btnNext")?.addEventListener("click",()=>seekTo(Math.min(segsEn.length-1,(curIdx||0)+1)));
  $("#btnSpeak")?.addEventListener("click",()=>{ const en=segsEn[curIdx]?.text||""; try{ const u=new SpeechSynthesisUtterance(en); const v=speechSynthesis.getVoices().find(x=>/en/i.test(x.lang))||speechSynthesis.getVoices()[0]; if(v) u.voice=v; u.lang=(v?.lang)||"en-US"; speechSynthesis.cancel(); speechSynthesis.speak(u);}catch{} });

  // Practice
  $("#btnMakeVocab")?.addEventListener("click",()=>{ const n=+$("#vocabN").value||40; const v=buildVocab(transcriptText(), n); $("#vocabList").innerHTML=v.map(x=>`<div class="row between item"><div><b>${x.i}.</b> ${escapeHtml(x.w)}</div><div class="muted small">count:${x.c}</div></div>`).join(""); });
  $("#btnExportVocab")?.addEventListener("click",()=>{ const rows=["rank,word,count"]; $$("#vocabList .item").forEach((el,i)=>{ const word=el.querySelector("div").textContent.replace(/^\d+\.\s*/,"").trim(); const cnt=(el.querySelector(".muted")?.textContent||"").replace("count:","").trim(); rows.push(`${i+1},${word},${cnt}`); }); const blob=new Blob([rows.join("\n")],{type:"text/csv;charset=utf-8"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=(currentTalk()?.title||"vocab")+".csv"; a.click(); URL.revokeObjectURL(a.href); });
  $("#btnMakeCloze")?.addEventListener("click",()=>{ const n=+$("#clozeN").value||10, k=+$("#clozeK").value||4; const {quiz, preview}=makeCloze(transcriptText(), n, k); renderCloze({quiz, preview}); });
  $("#btnShowAns")?.addEventListener("click",()=>{ $$("#clozeQuiz .q").forEach(q=>{ const ans=q.dataset.answer; const lab=q.querySelector(`label[data-val="${CSS.escape(ans)}"]`); if(lab) lab.style.outline="2px solid #16a34a"; }); });
  $("#btnBuildShadow")?.addEventListener("click",()=>{ const lines=segsEn.map((s,i)=>`${String(i+1).padStart(2,"0")}. ${s.text}`); $("#shadowScript").textContent=lines.join("\n"); });

  // Package
  $("#btnGenPackageLocal")?.addEventListener("click",()=>{ const t=currentTalk(); if(!t) return; const text=transcriptText(); const level=$("#level").value||"auto"; const pkg=pkgTemplateLocal({title:t.title||"Untitled", text, level}); renderPackage(pkg); $(".tab[data-tab='package']").click(); });
  $("#btnGenPackageLLM")?.addEventListener("click",async()=>{ const t=currentTalk(); if(!t) return; const text=transcriptText(); const level=$("#level").value||"auto"; try{ const pkg=await pkgTemplateLLM({title:t.title||"Untitled", text, level}); renderPackage(pkg); } catch(e){ alert("需要有效的 API Base/Key。"); } $(".tab[data-tab='package']").click(); });
  $("#btnExportMD")?.addEventListener("click",()=>{ const t=currentTalk(); if(!t) return; const pkg=Store.data.pkg[t.title]; if(!pkg) return; exportMarkdown(pkg); });

  // Chat
  $("#btnSend")?.addEventListener("click",chatSend);
  $("#btnClearChat")?.addEventListener("click",()=>($("#chatBox").innerHTML=""));

  // 导出/导入
  $("#btnExportState")?.addEventListener("click",()=>{ const blob=new Blob([JSON.stringify(Store.data,null,2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="board_state.json"; a.click(); URL.revokeObjectURL(a.href); });
  $("#importState")?.addEventListener("change",async(e)=>{ const f=e.target.files?.[0]; if(!f) return; const text=await f.text(); try{ const data=JSON.parse(text); Store.data=data; Store.save(); renderTalkList(); loadTalk(); } catch{ alert("JSON 解析失败"); } e.target.value=""; });

  // 偏好：自动滚动（默认开）
  const savedScroll = localStorage.getItem('board_autoScroll');
  if (savedScroll !== null) $("#autoScroll").checked = savedScroll === '1'; else $("#autoScroll").checked = true;
  $("#autoScroll")?.addEventListener("change",(e)=>localStorage.setItem('board_autoScroll', e.target.checked?'1':'0'));

  // 偏好：句末自动暂停（默认关）
  const savedAP = localStorage.getItem('board_autoPause');
  if (savedAP !== null) $("#autoPause").checked = savedAP === '1'; else $("#autoPause").checked = false;
  autoPausePref = $("#autoPause").checked;
  $("#autoPause")?.addEventListener("change",(e)=>{ autoPausePref = e.target.checked; localStorage.setItem('board_autoPause', e.target.checked?'1':'0'); });

  // 记住 Base/Key
  const savedBase = localStorage.getItem('ai_base'); if (savedBase) $("#aiBase").value = savedBase;
  const savedKey  = localStorage.getItem('ai_key');  if (savedKey)  $("#aiKey").value  = savedKey;
  $("#aiBase")?.addEventListener("change",(e)=>{ const v=(e.target.value||"").trim(); if (v) localStorage.setItem('ai_base', v); else localStorage.removeItem('ai_base'); });
  $("#aiKey")?.addEventListener("change",(e)=>{ const v=(e.target.value||"").trim(); if (v) localStorage.setItem('ai_key', v); else localStorage.removeItem('ai_key'); });

  bindDialog();
}

/* ======= 启动 ======= */
function currentTalk(){ return Store.data.talks.find(t=>t.id===Store.data.current); }
function boot(){
  Store.load(); Files.load();
  if (!Store.data.talks.length){
    addTalk({ title:"示例素材：可替换为你的 TED", videoId:"gN9dlisaQVM", enUrl:"../ted/sample/en.srt", zhUrl:"../ted/sample/zh.srt" });
  }
  renderTalkList(); bind(); loadTalk();
}
window.addEventListener("load", boot);
