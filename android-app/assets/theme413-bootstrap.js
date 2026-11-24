// Resolve the saved appearance before the first stylesheet paints.
(()=>{
 let preference='system';
 try{const saved=localStorage.getItem('lulu.appearance');if(['light','dark','system'].includes(saved))preference=saved;}catch(ignored){}
 const dark=preference==='dark'||preference==='system'&&matchMedia('(prefers-color-scheme: dark)').matches;
 document.documentElement.dataset.theme=dark?'dark':'light';
 document.documentElement.dataset.appearance=preference;
})();
