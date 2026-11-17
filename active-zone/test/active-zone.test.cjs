// Run from the repo root:
//   NODE_PATH=$(npm root -g):<dir with temml installed>/node_modules node --test active-zone/test/
// Needs Playwright with Chromium and the temml package (same version as in index.html).
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright');
const temml = require('temml');

const FILE = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + FILE;
const TEMML_JS = fs.readFileSync(require.resolve('temml/dist/temml.min.js'), 'utf8');
let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser.close(); });

async function open(opts = {}) {
  const ctx = await browser.newContext(opts);
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/temml/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: TEMML_JS }));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error' && !/ERR_FAILED|Failed to load resource/.test(msg.text())) errors.push(msg.text()); });
  await page.goto(URL);
  return { ctx, page, errors };
}
const data = async page => page.evaluate(() => ({ CARDS: window.__zona.CARDS, UNITS: window.__zona.UNITS, TIPS: window.__zona.TIPS }));

test('content: every formula, gap and trap compiles; answers are unambiguous', async () => {
  const { ctx, page } = await open();
  const { CARDS, UNITS, TIPS } = await data(page);
  const fills = await page.evaluate(() => window.__zona.CARDS.map(c => [c.id,
    window.__zona.gapTex(c.gap.tex, null), ...[c.gap.a, ...c.gap.o].map(x => window.__zona.gapTex(c.gap.tex, x))]));
  const r = s => temml.renderToString(s, { trust: true, throwOnError: true });
  const ids = new Set();
  for (const c of CARDS) {
    assert.ok(!ids.has(c.id), 'duplicate id ' + c.id); ids.add(c.id);
    assert.ok(['math', 'phys', 'chem', 'mech'].includes(c.r), c.id);
    assert.ok([3, 4].includes(c.s), c.id);
    for (const k of ['topic', 'name', 'hook', 'npp', 'trap']) assert.ok(c[k] && c[k].length > 3, `${c.id}.${k}`);
    r(c.tex);
    assert.ok(c.gap.tex.includes('\\gap'), c.id + ' gap marker');
    assert.equal(c.gap.o.length, 3, c.id);
    assert.equal(new Set([c.gap.a, ...c.gap.o]).size, 4, c.id + ' options must differ');
    assert.ok(c.bad.length >= 1, c.id);
    for (const b of c.bad) { r(b.tex); assert.notEqual(b.tex, c.tex, c.id); assert.ok(b.why.length > 3); }
  }
  for (const [id, ...texs] of fills) for (const t of texs) assert.doesNotThrow(() => r(t), id + ': ' + t);
  for (const u of UNITS) { assert.equal(new Set([u.a, ...u.o]).size, 4, u.id); }
  for (const room of ['math', 'phys', 'chem', 'mech']) {
    assert.ok(CARDS.filter(c => c.r === room).length >= 10, room);
    assert.ok(TIPS[room].length >= 5, room);
  }
  await ctx.close();
});

