// Run: node --test termin/test/   (needs Playwright with Chromium)
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser.close(); });

async function open(opts = {}) {
  const ctx = await browser.newContext(opts);
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.goto(URL);
  return { ctx, page, errors };
}

test('scheduler: intervals grow, lapses reset, ease stays bounded', async () => {
  const { ctx, page } = await open();
  const r = await page.evaluate(() => {
    const s = window.__termin.schedule;
    const a = s(null, 2, 100), b = s(a, 2, 101), c = s(b, 2, 104), lapse = s(c, 0, 112);
    let low = null; for (let i = 0; i < 20; i++) low = s(low, 0, 0);
    let high = null; for (let i = 0; i < 20; i++) high = s(high, 3, 0);
    return { a, b, c, lapse, low, high, easyNew: s(null, 3, 0), hardNew: s(null, 1, 0) };
  });
  assert.deepEqual([r.a.i, r.a.d], [1, 101]);
  assert.equal(r.b.i, 3);
  assert.equal(r.c.i, 8);
  assert.deepEqual([r.lapse.i, r.lapse.r, r.lapse.l, r.lapse.d], [0, 0, 1, 112]);
  assert.equal(r.low.e, 1.3);
  assert.equal(r.high.e, 3);
  assert.equal(r.high.i, 365);
  assert.equal(r.easyNew.i, 4);
  assert.equal(r.hardNew.i, 1);
  await ctx.close();
});

test('answer check: variants, ё/е, typos, articles', async () => {
  const { ctx, page } = await open();
  const r = await page.evaluate(() => {
    const c = window.__termin.check;
    return [
      c('твэл', 'твэл (тепловыделяющий элемент)'), c('Тепловыделяющий элемент', 'твэл (тепловыделяющий элемент)'),
      c('обьем', 'объём'), c('объем', 'объём'), c('speed', 'velocity / speed'), c('the report', 'report'),
      c('ускарение', 'ускорение'), c('масса', 'сила'), c('', 'сила'), c('power', 'power (exponent)'),
      c("dean's office", "dean's office"), c('deans office', "dean's office"),
    ];
  });
  assert.deepEqual(r, ['ok', 'ok', 'near', 'ok', 'ok', 'ok', 'near', 'bad', 'bad', 'ok', 'ok', 'near']);
  await ctx.close();
});

test('bulk paste parser', async () => {
  const { ctx, page } = await open();
  const r = await page.evaluate(() => window.__termin.parseBulk('теплообменник = heat exchanger\nарматура — valves\n\nбез перевода\nпаро-водяной;steam-water'));
  assert.deepEqual(r, [['теплообменник', 'heat exchanger'], ['арматура', 'valves'], ['паро-водяной', 'steam-water']]);
  await ctx.close();
});

