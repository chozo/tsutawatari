import {mkdir,readFile,writeFile,copyFile,cp,rm} from 'node:fs/promises';

const root=new URL('../',import.meta.url),read=path=>readFile(new URL(path,root),'utf8');
const html=await read('index.html'),css=await read('style.css'),icon=await read('public/favicon.svg');
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
// 前回の出力が残ると、そのままデプロイされてしまうので毎回作り直す
await rm(dist,{recursive:true,force:true});
await mkdir(dist,{recursive:true});
for(const path of ['index.html','style.css','manifest.webmanifest','sw.js','physics.js','course.js','engine.js','scenery.js','game.js'])
 await copyFile(new URL(path,root),new URL(path,dist));
await cp(new URL('assets/',root),new URL('assets/',dist),{recursive:true});
// public/ のファイル（favicon.svg・ogp.png）は Vite と同じく、そのままの名前で公開ルートに置く
await cp(new URL('public/',root),dist,{recursive:true});
await writeFile(new URL('game.html',dist),singleFile);
// Keep a single-file build available directly at the game's route.
await writeFile(new URL('tsutawatari.html',dist),singleFile);
// Workers routes serving a subdirectory require the asset tree to mirror that path.
const gameRoute=new URL('tsutawatari/',dist);
await mkdir(gameRoute,{recursive:true});
await writeFile(new URL('index.html',gameRoute),singleFile);
// 公開URL /tsutawatari/ でも public/ のファイルを返す。index.html の og:image は https://game.chozo.net/tsutawatari/ogp.png を指す。
await cp(new URL('public/',root),gameRoute,{recursive:true});
console.log('Built game.html, tsutawatari.html (offline single-file), and dist/ (static web app).');
