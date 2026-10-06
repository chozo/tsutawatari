import {mkdir, readFile, rm, writeFile, copyFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {promo} from './scenario.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const work = path.join(root, 'video', 'work');
const swiftCache = '/private/tmp/tsutawatari-swift-cache';
const sources = path.join(root, 'tools', 'promo', 'assets');
await mkdir(work, {recursive: true});
await mkdir(sources, {recursive: true});
await mkdir(swiftCache, {recursive: true});

// Keep the generated art with the source so the promo can be rebuilt later.
const world = path.join(sources, 'promo-world.png');
const hero = path.join(sources, 'explorer.png');
try { await readFile(world); } catch { await copyFile(path.join(work, 'promo-world.png'), world); }
try { await readFile(hero); } catch { await copyFile(path.join(root, 'assets', 'explorer.png'), hero); }

const scenarioFile = path.join(work, 'scenario.json');
const audioFile = path.join(work, 'music.wav');
await writeFile(scenarioFile, JSON.stringify(promo));
function run(command, args) {
  const env = command === 'swift' ? {...process.env, CLANG_MODULE_CACHE_PATH: swiftCache, SWIFT_MODULECACHE_PATH: swiftCache} : process.env;
  const result = spawnSync(command, args, {cwd: root, stdio: 'inherit', env});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status}`);
}
run('python3', [path.join(root, 'tools', 'promo', 'music.py'), audioFile]);
run('swift', [path.join(root, 'tools', 'promo', 'render.swift'), world, hero, audioFile, scenarioFile, path.join(root, 'video')]);
await rm(path.join(root, 'video', 'tsutawatari-promo-silent.mov'), {force: true});
await rm(work, {recursive: true, force: true});
console.log('Promo video and cover are ready in video/.');