test('flip session: grade, persist across reload, come back when due', async () => {
  const { ctx, page, errors } = await open();
  await page.click('#tab-progress'); await page.click('#seg-perday [data-v="5"]'); await page.click('#tab-study');
  assert.match(await page.textContent('.meter span'), /0 \/ 5/);
  const first = await page.textContent('.term');
  await page.click('[data-act="reveal"]');
  assert.ok(await page.isVisible('.answer'));
  await page.click('[data-grade="0"]'); // again: goes to the back of the queue
  assert.match(await page.textContent('.meter span'), /0 \/ 5/);
  for (let i = 0; i < 5; i++) { await page.keyboard.press('Space'); await page.keyboard.press('3'); }
  assert.match(await page.textContent('#session'), /Session complete/);
  assert.match(await page.textContent('#session'), /6 reviews done today/);
  await page.reload();
  assert.match(await page.textContent('#session'), /Session complete/);
  assert.equal(await page.evaluate(() => Object.keys(window.__termin.state().prog).length), 5);
  assert.equal(await page.textContent('#st-streak'), '1 day');
  await page.evaluate(() => window.__termin.shiftDays(1));
  assert.equal(await page.textContent('#st-due'), '5');
  assert.match(await page.textContent('.meter span'), /0 \/ 10/); // 5 reviews + 5 new
  assert.ok(first.length > 0);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('type mode: correct answer is accepted, wrong one repeats', async () => {
  const { ctx, page, errors } = await open();
  await page.click('#seg-mode [data-v="type"]');
  await page.click('#seg-dir [data-v="en-ru"]');
  await page.fill('#type-in', 'совсем не то');
  await page.keyboard.press('Enter');
  assert.match(await page.textContent('.verdict'), /Not this time/);
  await page.keyboard.press('Enter');
  assert.match(await page.textContent('.meter span'), /^0 \//);
  const answer = await page.textContent('.term');
  const ru = await page.evaluate(en => {
    // look the Russian side up through the Terms tab data
    document.getElementById('tab-terms').click();
    const li = [...document.querySelectorAll('#list li')].find(l => l.querySelector('.en').textContent === en);
    document.getElementById('tab-study').click();
    return li.querySelector('.ru').textContent;
  }, answer);
  await page.fill('#type-in', ru);
  await page.keyboard.press('Enter');
  assert.match(await page.textContent('.verdict'), /Correct/);
  await page.keyboard.press('Enter');
  assert.match(await page.textContent('.meter span'), /^1 \//);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('own terms: add, search, study deck, delete', async () => {
  const { ctx, page, errors } = await open();
  await page.click('#tab-add');
  await page.fill('#f-ru', 'теплообменник'); await page.fill('#f-en', 'heat exchanger');
  await page.click('#add-form button[type="submit"]');
  await page.fill('#f-bulk', 'арматура = valves\nтеплообменник = heat exchanger');
  await page.click('#bulk-btn');
  assert.match(await page.textContent('#toast'), /Added 1 term, skipped 1/);
  await page.click('#tab-terms');
  await page.fill('#q', 'теплооб');
  assert.equal(await page.locator('#list li').count(), 2); // теплообменник + built-in теплообмен
  await page.selectOption('#deck-filter', 'my');
  assert.equal(await page.locator('#list li').count(), 1);
  await page.click('[data-del]');
  assert.equal(await page.locator('#list li').count(), 0);
  await page.reload();
  assert.equal(await page.evaluate(() => window.__termin.state().custom.length), 1);
  assert.equal(await page.locator('.chip[data-deck="my"]').count(), 1);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('backup round-trip and reset', async () => {
  const { ctx, page, errors } = await open();
  await page.keyboard.press('Space'); await page.keyboard.press('3');
  await page.click('#tab-progress');
  await page.click('#b-export');
  const backup = await page.inputValue('#backup');
  await page.click('#b-reset'); await page.click('#b-reset');
  assert.equal(await page.evaluate(() => Object.keys(window.__termin.state().prog).length), 0);
  await page.fill('#backup', 'not json'); await page.click('#b-import');
  assert.match(await page.textContent('#toast'), /not a Термин backup/);
  await page.fill('#backup', backup); await page.click('#b-import');
  assert.equal(await page.evaluate(() => Object.keys(window.__termin.state().prog).length), 1);
  assert.match(await page.textContent('#tiles'), /Terms started\s*1/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('phone width: no horizontal scroll in any view', async () => {
  const { ctx, page } = await open({ viewport: { width: 360, height: 740 } });
  for (const t of ['study', 'terms', 'add', 'progress']) {
    await page.click('#tab-' + t);
    if (t === 'study') await page.click('[data-act="reveal"]');
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(over <= 0, `${t} overflows by ${over}px`);
  }
  await ctx.close();
});

test('every built-in card has a unique id and both sides', async () => {
  const { ctx, page } = await open();
  const r = await page.evaluate(() => {
    document.getElementById('tab-terms').click();
    const rows = [...document.querySelectorAll('#list li')].map(l => [l.querySelector('.ru').textContent, l.querySelector('.en').textContent]);
    return { n: rows.length, uniq: new Set(rows.map(r => r[0])).size, empty: rows.filter(r => !r[0] || !r[1]).length };
  });
  assert.ok(r.n >= 150);
  assert.equal(r.uniq, r.n);
  assert.equal(r.empty, 0);
  await ctx.close();
});
