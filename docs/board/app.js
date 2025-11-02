/* ======= 状态与工具 ======= */
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const STOP = new Set("the be to of and a in that have i it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like no just him know take into your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us".split(" "));
const Store = {
  key: "ted-board-v1",
  data: { talks: [], current: "", pkg: {} },
  load(){ try{ const raw=localStorage.getItem(this.key); if(raw) this.data=JSON.parse(raw); }catch{} },
  save(){ localStorage.setItem(this.key, JSON.stringify(this.data)); },
  up(fn){ fn(this.data); this.save(); renderTalkList(); },
};
function uid(){ return Math.random().toString(36).slice(2,9); }
function escapeHtml(s){ return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }
function escapeReg(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"); }
function sample(a,n){ const x=a.slice(); const r=[]; while(r.length<Math.min(n,x.length)){ const i=Math.floor(Math.random()*x.length); r.push(x.splice(i,1)[0]); } return r; }
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

/* ======= 素材库 ======= */
function addTalk({title, videoId="", enUrl="", zhUrl=""}) {
  const id=uid();
  Store.up(s=>s.talks.unshift({id, title, videoId, enUrl, zhUrl, addedAt:Date.now()}));
  selectTalk(id);
}
function selectTalk(id){ Store.up(s=>s.current=id); loadTalk(); }
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
  $$("#talkList .item").forEach(el=>el.addEventListener("click",()=>selectTalk(el.dataset.id)));
}
function shortUrl(u=""){ try{ const url=new URL(u, location.href); return (url.hostname||"")+url.pathname; }catch{ return u; } }

/* ======= 播放/字幕 ======= */
let YTPlayer, segsEn=[], segsZh=[], curIdx=-1, lastCapturedIdx=-1;
function onYouTubeIframeAPIReady(){}

async function fetchText(u){ if(!u) return ""; try{ const r=await fetch(u, {cache:"no-store"}); if(!r.ok) return ""; return await r.text(); }catch{ return ""; } }
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
function toSec(h,m,s,ms){ return (+h)*3600+(+m)*60+(+s)+(+ms)/1000; }
function fmt(sec){ const s=Math.floor(sec%60).toString().padStart(2,"0"), m=Math.floor((sec/60)%60).toString().padStart(2,"0"), h=Math.floor(sec/3600).toString().padStart(2,"0"); return (h!=="00"?h+":":"")+m+":"+s; }
function getIndexAtTime(t,segs){ if(!segs.length) return -1; const last=segs[segs.length-1]; if(t>last.end+0.6) return -1; let i=segs.findIndex(s=>t>=s.start-0.15 && t<=s.end+0.35); if(i!==-1) return i; for(let k=segs.length-1;k>=0;k--) if(t>=segs[k].start-0.15) return k; return -1; }

