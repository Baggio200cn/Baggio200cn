/* ========================================================================
   TED 英语私教 Board — app.js（修复：切换素材/手动暂停采集/字幕合并更稳）
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
  // 事件委托：避免重渲染后监听器丢失
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

/* 更强的英文合并：按间隔/标点/功能词；控制最大长度与时长 */
function mergeSegments(segs){
  const merged=[]; const endPunc=/[.?!。”’'")、…]$/;
  let buf=null;
  for(const s of (segs||[])){
    const text = (s.text||"").replace(/\s+/g," ").trim();
    if(!text){ continue; }
    if(!buf){ buf={start:s.start,end:s.end,text:text}; continue; }
    const gap = s.start - buf.end;
    const lastToken = buf.text.trim().split(/\s+/).pop()?.toLowerCase()||"";
    const joinByGap = gap<=0.35; // 紧邻强制合并
    const joinByNoPunc = !endPunc.test(buf.text.trim()) && gap<=1.0;
    const joinByConnector = (CONNECTORS.has((text.split(/\s+/)[0]||"").toLowerCase()) && gap<=1.2);
    const joinByShort = (buf.text.length<40 && text.length<20 && gap<=1.2);
    const shouldJoin = joinByGap || joinByNoPunc || joinByConnector || joinByShort;
    const tooLongChars = (buf.text.length + 1 + text.length) > 160;
    const tooLongSecs  = (s.end - buf.start) > 8.0;
    if(shouldJoin && !tooLongChars && !tooLongSecs){
      buf.end = Math.max(buf.end, s.end);
      buf.text = (buf.text + " " + text).replace(/\s+/g," ").trim();
    }else{
      merged.push(buf); buf={start:s.start,end:s.end,text:text};
    }
  }
  if(buf) merged.push(buf);
  return merged;
}
/* 中文按英文时间窗对齐合并 */
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

/* 时间→索引：超末尾则“最近上一句”；开头之前返回 -1 */
function getIndexAtTime(t,segs){
  if(!segs || !segs.length) return -1;
  let i=segs.findIndex(s=>t>=s.start-0.15 && t<=s.end+0.35);
  if(i!==-1) return i;
  for(let k=segs.length-1;k>=0;k--) if(t>=segs[k].start-0.15) return k;
  return -1;
}

/* ======= 播放/联动 ======= */
let YTPlayer=null, segsEn=[], segsZh=[], curIdx=-1;
let lastCapturedIdx=-1, lastCapturedTime=-1;
let isAutoPausing=false, autoPausePref=false;

async function loadTalk(){
  const talk=Store.data.talks.find(t=>t.id===Store.data.current); if(!talk) return;

  // 显式销毁旧播放器（修复切换素材后仍播放旧视频）
  try{ if (YTPlayer && typeof YTPlayer.destroy==="function"){ YTPlayer.destroy(); } }catch{} YTPlayer=null;

  // 重置 UI
  $("#timeline").innerHTML=""; $("#snippet").textContent=""; $("#sub-en").textContent=$("#sub-zh").textContent="";
  segsEn=[]; segsZh=[]; curIdx=-1; lastCapturedIdx=-1; lastCapturedTime=-1;

  // 解析字幕
  const enRaw=await fetchText(talk.enUrl);
  const zhRaw=await fetchText(talk.zhUrl);
  const enSegsRaw = (/\.(srt|vtt)(\?|#|$)/i.test(talk.enUrl) || talk.enUrl.startsWith("local:")) ? parseSRT(enRaw) : parsePlain(enRaw||"");
  const zhSegsRaw = (zhRaw && ((/\.(srt|vtt)(\?|#|$)/i.test(talk.zhUrl)) || talk.zhUrl?.startsWith("local:"))) ? parseSRT(zhRaw) : [];

  // 合并碎片 → 更完整的句子
  const enMerged = mergeSegments(enSegsRaw||[]);
  const zhMerged = mergeZhByEn(enMerged, zhSegsRaw||[]);
  segsEn = enMerged; segsZh = zhMerged;

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

  $("#pkgList").innerHTML=""; $("#pkgContent").innerHTML="";
}

function tick(){
  if (!YTPlayer || typeof YTPlayer.getCurrentTime!=="function") return requestAnimationFrame(tick);
  const t=YTPlayer.getCurrentTime(); const i=getIndexAtTime(t, segsEn); if (i!==-1) setActive(i);
  $("#sub-en").textContent = segsEn[curIdx]?.text || ""; $("#sub-zh").textContent = segsZh[curIdx]?.text || "";

  // 可选“句末自动暂停”：仅暂停不写入
  if (autoPausePref && curIdx!==-1){
    const end=segsEn[curIdx].end;
    if (t>=end-0.02 && YTPlayer.getPlayerState()===YT.PlayerState.PLAYING){
      isAutoPausing = true;
      try { YTPlayer.pauseVideo(); } catch {}
    }
  }
  requestAnimationFrame(tick);
}

function onPaused(){
  // 自动暂停的“停”不写入
  if (isAutoPausing) { isAutoPausing = false; return; }

  let t = 0;
  if (YTPlayer?.getCurrentTime){
    t = YTPlayer.getCurrentTime();
    let i=getIndexAtTime(t, segsEn);
    if (i!==-1) setActive(i);
    // 超过最后一句：兜底取最后一句
    if (i===-1 && segsEn.length) setActive(segsEn.length-1);
  }
  if (curIdx===-1) return;

  // 小冷却：同一句 1s 内不重复写入，避免连按暂停刷屏
  if (lastCapturedIdx===curIdx && lastCapturedTime>=0 && Math.abs(t - lastCapturedTime) < 1) return;

  lastCapturedIdx=curIdx; lastCapturedTime=t;
  const en=segsEn[curIdx]?.text||"", zh=segsZh[curIdx]?.text||"";
  $("#snippet").textContent = `${en}\n${zh}`;
  chatAdd("user", en + (zh?`\n${zh}`:""));
}

function setActive(i){
  if (i===curIdx) return; curIdx=i;
  $$("#timeline .seg").forEach(el=>el.classList.toggle("active", +el.dataset.i===i));
  if ($("#autoScroll").checked){ const el=document.querySelector(`#timeline .seg[data-i="${i}"]`); el?.scrollIntoView({block:"nearest", behavior:"smooth"}); }
}
function seekTo(i){
  if (i<0||i>=segsEn.length) return; setActive(i);
  if (YTPlayer?.seekTo){ YTPlayer.seekTo(segsEn[i].start+0.01, true); YTPlayer.playVideo(); }
}

/* ======= 练习 ======= */
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

/* ======= 导入对话框 / 偏好 / 控件 ======= */
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

  // 偏好：“句末自动暂停”（默认关）
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
