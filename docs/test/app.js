(function () {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  function getParams(){ const u=new URL(location.href); return { text:u.searchParams.get('text')||'', textUrl:u.searchParams.get('textUrl')||'', autogen:u.searchParams.get('autogen')||'', title:u.searchParams.get('title')||'' }; }
  const stopwords = new Set(["the","be","to","of","and","a","in","that","have","i","it","for","not","on","with","he","as","you","do","at","this","but","his","by","from","they","we","say","her","she","or","an","will","my","one","all","would","there","their","what","so","up","out","if","about","who","get","which","go","me","when","make","can","like","no","just","him","know","take","into","your","good","some","could","them","see","other","than","then","now","look","only","come","its","over","think","also","back","after","use","two","how","our","work","first","well","way","even","new","want","because","any","these","give","day","most","us"]);
  const textEl = $("#text"), countEl=$("#count"), optionsEl=$("#options"), previewCard=$("#previewCard"), previewEl=$("#preview"), quizCard=$("#quizCard"), quizEl=$("#quiz"), scoreEl=$("#score");
  $("#loadSample").addEventListener("click",()=>{ textEl.value=`Humans learn languages best when they practice with meaningful content.
Instead of memorizing isolated words, reading and listening in context helps
new words stick and improves fluency. In this short demo, we'll create a simple
online test that turns a paragraph into cloze questions. Try it now!`; });
  $("#reset").addEventListener("click",()=>{ textEl.value=""; quizEl.innerHTML=""; scoreEl.textContent=""; previewEl.textContent=""; previewCard.style.display="none"; quizCard.style.display="none"; });
  $("#generate").addEventListener("click",()=>{ const raw=textEl.value.trim(); if(!raw){ alert("请先粘贴英文文本，或点击“加载示例文本”。"); return;} const n=clamp(parseInt(countEl.value||"8",10),3,20); const k=clamp(parseInt(optionsEl.value||"4",10),2,6); const {quiz, preview}=makeClozeQuiz(raw,n,k); previewEl.textContent=preview; previewCard.style.display="block"; renderQuiz(quiz); quizCard.style.display="block"; scoreEl.textContent=""; });
  $("#submit").addEventListener("click",()=>{ const qs=getRenderedQuestions(); let correct=0; qs.forEach(q=>{ if(q.answer===q.userChoice) correct++; }); scoreEl.textContent=`得分：${correct} / ${qs.length}`; qs.forEach(q=>{ const block=document.getElementById(q.id); block.style.borderColor=(q.answer===q.userChoice)?"#16a34a":"#dc2626"; }); });
  $("#showAnswers").addEventListener("click",()=>{ const qs=getRenderedQuestions(); qs.forEach(q=>{ const label=document.querySelector(`#${q.id} label[data-val="${q.answer}"]`); if(label) label.style.outline="2px solid #16a34a"; }); });
  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
  function tokenize(text){ return (text.match(/[A-Za-z']+/g) || []).map(w=>w.toLowerCase()); }
  function pickCandidates(words){ return Array.from(new Set(words)).filter(w=>w.length>=5 && !stopwords.has(w)); }
  function sample(arr,n,exclude=new Set()){ const pool=arr.filter(x=>!exclude.has(x)); const r=[]; while(r.length<Math.min(n,pool.length)){ const idx=Math.floor(Math.random()*pool.length); const x=pool.splice(idx,1)[0]; r.push(x);} return r; }
  function makeClozeQuiz(raw, nQuestions, nOptions) {
    // Tokenize the input text
    const words = tokenize(raw);
    // Pick candidate words for cloze deletion
    const candidates = pickCandidates(words);
    if (candidates.length === 0) {
      return { quiz: [], preview: raw };
    }
    // Randomly sample target words for the quiz
    const targets = sample(candidates, nQuestions);
    // Create the preview text with blanks
    let preview = raw;
    targets.forEach((w, i) => {
      const rx = new RegExp(`\\b${escapeReg(w)}\\b`, `i`);
      preview = preview.replace(rx, `____(${i + 1})____`);
    });
    // Build the quiz questions
    const quiz = targets.map((ans, i) => {
      const distractors = sample(candidates, nOptions - 1, new Set([ans]));
      const options = shuffle([ans, ...distractors]);
      return {
        id: `q${i + 1}`,
        index: i + 1,
        stem: `(${i + 1}) 选择正确单词填空`,
        answer: ans,
        options
      };
    });
    return { quiz, preview };
  }
  function renderQuiz(quiz){ quizEl.innerHTML=""; quiz.forEach(q=>{ const block=document.createElement("div"); block.className="q"; block.id=q.id; block.innerHTML=`<h3>${escapeHtml(q.stem)}</h3>`; const list=document.createElement("div"); list.className="choices"; q.options.forEach((opt,j)=>{ const name=q.id; const id=`${q.id}_o${j+1}`; const row=document.createElement("div"); row.innerHTML=`
          <label for="${id}" data-val="${escapeHtml(opt)}">
            <input type="radio" name="${name}" id="${id}" value="${escapeHtml(opt)}"> ${escapeHtml(opt)}
          </label>`; list.appendChild(row); }); block.appendChild(list); block.dataset.answer=q.answer; quizEl.appendChild(block); }); }
  function getRenderedQuestions(){ return $$(".q").map(block=>{ const id=block.id; const answer=block.dataset.answer; const checked=block.querySelector("input[type=radio]:checked"); const userChoice=checked?checked.value:""; return { id, answer, userChoice }; }); }
  function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }
  function escapeReg(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  function escapeHtml(s){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;"); }
  window.addEventListener("load", async ()=>{ const p=getParams(); if(p.title){ try{ document.title=p.title+" — Online Test"; }catch(_){} } if(p.textUrl){ try{ const t=await fetch(p.textUrl).then(r=>r.text()); if(t && !textEl.value.trim()) textEl.value=t.trim(); }catch(_){} } if(p.text && !textEl.value.trim()){ textEl.value=p.text; } if((p.autogen==="1"||p.autogen==="true") && textEl.value.trim()){ $("#generate").click(); } });
})();
