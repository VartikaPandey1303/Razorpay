// Shared Collect — Playwright click-through.
// Fails on: any console error (incl. UNWIRED BUTTON / UNKNOWN ACTION), a wrong number,
// internal jargon on owner screens, or sideways scrolling at 390px.
// Usage: NODE_PATH=$(npm root -g) node fitcheck/mvp-test.js
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const FILE = 'file://' + path.join(__dirname, '..', 'index.html');
let failures = 0, passes = 0;
const ok = (c, m) => { if(c) passes++; else { failures++; console.log('  ✗ ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const BANNED = /provisional|ledger|agent-handled|evidence|\bbooked\b|\bpool\b|confidence|\bv1\b|scenario|reconcil|exception|stakeholder/i;
const CLINIC = "Echo machine EMI of ₹40,000, paid on the 5th, split by number of scans each of us did. Consultation rooms rent of ₹45,000, paid on the 5th, split by sessions. Sunita's salary (technician and front desk) ₹25,000, paid on the 7th, split equally between all four of us. Utilities ₹10,000, paid on the 20th — Dhruv pays one-third as he only comes on Tuesdays, the rest split equally.";

async function open(browser, query, width){
  const ctx = await browser.newContext({ viewport:{ width:width || 1280, height:900 } });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status:200, contentType:'text/css', body:'' }));
  const page = await ctx.newPage();
  page.errors = [];
  page.on('console', m => { if(m.type() === 'error') page.errors.push(m.text()); });
  page.on('pageerror', e => page.errors.push('pageerror: ' + e.message));
  await page.goto(FILE + (query || ''));
  await page.evaluate(() => { localStorage.clear(); });
  await page.goto(FILE + (query || ''));
  return page;
}
const text = async page => (await page.locator('#app').textContent()).replace(/\s+/g, ' ');
const btn = (page, name) => page.locator('#app > :not(.demobar) button', { hasText:name }).filter({ visible:true }).first();
async function click(page, name){ const b = btn(page, name); await b.waitFor({ state:'visible', timeout:3000 }); ok(await b.isEnabled(), `“${name}” is enabled`); await b.click(); await page.waitForTimeout(20); }
const next = async page => { await page.locator('.demobar .nx').click(); await page.waitForTimeout(20); };
const nextLabel = page => page.locator('.demobar .nx').textContent();
const flush = (page, where) => { ok(page.errors.length === 0, `no console errors at ${where}: ${page.errors.join(' | ')}`); page.errors = []; };
async function noJargon(page, where){ const t = await page.locator('#app').innerText(); const m = t.match(BANNED); ok(!m, `no internal jargon at ${where}${m ? ': “' + m[0] + '”' : ''}`); }
async function crawl(page, where){
  const snap = await page.evaluate(() => JSON.stringify(S));
  const n = await page.locator('#app button:visible').count();
  let clicked = 0;
  for(let k = 0; k < n; k++){
    const loc = page.locator('#app button:visible').nth(k);
    if(!(await loc.count()) || !(await loc.isEnabled())) continue;
    if((await loc.getAttribute('data-action')) === 'demoRestart') continue;
    try{ await loc.click({ timeout:800 }); clicked++; await page.waitForTimeout(10); }catch(e){}
    await page.evaluate(s => { S = JSON.parse(s); render(); }, snap);
  }
  flush(page, `crawl ${where} (${clicked} buttons)`);
}

