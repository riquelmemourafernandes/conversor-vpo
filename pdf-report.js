/* Relatório PDF premium da Costalog. O script substitui o clique do botão depois que o módulo principal termina de carregar. */
(function(){
  const RED=[235,0,0], DARK=[24,24,27], GRAY=[100,100,108], LIGHT=[246,247,249], MID=[224,226,230], WHITE=[255,255,255];
  const money=v=>{const s=String(v||'').replace(/[^0-9,.-]/g,'').replace(/\./g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)?n:0};
  const brl=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const loadImage=src=>fetch(src,{cache:'no-store'}).then(r=>r.blob()).then(blob=>new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsDataURL(blob)}));
  function rowsFromTable(){
    const trs=[...document.querySelectorAll('#resultsBody tr')];
    return trs.map(tr=>{const cells=[...tr.children];const checkbox=cells[0]?.querySelector('input[type="checkbox"]');return{selected:!!checkbox?.checked,status:(cells[7]?.textContent||'').trim(),data:cells.slice(1,7).map(c=>(c.textContent||'').trim())}});
  }
  function install(){
    const btn=document.querySelector('#pdfBtn');
    if(!btn||btn.dataset.premiumPdf==='1')return;
    btn.dataset.premiumPdf='1';
    btn.addEventListener('click',premiumPdf,true);
    btn.onclick=null;
  }
  async function premiumPdf(ev){
    ev.preventDefault();ev.stopImmediatePropagation();
    const api=window.jspdf, JsPDF=api?.jsPDF;
    if(!JsPDF)return alert('A biblioteca de PDF ainda está carregando. Aguarde alguns segundos e tente novamente.');
    const all=rowsFromTable();
    if(!all.length)return alert('Não há VPOs para gerar o relatório.');
    const invalid=all.filter(x=>/REVISAR|DUPLICADO/i.test(x.status));
    if(invalid.length)return alert(`Existem ${invalid.length} VPO(s) com pendências. Revise os registros antes de gerar o PDF.`);
    const selected=all.filter(x=>x.selected);const items=selected.length?selected:all;
    const total=items.reduce((a,x)=>a+money(x.data[5]),0);
    const generated=new Date();
    const doc=new JsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true});
    const W=297,H=210, margin=14;
    let logo=null;try{logo=await loadImage('LOGOTIPO-COSTALOG-versão-2020.png')}catch(e){console.warn('Logo não carregada',e)}

    function header(){
      doc.setFillColor(...RED);doc.rect(0,0,W,5,'F');
      doc.setFillColor(...WHITE);doc.roundedRect(margin,10,72,24,3,3,'F');
      if(logo)doc.addImage(logo,'PNG',margin+4,12,64,20,undefined,'FAST');
      doc.setTextColor(...DARK);doc.setFont('helvetica','bold');doc.setFontSize(20);doc.text('RELATÓRIO DE VALE-PEDÁGIO',94,18);
      doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(...GRAY);doc.text('CONVERSOR DE VPOs  •  DOCUMENTO OPERACIONAL',94,24);
      doc.setDrawColor(...MID);doc.line(94,28,W-margin,28);
      doc.setFontSize(8);doc.text(`Gerado em ${generated.toLocaleString('pt-BR')}`,94,34);
    }
    function footer(){
      const y=H-9;doc.setDrawColor(...MID);doc.line(margin,y-3,W-margin,y-3);doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(...GRAY);doc.text('Costalog  •  A Logística Ideal',margin,y);doc.text(`Página ${doc.internal.getNumberOfPages()}`,W-margin,y,{align:'right'});
    }
    header();
    // Cards de resumo
    const cardY=42, gap=5, cardW=(W-2*margin-2*gap)/3, cardH=24;
    const cards=[['VPOs PROCESSADAS',String(items.length)],['VALOR TOTAL',brl(total)],['STATUS','CONFERIDO']];
    cards.forEach((c,i)=>{const x=margin+i*(cardW+gap);doc.setFillColor(...LIGHT);doc.roundedRect(x,cardY,cardW,cardH,2.5,2.5,'F');doc.setFillColor(...RED);doc.roundedRect(x,cardY,2.5,cardH,1,1,'F');doc.setFont('helvetica','bold');doc.setFontSize(7);doc.setTextColor(...GRAY);doc.text(c[0],x+8,cardY+8);doc.setFontSize(i===1?14:13);doc.setTextColor(...DARK);doc.text(c[1],x+8,cardY+18)});

    const head=['DATA DE EMISSÃO','VALE-PEDÁGIO','ID VIAGEM','COMPROVANTE ANTT','PLACA','TOTAL VALE-PEDÁGIO'];
    const body=items.map(x=>[x.data[0],x.data[1],x.data[2],x.data[3],x.data[4],brl(money(x.data[5]))]);
    const auto=doc.autoTable||api.autoTable;
    if(typeof auto!=='function')return alert('O componente da tabela PDF não carregou. Atualize a página e tente novamente.');
    const opts={startY:72,margin:{left:margin,right:margin,top:72,bottom:16},head:[head],body,theme:'plain',styles:{font:'helvetica',fontSize:7.4,textColor:DARK,cellPadding:{top:3.2,right:3,bottom:3.2,left:3},lineColor:MID,lineWidth:.15,overflow:'linebreak',valign:'middle'},headStyles:{fillColor:DARK,textColor:WHITE,fontStyle:'bold,fontSize':7',halign:'center',cellPadding:{top:3.5,right:2.5,bottom:3.5,left:2.5}},alternateRowStyles:{fillColor:LIGHT},columnStyles:{0:{cellWidth:34,halign:'center'},1:{cellWidth:28,halign:'center'},2:{cellWidth:30,halign:'center'},3:{cellWidth:70,halign:'center'},4:{cellWidth:32,halign:'center',fontStyle:'bold'},5:{cellWidth:47,halign:'right',fontStyle:'bold'}},didDrawPage:()=>{if(doc.internal.getNumberOfPages()>1)header();footer()}};
    // Corrige a propriedade fontSize que fica mais clara fora do objeto string.
    opts.headStyles.fontSize=7;
    try{if(typeof doc.autoTable==='function')doc.autoTable(opts);else api.autoTable(doc,opts)}catch(e){console.error(e);return alert('Não foi possível montar o relatório PDF: '+e.message)}
    const pages=doc.internal.getNumberOfPages();
    for(let p=1;p<=pages;p++){doc.setPage(p);footer()}
    const suffix=selected.length?'_Selecionadas':'';
    doc.save(`VPOs_Costalog${suffix}_${generated.toLocaleDateString('pt-BR').replaceAll('/','-')}.pdf`);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else setTimeout(install,0);
})();
