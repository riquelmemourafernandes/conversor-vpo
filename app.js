import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

const DEFAULT_CONFIG={name:'Conversor de VPOs',subtitle:'VPO → Excel',color:'#c62828',footer:'Configuração personalizável'};
const config={...DEFAULT_CONFIG,...JSON.parse(localStorage.getItem('vpo-config')||'{}')};
let rows=[];

const $=s=>document.querySelector(s);
function applyConfig(){document.documentElement.style.setProperty('--primary',config.color);$('#appName').textContent=config.name;$('#appSubtitle').textContent=config.subtitle;$('#footerName').textContent=config.footer;$('#brandMark').textContent=(config.name.match(/\b\w/g)||['C','V']).slice(0,2).join('').toUpperCase()}
applyConfig();

function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3500)}
function progress(n,text){$('#progressBar').style.width=n+'%';$('#progressText').textContent=n+'%';$('#progressDetail').textContent=text}
function clean(s){return s.replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').trim()}
function match(text,re){const m=text.match(re);return m?clean(m[1]):''}
function money(v){const n=Number(String(v).replace(/\./g,'').replace(',','.'));return Number.isFinite(n)?n:0}
function dateBR(raw){const m=raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);return m?`${m[1]}/${m[2]}/${m[3]}`:raw}
function parseVpo(text,fileName){
  const value=money(match(text,/TOTAL\s+VALE-PED[ÍI]GIO\s*\(R\$\)\s*\n?\s*[^\n]*?\s+([\d.,]+)/i) || match(text,/TOTAL\s+VALE-PED[ÍI]GIO[^\n]*?([\d.,]+)\s*$/im));
  const dateRaw=match(text,/DATA DE EMISS[ÃA]O\s+DATA[^\n]*\n\s*(\d{2}\/\d{2}\/\d{4})/i) || match(text,/DATA DE EMISS[ÃA]O[^\n]*\n\s*(\d{2}\/\d{2}\/\d{4})/i);
  const vale=match(text,/Vale-Ped[áa]gio:\s*([0-9]+\/[0-9]+)/i);
  const id=match(text,/ID Viagem:\s*([0-9]+)/i);
  const placa=match(text,/PLACA\s+RNTRC\s*\n\s*([A-Z0-9-]{6,8})/i);
  const antt=match(text,/N[úu]mero do Comprovante ANTT\s*\n\s*([0-9]{15,25})/i);
  const missing=[]; if(!dateRaw)missing.push('data');if(!vale)missing.push('vale');if(!id)missing.push('ID');if(!antt)missing.push('ANTT');if(!placa)missing.push('placa');if(!value)missing.push('total');
  return {"DATA DE EMISSÃO":dateBR(dateRaw),"VALE PEDÁGIO":vale,"ID VIAGEM":id,"NÚMERO COMPROVANTE ANTT":antt,"PLACA":placa.toUpperCase(),"TOTAL VALE-PEDÁGIO":value,"ARQUIVO":fileName,_missing:missing};
}
async function pdfText(blob){const data=new Uint8Array(await blob.arrayBuffer());const pdf=await pdfjsLib.getDocument({data}).promise;let text='';for(let p=1;p<=pdf.numPages;p++){const page=await pdf.getPage(p);const c=await page.getTextContent();text+=c.items.map(i=>i.str).join(' ')+'\n';}return text}
async function collectFiles(files){const out=[];for(const f of files){if(f.name.toLowerCase().endsWith('.pdf'))out.push(f);else if(f.name.toLowerCase().endsWith('.zip')){const zip=await JSZip.loadAsync(f);for(const [name,e] of Object.entries(zip.files)){if(!e.dir&&name.toLowerCase().endsWith('.pdf'))out.push(new File([await e.async('blob')],name,{type:'application/pdf'}));}}}return out}
function render(){const body=$('#resultsBody');body.innerHTML='';rows.forEach((r,i)=>{const tr=document.createElement('tr');const vals=['DATA DE EMISSÃO','VALE PEDÁGIO','ID VIAGEM','NÚMERO COMPROVANTE ANTT','PLACA'];vals.forEach(k=>{const td=document.createElement('td');td.textContent=r[k]||'—';td.contentEditable='true';td.dataset.row=i;td.dataset.key=k;td.addEventListener('blur',e=>{rows[i][k]=e.target.textContent.trim()});tr.appendChild(td)});const td=document.createElement('td');td.textContent=r['TOTAL VALE-PEDÁGIO']?r['TOTAL VALE-PEDÁGIO'].toLocaleString('pt-BR',{minimumFractionDigits:2}):'—';td.contentEditable='true';td.dataset.row=i;td.dataset.key='TOTAL VALE-PEDÁGIO';td.addEventListener('blur',e=>{rows[i][td.dataset.key]=money(e.target.textContent)});tr.appendChild(td);const st=document.createElement('td');st.textContent=r._missing.length?'⚠ '+r._missing.join(', '):'✓ OK';st.className=r._missing.length?'status-warn':'status-ok';tr.appendChild(st);body.appendChild(tr)});updateStats()}
function updateStats(){const ok=rows.filter(r=>!r._missing.length).length;const warn=rows.length-ok;const total=rows.reduce((a,r)=>a+(r['TOTAL VALE-PEDÁGIO']||0),0);$('#statTotal').textContent=rows.length;$('#statOk').textContent=ok;$('#statWarn').textContent=warn;$('#statValue').textContent=total.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
async function processFiles(files){if(!files.length)return toast('Selecione pelo menos um PDF ou ZIP.');$('#progressSection').classList.remove('hidden');$('#resultsSection').classList.add('hidden');rows=[];try{progress(5,'Abrindo arquivos...');const pdfs=await collectFiles(files);if(!pdfs.length)throw new Error('Nenhum PDF encontrado.');for(let i=0;i<pdfs.length;i++){progress(Math.round(10+(i/pdfs.length)*85),`Lendo ${i+1} de ${pdfs.length}: ${pdfs[i].name}`);const text=await pdfText(pdfs[i]);rows.push(parseVpo(text,pdfs[i].name));}progress(100,'Processamento concluído.');render();$('#resultsSection').classList.remove('hidden');toast(`${rows.length} VPO(s) processada(s).`)}catch(e){console.error(e);toast('Não foi possível processar os arquivos: '+e.message)}finally{setTimeout(()=>$('#progressSection').classList.add('hidden'),700)}}

$('#chooseBtn').onclick=()=>$('#fileInput').click();$('#dropzone').onclick=e=>{if(e.target.closest('button'))return;$('#fileInput').click()};$('#fileInput').onchange=e=>processFiles([...e.target.files]);
['dragenter','dragover'].forEach(ev=>$('#dropzone').addEventListener(ev,e=>{e.preventDefault();$('#dropzone').classList.add('dragover')}));['dragleave','drop'].forEach(ev=>$('#dropzone').addEventListener(ev,e=>{e.preventDefault();$('#dropzone').classList.remove('dragover')}));$('#dropzone').addEventListener('drop',e=>processFiles([...e.dataTransfer.files]));
$('#clearBtn').onclick=()=>{rows=[];$('#resultsSection').classList.add('hidden');$('#fileInput').value=''};
$('#downloadBtn').onclick=()=>{if(!rows.length)return;const data=rows.map(({_missing,ARQUIVO,...r})=>r);const ws=XLSX.utils.json_to_sheet(data);ws['!cols']=[{wch:17},{wch:24},{wch:15},{wch:28},{wch:12},{wch:22}];const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'VPOs');XLSX.writeFile(wb,`VPOs_${new Date().toLocaleDateString('pt-BR').replaceAll('/','-')}.xlsx`);toast('Excel gerado com sucesso.')};
$('#settingsBtn').onclick=()=>{$('#cfgName').value=config.name;$('#cfgSubtitle').value=config.subtitle;$('#cfgColor').value=config.color;$('#cfgFooter').value=config.footer;$('#settingsDialog').showModal()};$('#saveSettings').onclick=()=>{config.name=$('#cfgName').value||DEFAULT_CONFIG.name;config.subtitle=$('#cfgSubtitle').value||DEFAULT_CONFIG.subtitle;config.color=$('#cfgColor').value||DEFAULT_CONFIG.color;config.footer=$('#cfgFooter').value||DEFAULT_CONFIG.footer;localStorage.setItem('vpo-config',JSON.stringify(config));applyConfig();toast('Configurações salvas.')};
