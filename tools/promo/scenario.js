// ツタワタリの告知動画の台本。
// 時刻を決め打ちせず、ゲームの出来事（p.on）や状態（p.until）に合わせて字幕を出す。
// 行き先（ゴールの国）はゲームの楽しみなので、動画では明かさない。

export const config = {
  slug: 'tsutawatari',
  url: 'https://game.chozo.net/tsutawatari/',
  orientation: 'portrait',
  game: { width: 390, height: 720 },
  serveDir: '.',
  gamePath: '/',
  // ゲームの BGM（1拍 0.38 秒）に合わせた合成リズム。低音もゲームの和音の1オクターブ下
  music: { synth: { bpm: 60 / 0.38, gain: 0.16, roots: [98, 87.31, 73.42, 87.31] } },
};

// ゲームと同じ放物線で、今離したら次のツタに手が届くかを測る（tools/browser-journey.js と同じ考え方）
function reach(s, r = 14) {
  if (!s || s.status !== 'swing') return false;
  let p = { ...s.player };
  const v = s.vines[1];
  if (!v || p.vx < 40) return false;
  for (let i = 0; i < 240; i++) {
    const dt = 1 / 120;
    const q = { x: p.x + p.vx * dt, y: p.y + p.vy * dt + 310 * dt * dt, vx: p.vx, vy: p.vy + 620 * dt };
    for (let j = 0; j <= 4; j++) {
      const x = p.x + (q.x - p.x) * j / 4, y = p.y + (q.y - p.y) * j / 4;
      const nearY = Math.max(v.y, Math.min(v.y + v.length, y));
      if (Math.hypot(x - v.x, y - nearY) <= r) return true;
    }
    if (q.y >= 284) return false;
    p = q;
  }
  return false;
}

// 撮らずに、本物と同じ入口（press / release / step）だけで vine 番目のツタまで進める
async function advanceTo(p, vine) {
  await p.eval((target, w) => {
    const g = w.__game;
    const reach = (s) => {
      let p = { ...s.player }; const v = s.vines[1];
      if (!v || p.vx < 40) return false;
      for (let i = 0; i < 240; i++) {
        const dt = 1 / 120, q = { x: p.x + p.vx * dt, y: p.y + p.vy * dt + 310 * dt * dt, vx: p.vx, vy: p.vy + 620 * dt };
        for (let j = 0; j <= 4; j++) { const x = p.x + (q.x - p.x) * j / 4, y = p.y + (q.y - p.y) * j / 4, nearY = Math.max(v.y, Math.min(v.y + v.length, y)); if (Math.hypot(x - v.x, y - nearY) <= 14) return true; }
        if (q.y >= 284) return false; p = q;
      }
      return false;
    };
    while (g.state().current < target) {
      g.press();
      for (let i = 0; i < 1800 && !reach(g.state()); i++) g.step(1 / 120);
      g.release(); g.press();
      for (let i = 0; i < 300 && g.state().status === 'flight'; i++) g.step(1 / 120);
      g.release(false);
      if (g.state().status !== 'swing') throw Error('advanceTo: 失敗 ' + g.state().current);
    }
    g.step(1.5); // カメラと景色の切り替えを落ち着かせる
    g.drainEvents(); g.audio.drain();
  }, vine);
}

// 1回の飛び移り（撮影しながら）。長押し → 届く瞬間に離す → 空中で押し直してキャッチ。
// つかんだ後は押したまま（次の揺れにつなげる。離すとジャンプになる）
async function hop(p, { max = 6, onRelease } = {}) {
  await p.call('touchDown');
  await p.until((s) => reach(s), { max });
  await p.call('touchUp');
  onRelease?.();
  await p.call('touchDown');
  await p.until((s) => s.status !== 'flight', { max: 3 });
}