(async () => {
  const browser = await chromium.launch();

  console.log('1. Rules engine and AI stand-ins');
  {
    const p = await open(browser, '?demo');
    const r = await p.evaluate(text => {
      fresh(); A.demoFillPeople();
      const d = localDraft(text, colleagues());
      S.costs = d.costs;
      const sh = computeShares(S.costs, allIds(), exampleCounts()).total;
      const g1 = cashGap(outflows(), [{d:'2026-09-01', amt:34636}, {d:DUE, amt:34116}, {d:'2026-10-20', amt:30082}, {d:DUE, amt:21166}], '2026-10-07');
      const g2 = cashGap(outflows(), [{d:'2026-09-01', amt:34636}, {d:DUE, amt:34116}, {d:'2026-10-20', amt:30082}], '2026-10-07');
      const read = localRead('Meera ji, is month thoda tight hai. 20 tak kar dunga, pakka.');
      return { names:d.costs.map(c => c.name), methods:d.costs.map(c => c.method + ':' + (c.measure || Object.keys(c.shares).join(''))), days:d.costs.map(c => c.payDay), q:d.questions.length,
        sh:[sh.me, sh.p1, sh.p2, sh.p3], g1, g2:g2.gap, read:[read.intent, read.date] };
    }, CLINIC);
    eq(r.names, ['Echo machine EMI','Consultation rooms rent','Sunita\'s salary','Utilities'], 'cost names');
    eq(r.methods, ['count:scans','count:sessions','equal:','share:p3'], 'split methods');
    eq(r.days, [5, 5, 7, 20], 'pay days');
    eq(r.q, 0, 'no open questions');
    eq(r.sh, [34636, 34116, 30082, 21166], 'shares');
    eq(r.g1, {need:110000, inflow:89918, gap:20082}, 'gap on 7 Oct');
    eq(r.g2, 41248, 'gap if Dhruv is not counted');
    eq(r.read, ['more-time', '2026-10-20'], 'reply read as more time, by 20 Oct');
    const other = await p.evaluate(() => {
      const ppl = n => n.map((x, i) => ({id:'p' + (i + 1), name:x, phone:''}));
      const renal = localDraft('Dialysis machine lease ₹60,000, paid on the 3rd, split by dialysis sessions. Nurse salary ₹30,000 split equally. Water plant ₹9,000 — Rao pays 50%.', ppl(['Dr Rao','Dr Iyer']));
      const kitchen = localDraft('Combi oven EMI ₹40,000 split by orders. Kitchen rent ₹45,000 split by shifts. Ravi\'s salary ₹25,000 split equally. Gas ₹10,000 — Sweet Spot pays ₹2,000 flat, rest equally.', ppl(['Tandoor Co','Bowl Theory','Sweet Spot']));
      const unknown = localDraft('Rent ₹30,000 — Kabir pays a third.', ppl(['Ishita']));
      const sum = (d, ids) => Object.values(computeShares(d.costs, ids, Object.fromEntries(d.costs.filter(c => c.measure).map(c => [c.measure, Object.fromEntries(ids.map((id, k) => [id, k + 3]))]))).total).reduce((a, b) => a + b, 0);
      return { renal:renal.costs.map(c => c.method + ':' + (c.measure || JSON.stringify(c.shares))), renalSum:sum(renal, ['me','p1','p2']),
        kitchen:kitchen.costs.map(c => c.name + ':' + c.method + ':' + (c.measure || JSON.stringify(c.fixed))), kitchenSum:sum(kitchen, ['me','p1','p2','p3']),
        unknownQ:unknown.questions.map(q => q.kind) };
    });
    eq(other.renal, ['count:dialysis sessions', 'equal:{}', 'share:{"p1":0.5}'], 'renal care: any measure, any share');
    eq(other.renalSum, 99000, 'renal care: shares add up');
    eq(other.kitchen, ['Combi oven EMI:count:orders', 'Kitchen rent:count:shifts', 'Ravi\'s salary:equal:{}', 'Gas:fixed:{"p3":2000}'], 'cloud kitchen: fixed amount');
    eq(other.kitchenSum, 120000, 'cloud kitchen: shares add up');
    eq(other.unknownQ, ['who'], 'unknown name becomes a question');
    flush(p, 'engine');
    await p.context().close();
  }

  console.log('2. Merchant view (no demo controls, no jargon)');
  {
    const p = await open(browser, '');
    ok(!(await p.locator('.demobar').count()), 'no demo bar without ?demo');
    ok((await text(p)).includes('Meera Diagnostics') && (await text(p)).includes('from your Razorpay account'), 'business comes from the account');
    ok(!(await p.locator('input[value="Meera Diagnostics"]').count()), 'business name is not editable');
    await noJargon(p, 'welcome');
    await click(p, 'Set up shared costs');
    await click(p, 'Continue');
    ok((await text(p)).includes('Add at least one person'), 'people step validates');
    await p.locator('input[aria-label="Name 1"]').fill('Dr Bhatt');
    await click(p, 'Add person'); await p.locator('input[aria-label="Name 2"]').fill('Dr Arjun');
    await click(p, 'Add person'); await p.locator('input[aria-label="Name 3"]').fill('Dr Dhruv');
    await noJargon(p, 'people');
    await click(p, 'Continue');
    await p.locator('textarea').fill(CLINIC);
    await noJargon(p, 'describe');
    await click(p, 'Draft my split');
    await p.waitForTimeout(50);
    const t = await text(p);
    ok(t.includes('split by scans') && t.includes('Dr Dhruv pays one-third'), 'split read back as sentences');
    await noJargon(p, 'check');
    await crawl(p, 'check');
    await click(p, 'Looks right');
    ok((await text(p)).includes('How will you give us the monthly numbers'), 'asks how numbers arrive (usage-based costs)');
    await click(p, 'Continue');
    ok((await text(p)).includes('Add the name of who sends the numbers'), 'numbers step validates');
    await p.locator('input[aria-label="Staff name"]').fill('Sunita');
    await click(p, 'Continue');
    await noJargon(p, 'send');
    await click(p, 'See what Dr Bhatt will see');
    ok((await p.locator('.modal').textContent()).includes('Accept'), 'preview shows their page');
    await p.locator('.modal button[data-action="closePreview"]').click();
    await click(p, 'Send to 3 people');
    ok((await text(p)).includes('0 of 3 accepted'), 'lands on replies');
    await noJargon(p, 'replies');
    for(const tab of ['Home','People','Settings']){ await p.locator('.tabs button', { hasText:tab }).click(); await noJargon(p, tab); await crawl(p, tab); }
    flush(p, 'merchant view');
    await p.context().close();
  }

  console.log('3. Full month, clicking through the demo');
  const p = await open(browser, '?demo');
  {
    await click(p, 'Set up shared costs');
    await click(p, 'Fill example'); await click(p, 'Continue');
    await click(p, 'Fill example'); await click(p, 'Draft my split'); await p.waitForTimeout(50);
    await click(p, 'Looks right');
    await click(p, 'Fill example'); await click(p, 'Continue');
    await click(p, 'Send to 3 people');
    ok((await nextLabel(p)).includes('Dr Bhatt accepts'), 'demo next: Bhatt accepts');
    await next(p); await next(p);
    ok((await text(p)).includes('How are my scans counted'), 'Arjun’s question shows on replies');
    await next(p);
    ok((await nextLabel(p)).includes('Answer Dr Arjun'), 'demo waits for the owner to answer');
    await p.locator('.tabs button', { hasText:'Home' }).click();
    ok((await text(p)).includes('Dr Arjun has a question'), 'Home shows the question');
    await click(p, 'Answer');
    await crawl(p, 'replies with question');
    await click(p, 'Send answer');
    await next(p);
    ok((await text(p)).includes('Everyone has accepted'), 'everyone accepted → clear next step');
    await click(p, 'Go to Home');
    ok((await nextLabel(p)).includes('Sunita sends'), 'demo next: Sunita sends numbers');
    await next(p);
    ok((await text(p)).includes("August's bills are ready to send"), 'Home: bills ready');
    await click(p, 'Check and send');
    const bt = await text(p);
    ok(bt.includes('₹34,116') && bt.includes('₹30,082') && bt.includes('₹21,166') && bt.includes('₹34,636'), 'bill amounts');
    await click(p, 'Dr Arjun');
    ok((await text(p)).includes('38 of 154 scans × ₹40,000'), 'bill shows the maths');
    await crawl(p, 'bill review');
    await click(p, 'Send 3 bills');
    for(let k = 0; k < 6 && !(await p.evaluate(() => openItems().length)); k++) await next(p);
    ok((await text(p)).includes('Dr Arjun asked for more time'), 'Home: Arjun asked for time');
    await click(p, 'Review');
    const dt = await text(p);
    ok(dt.includes('is month thoda tight hai') && dt.includes('Short on 7 Oct') && dt.includes('₹20,082'), 'decision shows what he said and the 7 Oct gap');
    ok(dt.includes('₹20,082 by 30 Sept and ₹10,000 by 20 Oct') && dt.includes('Agar nahi, batao kya possible hai.'), 'suggested reply sized by the rule');
    await p.locator('input[data-change="toggleExpect"]').uncheck(); await p.waitForTimeout(20);
    ok((await text(p)).includes('₹41,248'), 'gap if Dhruv isn’t counted');
    await p.locator('input[data-change="toggleExpect"]').check(); await p.waitForTimeout(20);
    await crawl(p, 'decision');
    await p.locator('.tones button[data-tone="warm"]').click(); await p.waitForTimeout(30);
    ok(await p.evaluate(() => S.tone === 'warm' && S.plans.p2.status === 'proposed'), 'tone stored and plan offered');
    await p.locator('.demobar .vw button', { hasText:'Dr Arjun’s phone' }).click();
    ok((await text(p)).includes('Accept the plan'), 'Arjun sees the plan on his phone');
    await crawl(p, 'Arjun’s phone (plan)');
    await click(p, 'Accept the plan');
    ok((await text(p)).includes('Pay ₹20,082 with UPI'), 'Arjun’s pay button shows the first part');
    await p.locator('.demobar .vw button', { hasText:'owner' }).click();
    for(let k = 0; k < 4 && !(await p.evaluate(() => openItems().length)); k++) await next(p);
    ok((await text(p)).includes('Dr Dhruv is likely to pay late'), 'Home: Dhruv nudge');
    await click(p, 'Review');
    ok((await text(p)).includes('Tone: warm'), 'later drafts use the chosen tone');
    await click(p, 'Send');
    for(let k = 0; k < 20 && !(await p.evaluate(() => S.closed)); k++) await next(p);
    const mt = await text(p);
    ok(/In by the due date\s*74%/.test(mt), 'summary: 74% by due date');
    ok(/From colleagues by the due date\s*63%/.test(mt) && mt.includes('₹54,198 of ₹85,364'), 'summary: 63% from colleagues (₹54,198 of ₹85,364)');
    ok(/Collected now\s*100%/.test(mt), 'summary: 100% collected');
    ok(mt.includes('only 40% of your colleagues'), 'summary: plain reminders would have been 40%');
    await crawl(p, 'summary');
    for(const v of ['Dr Bhatt’s phone','Dr Arjun’s phone','Dr Dhruv’s phone']){ await p.locator('.demobar .vw button', { hasText:v }).click(); await crawl(p, v + ' (closed)'); }
    await p.locator('.demobar .vw button', { hasText:'owner' }).click();
    for(const tab of ['Home','People','Settings']){ await p.locator('.tabs button', { hasText:tab }).click(); await crawl(p, tab + ' (closed)'); }
    flush(p, 'full month');
  }

  console.log('4. Colleague-side flows');
  {
    const r = await p.evaluate(async () => {
      fresh(); A.demoFillPeople(); A.demoFillText(); await A.draftSplit(); S.source.name = 'Sunita'; A.sendSplit();
      doDecline('p3', 'Utilities should be by hours'); render();
      const declined = document.body.innerText.includes('Decide what to do') || needsCards().some(c => /declined/.test(c[2]));
      A.removeFromSplit({dataset:{id:'p3'}});
      const afterRemove = [colleagues().length, status('p1'), S.version];
      ['p1','p2'].forEach(doAccept); S.today = BILL_DAY; S.month.counts = exampleCounts(); A.sendBills();
      await routeMessage('p1', 'My scans look too high, I did fewer.');
      await routeMessage('p2', 'Can I pay on the 10th?');
      return { declined, afterRemove, kinds:S.items.map(i => i.kind + ':' + (i.intent || i.date)) };
    });
    ok(r.declined, 'a decline lands on Home');
    eq(r.afterRemove, [2, 'pending', 2], 'removing someone resends a new version');
    eq(r.kinds, ['message:dispute', 'request:2026-10-10'], '“something’s not right” is read and routed');
    await p.evaluate(() => { S.view = 'owner'; S.page = 'home'; render(); });
    await crawl(p, 'Home with colleague messages');
    flush(p, 'colleague flows');
  }

  console.log('5. Phone width (390px)');
  {
    await p.setViewportSize({ width:390, height:844 });
    for(const pg of ['home','replies','bills','people','settings','split','month']){
      await p.evaluate(pg => { S.view = 'owner'; S.page = pg; render(); }, pg);
      ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 390, `no sideways scroll: ${pg}`);
    }
    await p.evaluate(() => { S.page = 'decision'; S.arg = S.items[0].id; render(); });
    ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 390, 'no sideways scroll: decision');
    await p.evaluate(() => { S.view = 'p:p1'; render(); });
    ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 390, 'no sideways scroll: colleague page');
    for(const st of ['welcome','people','describe','check','numbers','send']){
      await p.evaluate(st => { S.view = 'owner'; S.stage = st; render(); }, st);
      ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 390, `no sideways scroll: setup ${st}`);
    }
    flush(p, '390px');
  }
  await p.context().close();

  await browser.close();
  console.log(`\n${passes} passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
