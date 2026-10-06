import {mkdir,readFile,writeFile,copyFile,cp} from 'node:fs/promises';

const root=new URL('../',import.meta.url),read=path=>readFile(new URL(path,root),'utf8');
const html=await read('index.html'),css=await read('style.css'),icon=await read('favicon.svg');
const explorer=await readFile(new URL('assets/explorer.png',root));
const dataURL=`data:image/png;base64,${explorer.toString('base64')}`;
const sources=[];
for(const name of ['physics.js','course.js','engine.js','scenery.js','game.js'])
 sources.push((await read(name)).replace(/^import .*\n/gm,'').replace(/^export /gm,''));
const singleFile=html
 .replace('href="favicon.svg"',`href="data:image/svg+xml,${encodeURIComponent(icon)}"`)
 .replace('<link rel="manifest" href="manifest.webmanifest">','')
 .replace('src="assets/explorer.png"',`src="${dataURL}"`)
 .replace('<link rel="stylesheet" href="style.css">',`<style>${css}</style>`)
 .replace('<script type="module" src="game.js"></script><script>if(\'serviceWorker\'in navigator&&/^https?:$/.test(location.protocol))addEventListener(\'load\',()=>navigator.serviceWorker.register(\'sw.js\').catch(()=>{}));</script>',`<script>${sources.join('\n').replaceAll("'assets/explorer.png'",`'${dataURL}'`)}</script>`);
await writeFile(new URL('game.html',root),singleFile);
// Keep the previous prototype URL working as an identical, up-to-date single-file build.
await writeFile(new URL('prototype.html',root),singleFile);
const dist=new URL('../dist/',import.meta.url);
await mkdir(dist,{recursive:true});
for(const path of ['index.html','style.css','favicon.svg','manifest.webmanifest','sw.js','physics.js','course.js','engine.js','scenery.js','game.js'])
 await copyFile(new URL(path,root),new URL(path,dist));
await cp(new URL('assets/',root),new URL('assets/',dist),{recursive:true});
await writeFile(new URL('game.html',dist),singleFile);
// Keep a single-file build available directly at the game's route.
await writeFile(new URL('tsutawatari.html',dist),singleFile);
// Workers routes serving a subdirectory require the asset tree to mirror that path.
const gameRoute=new URL('tsutawatari/',dist);
await mkdir(gameRoute,{recursive:true});
await writeFile(new URL('index.html',gameRoute),singleFile);
console.log('Built game.html, tsutawatari.html (offline single-file), and dist/ (static web app).');