export default async function scenario(p) {
  await p.seed(7);
  let catchFx = true;
  const catchWords = ['パシッ！', 'キャッチ！', 'つかんだ！'];
  let catchCount = 0;
  p.on('catch', (e) => {
    if (!catchFx) return;
    p.fx(e.hard ? 'キャッチ！！' : catchWords[catchCount++ % catchWords.length], { x: 0.5, y: 0.58, size: e.hard ? 80 : 64 });
    p.shake(e.hard ? 12 : 6, 0.25);
  });
  p.on('fall', () => p.shake(16, 0.5));

  // ゲームの BGM を最初から鳴らす（効果音と同じ関数で書き出す）
  await p.call('audio.play', 'bgm', 32);

  // ---- 0〜2.5秒 つかみ: 終盤・海の難所をスローで ----
  await p.call('start');
  await advanceTo(p, 38);
  await p.call('touchDown');
  await p.until((s) => reach(s), { max: 6, record: false });
  p.zoom(1.22, 0, { x: 0.5, y: 0.5 });
  p.speed(0.35, { badge: false });
  p.caption('いま、離せ！', { y: 0.15, dur: 1.1, size: 60, color: '#ffe36a' });
  await p.call('touchUp');
  await p.call('touchDown');
  await p.until((s) => s.status !== 'flight', { max: 3 });
  p.flash({ strength: 0.7 });
  p.speed(1);
  p.zoom(1, 0.4);
  await p.wait(0.6);

  // ---- 2.5〜6秒 タイトル（裏で最初からやり直す）----
  await p.call('reset');
  await p.call('start');
  await p.skip(0.3);
  p.title({ title: 'ツタワタリ', sub: 'ツタからツタへ\n世界を渡る旅！', logo: '/assets/explorer.png', dur: 3 });
  await p.call('touchDown'); // タイトルの裏で揺れ始めておく
  await p.wait(3.4);

  // ---- 6〜10秒 遊び方 ----
  p.caption('長押しで\n大きく揺らして…', { y: 0.145, dur: 1.0 });
  await hop(p, { onRelease: () => p.caption('離してジャンプ！', { y: 0.145, dur: 1.4, color: '#ffe36a' }) });
  await p.wait(0.3);
  p.caption('空中でもう一度押して\nツタをつかめ！', { y: 0.145, dur: 2, size: 42 });
  await hop(p);
  await p.wait(0.2);

  // ---- 10〜14秒 惜しい失敗 → 同じツタから再挑戦 ----
  catchFx = false;
  await p.call('touchDown');
  await p.until((s) => reach(s, 40) && !reach(s), { max: 6 }); // ほんの少し早く離す
  await p.call('touchUp');
  await p.call('touchDown');
  await p.until((s) => s.status === 'failed', { max: 3 });
  await p.call('touchUp');
  p.caption('あと少し…！', { y: 0.145, dur: 1.3, color: '#ff8f7a' });
  await p.wait(1.6);
  p.caption('落ちても\nこのツタから再開！', { y: 0.145, dur: 1.8 });
  await p.wait(0.5);
  await p.call('resume');
  catchFx = true;
  await hop(p, { onRelease: () => {} });
  p.fx('リベンジ成功！', { x: 0.47, y: 0.5, size: 60, dur: 1 });
  await p.wait(0.4);

  // ---- 14〜21秒 景色が変わる（早送り）----
  catchFx = false;
  let areaCaptionEnd = 0;
  p.on('area', (e) => { if (e.area >= 2) { p.caption(`${e.name}へ！`, { y: 0.145, dur: 1.2, color: '#bff5ff' }); areaCaptionEnd = p.time + 1.2; } });
  p.caption('景色がどんどん\n変わっていく！', { y: 0.145, dur: 1.8 });
  p.speed(3);
  for (let i = 0; i < 14; i++) await hop(p);
  p.speed(1);
  p.off('area');
  await p.wait(Math.max(0, areaCaptionEnd - p.time) + 0.1); // 字幕を読み終えてから場面を切り替える

  // ---- 21〜26秒 クライマックス: 溶岩帯の難所をスローで ----
  await advanceTo(p, 28);
  p.flash({ strength: 0.6, dur: 0.3 });
  catchFx = true;
  p.caption('難所は\nタイミング勝負！', { y: 0.145, dur: 1.8, color: '#ffb36a' });
  await p.call('touchDown');
  await p.until((s) => reach(s), { max: 6 });
  p.speed(0.4, { badge: false });
  p.zoom(1.18, 0.25, { x: 0.5, y: 0.45 });
  await p.call('touchUp');
  await p.call('touchDown');
  await p.until((s) => s.status !== 'flight', { max: 3 });
  await p.call('release', false); // つかんだまま揺れるだけにする（離すとジャンプしてしまう）
  p.flash({ strength: 0.8 });
  p.speed(1);
  p.zoom(1, 0.4);
  await p.wait(0.9);
  p.caption('この旅の行き先は…？', { y: 0.145, dur: 1.6, size: 48, color: '#ffe36a' });
  await p.wait(1.6);

  // ---- エンドカード ----
  p.endCard({ title: 'ツタワタリ', sub: '長押しで揺れて\n離してジャンプ！', logo: '/assets/explorer.png' });
  await p.wait(3);
}
