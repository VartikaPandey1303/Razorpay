// Shared Collect v8 — Playwright click-through. Fails on any console error,
// UNWIRED BUTTON / UNKNOWN ACTION, wrong number, or horizontal scroll at 390px.
// Usage: node fitcheck/mvp-test.js   (needs the `playwright` package)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const SRC = path.join(__dirname, '..', 'index.html');
const OUT = path.join(__dirname, '.wrapped.html');
// The host wraps the page in a skeleton at publish time; do the same here.
fs.writeFileSync(OUT, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${fs.readFileSync(SRC, 'utf8')}</body></html>`);
const URL = 'file://' + OUT;

let failures = 0, passes = 0;
const ok = (cond, msg) => { if(cond){ passes++; } else { failures++; console.log('  ✗ ' + msg); } };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

async function newPage(browser, width){
  const ctx = await browser.newContext({ viewport:{ width:width || 1280, height:900 } });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status:200, contentType:'text/css', body:'' }));
  const page = await ctx.newPage();
  page.errors = [];
  page.on('console', m => { if(m.type() === 'error') page.errors.push(m.text()); });
  page.on('pageerror', e => page.errors.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.evaluate(() => { try{ localStorage.clear(); }catch(e){} });
  await page.goto(URL);
  return page;
}
const btn = (page, name) => page.locator('#app button', { hasText:name }).filter({ visible:true }).first();
async function click(page, name){ const b = btn(page, name); await b.waitFor({ state:'visible', timeout:3000 }); ok(await b.isEnabled(), `button "${name}" enabled`); await b.click(); }
async function nav(page, label){ await page.locator('.rail .nav button', { hasText:label }).first().click(); }
const text = async page => (await page.locator('#app').textContent()).replace(/\s+/g, ' ');
const flushErrors = (page, where) => { ok(page.errors.length === 0, `no console errors at ${where}: ${page.errors.join(' | ')}`); page.errors = []; };

// Click every visible enabled button once, restoring state after each.
async function crawl(page, where){
  const snap = await page.evaluate(() => JSON.stringify(S));
  const n = await page.locator('#app button:visible').count();
  let clicked = 0;
  for(let k = 0; k < n; k++){
    const loc = page.locator('#app button:visible').nth(k);
    if(!(await loc.count())) break;
    if(!(await loc.isEnabled())) continue;
    const action = await loc.getAttribute('data-action');
    if(action === 'reset') continue;
    try{ await loc.click({ timeout:1000 }); clicked++; }catch(e){ /* layout moved; ignore */ }
    await page.evaluate(s => { S = JSON.parse(s); render(); }, snap);
  }
  // inputs/selects fire change through the same dispatcher
  flushErrors(page, `crawl ${where} (${clicked} buttons)`);
}

(async () => {
  const browser = await chromium.launch({ executablePath:fs.existsSync('/opt/pw-browsers/chromium') ? undefined : undefined });

  /* 1 — engine numbers */
  console.log('1. Rules engine');
  {
    const page = await newPage(browser);
    const r = await page.evaluate(() => {
      fresh('clinic', true); A.draftRule();
      const sh = computeShares(S.lines, S.counts).total;
      const out = S.outflows;
      const inf7 = [{d:'2026-09-03', amt:34636},{d:DUE, amt:34116},{d:'2026-10-20', amt:30082},{d:DUE, amt:21166}];
      const g1 = cashGap(out, inf7, '2026-10-07');
      const g2 = cashGap(out, inf7.filter((_, i) => i !== 3), '2026-10-07');
      return { sh, hits:S.rule.hits, modes:S.lines.map(l => l.mode + ':' + (l.unit || '')), g1, g2,
        intent:classify(TPL.clinic.reply).intent, sum:Object.values(sh).reduce((a, b) => a + b, 0) };
    });
    eq(r.sh, {A:34636, B:34116, C:30082, D:21166}, 'shares');
    eq(r.sum, 120000, 'shares sum to pool');
    eq(r.hits, 4, 'rule lines recognised');
    eq(r.modes, ['count:scans','count:sessions','equal:','third:'], 'rule modes');
    eq(r.g1, {need:110000, inflow:89918, gap:20082}, 'cash gap 7 Oct, D expected');
    eq(r.g2.gap, 41248, 'cash gap 7 Oct, D not expected');
    eq(r.intent, 'request-time', 'Arjun reply intent');
    flushErrors(page, 'engine');
    await page.context().close();
  }

  /* 2 — click-through of the default path */
  console.log('2. Default path, by clicking');
  const page = await newPage(browser);
  {
    ok((await text(page)).includes('Shared Cost Recovery Agent'), 'install page');
    ok(await page.locator('.rail .nav button[data-arg="setup"]').isDisabled(), 'nav disabled before workspace');
    await click(page, 'Continue');
    ok((await page.locator('h1').first().innerText()) === 'Setup', 'landed on Setup');
    await crawl(page, 'setup (before draft)');
    await click(page, 'Draft the rule');
    ok((await text(page)).includes('4 of 4 lines recognised'), 'draft shows 4 of 4');
    ok((await text(page)).includes('This is what each stakeholder sees before any bill'), 'fairness caption');
    await crawl(page, 'setup (drafted)');
    await click(page, 'Looks right → invite stakeholders');
    ok((await text(page)).includes('What Dr Bhatt will see'), 'invite preview');
    await crawl(page, 'invite');
    await click(page, 'Send rule v1');
    ok((await text(page)).includes('Agent handles 0 of 3 · all 3 invoiced'), 'handles 0 of 3 after send');

    // Dr Arjun accepts on his own page; Bhatt and Dhruv via the scenario drawer
    await click(page, 'Preview stakeholder page');
    await crawl(page, 'stakeholder page (awaiting)');
    await click(page, 'Accept the rule');
    await page.locator('.fab').click();
    await page.locator('.drawer button', { hasText:'Dr Bhatt accepts the rule' }).click();
    await page.locator('.drawer button', { hasText:'Dr Dhruv accepts the rule' }).click();
    await page.locator('.drawer button[data-action="toggleDrawer"]').click();
    await nav(page, 'Stakeholders');
    ok((await text(page)).includes('Agent handles 3 of 3 · all 3 invoiced'), 'handles 3 of 3');
    ok((await page.locator('.rail .status').innerText()).includes('Active · review-first'), 'rail says active');

    // counts arrive, resolve the planted discrepancy, issue
    await nav(page, 'Usage & billing');
    ok((await text(page)).includes('waiting for counts'), 'billing waiting for counts');
    ok(await btn(page, 'Issue invoices and virtual accounts').isDisabled(), 'issue disabled without counts');
    await crawl(page, 'usage (waiting)');
    await click(page, 'Upload sheet');
    await click(page, 'Use sample sheet');
    ok((await text(page)).includes('Dropped patient_name, patient_phone, referred_by'), 'CSV connector drops identity columns');
    ok((await text(page)).includes('register 48, machine log 50'), 'exception card');
    ok(await btn(page, 'Issue invoices and virtual accounts').isDisabled(), 'issue disabled with open exception');
    await crawl(page, 'usage (exception)');
    await click(page, 'Use register (48)');
    await page.evaluate(() => { S.today = '2026-09-03'; render(); });
    await click(page, 'Issue invoices and virtual accounts');
    const sh = await page.evaluate(() => shares());
    eq(sh, {A:34636, B:34116, C:30082, D:21166}, 'billed shares');
    ok((await text(page)).includes('issued 3 Sept'), 'issued pill');
    await crawl(page, 'usage (issued)');

    // advance to Arjun's reply
    await page.locator('.fab').click();
    for(let k = 0; k < 8 && (await page.evaluate(() => S.today)) !== '2026-09-25'; k++) await page.locator('.drawer button[data-action="advance"]').click();
    ok(await page.evaluate(() => S.today) === '2026-09-25', 'advanced to 25 Sept');
    await page.locator('.drawer button[data-action="toggleDrawer"]').click();
    await nav(page, 'Decisions');
    const dt = await text(page);
    ok(dt.includes('is month thoda tight hai'), 'reply quote');
    ok(dt.includes('request-time'), 'intent pill');
    ok(dt.includes('₹20,082 by 30 Sept and ₹10,000 by 20 Oct'), 'proposed ask amounts');
    ok(dt.includes('Agar nahi, batao kya possible hai.'), 'operator line in draft');
    ok(dt.includes('Gap on 7 Oct') && dt.includes('₹20,082'), 'gap ₹20,082 on card');
    await page.locator('input[data-action="toggleExpectD"]').uncheck();
    ok((await text(page)).includes('₹41,248'), 'gap with D not expected');
    await page.locator('input[data-action="toggleExpectD"]').check();
    await crawl(page, 'decisions (reply open)');
    await click(page, 'WhatsApp view');
    await crawl(page, 'decisions (WhatsApp view)');
    await click(page, 'Card view');
    await page.locator('.drafts .opt[data-tone="warm"]').click();
    ok(await page.evaluate(() => S.tone) === 'warm', 'tone stored');
    ok(await page.evaluate(() => S.planC && S.planC.inst1 === 20082 && S.planC.inst2 === 10000), 'plan stored from rules');

    // Arjun's page shows the plan; accept it there
    await page.evaluate(() => { S.viewPayer = 'C'; S.page = 'payer'; render(); });
    ok((await text(page)).includes('Accept the plan'), 'plan pending on his page');
    await crawl(page, 'stakeholder page (plan pending)');
    await click(page, 'Accept the plan');

    // run to month end, approving the pre-due nudge
    await page.locator('.fab').click();
    for(let k = 0; k < 20; k++){
      const adv = page.locator('.drawer button[data-action="advance"]');
      if(!(await adv.count())) break;
      await adv.click();
      if(await page.evaluate(() => openItems().some(i => i.kind === 'prelate'))){
        await page.locator('.drawer button[data-action="toggleDrawer"]').click();
        await nav(page, 'Decisions');
        ok((await text(page)).includes('Tone: warm'), 'later card shows tone');
        await crawl(page, 'decisions (prelate)');
        await click(page, 'Approve');
        await page.locator('.fab').click();
      }
    }
    ok(await page.evaluate(() => S.closed), 'cycle closed');
    if(await page.locator('.drawer').count()) await page.locator('.drawer button[data-action="toggleDrawer"]').click();
    await nav(page, 'Month report');
    const rt = await text(page);
    ok(/Covered by original due\s*74%/.test(rt), 'covered by original due 74%');
    ok(/External by original due\s*63%/.test(rt), 'external by original due 63%');
    ok(rt.includes('₹54,198 of ₹85,364'), 'external ₹54,198 of ₹85,364');
    ok(/Collected to date\s*100%/.test(rt), 'collected 100%');
    ok(rt.includes('operator-confirmed') && rt.includes('observed once'), 'learned pills');
    await crawl(page, 'report');
    for(const p of ['Overview','Stakeholders','Activity','Usage & billing','Decisions']){ await nav(page, p); await crawl(page, p + ' (closed)'); }
  }

  /* 3 — every sheet opens and closes cleanly */
  console.log('3. Sheets');
  {
    const kinds = await page.evaluate(() => {
      const out = [];
      const tries = [['math',{id:'C',key:'equip'}],['question',{id:'scans:A'}],['request-time',{id:'D'}],['neft',{id:'B'}],['menu',{id:'C'}],['menu',{id:'C',sub:'log'}],['menu',{id:'C',sub:'rule'}],['menu',{id:'C',sub:'question'}],['invoice',{id:'B'}],['source',{id:'invoices'}],['source',{id:'whatsapp'}],['source',{id:'connector'}],['source',{id:'never'}],['source',{id:'second'}],['about',{}]];
      tries.forEach(([k, p]) => { S.sheet = {kind:k, payload:p}; render(); out.push(k + ':' + !!document.querySelector('.sheet')); });
      S.sheet = null; render(); return out;
    });
    ok(kinds.every(k => k.endsWith('true')), 'all sheet variants render: ' + kinds.join(','));
    flushErrors(page, 'sheets');
  }

  /* 4 — 390px, every page, no horizontal scroll */
  console.log('4. 390px layout');
  {
    const snap = await page.evaluate(() => JSON.stringify(S));
    await page.setViewportSize({ width:390, height:844 });
    for(const p of ['overview','setup','stakeholders','usage','decisions','payer','activity','report']){
      await page.evaluate(([s, pg]) => { S = JSON.parse(s); S.page = pg; render(); }, [snap, p]);
      const w = await page.evaluate(() => document.documentElement.scrollWidth);
      ok(w <= 390, `no horizontal scroll on ${p} (scrollWidth ${w})`);
    }
    await page.evaluate(s => { S = JSON.parse(s); S.page = 'setup'; S.setupStep = 'invite'; render(); }, snap);
    ok(await page.evaluate(() => document.documentElement.scrollWidth) <= 390, 'no horizontal scroll on invite');
    flushErrors(page, '390px');
  }
  await page.context().close();

  /* 5 — scripted default path, ledger mode, provisional, workspaces */
  console.log('5. Variants');
  {
    const p = await newPage(browser);
    const r = await p.evaluate(() => { playDefault(); const m = metrics(); return [pct(m.byDue, m.p), pct(m.extByDue, m.extTotal), m.extByDue, m.extTotal, pct(m.coll, m.p)]; });
    eq(r, [74, 63, 54198, 85364, 100], 'playDefault month end');

    // ledger mode: Dhruv declines
    await p.evaluate(() => { fresh('clinic', true); A.draftRule(); A.sendRule(); acceptRule('B'); acceptRule('C'); declineRule('D', 'Utilities by hours'); S.page = 'stakeholders'; render(); });
    const lt = await text(p);
    ok(lt.includes('Agent handles 2 of 3 · all 3 invoiced'), 'ledger: handles 2 of 3');
    ok(lt.includes("Invoices and the activity log still cover Dr Dhruv; the agent won't message them."), 'ledger line');
    const noD = await p.evaluate(() => { S.today = '2026-09-03'; receiveCounts(); S.exc['scans:A'] = 'register'; doIssue(false); for(let k = 0; k < 6; k++) advance(); return S.inbox.some(i => i.from === 'D'); });
    ok(!noD, 'no decisions about a ledger-only stakeholder');

    // edit after send bumps version and resets consent
    const v = await p.evaluate(() => { fresh('clinic', true); A.draftRule(); A.sendRule(); acceptRule('B'); syncActive(); S.lines[3].amount = 12000; ruleEdited(); return [S.ruleVersion, S.consent.B, S.sentRule]; });
    eq(v, [2, null, false], 'edit after send → v2, consent reset');

    // provisional billing and true-up
    const pr = await p.evaluate(() => { fresh('clinic', true); A.draftRule(); doIssue(true); const prov = S.provisional; S.page = 'payer'; S.viewPayer = 'C'; render();
      const banner = document.body.innerText.includes('Based on last month\'s usage — will be corrected when counts arrive. You can pay now or wait.');
      receiveCounts('System'); return [prov, banner, S.provisional, !!S.trueUp, Object.values(S.trueUp.diff).reduce((a, b) => a + b, 0)]; });
    eq(pr, [true, true, false, true, 0], 'provisional → banner → true-up sums to 0');
    await p.evaluate(() => { S.page = 'report'; render(); });
    ok((await text(p)).includes('True-up next cycle'), 'true-up card in report');

    // blocked sending / issuing with stated reasons
    const bl = await p.evaluate(() => { fresh('clinic', true); A.draftRule(); S.sources.whatsapp = false; S.setupStep = 'invite'; S.page = 'setup'; render();
      const r1 = document.body.innerText.includes('WhatsApp is disconnected'); S.sources.invoices = false; S.page = 'usage'; render();
      return [r1, document.body.innerText.includes('Invoices & Smart Collect is disconnected')]; });
    eq(bl, [true, true], 'blocked reasons shown');

    for(const k of ['kitchen','cowork','other']){
      await p.evaluate(k => { fresh(k, true); if(S.text) A.draftRule(); else { S.lines.forEach((l, i) => l.amount = [40000,45000,25000,10000][i]); S.manual = true; } render(); }, k);
      for(const pg of ['setup','overview','stakeholders','usage','decisions','payer','activity','report']){ await p.evaluate(pg => { S.page = pg; render(); }, pg); }
      const s = await p.evaluate(() => Object.values(computeShares(S.lines, S.counts).total).reduce((a, b) => a + b, 0));
      eq(s, 120000, `${k}: shares sum`);
    }
    // stakeholder-originated cards
    await p.evaluate(() => { fresh('clinic', true); A.draftRule(); A.sendRule(); questionLine('C', 'equip'); acceptRule('B'); S.page = 'decisions'; render(); });
    await crawl(p, 'question card');
    await p.evaluate(() => { acceptRule('C'); acceptRule('D'); receiveCounts(); S.exc['scans:A'] = 'register'; S.today = '2026-09-03'; doIssue(false); requestTime('D', '2026-10-07'); render(); });
    await crawl(p, 'request-time card');
    await p.evaluate(() => { for(let k = 0; k < 8 && !openItems().some(x => x.kind === 'reply'); k++) advance(); const i = openItems().find(x => x.kind === 'reply'); S.tone = 'direct'; approveDraft(i, draftText(i, 'direct'), 'approved'); counterOffer('C'); render(); });
    await crawl(p, 'counter card');
    flushErrors(p, 'variants');
    await p.context().close();
  }

  /* 6 — static self-check of the source */
  console.log('6. Source checks');
  {
    const src = fs.readFileSync(SRC, 'utf8');
    ok(!/<!doctype|<html|<head|<body/i.test(src), 'no document skeleton in index.html');
    ok(src.trimStart().startsWith('<title>Shared Collect MVP</title>'), 'title first');
    ok(!/\b(alert|confirm|prompt)\(/.test(src.replace(/\/\/.*$/gm, '')), 'no alert/confirm/prompt');
    const surface = src.replace(/kind === 'about'[\s\S]*?\} *\n  return `<div class="overlay"/, '');
    ok(!/simulat|\bdemo\b/i.test(surface.replace(/function drawer[\s\S]*?\n}\n/, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/label:'Clinic[^']*'/, '')), 'only About and the Scenario drawer mention simulation/demo');
  }

  await browser.close();
  try{ fs.unlinkSync(OUT); }catch(e){}
  console.log(`\n${passes} passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
