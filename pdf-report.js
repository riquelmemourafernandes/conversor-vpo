/* Relatório PDF profissional: altera somente a saída do PDF. */
(function(){
  const RED=[220,0,0], DARK=[28,28,30], GRAY=[105,105,112], LIGHT=[247,247,248], MID=[218,219,223], WHITE=[255,255,255];
  const brl=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const money=v=>{const s=String(v||'').replace(/R$\s*/i,'').replace(/\./g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)?n:0};
  const loadImage=src=>fetch(src,{cache:'no-store'}).then(r=>r.blob()).then(b=>new Promise((res,rej)=>{const f=new FileReader();f.onload=()=>res(f.result);f.onerror=rej;f.readAsDataURL(b)}));
  const imageSize=data=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve({w:img.naturalWidth||1,h:img.naturalHeight||1});img.onerror=()=>resolve({w:1,h:1});img.src=data});
  function readRows(){return [...document.querySelectorAll('#resultsBody tr')].map(tr=>{const c=[...tr.children];return{selected:!!c[0]?.querySelector('input')?.checked,status:(c[7]?.textContent||'').trim(),d:c.slice(1,7).map(x=>(x.textContent||'').trim())}})}
  function install(){const b=document.querySelector('#pdfBtn');if(!b||b.dataset.pdfLayout==='1')return;b.dataset.pdfLayout='1';b.addEventListener('click',makePdf,true);b.onclick=null}
  async function makePdf(e){
    e.preventDefault();e.stopImmediatePropagation();
    const api=window.jspdf,JsPDF=api?.jsPDF;if(!JsPDF)return alert('A biblioteca de PDF ainda está carregando. Aguarde alguns segundos e tente novamente.');
    const all=readRows();if(!all.length)return alert('Não há VPOs para gerar o relatório.');
    const bad=all.filter(x=>/REVISAR|DUPLICADO/i.test(x.status));if(bad.length)return alert(`Existem ${bad.length} VPO(s) com pendências. Revise os registros antes de gerar o PDF.`);
    const selected=all.filter(x=>x.selected),items=selected.length?selected:all,now=new Date(),total=items.reduce((a,x)=>a+money(x.d[5]),0);
    const doc=new JsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true});
    const W=297,H=210,m=7,contentW=W-2*m;let logo=null,logoRatio=3;
    try{logo=await loadImage('LOGOTIPO-COSTALOG-versão-2020.png');const sz=await imageSize(logo);logoRatio=sz.w/sz.h}catch(_){ }
    function header(){
      doc.setFillColor(...RED);doc.rect(0,0,W,3.5,'F');
      doc.setFillColor(...WHITE);doc.roundedRect(m,7,64,23,2.5,2.5,'F');
      if(logo){let lw=54,lh=lw/logoRatio;if(lh>17){lh=17;lw=lh*logoRatio}doc.addImage(logo,'PNG',m+(64-lw)/2,10+(17-lh)/2,lw,lh,undefined,'FAST')}
      doc.setFont('helvetica','bold');doc.setFontSize(17);doc.setTextColor(...DARK);doc.text('RELATÓRIO DE VALE-PEDÁGIO',78,14.5);
      doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(...GRAY);doc.text('CONVERSOR DE VPOs  •  DOCUMENTO OPERACIONAL',78,20);doc.text(`Gerado em ${now.toLocaleString('pt-BR')}`,78,26);
      doc.setDrawColor(...MID);doc.setLineWidth(.25);doc.line(78,30,W-m,30);
    }
    function footer(){const y=H-4.5;doc.setDrawColor(...MID);doc.setLineWidth(.2);doc.line(m,y-3,W-m,y-3);doc.setFont('helvetica','normal');doc.setFontSize(6.5);doc.setTextColor(...GRAY);doc.text('Costalog  •  A Logística Ideal',m,y);doc.text(`Página ${doc.internal.getNumberOfPages()}`,W-m,y,{align:'right'})}
    header();
    const cardY=34,cardH=17,gap=3,cardW=(contentW-2*gap)/3;
    [['VPOs PROCESSADAS',String(items.length)],['VALOR TOTAL',brl(total)],['STATUS','CONFERIDO']].forEach((x,i)=>{const xx=m+i*(cardW+gap);doc.setFillColor(...LIGHT);doc.roundedRect(xx,cardY,cardW,cardH,2,2,'F');doc.setFillColor(...RED);doc.rect(xx,cardY,2,cardH,'F');doc.setFont('helvetica','bold');doc.setFontSize(6.2);doc.setTextColor(...GRAY);doc.text(x[0],xx+7,cardY+6.2);doc.setFontSize(i===1?10.5:9.5);doc.setTextColor(...DARK);doc.text(x[1],xx+7,cardY+13.2)});
    const head=['DATA DE EMISSÃO','VALE-PEDÁGIO','ID VIAGEM','COMPROVANTE ANTT','PLACA','TOTAL VALE-PEDÁGIO'];
    const body=items.map(x=>[x.d[0]||'—',x.d[1]||'—',x.d[2]||'—',x.d[3]||'—',x.d[4]||'—',brl(money(x.d[5]))]);
    const available=H-58-10,baseRows=Math.max(1,items.length),minH=baseRows<=14?Math.min(11,Math.max(7,available/baseRows)):7;
    const table={startY:56,margin:{left:m,right:m,top:56,bottom:9},head:[head],body,theme:'grid',styles:{font:'helvetica',fontSize:7.5,textColor:DARK,cellPadding:{top:2.2,right:2,bottom:2.2,left:2},minCellHeight:minH,lineColor:MID,lineWidth:.15,valign:'middle',overflow:'linebreak'},headStyles:{fillColor:DARK,textColor:WHITE,fontStyle:'bold',fontSize:7,halign:'center',cellPadding:{top:2.8,right:2,bottom:2.8,left:2}},alternateRowStyles:{fillColor:LIGHT},columnStyles:{0:{cellWidth:39,halign:'center'},1:{cellWidth:34,halign:'center'},2:{cellWidth:37,halign:'center'},3:{cellWidth:77,halign:'center'},4:{cellWidth:32,halign:'center',fontStyle:'bold'},5:{cellWidth:63,halign:'right',fontStyle:'bold'}},didDrawPage:()=>{if(doc.internal.getNumberOfPages()>1)header();footer()}};
    try{if(typeof doc.autoTable==='function')doc.autoTable(table);else if(typeof api.autoTable==='function')api.autoTable(doc,table);else return alert('O componente da tabela PDF não carregou. Atualize a página e tente novamente.')}catch(err){console.error(err);return alert('Não foi possível gerar o PDF: '+err.message)}
    const pages=doc.internal.getNumberOfPages();for(let p=1;p<=pages;p++){doc.setPage(p);footer()}
    const suffix=selected.length?'_Selecionadas':'';doc.save(`VPOs_Costalog${suffix}_${now.toLocaleDateString('pt-BR').replaceAll('/','-')}.pdf`);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else setTimeout(install,0);
})();