async function loadTalk(){
  const talk=Store.data.talks.find(t=>t.id===Store.data.current); if(!talk) return;
  $("#timeline").innerHTML=""; $("#snippet").textContent=""; $("#sub-en").textContent=$("#sub-zh").textContent="";
  segsEn=[]; segsZh=[]; curIdx=-1; lastCapturedIdx=-1;

  // 兼容纯文本 URL：若非 .srt 则当作整段文本，拆句（无时间轴）
  const enRaw=await fetchText(talk.enUrl);
  if (/\.(srt|vtt)(\?|#|$)/i.test(talk.enUrl)) { segsEn=parseSRT(enRaw); }
  else { const parts=(enRaw||"").split(/\n+/).filter(Boolean); let acc=0; segsEn=parts.map(t=>({start:acc, end:acc+=3, text:t.trim()})); }

  const zhRaw=await fetchText(talk.zhUrl);
  if (/\.(srt|vtt)(\?|#|$)/i.test(talk.zhUrl)) { segsZh=parseSRT(zhRaw); }

  const tl=$("#timeline");
  if (segsEn.length){
    tl.innerHTML = segsEn.map((s,i)=>`<div class="seg" data-i="${i}">
      <div class="muted small">${fmt(s.start)} → ${fmt(s.end)}</div>
      <div>${escapeHtml(s.text)}</div>
      <div class="muted small">${escapeHtml(segsZh[i]?.text||"")}</div></div>`).join("");
    $$("#timeline .seg").forEach(el=>el.addEventListener("click",()=>seekTo(+el.dataset.i)));
  }else{
    tl.innerHTML = `<div class="muted small">未能加载英文内容（可在素材中更换 URL）。</div>`;
  }

  const box=$("#ytPlayer"); box.innerHTML="";
  if (talk.videoId){
    YTPlayer = new YT.Player("ytPlayer", {
      videoId: talk.videoId,
      playerVars: { rel:0, modestbranding:1, playsinline:1, controls:1 },
      events: { onReady:()=>tick(), onStateChange:(e)=>{ if (e.data===YT.PlayerState.PAUSED) onPaused(); } }
    });
  } else {
    box.innerHTML = `<div class="muted small" style="padding:8px">未提供视频ID。你仍可用“时间轴/练习/学习包”。</div>`;
  }

  // 清空包展示
  $("#pkgList").innerHTML=""; $("#pkgContent").innerHTML="";
}

function tick(){
  if (!YTPlayer || typeof YTPlayer.getCurrentTime!=="function") return requestAnimationFrame(tick);
  const t=YTPlayer.getCurrentTime(); const i=getIndexAtTime(t, segsEn); if (i!==-1) setActive(i);
  $("#sub-en").textContent = segsEn[curIdx]?.text || ""; $("#sub-zh").textContent = segsZh[curIdx]?.text || "";
  if ($("#autoPause").checked && curIdx!==-1){ const end=segsEn[curIdx].end; if (t>=end-0.02 && YTPlayer.getPlayerState()===YT.PlayerState.PLAYING){ YTPlayer.pauseVideo(); } }
  requestAnimationFrame(tick);
}
function onPaused(){
  if (YTPlayer?.getCurrentTime){ const i=getIndexAtTime(YTPlayer.getCurrentTime(), segsEn); if (i!==-1) setActive(i); }
  if (curIdx===-1) return;
  if (lastCapturedIdx===curIdx) return; // 避免同一句重复写入
  lastCapturedIdx=curIdx;
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

/* ======= 练习：词表/填空/跟读 ======= */
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
function showAnswers(){ $$("#clozeQuiz .q").forEach(q=>{ const ans=q.dataset.answer; const lab=q.querySelector(`label[data-val="${CSS.escape(ans)}"]`); if(lab) lab.style.outline="2px solid #16a34a"; }); }
function buildShadow(){ const lines=segsEn.map((s,i)=>`${String(i+1).padStart(2,"0")}. ${s.text}`); $("#shadowScript").textContent=lines.join("\n"); }

/* ======= 学习包：结构与生成 ======= */
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
async function pkgTemplateLLM({title, text, level}){
  const base = ($("#aiBase").value || "https://api.openai.com/v1").trim();
  const key = ($("#aiKey").value || "").trim();
  if (!key) throw new Error("No API key");
  const prompt = `You are an English tutor. Create a bilingual learning package for the talk titled "${title}". Level: ${level}.
Return Markdown sections with headings:
1) Video Information
2) Speaker Biography
3) Key Vocabulary (with English definitions and Chinese)
4) Key Phrases & Expressions (with meanings and CN)
5) Full Transcript (keep original, no translation)
6) Discussion Questions (8)
7) Key Takeaways (7)
8) Learning Objectives (clear, measurable)
Use concise bullet lists. Transcript source (truncated if too long):
${text.slice(0,4000)}`;
  const r = await fetch(base + "/chat/completions", {
    method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${key}` },
    body: JSON.stringify({ model:"gpt-4o-mini", messages:[{role:"user", content: prompt}] })
  });
  const j = await r.json();
  const md = j?.choices?.[0]?.message?.content || "Error generating package.";
  return {
    meta: { title, level, mode:"llm" },
    sections: [{ key:"package_md", name:"Learning Package (LLM)", content: md }]
  };
}

function renderPackage(pkg){
  // 保存到本地状态
  Store.up(s=>s.pkg[pkg.meta.title]=pkg);
  // 清单
  const list=$("#pkgList");
  list.innerHTML = pkg.sections.map(sec=>`<li><label><input type="checkbox" checked> ${escapeHtml(sec.name)}</label></li>`).join("");
  // 内容
  const cont=$("#pkgContent");
  cont.innerHTML = pkg.sections.map(sec=>`<section><h4>${escapeHtml(sec.name)}</h4><pre class="snippet">${escapeHtml(sec.content)}</pre></section>`).join("");
}
function exportMarkdown(pkg){
  const lines = [`# ${pkg.meta.title} — Learning Package (${pkg.meta.mode})`, `Level: ${pkg.meta.level}`, ""];
  pkg.sections.forEach(sec=>{ lines.push(`## ${sec.name}`,"", sec.content, ""); });
  const blob = new Blob([lines.join("\n")], {type:"text/markdown;charset=utf-8"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`${pkg.meta.title.replace(/\s+/g,'_')}_package.md`; a.click(); URL.revokeObjectURL(a.href);
}

/* ======= 右侧助手 ======= */
function chatAdd(role, text){
  const box=$("#chatBox"); const div=document.createElement("div"); div.className="msg "+role;
  div.innerHTML=`<div class="role">${role==="user"?"你":"助手"}</div><div class="bubble">${escapeHtml(text).replace(/\n/g,"<br>")}</div>`;
  box.appendChild(div); box.scrollTop=box.scrollHeight;
}
async function chatSend(){
  const t=$("#chatInput").value.trim(); if(!t) return; $("#chatInput").value=""; chatAdd("user", t);
  const base = ($("#aiBase").value || "https://api.openai.com/v1").trim();
  const key = ($("#aiKey").value || "").trim();
  if (!key){ chatAdd("assistant","离线模式：已记录。可使用 Practice/Package 继续。"); return; }
  try{
    const content = `Assistant for English learning. Context title: ${currentTalk()?.title||""}. Current sentence: ${($("#snippet").textContent||"").slice(0,200)}. User: ${t}`;
    const r = await fetch(base+"/chat/completions",{method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${key}`}, body:JSON.stringify({model:"gpt-4o-mini", messages:[{role:"user", content}]})});
    const j=await r.json(); chatAdd("assistant", j?.choices?.[0]?.message?.content || JSON.stringify(j).slice(0,1200));
  }catch{ chatAdd("assistant","调用失败，请检查 API 配置或网络。"); }
}
function currentTalk(){ return Store.data.talks.find(t=>t.id===Store.data.current); }

/* ======= 交互绑定 ======= */
function bind(){
  // Tabs
  $$(".tab").forEach(btn=>btn.addEventListener("click",()=>{
    $$(".tab").forEach(b=>b.classList.remove("active")); btn.classList.add("active");
    const name=btn.dataset.tab; $$(".panel").forEach(p=>p.classList.add("hide")); $("#panel-"+name).classList.remove("hide");
  }));
  // 播控
  $("#btnPrev").addEventListener("click",()=>seekTo(Math.max(0,(curIdx||0)-1)));
  $("#btnNext").addEventListener("click",()=>seekTo(Math.min(segsEn.length-1,(curIdx||0)+1)));
  $("#btnSpeak").addEventListener("click",()=>{ const en=segsEn[curIdx]?.text||""; try{ const u=new SpeechSynthesisUtterance(en); const v=speechSynthesis.getVoices().find(x=>/en/i.test(x.lang))||speechSynthesis.getVoices()[0]; if(v) u.voice=v; u.lang=(v?.lang)||"en-US"; speechSynthesis.cancel(); speechSynthesis.speak(u);}catch{} });
  // Practice
  $("#btnMakeVocab").addEventListener("click",()=>{ const n=+$("#vocabN").value||40; const v=buildVocab(transcriptText(), n); $("#vocabList").innerHTML=v.map(x=>`<div class="row between item"><div><b>${x.i}.</b> ${escapeHtml(x.w)}</div><div class="muted small">count:${x.c}</div></div>`).join(""); });
  $("#btnExportVocab").addEventListener("click",()=>{ const rows=["rank,word,count"]; $$("#vocabList .item").forEach((el,i)=>{ const word=el.querySelector("div").textContent.replace(/^\d+\.\s*/,"").trim(); const cnt=(el.querySelector(".muted")?.textContent||"").replace("count:","").trim(); rows.push(`${i+1},${word},${cnt}`); }); const blob=new Blob([rows.join("\n")],{type:"text/csv;charset=utf-8"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=(currentTalk()?.title||"vocab")+".csv"; a.click(); URL.revokeObjectURL(a.href); });
  $("#btnMakeCloze").addEventListener("click",()=>{ const n=+$("#clozeN").value||10, k=+$("#clozeK").value||4; const {quiz, preview}=makeCloze(transcriptText(), n, k); renderCloze({quiz, preview}); });
  $("#btnShowAns").addEventListener("click",showAnswers);
  $("#btnBuildShadow").addEventListener("click",buildShadow);
  // Package
  $("#btnGenPackageLocal").addEventListener("click",()=>{ const t=currentTalk(); if(!t) return; const text=transcriptText(); const level=$("#level").value||"auto"; const pkg=pkgTemplateLocal({title:t.title||"Untitled", text, level}); renderPackage(pkg); $(".tab[data-tab='package']").click(); });
  $("#btnGenPackageLLM").addEventListener("click",async()=>{ const t=currentTalk(); if(!t) return; const text=transcriptText(); const level=$("#level").value||"auto"; try{ const pkg=await pkgTemplateLLM({title:t.title||"Untitled", text, level}); renderPackage(pkg); } catch(e){ alert("需要有效的 API Key。"); } $(".tab[data-tab='package']").click(); });
  $("#btnExportMD").addEventListener("click",()=>{ const t=currentTalk(); if(!t) return; const pkg=Store.data.pkg[t.title]; if(!pkg) return; exportMarkdown(pkg); });
  // Chat
  $("#btnSend").addEventListener("click",chatSend); $("#btnClearChat").addEventListener("click",()=>($("#chatBox").innerHTML=""));
  // 添加素材
  $("#btnAdd").addEventListener("click",()=>$("#dlgTalk").showModal());
  $("#btnSaveTalk").addEventListener("click",(e)=>{ e.preventDefault(); const title=$("#fTitle").value.trim(); const videoId=$("#fVid").value.trim(); const enUrl=$("#fEn").value.trim(); const zhUrl=$("#fZh").value.trim(); if(!title||!enUrl){ alert("至少填写 标题 + 英文字幕/文本 URL"); return; } addTalk({title, videoId, enUrl, zhUrl}); $("#dlgTalk").close(); $("#fTitle").value=$("#fVid").value=$("#fEn").value=$("#fZh").value=""; });
  $("#q").addEventListener("input",renderTalkList);
  // 导出/导入
  $("#btnExportState").addEventListener("click",()=>{ const blob=new Blob([JSON.stringify(Store.data,null,2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="board_state.json"; a.click(); URL.revokeObjectURL(a.href); });
  $("#importState").addEventListener("change",async(e)=>{ const f=e.target.files?.[0]; if(!f) return; const text=await f.text(); try{ const data=JSON.parse(text); Store.data=data; Store.save(); renderTalkList(); loadTalk(); } catch{ alert("JSON 解析失败"); } e.target.value=""; });
}
function boot(){
  Store.load();
  if (!Store.data.talks.length){
    addTalk({ title:"示例素材：可替换为你的 TED", videoId:"gN9dlisaQVM", enUrl:"../ted/sample/en.srt", zhUrl:"../ted/sample/zh.srt" });
  }
  renderTalkList(); bind(); loadTalk();
}
window.addEventListener("load", boot);