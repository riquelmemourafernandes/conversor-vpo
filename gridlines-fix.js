// Garante que os arquivos XLSX exportados pelo conversor tenham as linhas de grade desativadas.
(() => {
  const originalWriteFile = XLSX.writeFile.bind(XLSX);
  XLSX.writeFile = async (workbook, filename, options = {}) => {
    try {
      const writeOptions = { ...options, bookType: 'xlsx', type: 'array' };
      const bytes = XLSX.write(workbook, writeOptions);
      const zip = await JSZip.loadAsync(bytes);
      const sheetFiles = Object.keys(zip.files).filter(name => /^xl\/worksheets\/sheet\d+\.xml$/.test(name));
      for (const name of sheetFiles) {
        let xml = await zip.file(name).async('string');
        if (/<sheetView\b[^>]*showGridLines=/.test(xml)) {
          xml = xml.replace(/(<sheetView\b[^>]*?)showGridLines="[^"]*"/g, '$1showGridLines="0"');
        } else {
          xml = xml.replace(/<sheetView\b([^>]*)>/g, '<sheetView$1 showGridLines="0">');
        }
        zip.file(name, xml);
      }
      const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Falha ao aplicar a configuração de linhas de grade:', error);
      originalWriteFile(workbook, filename, options);
    }
  };
})();
