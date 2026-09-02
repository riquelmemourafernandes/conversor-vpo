/* Compatibilidade do relatório PDF: garante doc.autoTable mesmo quando o plugin CDN não expõe o método no protótipo. */
(function(){
  function install(){
    const api=window.jspdf;
    if(!api||!api.jsPDF)return false;
    const proto=api.jsPDF.prototype;
    if(typeof proto.autoTable==='function')return true;
    if(typeof api.autoTable==='function'){
      proto.autoTable=function(options){return api.autoTable(this,options||{})};
      return true;
    }
    const pluginApi=api.jsPDF.API;
    if(pluginApi&&typeof pluginApi.autoTable==='function'){
      proto.autoTable=pluginApi.autoTable;
      return true;
    }
    return false;
  }
  if(install())return;
  let tries=0;
  const timer=setInterval(function(){
    tries++;
    if(install()||tries>20)clearInterval(timer);
  },100);
})();
