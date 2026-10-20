export function textNodes(root){return [...root.querySelectorAll('h1,h2,h3,p,blockquote')].filter(el=>!el.querySelector('h1,h2,h3,p,blockquote'))}
export function applyEdits(root,edits){textNodes(root).forEach((el,i)=>{if(typeof edits?.[i]==='string')el.textContent=edits[i]})}