test('formulas render as MathML, not raw TeX', async () => {
  const { ctx, page, errors } = await open();
  await page.click('[data-room="phys"]');
  assert.ok(await page.locator('.fcard math').count() >= 8);
  assert.equal(await page.locator('.fcard code').count(), 0);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('semester filter: 3rd shows only semester-3 topics, 4th adds semester-4', async () => {
  const { ctx, page } = await open();
  const { CARDS } = await data(page);
  await page.click('#seg-sem [data-v="3"]');
  await page.click('[data-room="phys"]');
  const n3 = await page.locator('.fcard').count();
  await page.click('#seg-sem [data-v="4"]');
  const n4 = await page.locator('.fcard').count();
  assert.equal(n3, CARDS.filter(c => c.r === 'phys' && c.s === 3).length);
  assert.equal(n4, CARDS.filter(c => c.r === 'phys').length);
  await ctx.close();
});

test('room: tip of the day, three facts per card, self-check veil', async () => {
  const { ctx, page, errors } = await open();
  await page.click('[data-room="mech"]');
  assert.match(await page.textContent('.tipbox'), /Совет дня/);
  const first = page.locator('.fcard').first();
  assert.equal(await first.locator('.facts > div').count(), 3);
  await page.click('[data-act="hide"]');
  assert.ok(await page.locator('.formula.veiled').count() > 0);
  await page.locator('[data-act="reveal"]').first().click();
  assert.equal(await page.locator('.fcard').first().locator('.formula.veiled').count(), 0);
  await page.reload();
  await page.click('[data-room="mech"]');
  assert.ok(await page.locator('.formula.veiled').count() > 0, 'setting persists');
  assert.deepEqual(errors, []);
  await ctx.close();
});

// answer the current question correctly or wrongly through the UI
async function respond(page, correct) {
  const q = await page.evaluate(() => { const g = window.__zona.game(); return { type: g.q.type, truth: g.q.truth, answer: g.q.answer, options: g.q.options }; });
  if (q.type === 'trap') return page.click(`[data-tf="${(q.truth === correct) ? 1 : 0}"]`);
  const idx = q.options.findIndex(o => (o === q.answer) === correct);
  return page.click(`[data-opt="${idx}"]`);
}
const phase = page => page.evaluate(() => window.__zona.game() && window.__zona.game().phase);
async function waitAsk(page) { await page.waitForFunction(() => { const g = window.__zona.game(); return g && (g.phase === 'ask' || g.phase === 'end'); }); }

test('fill-in game: 10 questions, scoring, record, persistence', async () => {
  const { ctx, page, errors } = await open();
  await page.click('#tab-games');
  await page.click('.game[data-play="gap"]');
  for (let i = 0; i < 10; i++) {
    await waitAsk(page);
    assert.equal(await page.locator('.fb').count(), 0, 'no feedback while answering');
    const ok = i !== 3;
    await respond(page, ok);
    if (!ok) { assert.match(await page.textContent('.fb'), /Неверно/); await page.keyboard.press('Enter'); }
  }
  await waitAsk(page);
  assert.equal(await phase(page), 'end');
  assert.match(await page.textContent('.stage'), /9 из 10/);
  assert.match(await page.textContent('.stage'), /новый рекорд/);
  assert.match(await page.textContent('.stage'), /Повтори эти формулы/);
  await page.reload();
  const s = await page.evaluate(() => window.__zona.state());
  assert.equal(s.best.gap, 9);
  assert.ok(Object.keys(s.prog).length >= 9);
  assert.equal(Object.values(s.prog).filter(p => p.l > 0).length, 1);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('reactor: three mistakes trip the scram; five right answers remove one', async () => {
  const { ctx, page, errors } = await open();
  await page.click('#tab-games');
  await page.click('.game[data-play="reactor"]');
  await waitAsk(page);
  await respond(page, false); await page.keyboard.press('Enter');
  await waitAsk(page);
  await respond(page, false); await page.keyboard.press('Enter');
  assert.ok(Math.abs(await page.evaluate(() => window.__zona.game().rho) - 0.0044) < 1e-9);
  for (let i = 0; i < 5; i++) { await waitAsk(page); await respond(page, true); }
  await waitAsk(page);
  assert.ok(Math.abs(await page.evaluate(() => window.__zona.game().rho) - 0.0022) < 1e-9, 'rods inserted');
  assert.ok(await page.evaluate(() => window.__zona.game().score) > 0);
  for (let i = 0; i < 2; i++) { await waitAsk(page); await respond(page, false); if (i === 0) await page.keyboard.press('Enter'); }
  assert.match(await page.textContent('.fb'), /аварийная защита/);
  await page.keyboard.press('Enter');
  assert.equal(await phase(page), 'end');
  assert.match(await page.textContent('.stage'), /Реактор заглушен/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('reactor: an unanswered question times out as a mistake', async () => {
  const { ctx, page } = await open();
  await page.click('#tab-games');
  await page.click('.game[data-play="reactor"]');
  await waitAsk(page);
  await page.evaluate(() => { window.__zona.game().qEnd = performance.now() + 200; });
  await page.waitForSelector('.fb');
  assert.match(await page.textContent('.fb'), /Время вышло/);
  await ctx.close();
});

test('true-or-trap: clock pauses during explanation and ends the round', async () => {
  const { ctx, page, errors } = await open();
  await page.click('#tab-games');
  await page.click('.game[data-play="trap"]');
  await waitAsk(page);
  await respond(page, false);
  const left1 = await page.evaluate(() => window.__zona.game().clockLeft);
  await page.waitForTimeout(600);
  await page.keyboard.press('Enter');
  await waitAsk(page);
  const left2 = await page.evaluate(() => window.__zona.game().clockEnd - performance.now());
  assert.ok(left2 > left1 - 300, 'clock paused while reading');
  await respond(page, true);
  await waitAsk(page);
  await page.evaluate(() => { window.__zona.game().clockEnd = performance.now() + 150; });
  await page.waitForFunction(() => window.__zona.game().phase === 'end');
  assert.match(await page.textContent('.stage'), /Время вышло: 1 очко/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('units game is disabled when only maths is selected', async () => {
  const { ctx, page } = await open();
  await page.click('#tab-games');
  for (const r of ['phys', 'chem', 'mech']) await page.click(`[data-groom="${r}"]`);
  assert.equal(await page.locator('.game[data-play="unit"]').isDisabled(), true);
  assert.equal(await page.locator('.game[data-play="gap"]').isDisabled(), false);
  await ctx.close();
});

test('spaced repetition: a mistake comes back as due the next day', async () => {
  const { ctx, page } = await open();
  await page.click('#tab-games');
  await page.click('.game[data-play="unit"]');
  await waitAsk(page);
  await respond(page, false);
  await page.keyboard.press('Enter');
  await page.click('[data-act="stop"]');
  await page.click('[data-act="quit"]');
  await page.evaluate(() => window.__zona.shiftDays(1));
  assert.equal(await page.textContent('#st-due'), '1');
  await ctx.close();
});

test('backup round-trip and reset', async () => {
  const { ctx, page } = await open();
  await page.click('#tab-games'); await page.click('.game[data-play="gap"]');
  await waitAsk(page); await respond(page, true);
  await waitAsk(page);
  await page.click('[data-act="stop"]');
  await page.click('#tab-progress');
  await page.click('#b-export');
  const backup = await page.inputValue('#backup');
  await page.click('#b-reset'); await page.click('#b-reset');
  assert.equal(await page.evaluate(() => Object.keys(window.__zona.state().prog).length), 0);
  await page.fill('#backup', 'мусор'); await page.click('#b-import');
  assert.match(await page.textContent('#toast'), /не копия/);
  await page.fill('#backup', backup); await page.click('#b-import');
  assert.equal(await page.evaluate(() => Object.keys(window.__zona.state().prog).length), 1);
  await ctx.close();
});

test('phone width: no horizontal page scroll anywhere', async () => {
  const { ctx, page } = await open({ viewport: { width: 360, height: 740 } });
  const over = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(await over() <= 0, 'rooms');
  await page.click('#seg-sem [data-v="0"]');
  for (const r of ['math', 'phys', 'chem', 'mech']) {
    await page.click(`[data-room="${r}"]`);
    assert.ok(await over() <= 0, r);
    await page.click('[data-act="rooms"]');
  }
  await page.click('#tab-games'); assert.ok(await over() <= 0, 'games');
  await page.click('.game[data-play="reactor"]');
  for (let i = 0; i < 6; i++) { await waitAsk(page); assert.ok(await over() <= 0, 'stage'); await respond(page, i % 2 === 0); if (i % 2) await page.keyboard.press('Enter'); }
  await page.click('#tab-progress'); assert.ok(await over() <= 0, 'progress');
  await ctx.close();
});
