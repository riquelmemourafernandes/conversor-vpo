(() => {
  const KEY='vpo-history-v1';
  const $=s=>document.querySelector(s);
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
  const save=v=>localStorage.setItem(KEY,JSON.stringify(v.slice(0,30)));
  const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  function ensureUI(){
    if($('#historyCard')) return;
    const section=document.createElement('section'); section.id='historyCard'; section.className='card history-card';
    section.innerHTML=`<div class="history-head"><div><h2>📁 Histórico de processamentos</h2><p>Os últimos 30 processamentos ficam salvos neste navegador.</p></div><button id="clearHistoryBtn" class="secondary-btn" type="button">Limpar histórico</button></div><div class="history-tools"><input id="historySearch" type="search" placeholder="Pesquisar por data, quantidade ou valor..."/><span id="historyCount"></span></div><div class="history-wrap"><table><thead><tr><th>Data/Hora</th><th>VPOs</th><th>Valor total</th><th>OK</th><th>Revisar</th><th>Duplicadas</th></tr></thead><tbody id="historyBody"></tbody></table></div>`;
    const results=$('#resultsSection'); if(results) results.after(section); else document.querySelector('main')?.append(section);
    $('#clearHistoryBtn').onclick=()=>{if(confirm('Deseja apagar todo o histórico deste navegador?')){save([]);renderHistory()}};
    $('#historySearch').oninput=renderHistory;
  }
  function renderHistory(){ensureUI();const q=($('#historySearch')?.value||'').toLowerCase();const all=load();const list=all.filter(x=>JSON.stringify(x).toLowerCase().includes(q));const body=$('#historyBody');body.innerHTML=list.length?list.map(x=>`<tr><td>${x.date}</td><td>${x.total}</td><td>${money(x.value)}</td><td class="history-ok">${x.ok}</td><td class="history-warn">${x.warn}</td><td class="history-dup">${x.dup}</td></tr>`).join(''):`<tr><td colspan="6" class="history-empty">Nenhum processamento encontrado.</td></tr>`;$('#historyCount').textContent=`${list.length} registro(s)`}
  function capture(){
    const section=$('#resultsSection'), body=$('#resultsBody'); if(!section||section.classList.contains('hidden')||!body||!body.children.length)return;
    const rows=[...body.querySelectorAll('tr')];let ok=0,warn=0,dup=0,value=0;
    rows.forEach(tr=>{const cells=tr.children;if(!cells.length)return;const status=cells[cells.length-1]?.textContent||'';if(status.includes('OK'))ok++;if(status.includes('REVISAR'))warn++;if(status.includes('DUPLICADO'))dup++;const raw=cells[5]?.textContent||'';const n=Number(raw.replace(/[^0-9,-]/g,'').replace(/\./g,'').replace(',','.'));if(Number.isFinite(n))value+=n});
    const signature=`${rows.length}|${ok}|${warn}|${dup}|${value}|${rows.map(r=>r.textContent).join('§')}`;if(signature===capture.last)return;capture.last=signature;
    const history=load();const item={date:new Date().toLocaleString('pt-BR'),total:rows.length,ok,warn,dup,value};const last=history[0];if(last&&last.signature===signature)return;item.signature=signature;history.unshift(item);save(history);renderHistory();
  }
  ensureUI();renderHistory();const observer=new MutationObserver(()=>setTimeout(capture,150));observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});setInterval(capture,1200);
})();
