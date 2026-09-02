/* Upload incremental: permite adicionar novos arquivos e acumular o processamento. */
(function(){
  const input=document.getElementById('fileInput');
  if(!input)return;
  let accumulated=[];
  let replay=false;
  const key=f=>`${f.name}__${f.size}__${f.lastModified}`;
  function rebuild(extra){
    const map=new Map(accumulated.map(f=>[key(f),f]));
    extra.forEach(f=>map.set(key(f),f));
    accumulated=[...map.values()];
    const dt=new DataTransfer();
    accumulated.forEach(f=>dt.items.add(f));
    input.files=dt.files;
  }
  input.addEventListener('change',function(e){
    if(replay){replay=false;return;}
    e.preventDefault();e.stopImmediatePropagation();
    rebuild([...input.files]);
    replay=true;
    input.dispatchEvent(new Event('change',{bubbles:true}));
  },true);
  const originalClick=document.getElementById('chooseBtn');
  if(originalClick){
    originalClick.addEventListener('click',()=>{},false);
  }
  const results=document.getElementById('resultsSection');
  const drop=document.getElementById('dropzone');
  const add=document.createElement('button');
  add.type='button';add.id='addMoreBtn';add.className='secondary-btn';add.textContent='+ Adicionar mais arquivos';
  add.style.marginTop='12px';add.style.display='none';
  add.addEventListener('click',()=>input.click());
  if(results?.parentNode)results.parentNode.insertBefore(add,results);
  const observer=new MutationObserver(()=>{add.style.display=results.classList.contains('hidden')?'none':'inline-flex'});
  if(results)observer.observe(results,{attributes:true,attributeFilter:['class']});
  const clear=document.getElementById('clearBtn');
  if(clear)clear.addEventListener('click',()=>{accumulated=[];input.value='';add.style.display='none'});
})();
