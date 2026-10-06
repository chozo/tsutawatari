import {readFile,writeFile,mkdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url),html=await readFile(new URL('game.html',root),'utf8');
const runner=(await readFile(new URL('tools/browser-journey.js',root),'utf8')).replace(/^\/\/.*\n/gm,'').trim().replace(/;$/,'');
const script=`<script>window.addEventListener('load',()=>requestAnimationFrame(()=>{try{const result=${runner};document.title='PASS: '+result;}catch(e){document.title='FAIL: '+e.message;throw e;}}));</script>`;
await mkdir(new URL('artifacts/',root),{recursive:true});await writeFile(new URL('artifacts/journey-check.html',root),html.replace('</body>',script+'</body>'));console.log('Built artifacts/journey-check.html; open in Chrome to run all 40 transitions.');
