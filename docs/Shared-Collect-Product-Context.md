---
title: "Shared Collect — Complete Product Context"
subtitle: "Idea, design, features, rules, AI, priorities, and full source code"
---

# Shared Collect — Complete Product Context

**What this document is:** the single source of truth for Shared Collect (working name inside Razorpay Agent Studio: *Shared Cost Recovery Agent*). It covers the idea, users, product decisions, every screen, the calculation rules, the AI layer, the data model, design system, tests, roadmap and priorities. The complete source code is in the appendix. Hand this whole file to any AI tool or engineer and they have everything needed to continue.

## 0. Links and files

| What | Where |
|---|---|
| Live prototype, merchant view (no demo controls) | https://vartikapandey1303.github.io/Razorpay/ |
| Live prototype, demo view (role switch + timeline) | https://vartikapandey1303.github.io/Razorpay/?demo |
| Repository | https://github.com/VartikaPandey1303/Razorpay |
| Branch | `claude/shared-collect-v8-mvp-hv6okt` (GitHub Pages serves from this branch) |
| App (single file, no build, no backend) | `index.html` |
| Automated test (Playwright click-through, 122 checks) | `fitcheck/mvp-test.js` |
| Click-by-click demo guide | `docs/Shared-Collect-Walkthrough.docx` |
| This document | `docs/Shared-Collect-Product-Context.md` (+ `.docx`) |

Run the tests: `NODE_PATH=$(npm root -g) node fitcheck/mvp-test.js` (needs Node and the `playwright` package with Chromium).

---

# Part 1 — The idea

## 1.1 Problem

Many small businesses share one fixed monthly cost between several independent people. Examples:

- A diagnostic clinic: an echo machine EMI, consultation rooms, a technician's salary and utilities, shared by four doctors who each run their own practice.
- A cloud kitchen host: oven EMI, kitchen rent, a dispatcher's salary and gas, shared by several food brands.
- A coworking or photo studio: rent, a lighting rig EMI and a manager, shared by members.
- A dialysis centre, a dental chair rental, a shared lab — any "one owner, many users of the same asset" setup.

Today the owner (who signed the loan or lease) does this on WhatsApp and spreadsheets:

1. Works out each person's share by hand every month, often from a usage register kept by the front desk.
2. Messages each person, chases them, and absorbs the awkwardness of asking colleagues for money.
3. Pays the EMI, rent and salaries on fixed dates — whether or not everyone has paid. When someone is late, the owner covers the gap from their own pocket.

Pain points: the maths is opaque so people dispute it; chasing peers is socially costly; late payment creates a cash crunch right before the owner's own payment dates; there's no record of who agreed to what.

## 1.2 The idea

An agent inside Razorpay that:

1. Turns the owner's own description of the split ("EMI split by scans, salary equally, Dhruv pays a third of utilities") into a clear rule.
2. Gets every colleague to accept that rule on their own page, where they can see the maths for every line.
3. Bills everyone in the owner's name every month through Razorpay Invoices, with UPI and a personal bank account (Smart Collect virtual account) each.
4. When someone is late or asks for time, reads their message, checks it against the owner's own payment dates, and proposes a reply sized to exactly what the owner needs — for the owner to approve.

**AI reads and proposes. Rules compute every rupee. Humans approve.**

## 1.3 Hypothesis the MVP tests

> An owner will move peer billing off WhatsApp and spreadsheets if the split is visibly fair and costs them almost no effort, and the agent's judgement on late shares recovers more by the original due date than plain reminders do.

How the demo proves it (reference month):

- 74% of the total is in by the due date (including the owner's own share), 63% of colleagues' shares (₹54,198 of ₹85,364), 100% collected by month end.
- Without the agent's plan, colleagues' share by the due date would have been 40% (₹34,116 of ₹85,364). The plan brought ₹20,082 in before the due date — exactly the shortfall before the owner's 7 Oct salary payment.

## 1.4 Users

| User | Who | What they need | Where they act |
|---|---|---|---|
| **Owner** (merchant) | Holds the loan/lease, has a Razorpay account. Demo: Dr Meera, Meera Diagnostics | Set up once, get paid on time, avoid awkward chasing, never be short on their own payment dates | Owner app (web) |
| **Colleague** (payer) | Shares the cost, not a Razorpay customer. Demo: Dr Bhatt (always on time), Dr Arjun (asks for time), Dr Dhruv (visits Tuesdays, pays late) | See exactly why they owe what they owe, pay easily, ask/decline/request time without a confrontation | Their own page, opened from a WhatsApp link |
| **Staff** (optional) | Keeps the usage register. Demo: Sunita, front desk | Send monthly numbers with no extra tool | WhatsApp |

## 1.5 Where it lives

Razorpay Agent Studio → "Shared costs". The merchant arrives logged in; business name and owner name come from the Razorpay account (KYC) and are read-only.

---

# Part 2 — Product principles

Every screen follows these. They came out of a detailed review of an earlier version (see Part 9).

1. **One job per screen, one main button, always a clear next step.** No dead ends; never rely on the menu to discover what's next.
2. **The product comes to you.** Anything needing the owner arrives as a Home card (and in production, a WhatsApp/push notification) — not a tab to check.
3. **Ask only what we don't know.** Account details are read-only. Never pre-fill data the merchant didn't give. Never show numbers we can't source (usage-based amounts appear only once real numbers exist).
4. **Plain words only.** Banned on owner screens: provisional, ledger, agent-handled, evidence, booked, pool, confidence %, version numbers, stakeholder, reconciliation, exception, scenario.
5. **Two people, two screens.** The owner never clicks Accept or Pay on a colleague's behalf. Colleagues act only on their own page.
6. **Nothing goes out without the owner's OK.** Said once, clearly.
7. **Business-agnostic.** No business-type picker, no fixed list of units. The owner's own words define the cost and what's counted.
8. **AI never sets an amount.** Amounts come from the rule engine; AI-written messages are rejected if any rupee figure differs.
9. **Guardrails the platform enforces whatever the settings:** never change someone's share, waive money, stop someone's access, or lend to cover a gap.

---

# Part 3 — Information architecture

## 3.1 Surfaces

**Owner app**

- Setup wizard (first run only): Welcome → People → Describe → Check split → Monthly numbers (only if a cost is usage-based) → Send.
- After setup, three tabs:
  - **Home** — what needs you now (cards), this month's status table, month summary card when the month closes.
  - **People** — each colleague's status and bill; person detail with full history and "See their page".
  - **Settings** — the split (change → re-acceptance), monthly numbers source, what the agent can do, connections (WhatsApp, Razorpay Invoices), account (read-only).
- Flows reached from Home cards (not tabs): **Replies**, **Monthly bills** (numbers → review → send), **Decision** (one per AI suggestion), **Month summary**, **Change the split**.

**Colleague page** (their phone, from the WhatsApp link): share and maths, accept / ask a question / decline, pay (UPI or bank transfer), accept a plan or suggest other dates, "Something not right? Tell Meera", own history, privacy line.

**Demo mode** (only with `?demo` in the URL): a thin black bar with a role switch (owner / each colleague's phone), a **Next** button that advances the simulated calendar or tells you what it is waiting for, and **Restart**. Example-fill buttons appear in setup only in demo mode.

## 3.2 Navigation rules

- Wizard steps have Back and one primary button; validation messages appear inline.
- Every flow page has a back link to Home (or People/Settings) and ends by returning Home with a toast.
- Home badge = number of things that need the owner.

---

# Part 4 — User journeys (as built)

## Journey A — First-time setup (owner)

1. **Welcome.** "Share a monthly cost, without the follow-ups". Locked row: "Dr Meera · Meera Diagnostics · from your Razorpay account". Three bullets (add who you share with; describe in your own words; you approve everything). Button: **Set up shared costs**.
2. **Who shares the cost with you?** Owner shown locked. Rows of Name + WhatsApp number; Add person; remove. Validation: at least one name.
3. **How do you split it today?** One text box, placeholder example for a generic business. "Mention when you pay each one if you can." Button: **Draft my split** (shows "Drafting…").
4. **Check your split.**
   - Each cost is a card in a sentence: "**Echo machine EMI** — **₹40,000** · split by **scans** each person used · You pay it on the 5th".
   - Warnings inline: no pay day → "When do you pay this? It helps the agent plan around late payments"; method not stated → "I assumed equally — change it if that's wrong".
   - **Change** opens an inline editor: name, amount, pay day (1st–28th), method chips (Equally / By something you count / Someone pays a fixed share / Someone pays a fixed amount); free-text "What do you count?"; per-person share (1/3, 40%) or fixed ₹.
   - Questions box when the AI is unsure, e.g. "Who is "Dhruv" in "Utilities"?" with a button per person, "(me)", and "Nobody — split it equally".
   - "What each person pays a month": fixed part per person; usage-based parts described in one line ("Plus everyone's share of ₹40,000 by scans and ₹45,000 by sessions, worked out each month").
   - Validation: every cost has an amount; usage costs name what's counted; share/fixed costs name who; no open questions.
5. **How will you give us the monthly numbers?** Only if a cost is usage-based. Options: staff sends them (name + WhatsApp; messaged on the 1st) / I'll type them in / I'll upload a sheet.
6. **Send it to N people.** The exact WhatsApp message per person; "See what X will see" (read-only preview modal); note on first bill date and approval. Button: **Send to N people** (disabled with reason if WhatsApp is off). Lands on **Replies**.

## Journey B — Replies (owner)

- "N of M accepted the split". One row per person with status: Waiting / Accepted / Has a question / Declined.
- **Has a question:** their question + an AI-suggested answer in an editable box + **Send answer** (status returns to Waiting; their page shows the answer).
- **Declined:** their reason + three options: **Change the split** / **Remove <name>** (confirm: everyone else re-accepts a new version) / **I'll talk to them** (bills wait).
- When everyone has accepted: green "Everyone has accepted. First bills go out on 1 Sept" + **Go to Home**.

## Journey C — Colleague page (their phone)

- Invited: "Meera has shared how Meera Diagnostics' monthly costs are split" + promise box (bills in the business's name, no auto-debit, can ask before accepting, nobody else sees your status) + **Accept** / Ask a question / Decline (with reason).
- Each cost line shows their part: exact for equal/share/fixed costs, "monthly" for usage costs (formula on tap). After billing, every line shows the exact amount and tapping shows the maths ("38 of 154 scans × ₹40,000 = 9,870.13 → ₹9,870").
- After billing: amount due, due date or plan, **Pay ₹X with UPI**, "Pay by bank transfer instead" (account number, IFSC, copy), paid state.
- Plan offered: owner's message + **Accept the plan** / **Suggest other dates** (two amount+date rows → sent to owner as a counter-offer).
- **Something not right? Tell Meera:** one text box. The AI reads it: a date/time request becomes a "request" decision; a dispute or question becomes a "message" decision with a suggested answer.
- Their own history; footer "Only you and Meera Diagnostics see this page."

## Journey D — Monthly bills (owner)

1. On the 1st (bill day): Home card "August is over — add August's numbers" (or, if staff sent them, "August's bills are ready to send").
2. **Numbers:** table of people × counted things; or upload a CSV (needs columns for person, what was counted, count; other columns like patient details are ignored).
3. **Review:** one row per person with amount; expand to see the maths per cost; owner's own share shown as "not billed to you"; total. Blocked (with reason) if anyone hasn't accepted (+ Remind them) or if Razorpay Invoices is off.
4. **Send N bills** → Home with a bills table: Bill, Status (Unpaid / Plan offered / On a plan / Part-paid / Paid / Late), Next.

## Journey E — Someone is late (the core AI moment)

1. Colleague replies on WhatsApp: "Meera ji, is month thoda tight hai. 20 tak kar dunga, pakka."
2. Home card: "Dr Arjun asked for more time — If you wait, you'll be ₹20,082 short on 7 Oct. The agent has a suggestion." → **Review**.
3. **Decision screen:**
   - What they said + "Read as: asking for more time" + why (names a date, firm commitment).
   - What it means for you: owner's payments up to the key date (EMI 5 Oct, rent 5 Oct, salary 7 Oct = ₹1,10,000), expected in by then (own share ₹34,636 + Bhatt ₹34,116 + Dhruv ₹21,166 = ₹89,918), Arjun "too late", **Short on 7 Oct ₹20,082**. Checkbox "Count on Dr Dhruv paying by 30 Sept (paid late before)" — unticking shows ₹41,248.
   - Suggested reply (AI draft · amounts from your rule): editable first part (₹20,082 by 30 Sept) and the rest (₹10,000 by 20 Oct, the date they named).
   - First time only: three tone options (warm, direct, formal); choosing one sends it and sets the tone. Later: one draft, "Tone: warm · change", Edit message, Send, Not now.
   - "This doesn't change the 30 Sept due date, adds no penalty, and mentions nobody else."
4. Colleague accepts the plan on their page → pays part one by 30 Sept → rest by 20 Oct.
5. Other decision types follow the same pattern: pre-due nudge for a likely-late payer; request to pay on a date (Accept / Ask for the due date); counter-offer (shows the shortfall with their dates vs yours); message (question or dispute, with suggested answer).

## Journey F — Month summary

Home card "August is closed" → summary: three tiles (in by due date; from colleagues by due date; collected now), "What the agent changed" (counterfactual vs plain reminders), "What the agent learned" (each labelled *you told it* / *seen once* / *a guess*).

---

# Part 5 — Calculation rules (real code, deterministic)

## 5.1 Split methods

For each cost line, with participants = owner + colleagues:

| Method | Meaning | Allocation |
|---|---|---|
| `equal` | Everyone pays the same | Weights 1 each |
| `count` | In proportion to a counted measure (any name: scans, orders, dialysis sessions) | Weights = that month's counts |
| `share` | Named people pay a fraction; others split the rest equally | Named: `floor(amount × fraction)`; rest allocated equally among the others |
| `fixed` | Named people pay fixed rupees; others split the rest equally | Named: fixed ₹; rest allocated equally among the others |

## 5.2 Rounding

- All money is integer rupees.
- Each line is allocated by **largest remainder** so the line sums exactly to its amount.
- A tie in fractional parts goes to the person with the **lowest running total** across lines already allocated (then by id).

## 5.3 Reference example (must reproduce)

Costs: Echo machine EMI ₹40,000 by scans (Meera 48, Bhatt 46, Arjun 38, Dhruv 22); Rooms ₹45,000 by sessions (14, 14, 12, 6); Salary ₹25,000 equally; Utilities ₹10,000 with Dhruv one-third, rest equal.

| | EMI | Rooms | Salary | Utilities | **Total** |
|---|---|---|---|---|---|
| Meera (owner) | 12,468 | 13,696 | 6,250 | 2,222 | **34,636** |
| Bhatt | 11,948 | 13,696 | 6,250 | 2,222 | **34,116** |
| Arjun | 9,870 | 11,739 | 6,250 | 2,223 | **30,082** |
| Dhruv | 5,714 | 5,869 | 6,250 | 3,333 | **21,166** |

Sum ₹1,20,000. (Utilities: Dhruv floor(10,000/3) = 3,333; remaining 6,667 ÷ 3 = 2,222.33 each; the extra rupee goes to Arjun, who has the lowest running total.)

## 5.4 Cash calendar and the gap

- **Outflows** = each cost's amount on its pay day in the month after the usage month (5 Oct, 5 Oct, 7 Oct, 20 Oct).
- **Inflows expected by a date** = payments already received + each unpaid share expected on: the due date (default); the date they said (if they replied with a date); plan instalment dates (if a plan exists); or after the horizon (if the owner unticks "count on them").
- `cashGap(outflows, inflows, by)` → `{need, inflow, gap = max(0, need − inflow)}`.
- **Key date** = the outflow date with the largest (need − inflow). Reference: 7 Oct, need ₹1,10,000, inflow ₹89,918, gap ₹20,082; with Dhruv not counted, gap ₹41,248.

## 5.5 Plan sizing

- First part = min(gap at key date, amount still due), due on the original due date (never later).
- Rest = remaining amount, due on the date they named (default 20 Oct).
- Reference: ₹20,082 by 30 Sept + ₹10,000 by 20 Oct. The original due date never moves.

## 5.6 Month metrics

- **In by the due date** = all payments dated ≤ due date (owner's share counts as paid when bills are sent) ÷ total. Reference: ₹88,834 / ₹1,20,000 = 74%.
- **From colleagues by the due date** = colleagues' payments ≤ due date ÷ colleagues' total. Reference: ₹54,198 / ₹85,364 = 63%.
- **Collected now** = all payments ÷ total = 100%.
- **Counterfactual (plain reminders)** = colleagues by due date minus payments that came via an agent-proposed plan = ₹34,116 / ₹85,364 = 40%.
- Percentages are rounded to the nearest whole number.

## 5.7 Reference timeline (demo)

| Date | Event |
|---|---|
| 28 Aug | Setup, split sent, replies (Bhatt accepts, Arjun asks a question, Dhruv accepts, Arjun accepts after answer) |
| 1 Sept | Staff sends August numbers; owner reviews and sends bills (owner's share counted as paid) |
| 23 Sept | Razorpay invoice reminders |
| 25 Sept | Arjun replies asking for time → decision → owner sends plan (warm tone) |
| 26 Sept | Arjun accepts the plan |
| 27 Sept | Agent flags Dhruv as likely late → owner sends a reminder |
| 28 Sept | Bhatt pays ₹34,116 |
| 29 Sept | Arjun pays ₹20,082 |
| 30 Sept | Due date |
| 5 Oct / 7 Oct | Owner pays EMI + rent / salary |
| 18 Oct | Arjun pays ₹10,000; Dhruv pays ₹21,166 |
| 20 Oct | Owner pays utilities |
| 31 Oct | Month closes → summary |

---

# Part 6 — The AI layer

## 6.1 Three functions (one adapter: `AI` object in `index.html`)

| Function | Input | Output | Used for |
|---|---|---|---|
| `AI.draftSplit(text, people)` | Owner's description + list of people | `{costs:[{name, amount, payDay, method, measure, shares, fixed}], questions:[]}` | Setup step "Draft my split" |
| `AI.readMessage(text)` | A colleague's message | `{intent: more-time / question / dispute / paid / other, date, why}` | WhatsApp replies, "Something not right" |
| `AI.write(kind, ctx)` | Kind (plan, nudge, answer…) + context incl. amounts, dates, tone | Message text in the owner's voice | Suggested replies |

## 6.2 Guardrails

- AI output is always passed through the rule engine; AI never decides an amount.
- `AI.write` with Gemini: the result is used only if every ₹ amount from the rule-based draft appears in it; otherwise the local draft is used.
- Ambiguity becomes a question to the owner, not a guess.
- Everything the AI drafts is labelled with a purple "AI" tag; nothing is sent without the owner's tap.

## 6.3 Local stand-ins (shipped)

- **Draft:** sentence-by-sentence parser. Finds the amount (₹, Rs, 40k, lakh), the name (text before "of ₹" / "₹" / "(" / "split" / "paid"), the pay day ("paid on the 5th"), the method ("split by <words>" → count with that measure; "<Name> pays one-third / a quarter / half / 40% / 2/3" → share; "<Name> pays ₹2,000 flat" → fixed; "equally" → equal; otherwise equal + "assumed" warning). Unknown names → "Who is X?" question.
- **Read:** pattern rules. "tight / time / tak / later / can I pay on / pay by" → more-time (+ date like "20 tak" → 20 Oct); "wrong / too high / mistake" → dispute; "paid / transferred" → paid; "?" / why / how → question.
- **Write:** templates per kind and tone (warm, direct, formal), Hinglish where natural, always including "Agar nahi, batao kya possible hai." for plans.

## 6.4 Gemini provider (built in, switchable)

- Turn on: browser console → `localStorage.setItem('sc.geminiKey', '<KEY>')`, optional `localStorage.setItem('sc.geminiModel', '<model>')` (default `gemini-2.5-flash`), reload.
- Calls `POST https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent?key=<KEY>` with `responseMimeType: application/json` and a `responseSchema` per function (schemas are in `SCHEMA` in the code).
- Any error falls back to the local stand-in, so the demo never breaks.
- **Production:** move the call to a small backend (the key must not live in the browser), add logging of inputs/outputs for evaluation, and keep the amount-check guardrail server-side.

Prompts used (see `AI` in the code for exact text): split drafting explains the four methods and "never invent amounts; ask a question if ambiguous"; message reading asks for intent + ISO date; writing asks to rewrite in a given tone keeping every amount and date exactly, under 45 words.

---

# Part 7 — Data model (state object `S`)

| Field | Meaning |
|---|---|
| `v` | State version (9) for localStorage |
| `view` | `owner` or `p:<id>` (colleague phone, demo only) |
| `today` | Simulated date (starts 2026-08-28) |
| `account` | `{business, owner, ownerFirst}` — from the Razorpay account, read-only |
| `stage` | Wizard step: welcome, people, describe, check, numbers, send, live |
| `page`, `arg` | Owner page after setup (home, replies, bills, decision, people, person, settings, split, month) and its argument |
| `people` | `[{id, name, phone}]` colleagues (owner is the fixed id `me`) |
| `text` | Owner's description |
| `costs` | `[{id, name, amount, payDay, method, measure, shares:{id:fraction}, fixed:{id:₹}, assumed}]` |
| `questions` | Open questions from drafting |
| `source` | Monthly numbers: `{type: staff/me/upload, name, phone}` |
| `version`, `sent`, `invites` | Split version; whether sent; per person `{status: pending/accepted/declined/question, reason, question, answer, answerDraft, handled, at}` |
| `tone`, `perms`, `channels` | Chosen tone; agent permissions `{remind, plan}`; `{whatsapp, invoices}` |
| `month` | `{counts, draft, status: open/sent, step, sentOn, bills:{id:₹}, invoices:{id:{no, va}}, csvMsg}` |
| `pays` | `{id:[{d, amt}]}` payments (owner's share recorded when bills are sent) |
| `plans` | `{id:{inst:[{amt, d}], status: proposed/accepted, on, text, viaAgent}}` |
| `items` | Decisions `[{id, kind: reply/nudge/request/counter/message, from, t, quote, intent, why, said, date, inst, plan, edit, status: open/done/dismissed, sent}]` |
| `history` | `{id:[{t, text}]}` per person (owner = `me`) |
| `expect` | `{id:false}` when the owner unticks "count on them" |
| `done`, `closed` | Demo timeline progress; month closed |
| `ui` | Transient UI (open rows, preview modal, inline forms) |

Production mapping (suggested): Account → Razorpay merchant; Person → contact; Split (versioned) → rule document with acceptances; Month → billing cycle; Bills → Razorpay Invoices; Smart Collect virtual account per person; Payments → webhooks; Items → agent proposals with decision audit; History → event log.

---

# Part 8 — Design system

- **Fonts:** Inter (UI), Instrument Serif (page titles), JetBrains Mono (money, dates). System fallbacks.
- **Colour tokens** (light; dark mode via `prefers-color-scheme` and `data-theme`): background #f5f6f8, panel #fff, ink #10131f, accent #2f5bff, ok #0f7f55, warn #9a5b00, bad #c23434, AI #6345f0 (purple, used only for AI tags/cards).
- **Components:** card, primary/ghost/link buttons, pills (status), "needs you" card (icon, title, one line, one button), sentence-style cost card with inline editor, question box (amber), decision cards, phone-style colleague page, modal preview, toast.
- **Layout:** owner app max width 1040px; flows 660px; colleague page 440px. Responsive at 760px: tabs under the header, single column, no sideways scrolling at 390px.
- **Copy rules:** plain, short, second person; numbers as ₹1,20,000 (en-IN); dates as "5 Oct" / "30 Sept"; banned jargon list in Part 2.
- **Status words:** Split — Waiting / Accepted / Has a question / Declined. Bills — Unpaid / Plan offered / On a plan / Part-paid / Paid / Late.

---

# Part 9 — How we got here (decision history)

1. **v8 (first build)** followed a detailed spec: left rail with 7 tabs (Overview, Setup, Stakeholders, Usage & billing, Decisions, Activity, Month report), business-type templates, a scenario drawer, keyword rule drafting tied to templates, "fairness proof" from built-in July numbers, outflow tables, evidence columns, data-source and permission panels in setup, a two-source count check, provisional billing, and "ledger only" stakeholders.
2. **Review findings (owner's perspective):** demo controls visible to merchants; a business-type picker that made no sense for a logged-in merchant; editable business name; fixed dropdowns of units that would not work for other businesses; numbers with no source; unexplained jargon (evidence, pool, booked, provisional, agent-handled); permissions and data sources in the wrong place; the owner clicking Accept for colleagues; dead ends with no next step; tabs (Decisions, Activity) with no entry or exit; a billing page with 20+ elements for a 4-step job.
3. **v9 (current) decisions:**
   - One guided setup; Home/People/Settings only; everything else arrives as a card.
   - Business-agnostic split with four methods and free-text measures; owner's own words drafted by AI and read back as sentences.
   - Separate colleague page; demo-only role switch.
   - Decline goes back to the owner; bills only after everyone accepts.
   - Monthly bills as numbers → review → send.
   - Late payment as one decision screen with the cash gap.
   - Cut from MVP: two-source count check; "bill on last month's numbers" (no previous month exists in a first cycle); Activity tab and export; month report tab (now a summary card).
   - AI behind one adapter, local stand-ins + optional Gemini.

---

# Part 10 — Features, status and suggested priority

**Priority key:** P0 = needed for a credible pilot with real merchants; P1 = needed before scaling beyond the pilot; P2 = later.

## 10.1 Built in the prototype

| Feature | Status | Notes |
|---|---|---|
| Guided setup (people, describe, check, numbers, send) | Built | Business-agnostic |
| Split engine (equal, count, share, fixed; exact rupees) | Built | Deterministic, tested |
| AI draft of the split + questions when unsure | Built (local) / Gemini-ready | |
| Colleague page (accept, ask, decline, pay, plan, something's wrong) | Built | Simulated payments |
| Replies screen (answer questions, handle declines) | Built | |
| Monthly bills (type / upload numbers, review, send) | Built | Invoices simulated |
| Late-payment decision with cash gap and sized plan | Built | Core AI moment |
| Nudge, time request, counter-offer, message decisions | Built | |
| Tone chosen once | Built | |
| Month summary with counterfactual and learnings | Built | |
| Settings (split change with re-acceptance, permissions, connections) | Built | |
| Demo mode (role switch, timeline) | Built | `?demo` only |
| Automated test suite | Built | 122 checks |

## 10.2 Roadmap

| # | Feature | Priority | Why |
|---|---|---|---|
| 1 | Real AI behind the adapter (Gemini or Claude via backend) + evaluation set of 50–100 real split descriptions and replies | **P0** | The draft and the reply reading are the product's promise; must work on messy real text (Hinglish, typos) |
| 2 | Real Razorpay Invoices + Smart Collect (one persistent virtual account per person) + payment webhooks | **P0** | Without real billing there is no pilot |
| 3 | WhatsApp Business API (templates for invite, bill, reminder, plan; inbound replies routed to `readMessage`) | **P0** | The channel colleagues already use |
| 4 | Colleague page as a real, signed link (no login), mobile-first | **P0** | Where acceptance and payment happen |
| 5 | Monthly cycle automation (bill day, staff message on the 1st, reminders T-7 and due day) | **P0** | "Almost no effort" for the owner |
| 6 | Audit trail of acceptances (who accepted which version, when) | **P0** | Trust and dispute resolution |
| 7 | Owner notifications (WhatsApp/push) for Home cards | **P0** | "The product comes to you" |
| 8 | Bill on last month's numbers when numbers are late, with a next-month adjustment | P1 | Needs month 2 data |
| 9 | Disputes with evidence (usage log per person, owner correction flow) | P1 | Will happen at scale |
| 10 | Connect usage sources (register sheet templates, POS/machine logs) and flag mismatches | P1 | Removes manual entry; the "two-source check" returns here |
| 11 | Owner's payment dates from RazorpayX / bank / Tally instead of typed pay days | P1 | Better cash-gap accuracy |
| 12 | Multiple cost groups per business, mid-month joiners/leavers, pro-rating | P1 | Real-world complexity |
| 13 | Learnings used next month (tone per person, best nudge day) | P1 | Compounding agent value |
| 14 | Export / accounting (GST invoices, Tally export) | P2 | Finance users |
| 15 | Auto-send for low-risk messages (owner opt-in, with caps) | P2 | Only after trust is established |
| 16 | Multi-language colleague page (Hindi, regional) | P2 | Reach |
| 17 | Analytics dashboard for Razorpay (adoption, on-time %, plan adherence) | P2 | Business case |

## 10.3 Success metrics for a pilot

- Setup completion rate and time to first send (target < 10 minutes).
- Acceptance rate of the split and time to all-accepted.
- % of total in by the original due date vs the owner's baseline (ask for the last 3 months at onboarding).
- Plan acceptance and plan adherence (instalments paid on time).
- Owner approval rate of AI drafts as-is (proxy for draft quality); edit rate.
- Disputes per 100 bills.
- Owner retention after 3 cycles.

## 10.4 Open questions and risks

- **Regulatory:** billing in the owner's name for a shared cost is ordinary invoicing, but plans must never look like credit; the "never lend" guardrail stays.
- **Privacy:** colleagues never see each other's status or amounts; usage uploads must drop identities (patients, customers).
- **WhatsApp:** template approval, opt-in for colleagues, rate limits.
- **Disagreement:** what happens if one person never accepts — the owner currently decides (change split, remove, or talk); consider a deadline.
- **Usage data quality:** who is the source of truth when counts are disputed.
- **AI errors:** misread split or reply — mitigated by read-back sentences, questions, owner approval and amount checks.

---

# Part 11 — Rebuilding or extending with another AI tool

## 11.1 What to give the tool

This whole document (it includes the code). Point it at Parts 2, 4, 5 and 6 as the specification, and the appendix as the reference implementation.

## 11.2 Prompt template

> You are building "Shared Collect", a Razorpay agent that lets a business owner share a fixed monthly cost with colleagues. Read the attached context document fully. Follow the product principles in Part 2 exactly, implement the journeys in Part 4, and reproduce the calculation rules and reference numbers in Part 5 (shares ₹34,636 / ₹34,116 / ₹30,082 / ₹21,166; 7 Oct gap ₹20,082, or ₹41,248 if Dhruv isn't counted; month end 74% / 63% / 100%; counterfactual 40%). The AI layer (Part 6) must sit behind one adapter with three functions and must never set an amount. Owner screens must not use the banned words. Start from the reference implementation in the appendix. Then: [your task, e.g. "move the AI calls to a Node backend using Gemini and add an evaluation script", or "rebuild the UI in React + Tailwind keeping the same flows", or "connect Razorpay Invoices test mode"].

## 11.3 Acceptance checklist for any rebuild

- [ ] Reference numbers reproduce exactly.
- [ ] A renal-care description ("split by dialysis sessions", "Rao pays 50%") drafts correctly; an unknown name becomes a question.
- [ ] No owner screen shows demo controls without `?demo`; no banned jargon.
- [ ] The owner can never accept or pay for a colleague.
- [ ] Every screen has one clear next step; every disabled button says why.
- [ ] Bills wait until everyone has accepted.
- [ ] AI-written messages with altered amounts are rejected.
- [ ] Works at 390px with no sideways scrolling.

## 11.4 Code map (`index.html`)

| Section | Functions |
|---|---|
| Configuration | `CFG` (AI provider/key/model), `DEMO` flag |
| Rules engine | `allocate`, `computeShares`, `cashGap` |
| AI adapter | `localDraft`, `localRead`, `localWrite`, `gemini`, `SCHEMA`, `AI.draftSplit / readMessage / write` |
| State & helpers | `fresh`, `colleagues`, `allIds`, `measures`, `sched`, `outflows`, `inflows`, `keyDate`, `cashAt`, `metrics` |
| Owner views | `wizard` (+ `wWelcome`, `wPeople`, `wDescribe`, `wCheck`, `splitEditor`, `costCard`, `shareSummary`, `wNumbers`, `wSend`), `pHome`, `needsCards`, `monthCard`, `pReplies`, `pBills`, `billNumbers`, `billReview`, `pDecision`, `cashCard`, `planInputs`, `messageBlock`, `pPeople`, `pPerson`, `pSettings`, `pSplitEdit`, `pMonth` |
| Colleague view | `colleagueApp` |
| Demo | `demoEvents`, `demoBar`, `exampleCounts` |
| Domain actions | `doAccept`, `doAsk`, `doDecline`, `doPay`, `doAcceptPlan`, `resend`, `routeMessage`, `sendItem`, `applyCsv` |
| UI actions | `A` (every button has `data-action` mapped here) |
| Runtime | `render`, `run`, delegated click/change/input listeners, `selfCheck` (logs UNWIRED BUTTON / UNKNOWN ACTION), `save`/`load` (localStorage key `shared-collect-v9`) |

---

# Appendix A — Full source: `index.html`


```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Shared Collect MVP</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
:root{
  --bg:#f5f6f8;--panel:#fff;--panel2:#fafbfc;--ink:#10131f;--ink2:#474d63;--ink3:#7a8096;--line:#e3e6ed;--line2:#eef0f4;
  --accent:#2f5bff;--accent-ink:#fff;--accent-soft:#eaf0ff;
  --ok:#0f7f55;--ok-soft:#e3f5ec;--warn:#9a5b00;--warn-soft:#fff2d9;--bad:#c23434;--bad-soft:#fde9e9;
  --ai:#6345f0;--ai-soft:#efebff;--demo:#0a0b10;
  --shadow:0 1px 2px rgba(16,19,31,.05),0 4px 16px rgba(16,19,31,.05);
  --sans:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;
  --serif:"Instrument Serif",Georgia,"Times New Roman",serif;
  --mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  color-scheme:light;
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --bg:#0c0e14;--panel:#141720;--panel2:#181b25;--ink:#e8eaf2;--ink2:#b3b8c9;--ink3:#80859a;--line:#262a37;--line2:#1e222d;
    --accent:#6b8cff;--accent-ink:#0c0e14;--accent-soft:#1c2547;
    --ok:#4cc58f;--ok-soft:#12291f;--warn:#f0b24a;--warn-soft:#2c2210;--bad:#f07a7a;--bad-soft:#321617;
    --ai:#a493ff;--ai-soft:#231d42;--shadow:0 1px 2px rgba(0,0,0,.3);color-scheme:dark;
  }
}
:root[data-theme="dark"]{
  --bg:#0c0e14;--panel:#141720;--panel2:#181b25;--ink:#e8eaf2;--ink2:#b3b8c9;--ink3:#80859a;--line:#262a37;--line2:#1e222d;
  --accent:#6b8cff;--accent-ink:#0c0e14;--accent-soft:#1c2547;
  --ok:#4cc58f;--ok-soft:#12291f;--warn:#f0b24a;--warn-soft:#2c2210;--bad:#f07a7a;--bad-soft:#321617;
  --ai:#a493ff;--ai-soft:#231d42;--shadow:0 1px 2px rgba(0,0,0,.3);color-scheme:dark;
}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:var(--bg);color:var(--ink);font:14px/1.55 var(--sans);-webkit-font-smoothing:antialiased;overflow-x:hidden}
button,input,select,textarea{font:inherit;color:inherit}
svg.i{width:16px;height:16px;flex:none;stroke:currentColor;fill:none;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round;vertical-align:-3px}
.mono{font-family:var(--mono);font-size:.93em}
.mute{color:var(--ink3)}.ink2{color:var(--ink2)}.small{font-size:12.5px}.tiny{font-size:11.5px}
h1{font-family:var(--serif);font-weight:400;font-size:34px;line-height:1.1;margin:0 0 6px}
h2{font-size:16px;font-weight:600;margin:0 0 10px}
h3{font-size:14px;font-weight:600;margin:0 0 6px}
p{margin:0 0 8px}
.lede{color:var(--ink2);margin:0 0 20px;font-size:15px}

/* demo bar (only with ?demo) */
.demobar{background:var(--demo);color:#d6d8e2;display:flex;align-items:center;gap:8px;padding:8px 16px;font-size:12.5px;position:sticky;top:0;z-index:30;flex-wrap:wrap}
.demobar b{color:#fff;font-weight:600;letter-spacing:.06em;font-size:11px;text-transform:uppercase;background:#2a2d3a;border-radius:4px;padding:2px 6px}
.demobar .vw{display:flex;gap:4px;flex-wrap:wrap}
.demobar .vw button{all:unset;cursor:pointer;padding:4px 10px;border-radius:999px;border:1px solid #2f3242;color:#c9cbd6;white-space:nowrap}
.demobar .vw button.on{background:#fff;color:#0a0b10;border-color:#fff}
.demobar .sp{flex:1}
.demobar .nx{all:unset;cursor:pointer;background:#2f5bff;color:#fff;border-radius:8px;padding:5px 12px;font-weight:500;display:inline-flex;gap:6px;align-items:center}
.demobar .nx[disabled]{background:#2a2d3a;color:#9a9eb0;cursor:not-allowed}
.demobar .rs{all:unset;cursor:pointer;color:#9a9eb0;padding:4px 6px}
.demobar .dt{font-family:var(--mono);color:#fff}

/* owner app chrome */
.appbar{background:var(--panel);border-bottom:1px solid var(--line);display:flex;align-items:center;gap:18px;padding:0 24px;min-height:58px;flex-wrap:wrap}
.logo{display:flex;align-items:center;gap:8px;font-weight:600;font-size:14px;white-space:nowrap}
.logo .biz{color:var(--ink3);font-weight:400;border-left:1px solid var(--line);padding-left:10px;margin-left:2px}
.tabs{display:flex;gap:2px;margin-left:auto}
.tabs button{all:unset;cursor:pointer;padding:18px 12px;font-size:13.5px;color:var(--ink2);border-bottom:2px solid transparent;display:flex;gap:6px;align-items:center}
.tabs button.on{color:var(--ink);border-bottom-color:var(--accent);font-weight:500}
.tabs .badge{background:var(--accent);color:#fff;border-radius:9px;font-size:11px;padding:0 6px;line-height:17px}
.main{max-width:1040px;margin:0 auto;padding:28px 24px 80px}
.narrow{max-width:660px;margin:0 auto;padding:28px 20px 80px}

/* building blocks */
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:20px;box-shadow:var(--shadow);min-width:0}
.stack>*+*{margin-top:14px}
.row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.row.sb{justify-content:space-between}
.grid2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}
.grid2>*{min-width:0}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid var(--line);background:var(--panel);color:var(--ink);border-radius:10px;padding:8px 14px;cursor:pointer;font-size:13.5px;font-weight:500;line-height:1.3}
.btn:hover:not(:disabled){border-color:var(--ink3)}
.btn.primary{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
.btn.primary:hover:not(:disabled){filter:brightness(1.07)}
.btn.ghost{background:transparent;border-color:transparent;color:var(--ink2)}
.btn.ghost:hover:not(:disabled){background:var(--line2)}
.btn.link{background:none;border:none;color:var(--accent);padding:2px 0;font-weight:500}
.btn.danger{color:var(--bad)}
.btn.sm{padding:5px 10px;font-size:12.5px;border-radius:8px}
.btn.lg{padding:12px 20px;font-size:15px;border-radius:12px}
.btn.full{width:100%}
.btn:disabled{opacity:.45;cursor:not-allowed}
.pill{display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:600;padding:1px 9px;border-radius:999px;background:var(--line2);color:var(--ink2);white-space:nowrap;line-height:19px}
.pill svg.i{width:12px;height:12px;vertical-align:-1px}
.pill.ok{background:var(--ok-soft);color:var(--ok)}.pill.warn{background:var(--warn-soft);color:var(--warn)}.pill.bad{background:var(--bad-soft);color:var(--bad)}.pill.ai{background:var(--ai-soft);color:var(--ai)}.pill.acc{background:var(--accent-soft);color:var(--accent)}
input[type=text],input[type=tel],input[type=number],input[type=date],select,textarea{background:var(--panel2);border:1px solid var(--line);border-radius:9px;padding:9px 11px;width:100%;min-width:0}
input:focus,select:focus,textarea:focus{outline:2px solid var(--accent-soft);border-color:var(--accent)}
textarea{resize:vertical;min-height:120px;line-height:1.55}
label.f{display:block;font-size:12.5px;color:var(--ink2);margin:0 0 5px;font-weight:500}
.note{background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:11px 13px;font-size:13px;color:var(--ink2)}
.note.warn{background:var(--warn-soft);border-color:transparent;color:var(--warn)}
.note.ok{background:var(--ok-soft);border-color:transparent;color:var(--ok)}
.err{color:var(--bad);font-size:12.5px;margin-top:8px}
.sep{height:1px;background:var(--line);margin:16px 0}
.chips{display:flex;gap:6px;flex-wrap:wrap}
.chip{border:1px solid var(--line);background:var(--panel);border-radius:999px;padding:6px 13px;cursor:pointer;font-size:13px}
.chip.on{background:var(--ink);color:var(--panel);border-color:var(--ink)}
.wrap{overflow-x:auto;max-width:100%}
table.t{width:100%;border-collapse:collapse;font-size:13.5px}
table.t th{text-align:left;font-weight:500;color:var(--ink3);font-size:12px;padding:8px;border-bottom:1px solid var(--line);white-space:nowrap}
table.t td{padding:10px 8px;border-bottom:1px solid var(--line2);vertical-align:middle}
table.t td.n,table.t th.n{text-align:right;font-family:var(--mono);white-space:nowrap}
table.t tr:last-child td{border-bottom:none}
.money{display:flex;align-items:center}
.money span{padding:9px 0 9px 11px;border:1px solid var(--line);border-right:none;border-radius:9px 0 0 9px;background:var(--panel2);color:var(--ink3)}
.money input{border-radius:0 9px 9px 0;font-family:var(--mono)}

/* wizard */
.steps{display:flex;align-items:center;gap:10px;margin-bottom:22px;font-size:12.5px;color:var(--ink3)}
.steps .bar{flex:1;height:4px;background:var(--line);border-radius:2px;overflow:hidden}
.steps .bar div{height:100%;background:var(--accent)}
.foot{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:22px}
.lockrow{display:flex;gap:10px;align-items:center;font-size:13px;color:var(--ink2);background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:10px 12px}
.prow{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) 36px;gap:8px;align-items:center;margin-bottom:8px}
.bullet{display:flex;gap:12px;align-items:flex-start;padding:8px 0;color:var(--ink2)}
.bullet svg{color:var(--accent);margin-top:3px}
.optcard{all:unset;box-sizing:border-box;display:block;width:100%;border:1px solid var(--line);border-radius:12px;padding:12px 14px;cursor:pointer;background:var(--panel)}
.optcard+.optcard{margin-top:8px}
.optcard.on{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}

/* split cards */
.cost{border:1px solid var(--line);border-radius:12px;padding:14px 16px;background:var(--panel)}
.cost+.cost{margin-top:10px}
.cost .sent{font-size:15px;line-height:1.5}
.cost .meta{font-size:12.5px;color:var(--ink3);margin-top:3px}
.cost.ed{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
.edgrid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) minmax(0,.8fr);gap:10px;margin-top:12px}
.question{border:1px solid var(--warn);background:var(--warn-soft);border-radius:12px;padding:12px 14px;color:var(--warn);margin-bottom:12px}

/* home */
.needs{display:flex;gap:14px;align-items:center;border:1px solid var(--line);background:var(--panel);border-radius:14px;padding:16px 18px;box-shadow:var(--shadow)}
.needs+.needs{margin-top:10px}
.needs .ic{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;flex:none;background:var(--accent-soft);color:var(--accent)}
.needs.ai .ic{background:var(--ai-soft);color:var(--ai)}
.needs.warn .ic{background:var(--warn-soft);color:var(--warn)}
.needs .tx{flex:1;min-width:0}
.needs .tx b{display:block;font-weight:600}
.needs .tx span{font-size:13px;color:var(--ink2)}
.tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.tile{border:1px solid var(--line);border-radius:12px;padding:12px 14px;background:var(--panel)}
.tile .k{font-size:12px;color:var(--ink3)}.tile .v{font-size:24px;font-weight:600;font-family:var(--mono);letter-spacing:-.02em}.tile .s{font-size:12px;color:var(--ink3)}
.progress{height:8px;background:var(--line2);border-radius:4px;overflow:hidden;display:flex;margin:10px 0 4px}
.progress div{height:100%}

/* replies */
.reply{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 10px;align-items:center;padding:14px 0;border-bottom:1px solid var(--line2)}
.reply:last-child{border-bottom:none}
.reply .body{grid-column:1/-1}
.quote{background:var(--panel2);border:1px solid var(--line);border-radius:4px 14px 14px 14px;padding:10px 14px;margin:8px 0;font-size:14px}
.quote small{display:block;color:var(--ink3);font-size:11.5px;margin-top:3px}

/* decision */
.kv{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:5px 14px;font-size:13.5px}
.kv .n{font-family:var(--mono);text-align:right}
.kv .tot{font-weight:600;border-top:1px solid var(--line);padding-top:6px}
.tones{display:grid;gap:8px}
.tones button{all:unset;box-sizing:border-box;display:block;border:1px solid var(--line);border-radius:12px;padding:11px 13px;cursor:pointer;font-size:13.5px;background:var(--panel2)}
.tones button:hover{border-color:var(--accent)}
.tones button b{display:block;font-size:11.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--accent);margin-bottom:3px}
.draft{border:1px solid var(--line);border-radius:12px;padding:12px 14px;background:var(--panel2);font-size:14px;white-space:pre-wrap}

/* timeline */
.tl{list-style:none;margin:0;padding:0}
.tl li{display:grid;grid-template-columns:62px minmax(0,1fr);gap:10px;padding:7px 0;border-bottom:1px solid var(--line2);font-size:13px}
.tl li:last-child{border-bottom:none}

/* colleague phone page */
.phonewrap{max-width:440px;margin:0 auto;padding:20px 16px 60px}
.phone{background:var(--panel);border:1px solid var(--line);border-radius:22px;padding:22px 20px;box-shadow:var(--shadow)}
.phone .hd{display:flex;gap:10px;align-items:center;margin-bottom:14px}
.phone .av{width:36px;height:36px;border-radius:10px;background:var(--accent);color:#fff;display:grid;place-items:center;font-weight:600}
.phone .amt{font-family:var(--mono);font-size:34px;font-weight:600;letter-spacing:-.03em;margin:4px 0}
.box{border:1px solid var(--line);border-radius:14px;padding:14px;margin:14px 0;background:var(--panel2)}
.ln{all:unset;box-sizing:border-box;display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--line2);font-size:13.5px;cursor:pointer;width:100%}
.ln .n{font-family:var(--mono);white-space:nowrap}
.ln small{display:block;color:var(--ink3);font-size:12px}
.math{font-family:var(--mono);font-size:12.5px;background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:8px 10px;margin:6px 0 8px}
.privacy{text-align:center;font-size:12px;color:var(--ink3);margin-top:16px}
.viewlabel{text-align:center;font-size:12px;color:var(--ink3);margin-bottom:10px}

/* modal + toast */
.overlay{position:fixed;inset:0;background:rgba(8,10,16,.5);z-index:40;display:flex;align-items:flex-start;justify-content:center;padding:24px 16px;overflow:auto}
.modal{background:var(--bg);border-radius:18px;width:480px;max-width:100%;padding:16px;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.modal .hd{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.modal .hd h2{margin:0;font-size:15px}
.modal .hd .btn{margin-left:auto}
.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:var(--ink);color:var(--panel);padding:10px 16px;border-radius:10px;font-size:13.5px;z-index:60;opacity:0;transition:opacity .2s;pointer-events:none;max-width:calc(100% - 32px)}
.toast.on{opacity:1}
.spin{display:inline-block;width:14px;height:14px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:sp .7s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}

@media (max-width:760px){
  .appbar{padding:0 16px;gap:4px}
  .logo{padding-top:12px}
  .logo .biz{display:none}
  .tabs{margin-left:0;width:100%;overflow-x:auto}
  .tabs button{padding:12px 10px}
  .main,.narrow{padding:18px 16px 70px}
  .tiles{grid-template-columns:minmax(0,1fr)}
  .edgrid{grid-template-columns:minmax(0,1fr)}
  h1{font-size:28px}
  .needs{flex-wrap:wrap}
  .needs .btn{width:100%}
  .demobar .vw{width:100%;overflow-x:auto;flex-wrap:nowrap}
}
</style>
</head>
<body>
<div id="app"></div>
<div class="toast" id="toast" role="status"></div>

<script>
/* ==================================================================
   Shared Collect — owner app + colleague page, one file, no backend.
   - Rules compute every rupee (computeShares, cashGap).
   - AI reads and drafts through one adapter (AI.*). Local stand-ins
     ship by default; set a Gemini key to use Gemini (see CFG below).
   - Demo controls exist only with ?demo in the URL.
   ================================================================== */

/* ---------- configuration ---------- */
// To use Gemini: in the browser console run
//   localStorage.setItem('sc.geminiKey', '<your key>')   (optional: 'sc.geminiModel')
// then reload. For production, call Gemini from a backend instead —
// a key in the browser is visible to anyone who opens the page.
const CFG = { ai:{ provider:'local', geminiKey:'', model:'gemini-2.5-flash' } };
try{
  const k = localStorage.getItem('sc.geminiKey'); if(k){ CFG.ai.provider = 'gemini'; CFG.ai.geminiKey = k; }
  const m = localStorage.getItem('sc.geminiModel'); if(m) CFG.ai.model = m;
}catch(e){}
const DEMO = /[?&]demo\b/.test(location.search);

/* ---------- constants & formatting ---------- */
const DUE = '2026-09-30';
const BILL_DAY = '2026-09-01';
const MONTH = 'August';
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'];
const IFSC = 'RATN0VAAPIS';
const fmt = n => '₹' + Math.round(n || 0).toLocaleString('en-IN');
const num = n => Math.round(n || 0).toLocaleString('en-IN');
const dec = n => (n || 0).toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2});
const pct = (a, b) => b ? Math.round(a * 100 / b) : 0;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const parseAmt = v => { const s = String(v || '').toLowerCase().replace(/,/g, ''); const m = s.match(/([\d.]+)\s*(k|l|lakh)?/); if(!m) return 0; let n = +m[1]; if(m[2] === 'k') n *= 1e3; if(m[2] === 'l' || m[2] === 'lakh') n *= 1e5; return Math.round(n) || 0; };
function dayNum(iso){ const [y, m, d] = String(iso).split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); }
function fd(iso){ if(!iso) return '—'; const [, m, d] = iso.split('-').map(Number); return d + ' ' + MON[m - 1]; }
const ord = n => n + ({1:'st', 2:'nd', 3:'rd', 21:'st', 22:'nd', 23:'rd'}[n] || 'th');
const payDate = d => `2026-10-${String(d).padStart(2, '0')}`;
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

/* ==================================================================
   RULES ENGINE (real code — the AI never sets an amount)
   ================================================================== */
// Integer allocation by weights, largest remainder; ties go to the lowest running total.
function allocate(amount, weights, running){
  running = running || {};
  const ids = Object.keys(weights).filter(i => weights[i] > 0), out = {}, exact = {};
  Object.keys(weights).forEach(i => { out[i] = 0; exact[i] = 0; });
  const W = ids.reduce((s, i) => s + weights[i], 0);
  if(!W || !amount) return {out, exact};
  let used = 0;
  ids.forEach(i => { exact[i] = amount * weights[i] / W; out[i] = Math.floor(exact[i] + 1e-9); used += out[i]; });
  const order = ids.slice().sort((a, b) => {
    const fa = exact[a] - out[a], fb = exact[b] - out[b];
    if(Math.abs(fa - fb) > 1e-9) return fb - fa;
    return ((running[a] || 0) + out[a]) - ((running[b] || 0) + out[b]) || a.localeCompare(b);
  });
  for(let k = 0; k < amount - used; k++) out[order[k % order.length]]++;
  return {out, exact};
}
// Each cost is split to the rupee and sums exactly. Methods:
//   equal · count (by any measure) · share (fractions for some, rest equal) · fixed (₹ for some, rest equal)
function computeShares(costs, ids, counts){
  const total = {}, byCost = {};
  ids.forEach(i => total[i] = 0);
  costs.forEach(c => {
    const amt = Math.round(c.amount || 0);
    let out = {}, exact = {}, w = {};
    if(c.method === 'count'){
      const m = (counts && counts[c.measure]) || {};
      ids.forEach(i => w[i] = +m[i] || 0);
      ({out, exact} = allocate(amt, w, total));
    } else if(c.method === 'share' || c.method === 'fixed'){
      const set = c.method === 'share' ? (c.shares || {}) : (c.fixed || {});
      let taken = 0;
      ids.forEach(i => { out[i] = 0; exact[i] = 0; });
      Object.keys(set).filter(i => ids.includes(i)).forEach(i => {
        const v = c.method === 'share' ? Math.floor(amt * set[i] + 1e-9) : Math.round(set[i]);
        out[i] = v; exact[i] = c.method === 'share' ? amt * set[i] : v; taken += v;
      });
      const rest = ids.filter(i => !(i in set));
      rest.forEach(i => w[i] = 1);
      const r = allocate(Math.max(0, amt - taken), w, total);
      rest.forEach(i => { out[i] = r.out[i]; exact[i] = r.exact[i]; });
    } else {
      ids.forEach(i => w[i] = 1);
      ({out, exact} = allocate(amt, w, total));
    }
    byCost[c.id] = {out, exact, w};
    ids.forEach(i => total[i] += out[i] || 0);
  });
  return {total, byCost};
}
// Cash calendar: what must go out by a date vs what is expected in by it.
function cashGap(outflows, inflows, by){
  const b = dayNum(by);
  const need = outflows.filter(o => dayNum(o.date) <= b).reduce((s, o) => s + o.amt, 0);
  const inflow = inflows.filter(x => dayNum(x.d) <= b).reduce((s, x) => s + x.amt, 0);
  return {need, inflow, gap:Math.max(0, need - inflow)};
}

/* ==================================================================
   AI ADAPTER — local stand-ins with the same contract as Gemini.
   ================================================================== */
const FRACTIONS = {'one-third':1/3,'one third':1/3,'a third':1/3,'1/3':1/3,'one-fourth':1/4,'one fourth':1/4,'a quarter':1/4,'one-quarter':1/4,'one quarter':1/4,'1/4':1/4,'half':1/2,'one-half':1/2,'one half':1/2,'1/2':1/2,'two-thirds':2/3,'two thirds':2/3,'2/3':2/3};
function matchPerson(word, people){
  const w = String(word || '').toLowerCase().replace(/^dr\.?\s+/, '').trim();
  if(!w) return null;
  return people.find(p => p.name.toLowerCase().replace(/^dr\.?\s+/, '').split(/\s+/).some(t => t === w || t === w.split(' ')[0])) || null;
}
function localDraft(text, people){
  const sentences = String(text || '').split(/(?<=[.!?\n])\s+/).map(s => s.trim()).filter(Boolean);
  const costs = [], questions = [];
  sentences.forEach(s => {
    const fixedRe = /([A-Z][\w.]*(?:\s[A-Z]\w*)?)\s+pays?\s+(?:a\s+)?(?:flat\s+)?(?:₹|rs\.?\s?)\s*([\d,]+)/g;
    const fixed = {}, fixedAmts = new Set(); let fm;
    while((fm = fixedRe.exec(s))){ const p = matchPerson(fm[1], people), a = parseAmt(fm[2]); fixedAmts.add(a); if(p) fixed[p.id] = a; }
    const amtRe = /(?:₹|rs\.?\s?|inr\s?)\s*([\d,]+(?:\.\d+)?)\s*(k|lakh)?\b|\b(\d{1,3}(?:,\d{2,3})+|\d{4,})\b/gi;
    let amount = 0, m;
    while((m = amtRe.exec(s))){ const a = parseAmt((m[1] || m[3]) + (m[2] || '')); if(a && !fixedAmts.has(a)){ amount = a; break; } }
    if(!amount) return;
    let name = s.split(/\s+(?:of|is|are|costs?|at|comes to|=)\s*(?:₹|rs\b)|\s*[₹(:,—–]\s*|\s+-\s+|\s+(?:split|paid|shared|divided|which)\b/i)[0]
      .replace(/^(the|our|and|also|then|we have|we pay)\s+/i, '').replace(/\s*(?:rs\.?)\s*[\d,]+.*$/i, '').trim();
    if(!name || name.length > 48) name = 'Cost ' + (costs.length + 1);
    const pd = s.match(/(?:paid|due|pay|goes out|deducted)\s+(?:on|by)\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?/i);
    const c = {id:'c' + (costs.length + 1), name:cap(name), amount, payDay:pd ? Math.min(28, +pd[1]) : null, method:'equal', measure:'', shares:{}, fixed:{}, assumed:false};
    const sh = s.match(/([A-Z][\w.]*(?:\s[A-Z]\w*)?)\s+pays?\s+(one[- ]third|a third|two[- ]thirds|one[- ](?:fourth|quarter)|a quarter|(?:one[- ])?half|\d+\/\d+|\d+(?:\.\d+)?\s?%)/);
    const ms = s.match(/\b(?:by|per|based on|according to|in proportion to)\s+(?:the\s+)?(?:(?:number|no\.?|count|amount)\s+of\s+)?([a-z][a-z\-]*(?:\s+[a-z][a-z\-]*){0,2}?)\s*(?=[,.;:)]|\s+(?:each|every|per|done|used|that|we|they|between|among|and|in|this|the|of|for)\b|$)/i);
    if(Object.keys(fixed).length){ c.method = 'fixed'; c.fixed = fixed; }
    else if(sh){
      const p = matchPerson(sh[1], people), k = sh[2].toLowerCase();
      const frac = /%/.test(k) ? parseFloat(k) / 100 : /^\d+\/\d+$/.test(k) ? (+k.split('/')[0]) / (+k.split('/')[1]) : (FRACTIONS[k] || FRACTIONS[k.replace(' ', '-')] || 1/3);
      if(p){ c.method = 'share'; c.shares = {[p.id]:frac}; }
      else { c.method = 'share'; questions.push({kind:'who', cost:c.id, frac, word:sh[1], text:`Who is “${sh[1]}” in “${c.name}”? I couldn't match them to anyone you added.`}); }
    }
    else if(ms && !/^(equal|equally|cheque|cash|upi|month)$/i.test(ms[1].trim())){ c.method = 'count'; c.measure = ms[1].trim().toLowerCase(); }
    else if(!/equal|evenly|same/i.test(s)) c.assumed = true;
    costs.push(c);
  });
  if(!costs.length) questions.push({kind:'none', text:'I couldn’t find any costs with amounts. Try one line per cost, e.g. “Rent ₹45,000, split by sessions.”'});
  return {costs, questions};
}
function localRead(text){
  const t = String(text || '').toLowerCase();
  let date = null;
  const dm = t.match(/\b(\d{1,2})\s*(?:st|nd|rd|th)?\s*(?:tak|tk|oct|october|sept|september)\b|\bby\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\b|\bon\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\b/);
  if(dm){ const d = +(dm[1] || dm[2] || dm[3]); if(d >= 1 && d <= 31) date = /sept/.test(t) ? `2026-09-${String(d).padStart(2, '0')}` : `2026-10-${String(d).padStart(2, '0')}`; }
  if(/tight|time|\btak\b|later|next week|thoda|mushkil|can i pay|pay (?:on|by)|extend/.test(t)) return {intent:'more-time', date, why:'Asks for more time' + (date ? ` and names a date (${fd(date)})` : '') + (/pakka|sure|promise/.test(t) ? ', with a firm commitment.' : '.')};
  if(/wrong|galat|not mine|didn.?t|too high|higher|mistake|incorrect/.test(t)) return {intent:'dispute', why:'Says a number looks wrong.'};
  if(/paid|kar diya|sent it|transferred/.test(t)) return {intent:'paid', why:'Says they have paid.'};
  if(/\?|why|how|kaise|kyun|what/.test(t)) return {intent:'question', why:'Asks how something is worked out.'};
  return {intent:'other', why:'No clear request.'};
}
function localWrite(kind, c){
  const op = c.ownerFirst, f = c.toFirst;
  if(kind === 'plan'){
    const ask = c.inst2 > 0 ? `${fmt(c.inst1)} by ${fd(c.d1)} and ${fmt(c.inst2)} by ${fd(c.d2)}` : `${fmt(c.inst1)} by ${fd(c.d1)}`;
    return ({
      direct:`${f}, can you do ${ask}? Agar nahi, batao kya possible hai. — ${op}`,
      warm:`${f} ji, no problem, I understand. Kya ${ask} ho payega? Agar nahi, batao kya possible hai. — ${op}`,
      formal:`Dear ${c.toName}, thank you for letting me know. Could you pay ${ask}? Agar nahi, batao kya possible hai. Regards, ${op}`})[c.tone];
  }
  if(kind === 'nudge') return ({
      direct:`${f}, reminder: your ${fmt(c.amount)} for ${MONTH} is due ${fd(DUE)}. Pay here: ${c.link} — ${op}`,
      warm:`${f} ji, a gentle reminder — ${fmt(c.amount)} for ${MONTH} is due ${fd(DUE)}. Next visit pe kar dena please. ${c.link} — ${op}`,
      formal:`Dear ${c.toName}, a reminder that your share of ${fmt(c.amount)} for ${MONTH} is due on ${fd(DUE)}. Payment link: ${c.link}. Regards, ${op}`})[c.tone];
  if(kind === 'answer') return c.intent === 'dispute'
      ? `${f}, thanks for flagging. Your count came from the ${c.source}. I'll check it and get back to you before the due date. — ${op}`
      : `${f}, good question. ${c.measure ? `Your ${c.measure} come from the ${c.source}, and you'll see your own count every month before you pay.` : 'Your page shows the maths for every line.'} — ${op}`;
  if(kind === 'accept-time') return `${f}, ${fd(c.date)} is fine. Your page shows the new date. — ${op}`;
  if(kind === 'decline-time') return `${f}, I need it by ${fd(DUE)} as agreed — my own payments go out right after. Agar mushkil hai, batao. — ${op}`;
  if(kind === 'accept-counter') return `${f}, theek hai — ${fmt(c.inst1)} by ${fd(c.d1)} and ${fmt(c.inst2)} by ${fd(c.d2)}. — ${op}`;
  if(kind === 'keep-counter') return `${f}, my own payments go out on ${fd(c.key)}, so ${fmt(c.inst1)} by ${fd(c.d1)} really helps. The rest by ${fd(c.d2)} is fine. — ${op}`;
  return '';
}
async function gemini(prompt, schema){
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(CFG.ai.model)}:generateContent?key=${encodeURIComponent(CFG.ai.geminiKey)}`;
  const res = await fetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({
    contents:[{role:'user', parts:[{text:prompt}]}],
    generationConfig:{responseMimeType:'application/json', responseSchema:schema, temperature:0.2}})});
  if(!res.ok) throw new Error('Gemini HTTP ' + res.status);
  const j = await res.json();
  return JSON.parse(j.candidates[0].content.parts[0].text);
}
const SCHEMA = {
  split:{type:'OBJECT', properties:{
    costs:{type:'ARRAY', items:{type:'OBJECT', properties:{
      name:{type:'STRING'}, amount:{type:'NUMBER'}, payDay:{type:'INTEGER', nullable:true},
      method:{type:'STRING', enum:['equal','count','share','fixed']}, measure:{type:'STRING'},
      shares:{type:'ARRAY', items:{type:'OBJECT', properties:{person:{type:'STRING'}, fraction:{type:'NUMBER'}}}},
      fixed:{type:'ARRAY', items:{type:'OBJECT', properties:{person:{type:'STRING'}, amount:{type:'NUMBER'}}}}},
      required:['name','amount','method']}},
    questions:{type:'ARRAY', items:{type:'STRING'}}}, required:['costs']},
  read:{type:'OBJECT', properties:{intent:{type:'STRING', enum:['more-time','question','dispute','paid','other']}, date:{type:'STRING', nullable:true}, why:{type:'STRING'}}, required:['intent','why']},
  write:{type:'OBJECT', properties:{message:{type:'STRING'}}, required:['message']}
};
const AI = {
  // text + people -> {costs:[{name, amount, payDay, method, measure, shares, fixed}], questions:[]}
  async draftSplit(text, people){
    if(CFG.ai.provider === 'gemini'){
      try{
        const r = await gemini(`You turn a business owner's description of how shared monthly costs are split into structured costs.
People sharing (the owner is "me"): ${['me (the owner)'].concat(people.map(p => p.name)).join(', ')}.
For each cost give: name, monthly amount in rupees, payDay (day of month the owner pays it, or null), and method:
"equal" (split equally among everyone), "count" (in proportion to something counted — put that thing, in the owner's own words, in "measure"),
"share" (named people pay a fraction; everyone else splits the rest equally), "fixed" (named people pay fixed rupees; everyone else splits the rest equally).
Never invent amounts. If something is missing or ambiguous, add a short question to "questions".
Description:\n${text}`, SCHEMA.split);
        const costs = (r.costs || []).map((c, i) => ({id:'c' + (i + 1), name:c.name, amount:Math.round(c.amount || 0), payDay:c.payDay || null, method:c.method, measure:(c.measure || '').toLowerCase(),
          shares:Object.fromEntries((c.shares || []).map(s => [(matchPerson(s.person, people) || {}).id, s.fraction]).filter(e => e[0])),
          fixed:Object.fromEntries((c.fixed || []).map(s => [(matchPerson(s.person, people) || {}).id, Math.round(s.amount)]).filter(e => e[0])), assumed:false}));
        return {costs, questions:(r.questions || []).map(t => ({kind:'ai', text:t}))};
      }catch(e){ console.warn('Gemini unavailable — using the local draft.', e); }
    }
    return localDraft(text, people);
  },
  // message -> {intent, date, why}
  async readMessage(text){
    if(CFG.ai.provider === 'gemini'){
      try{ const r = await gemini(`Classify this message from someone who owes a share of a shared cost (due ${DUE}, today ${S.today}). Intent is one of more-time, question, dispute, paid, other. If they name a date, return it as YYYY-MM-DD. Message: """${text}"""`, SCHEMA.read); return {intent:r.intent, date:r.date || null, why:r.why}; }
      catch(e){ console.warn('Gemini unavailable — using the local reader.', e); }
    }
    return localRead(text);
  },
  // kind + context -> message in the owner's voice. Amounts always come from the rules and are checked.
  async write(kind, ctx){
    const local = localWrite(kind, ctx);
    if(CFG.ai.provider === 'gemini'){
      try{
        const r = await gemini(`Rewrite this WhatsApp message from ${ctx.ownerFirst} to ${ctx.toName} in a ${ctx.tone || 'warm'} tone. Hinglish is fine. Keep every amount and date exactly. Under 45 words.\n${local}`, SCHEMA.write);
        const amounts = local.match(/₹[\d,]+/g) || [];
        if(r.message && amounts.every(a => r.message.includes(a))) return r.message;
      }catch(e){ console.warn('Gemini unavailable — using the local draft.', e); }
    }
    return local;
  }
};

/* ==================================================================
   STATE
   ================================================================== */
let S;
function fresh(){
  S = {
    v:9, view:'owner', today:'2026-08-28',
    account:{business:'Meera Diagnostics', owner:'Dr Meera', ownerFirst:'Meera'},
    stage:'welcome', page:'home', arg:null,
    people:[{id:'p1', name:'', phone:''}], seq:2,
    text:'', drafting:false, questions:[], costs:[], editing:null, errors:{},
    source:{type:'staff', name:'', phone:''},
    version:1, sent:false, invites:{}, confirmResplit:false,
    tone:null, perms:{remind:true, plan:true, flag:true}, channels:{whatsapp:true, invoices:true},
    month:{counts:null, draft:null, status:'open', step:'numbers', sentOn:null, bills:null, invoices:{}, csvMsg:null},
    pays:{}, plans:{}, items:[], history:{me:[]}, expect:{}, done:{}, closed:false,
    ui:{open:{}, preview:null, wrong:{}, counter:{}, decline:{}, ask:{}}
  };
  return S;
}
const colleagues = () => S.people.filter(p => p.name.trim());
const allIds = () => ['me'].concat(colleagues().map(p => p.id));
const P = id => S.people.find(p => p.id === id);
const nm = id => id === 'me' ? S.account.owner : (P(id) || {}).name || 'Someone';
const firstName = id => nm(id).replace(/^Dr\.?\s+/i, '').split(' ')[0];
const measures = () => [...new Set(S.costs.filter(c => c.method === 'count' && c.measure).map(c => c.measure))];
const total = () => S.costs.reduce((s, c) => s + (c.amount || 0), 0);
const status = id => (S.invites[id] || {}).status;
const accepted = id => status(id) === 'accepted';
const allAccepted = () => colleagues().length > 0 && colleagues().every(p => accepted(p.id));
const sourceName = () => S.source.type === 'staff' ? `register ${S.source.name || 'your staff'} keeps` : 'monthly numbers';
const billed = () => S.month.status === 'sent';
const bills = () => S.month.bills || {};
const paid = id => (S.pays[id] || []).reduce((s, p) => s + p.amt, 0);
const due = id => Math.max(0, (bills()[id] || 0) - paid(id));
const openItems = () => S.items.filter(i => i.status === 'open');
const roles = () => { const c = colleagues(); return {onTime:c[0], asker:c[1] || c[0], late:c[2] || c[c.length - 1]}; };
function hist(id, text){ (S.history[id] = S.history[id] || []).push({t:S.today, text}); }
function wa(id, text){ hist(id, `Message from ${S.account.ownerFirst}: “${text}”`); }

/* expected inflows & cash position */
function sched(id, opt){
  opt = opt || {};
  const rem = due(id);
  if(rem <= 0) return [];
  const pl = S.plans[id];
  if(pl && !(opt.noPlan && pl.viaAgent) && (pl.status === 'accepted' || pl.status === 'proposed')){
    let p = paid(id); const out = [];
    pl.inst.forEach(x => { const take = Math.min(x.amt, p); p -= take; if(x.amt - take > 0) out.push({d:x.d, amt:x.amt - take}); });
    return out;
  }
  if(S.expect[id] === false) return [{d:'2026-10-31', amt:rem}];
  const said = S.items.find(i => i.from === id && i.kind === 'reply' && i.said);
  if(said) return [{d:said.said, amt:rem}];
  return [{d:DUE, amt:rem}];
}
function outflows(){ return S.costs.filter(c => c.payDay).map(c => ({name:c.name, amt:c.amount, date:payDate(c.payDay)})); }
function inflows(opt){ const xs = []; allIds().forEach(id => { (S.pays[id] || []).forEach(p => xs.push({d:p.d, amt:p.amt})); sched(id, opt).forEach(x => xs.push(x)); }); return xs; }
function keyDate(opt){
  const ds = [...new Set(outflows().map(o => o.date))].sort();
  let best = ds[0] || DUE, worst = -Infinity; const inf = inflows(opt);
  ds.forEach(d => { const g = cashGap(outflows(), inf, d); if(g.need - g.inflow > worst + .5){ worst = g.need - g.inflow; best = d; } });
  return best;
}
const cashAt = (d, opt) => cashGap(outflows(), inflows(opt), d);
function metrics(){
  const b = bills(), tot = Object.values(b).reduce((s, x) => s + x, 0);
  let byDue = 0, ext = 0, extTot = 0, coll = 0, viaPlan = 0;
  allIds().forEach(id => {
    (S.pays[id] || []).forEach(p => { coll += p.amt; if(dayNum(p.d) <= dayNum(DUE)){ byDue += p.amt; if(id !== 'me') ext += p.amt; if(S.plans[id] && S.plans[id].viaAgent) viaPlan += p.amt; } });
    if(id !== 'me') extTot += b[id] || 0;
  });
  return {tot, byDue, ext, extTot, coll, viaPlan};
}

/* ==================================================================
   VIEW HELPERS
   ================================================================== */
const IC = {
  home:'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  users:'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.9 M16 3.1a4 4 0 0 1 0 7.8',
  settings:'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  doc:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8',
  spark:'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z',
  check:'M20 6L9 17l-5-5', x:'M18 6L6 18 M6 6l12 12', arrow:'M5 12h14 M12 5l7 7-7 7', back:'M19 12H5 M12 19l-7-7 7-7',
  edit:'M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z', send:'M22 2L11 13 M22 2l-7 20-4-9-9-4z',
  lock:'M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z M7 11V7a5 5 0 0 1 10 0v4',
  clock:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2', pay:'M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M2 10h20',
  msg:'M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z', eye:'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  plus:'M12 5v14 M5 12h14', upload:'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12', copy:'M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
  chart:'M18 20V10 M12 20V4 M6 20v-6', play:'M6 4l14 8-14 8z', alert:'M12 9v4 M12 17h.01 M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z'
};
const ic = k => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="${IC[k]}"/></svg>`;
const dattr = o => Object.entries(o || {}).filter(([, v]) => v != null).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');
function b(label, action, o){ o = o || {}; return `<button type="button" class="btn ${o.cls || ''}" data-action="${action}"${o.arg != null ? ` data-arg="${esc(o.arg)}"` : ''}${dattr(o.d)}${o.dis ? ' disabled' : ''}${o.title ? ` aria-label="${esc(o.title)}" title="${esc(o.title)}"` : ''}>${o.icon ? ic(o.icon) : ''}${label ? `<span>${label}</span>` : ''}</button>`; }
const pill = (t, c) => `<span class="pill ${c || ''}">${t}</span>`;
const aiTag = t => pill(ic('spark') + (t || 'Suggested by AI'), 'ai');
const logo = `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 2h12L13 22H7l3.6-8.5H5z" fill="#3395ff"/></svg>`;
function fracLabel(f){ if(Math.abs(f - 1/3) < 1e-6) return 'one-third'; if(Math.abs(f - 2/3) < 1e-6) return 'two-thirds'; if(f === .5) return 'half'; if(f === .25) return 'a quarter'; return Math.round(f * 1000) / 10 + '%'; }
function fracInput(f){ if(Math.abs(f - 1/3) < 1e-6) return '1/3'; if(Math.abs(f - 2/3) < 1e-6) return '2/3'; return Math.round(f * 1000) / 10 + '%'; }
function methodSentence(c){
  const amt = `<b>${fmt(c.amount)}</b>`;
  if(c.method === 'count') return `${amt} · split by <b>${esc(c.measure || '…')}</b> each person used`;
  if(c.method === 'share'){ const e = Object.entries(c.shares || {}); return e.length ? `${amt} · ${e.map(([id, f]) => `<b>${esc(nm(id))}</b> pays ${fracLabel(f)}`).join(', ')}, the rest split equally` : `${amt} · someone pays a fixed share <span style="color:var(--warn)">(who?)</span>`; }
  if(c.method === 'fixed'){ const e = Object.entries(c.fixed || {}); return e.length ? `${amt} · ${e.map(([id, a]) => `<b>${esc(nm(id))}</b> pays ${fmt(a)}`).join(', ')}, the rest split equally` : `${amt} · someone pays a fixed amount <span style="color:var(--warn)">(who?)</span>`; }
  return `${amt} · split <b>equally</b>`;
}

/* ==================================================================
   OWNER APP
   ================================================================== */
const WIZ = ['welcome','people','describe','check','numbers','send'];
function wizSteps(){ return WIZ.filter(s => s !== 'numbers' || measures().length); }
function needsCount(){ return needsCards().length; }
function ownerApp(){
  if(S.stage !== 'live') return wizard();
  const n = needsCount();
  const tab = ['people','person'].includes(S.page) ? 'people' : ['settings','split'].includes(S.page) ? 'settings' : 'home';
  const pages = {home:pHome, replies:pReplies, bills:pBills, decision:pDecision, people:pPeople, person:pPerson, settings:pSettings, split:pSplitEdit, month:pMonth};
  return `<header class="appbar"><div class="logo">${logo}<span>Shared costs</span><span class="biz">${esc(S.account.business)}</span></div>
    <nav class="tabs">${[['home','Home','home'],['people','People','users'],['settings','Settings','settings']].map(([k, l, i]) => `<button type="button" class="${tab === k ? 'on' : ''}" data-action="go" data-arg="${k}">${ic(i)}<span>${l}</span>${k === 'home' && n ? `<span class="badge">${n}</span>` : ''}</button>`).join('')}</nav></header>
    ${(pages[S.page] || pHome)()}`;
}

/* ---------- setup wizard ---------- */
function wizard(){
  const steps = wizSteps(), i = steps.indexOf(S.stage);
  const head = S.stage === 'welcome' ? '' : `<div class="steps"><span>Step ${i} of ${steps.length - 1}</span><div class="bar"><div style="width:${i / (steps.length - 1) * 100}%"></div></div></div>`;
  const body = ({welcome:wWelcome, people:wPeople, describe:wDescribe, check:wCheck, numbers:wNumbers, send:wSend})[S.stage]();
  return `<header class="appbar"><div class="logo">${logo}<span>Shared costs</span><span class="biz">${esc(S.account.business)}</span></div></header><div class="narrow">${head}${body}</div>`;
}
const wizFoot = (next, label) => `<div class="foot">${b('Back', 'wizBack', {cls:'ghost', icon:'back'})}${b(label, next, {cls:'primary lg', icon:'arrow'})}</div>`;
function wWelcome(){
  return `<div class="card" style="padding:28px">
    <h1>Share a monthly cost, without the follow-ups</h1>
    <p class="lede">Describe how you split a cost with colleagues once. Each person sees exactly why they owe what they owe, bills go out in your name every month, and when someone is late you get a suggestion for what to do.</p>
    <div class="lockrow">${ic('lock')}<span>${esc(S.account.owner)} · <b>${esc(S.account.business)}</b> · from your Razorpay account</span></div>
    <div style="margin-top:16px">
      <div class="bullet">${ic('users')}<div><b>Add who you share with.</b> Names and WhatsApp numbers.</div></div>
      <div class="bullet">${ic('msg')}<div><b>Describe the split in your own words.</b> The agent turns it into a rule you check.</div></div>
      <div class="bullet">${ic('check')}<div><b>You approve everything.</b> Nothing is sent in your name without your OK.</div></div>
    </div>
    <div style="margin-top:18px">${b('Set up shared costs', 'wizNext', {cls:'primary lg full', icon:'arrow'})}</div>
    <p class="tiny mute" style="text-align:center;margin-top:10px">Takes about 5 minutes.</p></div>`;
}
function peopleRows(){
  return S.people.map((p, k) => `<div class="prow"><input type="text" placeholder="Name" value="${esc(p.name)}" data-live="personName" data-id="${p.id}" aria-label="Name ${k + 1}"><input type="tel" placeholder="WhatsApp number" value="${esc(p.phone)}" data-live="personPhone" data-id="${p.id}" aria-label="WhatsApp number ${k + 1}">${S.people.length > 1 ? b('', 'removePerson', {cls:'ghost sm', icon:'x', d:{id:p.id}, title:'Remove'}) : '<span></span>'}</div>`).join('');
}
function wPeople(){
  return `<h1>Who shares the cost with you?</h1><p class="lede">They'll get a WhatsApp message with a link to their own page. Nobody sees anyone else's share or status.</p>
  <div class="card">
    <div class="lockrow" style="margin-bottom:12px">${ic('lock')}<span>${esc(S.account.owner)} <span class="mute">(you)</span></span></div>
    ${peopleRows()}
    <div class="row">${b('Add person', 'addPerson', {cls:'sm', icon:'plus'})}${DEMO ? b('Fill example', 'demoFillPeople', {cls:'sm ghost'}) : ''}</div>
    ${S.errors.people ? `<div class="err">${S.errors.people}</div>` : ''}
  </div>${wizFoot('wizNext', 'Continue')}`;
}
function wDescribe(){
  return `<h1>How do you split it today?</h1><p class="lede">Write it the way you'd explain it to a colleague — one line per cost works best. Mention when you pay each one if you can.</p>
  <div class="card">
    <textarea data-live="text" aria-label="How you split costs" placeholder="e.g. Machine EMI ₹40,000, paid on the 5th, split by number of tests each of us did. Rent ₹45,000 split by hours used. Staff salary ₹25,000 split equally. Electricity ₹10,000 — Ravi pays a third, the rest equally.">${esc(S.text)}</textarea>
    <div class="row sb" style="margin-top:10px"><span class="small mute">${ic('spark')} The agent drafts a rule from this. You check every line next.</span>${DEMO ? b('Fill example', 'demoFillText', {cls:'sm ghost'}) : ''}</div>
    ${S.errors.text ? `<div class="err">${S.errors.text}</div>` : ''}
  </div>
  <div class="foot">${b('Back', 'wizBack', {cls:'ghost', icon:'back'})}${S.drafting ? `<button type="button" class="btn primary lg" data-action="noop" disabled><span class="spin"></span><span>Drafting…</span></button>` : b('Draft my split', 'draftSplit', {cls:'primary lg', icon:'spark'})}</div>`;
}
function wCheck(){
  return `<h1>Check your split</h1><p class="lede">This is the rule everyone will accept. Tap <b>Change</b> on any cost to fix it.</p>
  ${splitEditor()}
  ${wizFoot('wizNext', 'Looks right')}`;
}
function splitEditor(){
  return `${S.questions.map((q, k) => `<div class="question"><b>${ic('alert')} One thing I need:</b> ${esc(q.text)}
      ${q.kind === 'who' ? `<div class="chips" style="margin-top:8px">${allIds().map(id => `<button type="button" class="chip" data-action="answerWho" data-k="${k}" data-id="${id}">${esc(nm(id))}${id === 'me' ? ' (me)' : ''}</button>`).join('')}<button type="button" class="chip" data-action="answerWho" data-k="${k}" data-id="">Nobody — split it equally</button></div>` : `<div style="margin-top:6px">${b('Got it', 'dismissQ', {cls:'sm', d:{k}})}</div>`}</div>`).join('')}
  <div class="card">
    <div class="row sb" style="margin-bottom:10px"><h2 style="margin:0">${S.costs.length} cost${S.costs.length === 1 ? '' : 's'} · ${fmt(total())} a month</h2>${aiTag('Drafted by AI — check it')}</div>
    ${S.costs.map(costCard).join('')}
    <div style="margin-top:12px">${b('Add a cost', 'addCost', {cls:'sm', icon:'plus'})}</div>
    ${S.errors.split ? `<div class="err">${S.errors.split}</div>` : ''}
  </div>
  ${shareSummary()}`;
}
function costCard(c){
  const ed = S.editing === c.id;
  const head = `<div class="row sb" style="align-items:flex-start;flex-wrap:nowrap"><div style="min-width:0"><div class="sent"><b>${esc(c.name)}</b> — ${methodSentence(c)}</div>
    <div class="meta">${c.payDay ? `You pay it on the ${ord(c.payDay)}` : '<span style="color:var(--warn)">When do you pay this? It helps the agent plan around late payments.</span>'}${c.assumed ? ' · <span style="color:var(--warn)">I assumed equally — change it if that’s wrong</span>' : ''}</div></div>
    ${ed ? b('Done', 'editCost', {cls:'sm primary', d:{id:''}}) : b('Change', 'editCost', {cls:'sm', icon:'edit', d:{id:c.id}})}</div>`;
  if(!ed) return `<div class="cost">${head}</div>`;
  return `<div class="cost ed">${head}
    <div class="edgrid">
      <div><label class="f">What is it</label><input type="text" value="${esc(c.name)}" data-live="costField" data-id="${c.id}" data-f="name" aria-label="Cost name"></div>
      <div><label class="f">Amount each month</label><div class="money"><span>₹</span><input type="text" inputmode="numeric" value="${c.amount ? num(c.amount) : ''}" data-live="costField" data-id="${c.id}" data-f="amount" aria-label="Amount"></div></div>
      <div><label class="f">You pay it on</label><select data-change="costPayDay" data-id="${c.id}" aria-label="Pay day"><option value="">—</option>${Array.from({length:28}, (_, k) => `<option value="${k + 1}"${c.payDay === k + 1 ? ' selected' : ''}>${ord(k + 1)}</option>`).join('')}</select></div>
    </div>
    <label class="f" style="margin-top:12px">How is it split?</label>
    <div class="chips">${[['equal','Equally'],['count','By something you count'],['share','Someone pays a fixed share'],['fixed','Someone pays a fixed amount']].map(([m, l]) => `<button type="button" class="chip ${c.method === m ? 'on' : ''}" data-action="costMethod" data-id="${c.id}" data-m="${m}">${l}</button>`).join('')}</div>
    ${c.method === 'count' ? `<div style="margin-top:10px"><label class="f">What do you count? Use your own word.</label><input type="text" placeholder="e.g. scans, dialysis sessions, orders, desk-days" value="${esc(c.measure)}" data-live="costField" data-id="${c.id}" data-f="measure" aria-label="What you count"></div>` : ''}
    ${c.method === 'share' || c.method === 'fixed' ? `<div style="margin-top:10px"><label class="f">${c.method === 'share' ? 'Their share, e.g. 1/3 or 40%' : 'Their fixed amount in ₹'} — leave the others blank; they split the rest equally</label>
      ${allIds().map(id => `<div class="row" style="margin-bottom:6px;flex-wrap:nowrap"><span style="width:140px;flex:none" class="small">${esc(nm(id))}</span><input type="text" style="max-width:160px" value="${c.method === 'share' ? (c.shares[id] != null ? fracInput(c.shares[id]) : '') : (c.fixed[id] != null ? num(c.fixed[id]) : '')}" data-live="costPart" data-id="${c.id}" data-p="${id}" aria-label="${esc(nm(id))}"></div>`).join('')}</div>` : ''}
    <div class="row" style="margin-top:12px">${b('Remove this cost', 'removeCost', {cls:'sm ghost danger', icon:'x', d:{id:c.id}})}</div></div>`;
}
function shareSummary(){
  if(!S.costs.length || !colleagues().length) return '';
  const fixed = computeShares(S.costs.filter(c => c.method !== 'count'), allIds(), {}).total;
  const usage = S.costs.filter(c => c.method === 'count');
  return `<div class="card" style="margin-top:14px"><h2>What each person pays a month</h2>
  <div class="wrap"><table class="t"><thead><tr><th>Person</th><th class="n">${usage.length ? 'Fixed part' : 'Every month'}</th></tr></thead><tbody>
  ${allIds().map(id => `<tr><td>${esc(nm(id))}${id === 'me' ? ' <span class="mute small">you</span>' : ''}</td><td class="n">${fmt(fixed[id])}</td></tr>`).join('')}
  </tbody></table></div>
  ${usage.length ? `<p class="small" style="margin:10px 0 0">Plus everyone's share of ${usage.map(c => `${fmt(c.amount)} by ${esc(c.measure)}`).join(' and ')}, worked out each month from that month's numbers.</p>` : ''}
  <p class="tiny mute" style="margin-top:6px">Each cost is split to the rupee and adds up exactly.</p></div>`;
}
function wNumbers(){
  const ms = measures(), t = S.source.type;
  return `<h1>How will you give us the monthly numbers?</h1><p class="lede">Some costs are split by ${ms.map(m => `<b>${esc(m)}</b>`).join(' and ')}. At the end of each month the agent needs those numbers for each person.</p>
  <div class="card">
    ${[['staff','Someone on my staff will send them','We message them on WhatsApp on the 1st.'],['me','I’ll type them in','We remind you on the 1st.'],['upload','I’ll upload a sheet','Any spreadsheet with person, what was counted, and the count.']].map(([k, l, s]) =>
      `<button type="button" class="optcard ${t === k ? 'on' : ''}" data-action="setSource" data-arg="${k}"><b>${l}</b><br><span class="small mute">${s}</span></button>`).join('')}
    ${t === 'staff' ? `<div class="prow" style="margin-top:14px"><input type="text" placeholder="Their name" value="${esc(S.source.name)}" data-live="sourceName" aria-label="Staff name"><input type="tel" placeholder="WhatsApp number" value="${esc(S.source.phone)}" data-live="sourcePhone" aria-label="Staff WhatsApp"><span></span></div>${DEMO ? b('Fill example', 'demoFillStaff', {cls:'sm ghost'}) : ''}` : ''}
    ${S.errors.source ? `<div class="err">${S.errors.source}</div>` : ''}
  </div>${wizFoot('wizNext', 'Continue')}`;
}
function inviteText(id){ return `Hi ${firstName(id)}, ${S.account.ownerFirst} here. I've set up how our shared ${S.account.business} costs are split. See your share and the maths here: rzp.io/s/${(id + S.account.business).replace(/\W/g, '').slice(0, 10).toLowerCase()}`; }
function wSend(){
  const c = colleagues();
  return `<h1>Send it to ${c.length} ${c.length === 1 ? 'person' : 'people'}</h1><p class="lede">Each person accepts on their own page. Bills start only once everyone has accepted.</p>
  <div class="card">
    ${c.map(p => `<div style="padding:10px 0;border-bottom:1px solid var(--line2)"><div class="row sb"><b>${esc(p.name)}</b><span class="small mute">${esc(p.phone || 'no number yet')}</span></div>
      <div class="quote" style="margin-bottom:4px">${esc(inviteText(p.id))}<small>WhatsApp</small></div>${b(`See what ${esc(p.name)} will see`, 'preview', {cls:'link sm', icon:'eye', d:{id:p.id}})}</div>`).join('')}
    <div class="note" style="margin-top:14px">${ic('check')} First bills go out on <b>${fd(BILL_DAY)}</b>, for ${MONTH}, due ${fd(DUE)}. The agent drafts reminders and follow-ups — nothing goes out without your OK.</div>
    ${!S.channels.whatsapp ? `<div class="err">WhatsApp is turned off in Settings, so this can’t be sent.</div>` : ''}
  </div>
  <div class="foot">${b('Back', 'wizBack', {cls:'ghost', icon:'back'})}${b(`Send to ${c.length} ${c.length === 1 ? 'person' : 'people'}`, 'sendSplit', {cls:'primary lg', icon:'send', dis:!S.channels.whatsapp})}</div>`;
}

/* ---------- Home ---------- */
function needsCards(){
  const out = [], c = colleagues();
  const pend = c.filter(p => status(p.id) === 'pending');
  c.filter(p => status(p.id) === 'question').forEach(p => out.push(['ai', 'msg', `${esc(p.name)} has a question`, `“${esc(S.invites[p.id].question)}”`, 'Answer', 'go', {arg:'replies'}]));
  c.filter(p => status(p.id) === 'declined' && !S.invites[p.id].handled).forEach(p => out.push(['warn', 'alert', `${esc(p.name)} declined the split`, `“${esc(S.invites[p.id].reason)}”`, 'Decide what to do', 'go', {arg:'replies'}]));
  openItems().forEach(i => out.push(['ai', 'spark', itemTitle(i), itemSub(i), 'Review', 'openItem', {d:{id:i.id}}]));
  if(!billed() && dayNum(S.today) >= dayNum(BILL_DAY)){
    if(!S.month.counts && measures().length) out.push(['', 'doc', `${MONTH} is over — add ${MONTH}'s numbers`, S.source.type === 'staff' ? `${esc(S.source.name || 'Your staff')} hasn't sent them yet. You can add them yourself.` : `We need ${measures().map(esc).join(' and ')} for each person to send bills.`, 'Add numbers', 'openBills', {}]);
    else out.push(['', 'send', `${MONTH}'s bills are ready to send`, allAccepted() ? `${S.month.counts && S.source.type === 'staff' ? `${esc(S.source.name)} sent the numbers. ` : ''}Check each bill, then send.` : 'Bills wait until everyone has accepted the split.', 'Check and send', 'openBills', {}]);
  }
  if(pend.length && S.sent) out.push(['', 'clock', `Waiting for ${pend.length} ${pend.length === 1 ? 'reply' : 'replies'}`, pend.map(p => esc(p.name)).join(', '), 'See replies', 'go', {arg:'replies'}]);
  return out;
}
function pHome(){
  const cards = needsCards(), m = metrics();
  return `<div class="main">
  <h1>Hello, ${esc(S.account.ownerFirst)}</h1><p class="lede">${cards.length ? `${cards.length} thing${cards.length > 1 ? 's need' : ' needs'} you.` : 'Nothing needs you right now.'}</p>
  ${S.closed ? `<div class="needs ai"><div class="ic">${ic('chart')}</div><div class="tx"><b>${MONTH} is closed</b><span>${pct(m.byDue, m.tot)}% arrived by the due date · ${pct(m.coll, m.tot)}% collected.</span></div>${b('See summary', 'go', {arg:'month', cls:'primary'})}</div>` : ''}
  ${cards.map(([cls, i, t, s, l, a, o]) => `<div class="needs ${cls}"><div class="ic">${ic(i)}</div><div class="tx"><b>${t}</b><span>${s}</span></div>${b(l, a, {cls:'primary', ...o})}</div>`).join('')}
  <div class="card" style="margin-top:18px">${monthCard()}</div></div>`;
}
function monthCard(){
  const c = colleagues();
  if(!billed()){
    return `<div class="row sb"><h2 style="margin:0">${MONTH}</h2>${pill(`Bills go out ${fd(BILL_DAY)}`)}</div>
    <div class="wrap" style="margin-top:8px"><table class="t"><thead><tr><th>Person</th><th>Split</th></tr></thead><tbody>
    ${c.map(p => `<tr><td>${b(esc(p.name), 'openPerson', {cls:'link', d:{id:p.id}})}</td><td>${statusPill(p.id)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  const m = metrics();
  return `<div class="row sb"><h2 style="margin:0">${MONTH} bills</h2><span class="small mute">Due ${fd(DUE)}</span></div>
  <div class="progress"><div style="width:${m.coll / m.tot * 100}%;background:var(--ok)"></div></div>
  <div class="small mute">${fmt(m.coll)} of ${fmt(m.tot)} collected, including your own share</div>
  <div class="wrap" style="margin-top:8px"><table class="t"><thead><tr><th>Person</th><th class="n">Bill</th><th>Status</th><th>Next</th></tr></thead><tbody>
  ${c.map(p => `<tr><td>${b(esc(p.name), 'openPerson', {cls:'link', d:{id:p.id}})}</td><td class="n">${fmt(bills()[p.id])}</td><td>${payPill(p.id)}</td><td class="small mute">${nextLine(p.id)}</td></tr>`).join('')}
  <tr><td>${esc(S.account.owner)} <span class="mute small">you</span></td><td class="n">${fmt(bills().me)}</td><td>${pill('Your share', 'acc')}</td><td></td></tr></tbody></table></div>`;
}
function statusPill(id){ return ({pending:pill('Waiting', 'warn'), accepted:pill('Accepted', 'ok'), declined:pill('Declined', 'bad'), question:pill('Has a question', 'ai')})[status(id)] || pill('Not sent yet'); }
function payPill(id){
  const r = due(id), pl = S.plans[id];
  if(r === 0) return pill('Paid', 'ok');
  if(pl && pl.status === 'accepted') return pill(paid(id) ? 'On a plan · part-paid' : 'On a plan', 'acc');
  if(pl && pl.status === 'proposed') return pill('Plan offered', 'acc');
  if(paid(id)) return pill('Part-paid', 'acc');
  return dayNum(S.today) > dayNum(DUE) ? pill('Late', 'bad') : pill('Unpaid', 'warn');
}
function nextLine(id){
  if(due(id) === 0) return '';
  const s = sched(id)[0], pl = S.plans[id];
  if(pl && pl.status === 'accepted') return `Next: ${fmt(s.amt)} by ${fd(s.d)}`;
  return `Due ${fd(DUE)}`;
}

/* ---------- Replies (after sending the split) ---------- */
function pReplies(){
  const c = colleagues(), acc = c.filter(p => accepted(p.id)).length, done = allAccepted();
  return `<div class="narrow">${b('Home', 'go', {arg:'home', cls:'link', icon:'back'})}
  <h1 style="margin-top:10px">Replies</h1><p class="lede">${acc} of ${c.length} accepted the split${S.version > 1 ? ' (updated version)' : ''}.</p>
  ${done ? `<div class="note ok" style="margin-bottom:14px">${ic('check')} <b>Everyone has accepted.</b> First bills go out on ${fd(BILL_DAY)} for ${MONTH}.</div>` : ''}
  <div class="card">${c.map(replyRow).join('')}</div>
  <div class="foot">${done ? '<span></span>' + b('Go to Home', 'go', {arg:'home', cls:'primary lg', icon:'arrow'}) : `<span class="small mute">You can leave this page — Home shows you when someone replies.</span>${b('Go to Home', 'go', {arg:'home', cls:'lg'})}`}</div></div>`;
}
function answerDefault(id){ return localWrite('answer', {ownerFirst:S.account.ownerFirst, toFirst:firstName(id), measure:measures()[0], source:sourceName(), intent:'question'}); }
function replyRow(p){
  const inv = S.invites[p.id] || {}, st = inv.status;
  let body = '';
  if(st === 'question'){
    body = `<div class="quote">“${esc(inv.question)}”<small>${fd(inv.at)}</small></div>
      <div class="row sb" style="margin:6px 0 4px"><span class="small"><b>Suggested answer</b></span>${aiTag()}</div>
      <textarea data-live="answerDraft" data-id="${p.id}" style="min-height:70px" aria-label="Answer">${esc(inv.answerDraft != null ? inv.answerDraft : answerDefault(p.id))}</textarea>
      <div class="row" style="margin-top:8px">${b('Send answer', 'sendAnswer', {cls:'primary sm', icon:'send', d:{id:p.id}, dis:!S.channels.whatsapp})}</div>`;
  } else if(st === 'declined'){
    body = `<div class="quote">“${esc(inv.reason)}”<small>Declined · ${fd(inv.at)}</small></div>
      ${inv.handled ? `<p class="small mute">You said you'll talk to ${esc(firstName(p.id))}. Bills wait until they accept, or until you change the split.</p>` :
      S.ui.decline[p.id] === 'remove' ? `<div class="note warn">Remove ${esc(p.name)}? Everyone else's share changes, so they'll be asked to accept the new split.<div class="row" style="margin-top:8px">${b('Remove and resend', 'removeFromSplit', {cls:'sm primary', d:{id:p.id}})}${b('Cancel', 'declineChoice', {cls:'sm ghost', d:{id:p.id, c:''}})}</div></div>` :
      `<div class="row">${b('Change the split', 'go', {arg:'split', cls:'sm', icon:'edit'})}${b(`Remove ${esc(firstName(p.id))}`, 'declineChoice', {cls:'sm', d:{id:p.id, c:'remove'}})}${b('I’ll talk to them', 'talkToThem', {cls:'sm ghost', d:{id:p.id}})}</div>`}`;
  } else if(inv.answer){
    body = `<p class="small mute">You answered: “${esc(inv.answer)}”</p>`;
  }
  return `<div class="reply"><div><b>${esc(p.name)}</b><div class="small mute">${esc(p.phone || '')}</div></div><div>${statusPill(p.id)}</div>${body ? `<div class="body">${body}</div>` : ''}</div>`;
}

/* ---------- Monthly bills ---------- */
function pBills(){
  const step = S.month.step, two = measures().length;
  return `<div class="narrow">${b('Home', 'go', {arg:'home', cls:'link', icon:'back'})}
  ${two ? `<div class="steps" style="margin-top:12px"><span>${step === 'numbers' ? 'Step 1 of 2 · Numbers' : 'Step 2 of 2 · Bills'}</span><div class="bar"><div style="width:${step === 'numbers' ? 50 : 100}%"></div></div></div>` : '<div style="height:12px"></div>'}
  ${step === 'numbers' && two ? billNumbers() : billReview()}</div>`;
}
function billNumbers(){
  const ms = measures(), d = S.month.draft || {};
  return `<h1>${MONTH}'s numbers</h1><p class="lede">How many ${ms.map(esc).join(' and ')} each person had in ${MONTH}.</p>
  <div class="card"><div class="wrap"><table class="t"><thead><tr><th>Person</th>${ms.map(m => `<th>${esc(cap(m))}</th>`).join('')}</tr></thead><tbody>
  ${allIds().map(id => `<tr><td>${esc(nm(id))}</td>${ms.map(m => `<td style="min-width:90px"><input type="number" min="0" inputmode="numeric" value="${d[m] && d[m][id] != null ? d[m][id] : ''}" data-live="countDraft" data-id="${id}" data-m="${esc(m)}" aria-label="${esc(m)} for ${esc(nm(id))}"></td>`).join('')}</tr>`).join('')}
  </tbody></table></div>
  <div class="row" style="margin-top:12px"><label class="btn sm" style="cursor:pointer">${ic('upload')}<span>Upload a sheet instead</span><input type="file" accept=".csv,text/csv" data-change="csvFile" hidden></label>${DEMO ? b('Fill example numbers', 'demoFillCounts', {cls:'sm ghost'}) : ''}</div>
  ${S.month.csvMsg ? `<p class="small" style="margin-top:8px;color:${S.month.csvMsg.err ? 'var(--bad)' : 'var(--ok)'}">${esc(S.month.csvMsg.text)}</p>` : ''}
  <p class="tiny mute" style="margin-top:8px">A sheet needs columns for person, what was counted, and the count. Anything else in it — like patient or customer details — is ignored.</p>
  ${S.errors.counts ? `<div class="err">${S.errors.counts}</div>` : ''}</div>
  <div class="foot"><span></span>${b('Continue', 'saveCounts', {cls:'primary lg', icon:'arrow'})}</div>`;
}
function billReview(){
  const sh = computeShares(S.costs, allIds(), S.month.counts || {});
  const waiting = colleagues().filter(p => !accepted(p.id));
  const blocked = waiting.length ? `Bills go out once everyone has accepted the split. Waiting for ${waiting.map(p => esc(p.name)).join(', ')}.` : !S.channels.invoices ? 'Razorpay Invoices is turned off in Settings, so bills can’t be sent.' : null;
  return `<h1>${MONTH}'s bills</h1><p class="lede">Each bill goes out in ${esc(S.account.business)}'s name with a UPI link and a bank account that's theirs alone. Due ${fd(DUE)}.</p>
  <div class="card">${colleagues().map(p => billRow(p.id, sh)).join('')}
    <div class="row sb" style="margin-top:12px"><span>${esc(S.account.owner)} <span class="mute small">· your share, not billed to you</span></span><span class="mono">${fmt(sh.total.me)}</span></div>
    <div class="sep" style="margin:10px 0"></div>
    <div class="row sb"><b>Total</b><b class="mono">${fmt(Object.values(sh.total).reduce((s, x) => s + x, 0))}</b></div></div>
  ${blocked ? `<div class="note warn" style="margin-top:14px">${blocked}${waiting.length ? `<div style="margin-top:8px">${b('Remind them', 'remindAccept', {cls:'sm', dis:!S.channels.whatsapp})}</div>` : ''}</div>` : ''}
  <div class="foot">${measures().length ? b('Back', 'billStep', {cls:'ghost', icon:'back', d:{step:'numbers'}}) : '<span></span>'}${b(`Send ${colleagues().length} bill${colleagues().length > 1 ? 's' : ''}`, 'sendBills', {cls:'primary lg', icon:'send', dis:!!blocked})}</div>`;
}
function billRow(id, sh){
  const open = S.ui.open['bill' + id];
  return `<div style="border-bottom:1px solid var(--line2)"><button type="button" class="ln" data-action="toggle" data-k="bill${id}"><span><b>${esc(nm(id))}</b><small>${open ? 'Hide the maths' : 'See the maths'}</small></span><span class="n">${fmt(sh.total[id])}</span></button>
    ${open ? S.costs.map(c => `<div class="math">${esc(c.name)}: ${mathLine(c, id, sh, S.month.counts || {})}</div>`).join('') : ''}</div>`;
}
function mathLine(c, id, sh, counts){
  const r = sh.byCost[c.id], ids = Object.keys(r.out);
  if(c.method === 'count'){ const m = counts[c.measure] || {}; const tot = ids.reduce((s, i) => s + (+m[i] || 0), 0); return `${m[id] || 0} of ${tot} ${esc(c.measure)} × ${fmt(c.amount)} = ${dec(r.exact[id])} → ${fmt(r.out[id])}`; }
  if(c.method === 'share' && id in (c.shares || {})) return `${fracLabel(c.shares[id])} of ${fmt(c.amount)} = ${dec(c.amount * c.shares[id])} → ${fmt(r.out[id])}`;
  if(c.method === 'fixed' && id in (c.fixed || {})) return `fixed ${fmt(r.out[id])}`;
  if(c.method === 'share' || c.method === 'fixed'){ const set = c.method === 'share' ? c.shares : c.fixed; const taken = Object.keys(set).reduce((s, i) => s + (r.out[i] || 0), 0); const n = ids.length - Object.keys(set).length; return `(${fmt(c.amount)} − ${fmt(taken)}) ÷ ${n} = ${dec(r.exact[id])} → ${fmt(r.out[id])}`; }
  return `${fmt(c.amount)} ÷ ${ids.length} = ${dec(r.exact[id])} → ${fmt(r.out[id])}`;
}

/* ---------- Decision (one screen per suggestion) ---------- */
function itemTitle(i){
  const n = esc(nm(i.from));
  return ({reply:`${n} asked for more time`, nudge:`${n} is likely to pay late`, request:`${n} asked to pay on ${fd(i.date)}`, counter:`${n} suggested other dates`, message:`${n} says something's not right`})[i.kind];
}
function itemSub(i){
  if(i.kind === 'reply'){ const kd = keyDate({noPlan:true}), g = cashAt(kd, {noPlan:true}); return g.gap ? `If you wait, you'll be ${fmt(g.gap)} short on ${fd(kd)}. The agent has a suggestion.` : 'The agent has a suggested reply.'; }
  if(i.kind === 'nudge') return `${fmt(due(i.from))} due ${fd(DUE)}. One gentle reminder drafted.`;
  return `“${esc(i.quote)}”`;
}
function planFor(i){
  const rem = due(i.from);
  if(i.plan) return {...i.plan, inst1:Math.min(rem, i.plan.inst1), inst2:Math.max(0, rem - Math.min(rem, i.plan.inst1))};
  const g = cashAt(keyDate({noPlan:true}), {noPlan:true});
  const inst1 = Math.min(rem, g.gap || rem);
  return {inst1, inst2:rem - inst1, d1:DUE, d2:i.said || '2026-10-20'};
}
function writeCtx(i, extra){ return Object.assign({ownerFirst:S.account.ownerFirst, toFirst:firstName(i.from), toName:nm(i.from), tone:S.tone || 'warm'}, extra || {}); }
function draftFor(i, tone){
  if(i.kind === 'reply') return localWrite('plan', writeCtx(i, {...planFor(i), tone}));
  if(i.kind === 'nudge') return localWrite('nudge', writeCtx(i, {amount:due(i.from), link:'rzp.io/i/' + ((S.month.invoices[i.from] || {}).no || '').toLowerCase(), tone}));
  if(i.kind === 'message') return localWrite('answer', writeCtx(i, {measure:measures()[0], source:sourceName(), intent:i.intent}));
  return '';
}
function pDecision(){
  const i = S.items.find(x => x.id === S.arg);
  const back = b('Home', 'go', {arg:'home', cls:'link', icon:'back'});
  if(!i) return `<div class="narrow">${back}<p style="margin-top:12px">This has already been handled.</p></div>`;
  if(i.status !== 'open') return `<div class="narrow">${back}<h1 style="margin-top:10px">${itemTitle(i)}</h1><div class="note ok">${ic('check')} Handled${i.sent ? `. You sent: “${esc(i.sent)}”` : '.'}</div></div>`;
  const blockedWa = !S.channels.whatsapp ? `<div class="err">WhatsApp is turned off in Settings, so nothing can be sent.</div>` : '';
  let body = '';
  if(i.kind === 'reply' || i.kind === 'nudge' || i.kind === 'message'){
    body = `${i.quote ? `<div class="card"><div class="row sb"><b>What ${esc(firstName(i.from))} said</b>${aiTag('Read as: ' + ({'more-time':'asking for more time', question:'a question', dispute:'says a number is wrong', paid:'says they paid', other:'unclear'})[i.intent])}</div><div class="quote">“${esc(i.quote)}”<small>${i.via || 'WhatsApp'} · ${fd(i.t)}</small></div><p class="small mute" style="margin:0">${esc(i.why || '')}</p></div>` : ''}
    ${i.kind === 'nudge' ? `<div class="card"><div class="row sb"><b>Why now</b>${aiTag()}</div><p class="small" style="margin:6px 0 0">${esc(i.signal)}</p></div>` : ''}
    ${i.kind === 'reply' ? cashCard(i) : ''}
    <div class="card"><div class="row sb"><b>${i.kind === 'reply' ? 'Suggested reply' : i.kind === 'nudge' ? 'Suggested reminder' : 'Suggested answer'}</b>${aiTag(i.kind === 'reply' ? 'AI draft · amounts from your rule' : 'AI draft')}</div>
      ${i.kind === 'reply' ? planInputs(i) : ''}
      ${messageBlock(i)}
      ${i.kind === 'reply' ? `<p class="small mute" style="margin-top:10px">This doesn't change the ${fd(DUE)} due date, adds no penalty, and mentions nobody else.</p>` : ''}
      ${blockedWa}
      <div class="row" style="margin-top:14px">${S.tone || i.kind === 'message' || i.edit != null ? b('Send', 'sendItem', {cls:'primary lg', icon:'send', d:{id:i.id}, dis:!S.channels.whatsapp}) : ''}${b('Not now', 'dismissItem', {cls:'ghost', d:{id:i.id}})}</div></div>`;
  } else if(i.kind === 'request'){
    const kd = keyDate(), ok = dayNum(i.date) <= dayNum(kd);
    body = `<div class="card"><div class="quote">“${esc(i.quote)}”<small>From their page · ${fd(i.t)}</small></div>
      <p class="small">${ok ? `${fd(i.date)} is before your own payments on ${fd(kd)}, so it doesn't leave you short.` : `${fd(i.date)} is after your own payments on ${fd(kd)}.`} The due date stays ${fd(DUE)}.</p>
      ${blockedWa}<div class="row" style="margin-top:12px">${b(`Accept ${fd(i.date)}`, 'acceptRequest', {cls:'primary', icon:'check', d:{id:i.id}, dis:!S.channels.whatsapp})}${b(`Ask for ${fd(DUE)}`, 'declineRequest', {d:{id:i.id}, dis:!S.channels.whatsapp})}</div></div>`;
  } else if(i.kind === 'counter'){
    const pl = S.plans[i.from];
    body = `<div class="card"><div class="quote">“${esc(i.quote)}”<small>From their page · ${fd(i.t)}</small></div>
      <div class="kv"><span>You asked</span><span class="n">${pl.inst.map(x => `${fmt(x.amt)} by ${fd(x.d)}`).join(' · ')}</span><span>They suggest</span><span class="n">${i.inst.map(x => `${fmt(x.amt)} by ${fd(x.d)}`).join(' · ')}</span></div>
      <p class="small" style="margin-top:10px">${counterImpact(i)}</p>
      ${blockedWa}<div class="row" style="margin-top:12px">${b(`Accept ${esc(firstName(i.from))}'s dates`, 'acceptCounter', {cls:'primary', icon:'check', d:{id:i.id}, dis:!S.channels.whatsapp})}${b('Keep my ask', 'keepCounter', {d:{id:i.id}, dis:!S.channels.whatsapp})}</div></div>`;
  }
  return `<div class="narrow">${back}<h1 style="margin-top:10px">${itemTitle(i)}</h1><p class="lede">${i.kind === 'reply' ? 'The agent sized the ask to what you need before your own payments go out.' : 'Nothing is sent until you decide.'}</p><div class="stack">${body}</div></div>`;
}
function cashCard(i){
  const kd = keyDate({noPlan:true}), g = cashAt(kd, {noPlan:true}), r = roles();
  const outs = outflows().filter(o => dayNum(o.date) <= dayNum(kd)).sort((a, z) => dayNum(a.date) - dayNum(z.date));
  return `<div class="card"><b>What it means for you</b>
    <div class="kv" style="margin-top:10px">${outs.map(o => `<span>${esc(o.name)} · you pay ${fd(o.date)}</span><span class="n">−${fmt(o.amt)}</span>`).join('')}
      <span class="tot">You need by ${fd(kd)}</span><span class="n tot">${fmt(g.need)}</span>
      <span>Your own share</span><span class="n">${fmt(bills().me)}</span>
      ${colleagues().filter(p => p.id !== i.from).map(p => `<span>${esc(p.name)} ${due(p.id) === 0 ? '· paid' : S.expect[p.id] === false ? '· not counted' : '· due ' + fd(DUE)}</span><span class="n">${S.expect[p.id] === false && due(p.id) ? '—' : fmt(bills()[p.id])}</span>`).join('')}
      <span>${esc(nm(i.from))} · says ${fd(i.said)}</span><span class="n mute">too late</span>
      <span class="tot">Short on ${fd(kd)}</span><span class="n tot" style="color:${g.gap ? 'var(--bad)' : 'var(--ok)'}">${fmt(g.gap)}</span></div>
    ${r.late && r.late.id !== i.from && due(r.late.id) ? `<label class="small row" style="margin-top:12px;gap:8px;flex-wrap:nowrap"><input type="checkbox" data-change="toggleExpect" data-id="${r.late.id}"${S.expect[r.late.id] === false ? '' : ' checked'}> <span>Count on ${esc(nm(r.late.id))} paying by ${fd(DUE)} <span class="mute">(paid late before)</span></span></label>` : ''}</div>`;
}
function planInputs(i){
  const p = planFor(i);
  return `<div class="grid2" style="margin:10px 0 4px">
    <div><label class="f">First part</label><div class="money"><span>₹</span><input type="text" inputmode="numeric" value="${num(p.inst1)}" data-change="planField" data-id="${i.id}" data-f="inst1" aria-label="First part"></div></div>
    <div><label class="f">by</label><input type="date" value="${p.d1}" max="${DUE}" data-change="planField" data-id="${i.id}" data-f="d1" aria-label="First part date"></div>
    <div><label class="f">The rest</label><div class="money"><span>₹</span><input type="text" value="${num(p.inst2)}" disabled aria-label="The rest"></div></div>
    <div><label class="f">by</label><input type="date" value="${p.d2}" data-change="planField" data-id="${i.id}" data-f="d2" aria-label="Rest date"></div></div>`;
}
function messageBlock(i){
  if(i.edit != null) return `<label class="f" style="margin-top:10px">Your message</label><textarea data-live="itemEdit" data-id="${i.id}" style="min-height:90px" aria-label="Message">${esc(i.edit)}</textarea>`;
  if(!S.tone && i.kind !== 'message') return `<p class="small" style="margin:10px 0 8px"><b>Pick how you sound.</b> Choosing one sends it, and the agent writes like this from now on.</p>
    <div class="tones">${['warm','direct','formal'].map(t => `<button type="button" data-action="chooseTone" data-id="${i.id}" data-tone="${t}"${S.channels.whatsapp ? '' : ' disabled'}><b>${t}</b>${esc(draftFor(i, t))}</button>`).join('')}</div>`;
  return `<div class="draft" style="margin-top:10px">${esc(draftFor(i, S.tone || 'warm'))}</div>
    <div class="row" style="margin-top:6px">${b('Edit message', 'editItem', {cls:'sm ghost', icon:'edit', d:{id:i.id}})}${i.kind !== 'message' ? `<span class="tiny mute">Tone: ${S.tone}</span>${b('change', 'changeTone', {cls:'link sm'})}` : ''}</div>`;
}
function counterImpact(i){
  const kd = keyDate({noPlan:true}), save = S.plans[i.from];
  const mine = cashAt(kd).gap;
  S.plans[i.from] = {...save, inst:i.inst};
  const theirs = cashAt(kd).gap; S.plans[i.from] = save;
  return `With their dates you'd be ${fmt(theirs)} short on ${fd(kd)} (with yours: ${fmt(mine)}).`;
}

/* ---------- People ---------- */
function pPeople(){
  return `<div class="main"><h1>People</h1><p class="lede">Everyone sharing ${esc(S.account.business)}'s costs. Each person only ever sees their own page.</p>
  <div class="card"><div class="wrap"><table class="t"><thead><tr><th>Name</th><th>Split</th>${billed() ? `<th class="n">${MONTH} bill</th><th>Status</th>` : ''}<th></th></tr></thead><tbody>
  ${colleagues().map(p => `<tr><td><b>${esc(p.name)}</b><div class="tiny mute">${esc(p.phone)}</div></td><td>${statusPill(p.id)}</td>${billed() ? `<td class="n">${fmt(bills()[p.id])}</td><td>${payPill(p.id)}</td>` : ''}<td style="text-align:right">${b('Open', 'openPerson', {cls:'sm', d:{id:p.id}})}</td></tr>`).join('')}
  </tbody></table></div><div class="row" style="margin-top:12px">${b('Add someone', 'go', {arg:'split', cls:'sm', icon:'plus', dis:billed()})}<span class="tiny mute">Adding someone changes the split, so everyone accepts again.</span></div></div></div>`;
}
function pPerson(){
  const id = S.arg, p = P(id);
  if(!p) return `<div class="narrow">${b('People', 'go', {arg:'people', cls:'link', icon:'back'})}</div>`;
  const h = (S.history[id] || []).slice().reverse();
  return `<div class="narrow">${b('People', 'go', {arg:'people', cls:'link', icon:'back'})}
  <div class="row sb" style="margin-top:10px"><div><h1 style="margin:0">${esc(p.name)}</h1><p class="small mute">${esc(p.phone)}</p></div>${statusPill(id)}</div>
  ${billed() ? `<div class="card" style="margin-top:14px"><div class="row sb"><b>${MONTH} bill</b>${payPill(id)}</div><div class="mono" style="font-size:26px;font-weight:600;margin-top:4px">${fmt(bills()[id])}</div><div class="small mute">${paid(id) ? `${fmt(paid(id))} paid · ` : ''}${nextLine(id) || 'Paid in full'}</div></div>` : ''}
  <div class="card" style="margin-top:14px"><div class="row sb"><b>History</b>${b('See their page', 'preview', {cls:'sm', icon:'eye', d:{id}})}</div>
  <ul class="tl" style="margin-top:8px">${h.map(x => `<li><span class="mono tiny mute">${fd(x.t)}</span><span>${esc(x.text)}</span></li>`).join('') || '<li><span></span><span class="mute">Nothing yet.</span></li>'}</ul></div></div>`;
}

/* ---------- Settings ---------- */
function pSettings(){
  const tg = (k, on, l, s, act) => `<div class="row sb" style="padding:10px 0;border-bottom:1px solid var(--line2);flex-wrap:nowrap"><div style="flex:1;min-width:0"><b>${l}</b><div class="small mute">${s}</div></div>${b(on ? 'On' : 'Off', act, {cls:'sm ' + (on ? '' : 'ghost'), d:{k}, title:`${l}: ${on ? 'on' : 'off'}`})}</div>`;
  return `<div class="main"><h1>Settings</h1><p class="lede">Set once; change any time.</p><div class="stack">
  <div class="card"><div class="row sb"><h2 style="margin:0">The split</h2>${b('Change the split', 'go', {arg:'split', cls:'sm', icon:'edit', dis:billed()})}</div>
    ${S.costs.map(c => `<p style="margin:10px 0 0">${esc(c.name)} — ${methodSentence(c)}${c.payDay ? ` <span class="small mute">· you pay on the ${ord(c.payDay)}</span>` : ''}</p>`).join('')}
    ${billed() ? `<p class="tiny mute" style="margin-top:10px">${MONTH}'s bills are out, so the split can change from next month.</p>` : ''}</div>
  ${measures().length ? `<div class="card"><h2>Monthly numbers</h2><p class="small">${S.source.type === 'staff' ? `${esc(S.source.name || 'Your staff')} sends ${measures().map(esc).join(' and ')} on the 1st.` : S.source.type === 'upload' ? 'You upload a sheet on the 1st.' : 'You type them in on the 1st.'}</p>
    <div class="chips">${[['staff','Staff sends them'],['me','I type them'],['upload','I upload a sheet']].map(([k, l]) => `<button type="button" class="chip ${S.source.type === k ? 'on' : ''}" data-action="setSource" data-arg="${k}">${l}</button>`).join('')}</div></div>` : ''}
  <div class="card"><h2>What the agent can do</h2><p class="small mute" style="margin:0">It always asks you first.</p>
    ${tg('remind', S.perms.remind, 'Suggest reminders', 'When someone is likely to pay late', 'togglePerm')}
    ${tg('plan', S.perms.plan, 'Suggest payment plans', 'Sized so your own payments are covered', 'togglePerm')}
    <div class="row" style="padding:12px 0 0;gap:10px;flex-wrap:nowrap">${ic('lock')}<div class="small"><b>Never, whatever the settings:</b> change someone's share, waive money, stop someone's access, or lend to cover a gap.</div></div></div>
  <div class="card"><h2>Connected</h2>
    ${tg('whatsapp', S.channels.whatsapp, 'WhatsApp', 'Sends the split, bills and the messages you approve', 'toggleChannel')}
    ${tg('invoices', S.channels.invoices, 'Razorpay Invoices', 'Bills in your name, with UPI and a bank account per person', 'toggleChannel')}</div>
  <div class="card"><h2>Account</h2><div class="lockrow">${ic('lock')}<span>${esc(S.account.owner)} · ${esc(S.account.business)} · managed in your Razorpay account</span></div></div>
  </div></div>`;
}
function pSplitEdit(){
  return `<div class="narrow">${b('Settings', 'go', {arg:'settings', cls:'link', icon:'back'})}
  <h1 style="margin-top:10px">Change the split</h1><p class="lede">${S.sent ? 'Everyone will be asked to accept the new version.' : ''}</p>
  <div class="card" style="margin-bottom:14px"><h2>People</h2>${peopleRows()}${b('Add person', 'addPerson', {cls:'sm', icon:'plus'})}</div>
  ${splitEditor()}
  ${S.confirmResplit ? `<div class="note warn" style="margin-top:14px">Everyone will get the new split and accept it again.<div class="row" style="margin-top:8px">${b('Send new version', 'saveSplit', {cls:'sm primary', d:{confirm:1}})}${b('Cancel', 'cancelResplit', {cls:'sm ghost'})}</div></div>` :
  `<div class="foot"><span></span>${b(S.sent ? 'Save and send to everyone' : 'Save', 'saveSplit', {cls:'primary lg', icon:'check'})}</div>`}</div>`;
}

/* ---------- Month summary ---------- */
function pMonth(){
  const m = metrics(), cf = m.ext - m.viaPlan, r = roles();
  const planP = colleagues().find(p => S.plans[p.id] && S.plans[p.id].viaAgent);
  const pl = planP && S.plans[planP.id];
  const kept = pl && (S.pays[planP.id] || []).filter(x => dayNum(x.d) <= dayNum(pl.inst[0].d)).reduce((s, x) => s + x.amt, 0) >= pl.inst[0].amt;
  const said = planP && (S.items.find(i => i.kind === 'reply' && i.from === planP.id) || {}).said;
  const nudge = S.items.find(i => i.kind === 'nudge');
  const lateAfter = r.late && (S.pays[r.late.id] || []).some(x => dayNum(x.d) > dayNum(DUE));
  const learned = [
    [S.tone ? `You prefer ${S.tone} messages` : 'Your preferred tone isn’t known yet', S.tone ? 'you told it' : 'a guess'],
    planP ? [kept ? `${firstName(planP.id)} keeps a plan once it's agreed` : `${firstName(planP.id)} needs a firmer plan next time`, 'seen once'] : null,
    r.late && r.late !== planP ? [nudge && nudge.status === 'done' && lateAfter ? `A reminder before the due date didn't move ${firstName(r.late.id)} — try the day of their next visit` : `${firstName(r.late.id)} tends to pay after the due date`, nudge && nudge.status === 'done' ? 'seen once' : 'a guess'] : null
  ].filter(Boolean);
  return `<div class="main">${b('Home', 'go', {arg:'home', cls:'link', icon:'back'})}
  <h1 style="margin-top:10px">${MONTH} summary</h1><p class="lede">Bills were due ${fd(DUE)}.</p>
  <div class="tiles">
    <div class="tile"><div class="k">In by the due date</div><div class="v">${pct(m.byDue, m.tot)}%</div><div class="s">${fmt(m.byDue)} of ${fmt(m.tot)}, including your share</div></div>
    <div class="tile"><div class="k">From colleagues by the due date</div><div class="v">${pct(m.ext, m.extTot)}%</div><div class="s">${fmt(m.ext)} of ${fmt(m.extTot)}</div></div>
    <div class="tile"><div class="k">Collected now</div><div class="v">${pct(m.coll, m.tot)}%</div><div class="s">${fmt(m.coll)}</div></div>
  </div>
  <div class="card" style="margin-top:14px"><h2>What the agent changed</h2>
    <p style="margin:0">${planP && m.viaPlan ? `${esc(firstName(planP.id))} wanted to pay on ${fd(said)}. With plain reminders, only <b>${pct(cf, m.extTot)}%</b> of your colleagues' share would have arrived by ${fd(DUE)}. The plan brought in <b>${fmt(m.viaPlan)}</b> before the due date — the amount you needed for your own payments.` : `No plan was needed this month. Reminders alone brought in ${pct(m.ext, m.extTot)}% of your colleagues' share by the due date.`}</p></div>
  <div class="card" style="margin-top:14px"><div class="row sb"><h2 style="margin:0">What the agent learned</h2>${aiTag('AI')}</div>
    ${learned.map(([t, l]) => `<div class="row sb" style="padding:10px 0;border-bottom:1px solid var(--line2);flex-wrap:nowrap"><span>${esc(t)}</span>${pill(l, l === 'you told it' ? 'ok' : l === 'seen once' ? 'acc' : '')}</div>`).join('')}
    <p class="tiny mute" style="margin-top:8px">The agent uses these next month. “A guess” means it hasn't seen it happen yet.</p></div></div>`;
}

/* ==================================================================
   COLLEAGUE PAGE (their phone)
   ================================================================== */
function colleagueApp(id, o){
  o = o || {};
  // o.ro: buttons are inert (owner preview). o.asInvite: show the invite as it will look once sent.
  const pv = !!o.ro, asInvite = !!o.asInvite, p = P(id);
  if(!p) return '';
  const inv = asInvite ? {status:'pending'} : (S.invites[id] || null);
  const B = (l, a, opt) => b(l, pv ? 'previewOnly' : a, opt);
  const biz = esc(S.account.business), owner = esc(S.account.ownerFirst);
  if(!inv) return `<div class="phone"><div class="hd"><div class="av">${biz[0]}</div><div><b>${biz}</b></div></div><p class="mute">${owner} hasn't shared anything with you yet.</p></div>`;
  const isBilled = billed() && !asInvite && bills()[id] != null;
  const rem = isBilled ? due(id) : 0, pl = S.plans[id];
  let top = '';
  if(isBilled){
    let amt = rem, line = `Due ${fd(DUE)}`;
    if(pl && pl.status === 'accepted' && rem){ const s = sched(id)[0]; amt = s.amt; line = `Your plan: ${pl.inst.map(x => `${fmt(x.amt)} by ${fd(x.d)}`).join(' · ')}`; }
    top = `<div class="small mute">Your ${MONTH} share${rem && paid(id) ? ' · left to pay' : ''}</div><div class="amt">${fmt(rem || bills()[id])}</div><div class="small">${rem === 0 ? `${ic('check')} Paid in full — thank you` : (paid(id) ? `${fmt(paid(id))} paid · ` : '') + line}</div>`;
    if(pl && pl.status === 'proposed' && rem){
      const cu = S.ui.counter[id];
      top += `<div class="box"><b>Message from ${owner}</b><p style="margin:6px 0">${esc(pl.text)}</p><p class="tiny mute">Your due date stays ${fd(DUE)}.</p>
        ${cu ? `<div class="small" style="margin:8px 0 4px"><b>Suggest your dates</b></div>${[0, 1].map(k => `<div class="row" style="margin-bottom:6px;flex-wrap:nowrap"><div class="money" style="flex:1"><span>₹</span><input type="text" inputmode="numeric" value="${num(cu[k].amt)}" data-live="counterField" data-id="${id}" data-k="${k}" data-f="amt" aria-label="Amount ${k + 1}"></div><input type="date" style="flex:1" value="${cu[k].d}" data-live="counterField" data-id="${id}" data-k="${k}" data-f="d" aria-label="Date ${k + 1}"></div>`).join('')}
          <div class="row">${B('Send to ' + owner, 'sendCounter', {cls:'primary sm', d:{id}})}${B('Cancel', 'counterOpen', {cls:'ghost sm', d:{id, off:1}})}</div>`
        : `<div class="row">${B('Accept the plan', 'acceptPlan', {cls:'primary', icon:'check', d:{id}})}${B('Suggest other dates', 'counterOpen', {cls:'ghost', d:{id}})}</div>`}</div>`;
    } else if(rem){
      const bank = S.ui.open['bank' + id];
      top += `<div style="margin-top:14px">${B(`Pay ${fmt(amt)} with UPI`, 'payNow', {cls:'primary lg full', icon:'pay', d:{id, amt}})}</div>
        <div style="text-align:center;margin-top:8px">${B(bank ? 'Hide bank details' : 'Pay by bank transfer instead', 'toggle', {cls:'link sm', d:{k:'bank' + id}})}</div>
        ${bank ? `<div class="box"><div class="kv small"><span>Account no</span><span class="n">${S.month.invoices[id].va}</span><span>IFSC</span><span class="n">${IFSC}</span><span>Name</span><span class="n">${biz}</span></div><div style="margin-top:8px">${B('Copy details', 'copy', {cls:'sm', icon:'copy', d:{text:`${S.account.business} · A/c ${S.month.invoices[id].va} · IFSC ${IFSC}`}})}</div><p class="tiny mute" style="margin:6px 0 0">This account is yours alone and stays the same every month.</p></div>` : ''}`;
    }
  } else if(inv.status === 'pending' || inv.status === 'question'){
    const dec = S.ui.decline[id] === 'open', ask = S.ui.ask[id] === 'open';
    top = `<p style="font-size:15px;margin:0 0 4px"><b>${owner}</b> has shared how ${biz}'s monthly costs are split.</p>
      <p class="small mute">Check your share below. You only ever pay what this rule says.</p>
      <div class="box small ink2">${ic('lock')} Bills come in ${biz}'s name. No auto-debit. You can ask about any line before accepting, and nobody else sees your status.</div>
      ${inv.answer ? `<div class="box"><b>${owner} answered</b><p class="small" style="margin:4px 0 0">${esc(inv.answer)}</p></div>` : ''}
      ${inv.status === 'question' ? `<div class="note">You asked: “${esc(inv.question)}” — waiting for ${owner}.</div>` : ''}
      ${dec ? `<div class="box"><b>Why are you declining?</b><textarea data-live="declineText" data-id="${id}" style="min-height:70px;margin-top:6px" aria-label="Reason">${esc(S.ui.decline['t' + id] || '')}</textarea><div class="row" style="margin-top:8px">${B('Send', 'declineSend', {cls:'primary sm', d:{id}})}${B('Cancel', 'declineOpen', {cls:'ghost sm', d:{id, off:1}})}</div></div>`
        : ask ? `<div class="box"><b>Your question for ${owner}</b><textarea data-live="askText" data-id="${id}" style="min-height:70px;margin-top:6px" aria-label="Question">${esc(S.ui.ask['t' + id] || '')}</textarea><div class="row" style="margin-top:8px">${B('Send', 'askSend', {cls:'primary sm', d:{id}})}${B('Cancel', 'askOpen', {cls:'ghost sm', d:{id, off:1}})}</div></div>`
        : `<div style="margin-top:12px">${B('Accept', 'acceptSplit', {cls:'primary lg full', icon:'check', d:{id}})}</div><div class="row" style="justify-content:center;margin-top:8px">${B('Ask a question', 'askOpen', {cls:'link sm', d:{id}})}<span class="mute">·</span>${B('Decline', 'declineOpen', {cls:'link sm', d:{id}})}</div>`}`;
  } else if(inv.status === 'accepted'){
    top = `<div class="note ok">${ic('check')} You've accepted. Your first bill comes on ${fd(BILL_DAY)}, for ${MONTH}.</div>`;
  } else if(inv.status === 'declined'){
    top = `<div class="note">You declined. ${owner} has your reason: “${esc(inv.reason)}”.</div><div style="margin-top:10px">${B('Changed your mind? Accept', 'acceptSplit', {cls:'sm', d:{id}})}</div>`;
  }
  const comp = isBilled ? computeShares(S.costs, allIds(), S.month.counts || {}) : null;
  const fixedComp = computeShares(S.costs.filter(c => c.method !== 'count'), allIds(), {});
  const lines = S.costs.map(c => {
    const k = 'ln' + id + c.id, open = S.ui.open[k];
    const amt = comp ? fmt(comp.byCost[c.id].out[id]) : c.method === 'count' ? 'monthly' : fmt(fixedComp.byCost[c.id].out[id]);
    const desc = c.method === 'count' ? `your share of ${fmt(c.amount)}, by your ${esc(c.measure)}` : c.method === 'equal' ? `${fmt(c.amount)} split equally between ${allIds().length}` : methodSentence(c).replace(/<[^>]+>/g, '');
    return `<button type="button" class="ln" data-action="toggle" data-k="${k}"><span>${esc(c.name)}<small>${desc}</small></span><span class="n">${amt}</span></button>
      ${open ? `<div class="math">${comp ? mathLine(c, id, comp, S.month.counts || {}) : c.method === 'count' ? `Worked out each month: your ${esc(c.measure)} ÷ everyone's ${esc(c.measure)} × ${fmt(c.amount)}.` : mathLine(c, id, fixedComp, {})}</div>` : ''}`;
  }).join('');
  const wrongOpen = S.ui.wrong[id] === 'open';
  const wrong = (!pv && (isBilled || inv.status === 'accepted')) ? (wrongOpen
      ? `<div class="box"><b>Tell ${owner} what's wrong</b><textarea data-live="wrongText" data-id="${id}" style="min-height:80px;margin-top:6px" placeholder="e.g. My count looks too high, or: Can I pay on the 10th?" aria-label="What's wrong">${esc(S.ui.wrong['t' + id] || '')}</textarea><div class="row" style="margin-top:8px">${B('Send', 'wrongSend', {cls:'primary sm', d:{id}})}${B('Cancel', 'wrongOpen', {cls:'ghost sm', d:{id, off:1}})}</div></div>`
      : `<div style="text-align:center;margin-top:12px">${B('Something not right? Tell ' + owner, 'wrongOpen', {cls:'link sm', d:{id}})}</div>`) : '';
  const h = (S.history[id] || []).slice(-6).reverse();
  return `<div class="phone"><div class="hd"><div class="av">${biz[0]}</div><div><b>${biz}</b><div class="tiny mute">Shared costs · ${esc(p.name)}</div></div></div>
    ${top}
    <h3 style="margin-top:18px">How your share is worked out</h3><div>${lines}</div>
    <p class="tiny mute" style="margin-top:6px">Tap a line to see the maths.</p>
    ${wrong}
    ${!asInvite && h.length ? `<h3 style="margin-top:18px">Your history</h3><ul class="tl">${h.map(x => `<li><span class="mono tiny mute">${fd(x.t)}</span><span class="small">${esc(x.text)}</span></li>`).join('')}</ul>` : ''}
    <div class="privacy">${ic('lock')} Only you and ${biz} see this page.</div></div>`;
}

/* ==================================================================
   DEMO (only with ?demo) — role switch + timeline
   ================================================================== */
function demoEvents(){
  const r = roles(), c = colleagues();
  if(!S.sent) return [{id:'setup', gate:'Finish setup and send the split'}];
  const E = [];
  const pendingish = id => status(id) === 'pending';
  if(r.onTime && pendingish(r.onTime.id)) E.push({id:'acc-' + r.onTime.id, label:`${r.onTime.name} accepts`, run:() => doAccept(r.onTime.id)});
  if(r.asker && r.asker !== r.onTime && pendingish(r.asker.id) && !S.done['q-' + r.asker.id]) E.push({id:'q-' + r.asker.id, label:`${r.asker.name} asks a question`, run:() => doAsk(r.asker.id, measures().length ? `How are my ${measures()[0]} counted? Who keeps the record?` : 'How is this worked out?')});
  c.filter(p => p !== r.asker && p !== r.onTime && pendingish(p.id)).forEach(p => E.push({id:'acc-' + p.id, label:`${p.name} accepts`, run:() => doAccept(p.id)}));
  if(r.asker && pendingish(r.asker.id) && S.done['q-' + r.asker.id]) E.push({id:'acc2-' + r.asker.id, label:`${r.asker.name} accepts`, run:() => doAccept(r.asker.id)});
  if(E.length) return E;
  if(c.some(p => status(p.id) === 'question')) return [{id:'wait', gate:`Answer ${c.find(p => status(p.id) === 'question').name}'s question (Home)`}];
  if(!allAccepted()) return [{id:'wait', gate:'Someone declined — decide on Home'}];
  const T = [];
  T.push({id:'counts', d:BILL_DAY, label:measures().length && S.source.type === 'staff' ? `${S.source.name || 'Staff'} sends ${MONTH}'s numbers` : `${MONTH} ends`, run:() => {
    if(measures().length && S.source.type === 'staff' && !S.month.counts){ S.month.counts = exampleCounts(); S.month.draft = exampleCounts(); hist('me', `${S.source.name} sent ${MONTH}'s numbers.`); }
  }});
  T.push({id:'bills', d:BILL_DAY, gate:billed() ? null : `Send ${MONTH}'s bills (Home)`, label:'Bills sent', run:() => {}});
  T.push({id:'remind', d:'2026-09-23', label:'Razorpay sends invoice reminders', run:() => c.filter(p => due(p.id)).forEach(p => hist(p.id, `Invoice reminder: ${fmt(due(p.id))} due ${fd(DUE)}.`))});
  if(r.asker) T.push({id:'reply', d:'2026-09-25', label:`${r.asker.name} replies on WhatsApp`, run:async () => {
    if(!due(r.asker.id)) return;
    const text = `${S.account.ownerFirst} ji, is month thoda tight hai. 20 tak kar dunga, pakka.`;
    const k = await AI.readMessage(text);
    hist(r.asker.id, `Replied: “${text}”`);
    if(S.perms.plan) S.items.push({id:'i' + S.seq++, kind:'reply', from:r.asker.id, t:S.today, quote:text, intent:k.intent, why:k.why, said:k.date || '2026-10-20', status:'open'});
  }});
  const pl = r.asker && S.plans[r.asker.id];
  if(pl && pl.status === 'proposed' && pl.viaAgent) T.push({id:'planAcc', d:dayNum(pl.on) >= dayNum('2026-09-26') ? pl.on : '2026-09-26', label:`${r.asker.name} accepts the plan`, run:() => doAcceptPlan(r.asker.id)});
  if(r.late && r.late !== r.asker) T.push({id:'nudge', d:'2026-09-27', label:`Agent spots ${r.late.name} may pay late`, run:() => {
    if(!due(r.late.id) || !S.perms.remind) return;
    S.items.push({id:'i' + S.seq++, kind:'nudge', from:r.late.id, t:S.today, status:'open', signal:`${firstName(r.late.id)} paid after the due date in 2 of the last 3 months, each time after their next visit. A short reminder now gives them time before ${fd(DUE)}.`});
  }});
  if(r.onTime) T.push({id:'pay-on', d:'2026-09-28', label:`${r.onTime.name} pays`, run:() => doPay(r.onTime.id, due(r.onTime.id))});
  if(pl && pl.status === 'accepted') T.push({id:'pay-p1', d:pl.inst[0].d === DUE ? '2026-09-29' : pl.inst[0].d, label:`${r.asker.name} pays the first part`, run:() => { const s = sched(r.asker.id)[0]; if(s) doPay(r.asker.id, s.amt); }});
  T.push({id:'due', d:DUE, label:'Due date', run:() => {}});
  [...new Set(outflows().map(o => o.date))].sort().forEach(d => T.push({id:'out' + d, d, label:`You pay ${outflows().filter(o => o.date === d).map(o => o.name).join(', ')}`, run:() => hist('me', `Paid ${outflows().filter(o => o.date === d).map(o => `${o.name} ${fmt(o.amt)}`).join(', ')}.`)}));
  if(r.asker && r.asker !== r.onTime) T.push({id:'pay-rest', d:'2026-10-18', label:`${r.asker.name} pays the rest`, run:() => doPay(r.asker.id, due(r.asker.id))});
  c.filter(p => p !== r.onTime && p !== r.asker).forEach(p => T.push({id:'pay-' + p.id, d:S.plans[p.id] && S.plans[p.id].status === 'accepted' ? S.plans[p.id].inst[0].d : '2026-10-18', label:`${p.name} pays`, run:() => doPay(p.id, due(p.id))}));
  T.push({id:'close', d:'2026-10-31', label:`${MONTH} closes`, run:() => { S.closed = true; S.page = 'month'; S.view = 'owner'; }});
  return T.filter(e => !S.done[e.id]).sort((a, z) => dayNum(a.d) - dayNum(z.d));
}
function demoBar(){
  if(!DEMO) return '';
  const nx = demoEvents()[0];
  const views = [['owner', S.account.owner + ' (owner)']].concat(S.sent ? colleagues().map(p => ['p:' + p.id, p.name + '’s phone']) : []);
  const label = nx ? (nx.gate || 'Next: ' + (nx.d && dayNum(nx.d) > dayNum(S.today) ? fd(nx.d) + ' · ' : '') + nx.label) : '';
  return `<div class="demobar"><b>Demo</b><div class="vw">${views.map(([k, l]) => `<button type="button" class="${S.view === k ? 'on' : ''}" data-action="demoView" data-arg="${k}">${esc(l)}</button>`).join('')}</div>
    <span class="sp"></span><span class="dt">${fd(S.today)}</span>
    ${nx ? `<button type="button" class="nx" data-action="demoNext"${nx.gate ? ' disabled' : ''}>${ic(nx.gate ? 'clock' : 'play')}<span>${esc(label)}</span></button>` : `<span>Month closed</span>`}
    <button type="button" class="rs" data-action="demoRestart">Restart</button></div>`;
}
function exampleCounts(){
  const BASE = [{0:48,1:46,2:38,3:22},{0:14,1:14,2:12,3:6},{0:30,1:25,2:20,3:10}];
  const ids = allIds(), out = {};
  measures().forEach((m, k) => { out[m] = {}; ids.forEach((id, j) => out[m][id] = BASE[k % 3][j] != null ? BASE[k % 3][j] : 10 + j * 3); });
  return out;
}

/* ==================================================================
   DOMAIN ACTIONS (shared by owner, colleague page and demo)
   ================================================================== */
function doAccept(id){ S.invites[id] = {...S.invites[id], status:'accepted', at:S.today}; hist(id, `Accepted the split${S.version > 1 ? ' (new version)' : ''}.`); }
function doAsk(id, q){ S.invites[id] = {...S.invites[id], status:'question', question:q, at:S.today, answerDraft:null}; hist(id, `Asked: “${q}”`); S.done['q-' + id] = true; }
function doDecline(id, reason){ reason = reason || 'No reason given'; S.invites[id] = {...S.invites[id], status:'declined', reason, at:S.today, handled:false}; hist(id, `Declined: “${reason}”`); }
function doPay(id, amt){ amt = Math.min(amt, due(id)); if(amt <= 0) return; (S.pays[id] = S.pays[id] || []).push({d:S.today, amt}); hist(id, `Paid ${fmt(amt)}${due(id) ? ` · ${fmt(due(id))} left` : ' · paid in full'}.`); }
function doAcceptPlan(id){ const pl = S.plans[id]; if(!pl) return; pl.status = 'accepted'; hist(id, `Accepted the plan: ${pl.inst.map(x => `${fmt(x.amt)} by ${fd(x.d)}`).join(', ')}.`); S.items.filter(i => i.kind === 'counter' && i.from === id && i.status === 'open').forEach(i => i.status = 'done'); }
function resend(note){ colleagues().forEach(p => { S.invites[p.id] = {status:'pending', at:S.today}; wa(p.id, note || inviteText(p.id)); }); Object.keys(S.done).filter(k => /^(acc|acc2|q)-/.test(k)).forEach(k => delete S.done[k]); }
async function routeMessage(id, text){
  const k = await AI.readMessage(text);
  hist(id, `Wrote: “${text}”`);
  if(k.intent === 'more-time') S.items.push({id:'i' + S.seq++, kind:'request', from:id, t:S.today, quote:text, date:k.date || '2026-10-07', status:'open'});
  else S.items.push({id:'i' + S.seq++, kind:'message', from:id, t:S.today, quote:text, intent:k.intent, why:k.why, via:'Their page', status:'open'});
}
async function sendItem(i){
  if(!S.channels.whatsapp || !i || i.status !== 'open') return;
  const ctx = i.kind === 'reply' ? writeCtx(i, planFor(i)) : i.kind === 'nudge' ? writeCtx(i, {amount:due(i.from), link:'rzp.io/i/' + ((S.month.invoices[i.from] || {}).no || '').toLowerCase()}) : writeCtx(i, {measure:measures()[0], source:sourceName(), intent:i.intent});
  const text = i.edit != null ? i.edit : await AI.write(i.kind === 'reply' ? 'plan' : i.kind === 'nudge' ? 'nudge' : 'answer', ctx);
  wa(i.from, text);
  if(i.kind === 'reply'){ const p = planFor(i); S.plans[i.from] = {inst:[{amt:p.inst1, d:p.d1}].concat(p.inst2 ? [{amt:p.inst2, d:p.d2}] : []), status:'proposed', on:S.today, text, viaAgent:true}; }
  i.status = 'done'; i.sent = text; S.page = 'home'; toast('Sent on WhatsApp');
}
function applyCsv(txt){
  const lines = txt.trim().split(/\r?\n/).filter(Boolean);
  if(lines.length < 2){ S.month.csvMsg = {err:true, text:'The sheet looks empty.'}; return; }
  const head = lines[0].split(',').map(h => h.trim().toLowerCase());
  const pi = head.findIndex(h => /payer|person|name|doctor|member/.test(h)), ri = head.findIndex(h => /resource|what|item|type|measure/.test(h)), ci = head.findIndex(h => /count|qty|quantity|number/.test(h));
  if(pi < 0 || ri < 0 || ci < 0){ S.month.csvMsg = {err:true, text:'I need columns for person, what was counted, and the count.'}; return; }
  const d = {}; measures().forEach(m => { d[m] = {}; allIds().forEach(id => d[m][id] = 0); });
  let n = 0, skipped = 0;
  lines.slice(1).forEach(l => {
    const r = l.split(',').map(x => x.trim()), who = (r[pi] || '').toLowerCase(), what = (r[ri] || '').toLowerCase();
    const id = who === 'me' || S.account.owner.toLowerCase() === who || S.account.ownerFirst.toLowerCase() === who ? 'me' : (colleagues().find(p => p.name.toLowerCase() === who || firstName(p.id).toLowerCase() === who) || {}).id;
    const m = measures().find(x => x === what || x.replace(/s$/, '') === what);
    if(id && m && !isNaN(+r[ci])){ d[m][id] += +r[ci]; n++; } else skipped++;
  });
  S.month.draft = d; S.month.csvMsg = {err:false, text:`Read ${n} rows${skipped ? `, skipped ${skipped}` : ''}. Other columns were ignored. Check the numbers, then continue.`};
}

/* ==================================================================
   ACTIONS — every button carries data-action; one dispatcher
   ================================================================== */
const A = {
  noop(){},
  go(el){ S.page = el.dataset.arg; S.arg = null; S.confirmResplit = false; S.errors = {}; if(S.page === 'split') S.editing = null; scrollTo(0, 0); },
  openPerson(el){ S.page = 'person'; S.arg = el.dataset.id; scrollTo(0, 0); },
  openItem(el){ S.page = 'decision'; S.arg = el.dataset.id; scrollTo(0, 0); },
  openBills(){ S.page = 'bills'; S.errors = {}; S.month.step = S.month.counts || !measures().length ? 'review' : 'numbers'; if(!S.month.draft) S.month.draft = S.month.counts ? JSON.parse(JSON.stringify(S.month.counts)) : {}; scrollTo(0, 0); },
  toggle(el){ const k = el.dataset.k; S.ui.open[k] = !S.ui.open[k]; },
  preview(el){ S.ui.preview = el.dataset.id; },
  closePreview(){ S.ui.preview = null; },
  previewOnly(){ toast('Preview — they can tap this on their own phone.'); },
  copy(el){ copyText(el.dataset.text); },

  // wizard
  wizNext(){
    S.errors = {};
    if(S.stage === 'people'){
      if(!S.people.some(p => p.name.trim())){ S.errors.people = 'Add at least one person.'; return; }
      S.people = S.people.filter(p => p.name.trim());
    }
    if(S.stage === 'check'){
      if(!S.costs.length){ S.errors.split = 'Add at least one cost.'; return; }
      if(S.costs.some(c => !c.amount)){ S.errors.split = 'Every cost needs an amount.'; return; }
      if(S.costs.some(c => c.method === 'count' && !c.measure.trim())){ S.errors.split = 'Say what you count for each usage-based cost.'; return; }
      if(S.costs.some(c => (c.method === 'share' && !Object.keys(c.shares).length) || (c.method === 'fixed' && !Object.keys(c.fixed).length))){ S.errors.split = 'Say who pays the fixed share or amount.'; return; }
      if(S.questions.some(q => q.kind === 'who')){ S.errors.split = 'Answer the question above first.'; return; }
      S.editing = null;
    }
    if(S.stage === 'numbers' && S.source.type === 'staff' && !S.source.name.trim()){ S.errors.source = 'Add the name of who sends the numbers.'; return; }
    const s = wizSteps(); S.stage = s[s.indexOf(S.stage) + 1] || S.stage;
    scrollTo(0, 0);
  },
  wizBack(){ const s = wizSteps(); S.stage = s[Math.max(0, s.indexOf(S.stage) - 1)]; S.errors = {}; scrollTo(0, 0); },
  personName(el){ P(el.dataset.id).name = el.value; },
  personPhone(el){ P(el.dataset.id).phone = el.value; },
  addPerson(){ S.people.push({id:'p' + S.seq++, name:'', phone:''}); },
  removePerson(el){ const id = el.dataset.id; S.people = S.people.filter(p => p.id !== id); S.costs.forEach(c => { delete c.shares[id]; delete c.fixed[id]; }); },
  text(el){ S.text = el.value; },
  async draftSplit(){
    S.errors = {};
    if(!S.text.trim()){ S.errors.text = 'Describe at least one cost.'; return; }
    S.drafting = true; render();
    let r;
    try{ r = await AI.draftSplit(S.text, colleagues()); } finally { S.drafting = false; }
    if(!r.costs.length){ S.errors.text = (r.questions[0] || {}).text || 'I couldn’t find any costs.'; return; }
    S.costs = r.costs; S.questions = r.questions.filter(q => q.kind !== 'none'); S.editing = null;
    S.seq = Math.max(S.seq, r.costs.length + 2);
    S.stage = 'check'; scrollTo(0, 0);
  },
  editCost(el){ S.editing = el.dataset.id || null; S.errors = {}; },
  costField(el){ const c = S.costs.find(x => x.id === el.dataset.id), f = el.dataset.f; if(f === 'amount') c.amount = parseAmt(el.value); else if(f === 'measure') c.measure = el.value.trim().toLowerCase(); else c.name = el.value; c.assumed = false; },
  costPayDay(el){ const c = S.costs.find(x => x.id === el.dataset.id); c.payDay = el.value ? +el.value : null; },
  costMethod(el){ const c = S.costs.find(x => x.id === el.dataset.id); c.method = el.dataset.m; c.assumed = false; },
  costPart(el){
    const c = S.costs.find(x => x.id === el.dataset.id), p = el.dataset.p, v = el.value.trim();
    if(c.method === 'share'){
      if(!v){ delete c.shares[p]; return; }
      const f = /%/.test(v) ? parseFloat(v) / 100 : /\//.test(v) ? (+v.split('/')[0]) / (+v.split('/')[1]) : parseFloat(v) > 1 ? parseFloat(v) / 100 : parseFloat(v);
      if(f > 0 && f < 1) c.shares[p] = f;
    } else { if(!v){ delete c.fixed[p]; return; } c.fixed[p] = parseAmt(v); }
  },
  addCost(){ const id = 'c' + S.seq++; S.costs.push({id, name:'New cost', amount:0, payDay:null, method:'equal', measure:'', shares:{}, fixed:{}}); S.editing = id; },
  removeCost(el){ S.costs = S.costs.filter(c => c.id !== el.dataset.id); S.editing = null; },
  answerWho(el){ const k = +el.dataset.k, q = S.questions[k], c = S.costs.find(x => x.id === q.cost), id = el.dataset.id; if(c){ if(id){ c.method = 'share'; c.shares = {[id]:q.frac || 1/3}; } else { c.method = 'equal'; c.shares = {}; } c.assumed = false; } S.questions.splice(k, 1); },
  dismissQ(el){ S.questions.splice(+el.dataset.k, 1); },
  setSource(el){ S.source.type = el.dataset.arg; S.errors = {}; },
  sourceName(el){ S.source.name = el.value; },
  sourcePhone(el){ S.source.phone = el.value; },
  sendSplit(){ if(!S.channels.whatsapp) return; resend(); S.sent = true; S.stage = 'live'; S.page = 'replies'; toast(`Sent to ${colleagues().length} ${colleagues().length === 1 ? 'person' : 'people'}`); scrollTo(0, 0); },

  // replies
  answerDraft(el){ S.invites[el.dataset.id].answerDraft = el.value; },
  sendAnswer(el){
    const id = el.dataset.id, inv = S.invites[id];
    const t = inv.answerDraft != null ? inv.answerDraft : answerDefault(id);
    wa(id, t); S.invites[id] = {...inv, status:'pending', answer:t};
    toast('Answer sent');
  },
  declineChoice(el){ S.ui.decline[el.dataset.id] = el.dataset.c || null; },
  talkToThem(el){ S.invites[el.dataset.id].handled = true; hist(el.dataset.id, `${S.account.ownerFirst} will talk to them directly.`); },
  removeFromSplit(el){
    const id = el.dataset.id, n = nm(id);
    S.people = S.people.filter(p => p.id !== id); delete S.invites[id];
    S.costs.forEach(c => { delete c.shares[id]; delete c.fixed[id]; });
    S.version++; resend(`${S.account.ownerFirst} updated the split (${n} is no longer part of it). Please check your share again.`);
    toast(`${n} removed. Everyone else has the new split.`);
  },
  remindAccept(){ colleagues().filter(p => !accepted(p.id)).forEach(p => wa(p.id, `Reminder: please check and accept your share of ${S.account.business}'s costs.`)); toast('Reminder sent'); },

  // bills
  countDraft(el){ const m = el.dataset.m; S.month.draft = S.month.draft || {}; S.month.draft[m] = S.month.draft[m] || {}; S.month.draft[m][el.dataset.id] = el.value === '' ? null : Math.max(0, Math.round(+el.value)); },
  csvFile(el){ const f = el.files && el.files[0]; if(!f) return; const r = new FileReader(); r.onload = () => { applyCsv(String(r.result)); render(); }; r.readAsText(f); },
  saveCounts(){
    const d = S.month.draft || {};
    if(measures().some(m => allIds().some(id => !(d[m] && d[m][id] != null)))){ S.errors.counts = 'Fill in a number for everyone (0 is fine).'; return; }
    S.errors = {}; S.month.counts = JSON.parse(JSON.stringify(d)); S.month.step = 'review'; hist('me', `Added ${MONTH}'s numbers.`); scrollTo(0, 0);
  },
  billStep(el){ S.month.step = el.dataset.step; },
  sendBills(){
    if(!allAccepted() || !S.channels.invoices || billed()) return;
    const sh = computeShares(S.costs, allIds(), S.month.counts || {});
    S.month.bills = sh.total; S.month.status = 'sent'; S.month.sentOn = S.today;
    colleagues().forEach((p, k) => { S.month.invoices[p.id] = {no:`INV-2608-${String(k + 2).padStart(3, '0')}`, va:`2223 3300 ${String(4417820 + k * 1137).replace(/(\d{4})(\d+)/, '$1 $2')}`}; hist(p.id, `${MONTH} bill sent: ${fmt(sh.total[p.id])}, due ${fd(DUE)}.`); });
    (S.pays.me = S.pays.me || []).push({d:S.today, amt:sh.total.me});
    hist('me', `Sent ${MONTH}'s bills.`);
    S.page = 'home'; toast(`${colleagues().length} bills sent`); scrollTo(0, 0);
  },

  // decisions
  planField(el){
    const i = S.items.find(x => x.id === el.dataset.id), p = planFor(i), f = el.dataset.f;
    const np = {inst1:p.inst1, d1:p.d1, d2:p.d2};
    if(f === 'inst1') np.inst1 = Math.min(due(i.from), parseAmt(el.value)); else if(el.value) np[f] = el.value;
    if(dayNum(np.d1) > dayNum(DUE)) np.d1 = DUE;
    i.plan = np;
  },
  toggleExpect(el){ const id = el.dataset.id; S.expect[id] = S.expect[id] === false; },
  async chooseTone(el){ const i = S.items.find(x => x.id === el.dataset.id); S.tone = el.dataset.tone; await sendItem(i); },
  changeTone(){ S.tone = null; },
  editItem(el){ const i = S.items.find(x => x.id === el.dataset.id); i.edit = draftFor(i, S.tone || 'warm'); },
  itemEdit(el){ S.items.find(x => x.id === el.dataset.id).edit = el.value; },
  async sendItem(el){ await sendItem(S.items.find(x => x.id === el.dataset.id)); },
  dismissItem(el){ const i = S.items.find(x => x.id === el.dataset.id); i.status = 'dismissed'; S.page = 'home'; toast('Okay — nothing sent'); },
  acceptRequest(el){ const i = S.items.find(x => x.id === el.dataset.id); S.plans[i.from] = {inst:[{amt:due(i.from), d:i.date}], status:'accepted', on:S.today, viaAgent:false}; const t = localWrite('accept-time', writeCtx(i, {date:i.date})); wa(i.from, t); i.status = 'done'; i.sent = t; S.page = 'home'; toast('Sent'); },
  declineRequest(el){ const i = S.items.find(x => x.id === el.dataset.id); const t = localWrite('decline-time', writeCtx(i)); wa(i.from, t); i.status = 'done'; i.sent = t; S.page = 'home'; toast('Sent'); },
  acceptCounter(el){ const i = S.items.find(x => x.id === el.dataset.id); S.plans[i.from].inst = i.inst.map(x => ({...x})); const t = localWrite('accept-counter', writeCtx(i, {inst1:i.inst[0].amt, d1:i.inst[0].d, inst2:i.inst[1].amt, d2:i.inst[1].d})); wa(i.from, t); doAcceptPlan(i.from); i.status = 'done'; i.sent = t; S.page = 'home'; toast('Sent'); },
  keepCounter(el){ const i = S.items.find(x => x.id === el.dataset.id), pl = S.plans[i.from]; const t = localWrite('keep-counter', writeCtx(i, {inst1:pl.inst[0].amt, d1:pl.inst[0].d, d2:pl.inst[1] ? pl.inst[1].d : DUE, key:keyDate({noPlan:true})})); wa(i.from, t); i.status = 'done'; i.sent = t; S.page = 'home'; toast('Sent'); },

  // settings
  togglePerm(el){ const k = el.dataset.k; S.perms[k] = !S.perms[k]; },
  toggleChannel(el){ const k = el.dataset.k; S.channels[k] = !S.channels[k]; },
  saveSplit(el){
    S.errors = {};
    if(!S.costs.length || S.costs.some(c => !c.amount)){ S.errors.split = 'Every cost needs an amount.'; return; }
    if(!S.people.some(p => p.name.trim())){ S.errors.split = 'Add at least one person.'; return; }
    S.people = S.people.filter(p => p.name.trim()); S.editing = null;
    if(S.sent && !el.dataset.confirm){ S.confirmResplit = true; return; }
    S.confirmResplit = false;
    if(S.sent){ S.version++; resend(`${S.account.ownerFirst} updated how ${S.account.business}'s costs are split. Please check your share again.`); S.page = 'replies'; toast('New split sent to everyone'); }
    else { S.page = 'settings'; toast('Saved'); }
    scrollTo(0, 0);
  },
  cancelResplit(){ S.confirmResplit = false; },

  // colleague page (recorded as their actions)
  acceptSplit(el){ doAccept(el.dataset.id); toast('Accepted'); },
  declineOpen(el){ S.ui.decline[el.dataset.id] = el.dataset.off ? null : 'open'; },
  declineText(el){ S.ui.decline['t' + el.dataset.id] = el.value; },
  declineSend(el){ const id = el.dataset.id; doDecline(id, (S.ui.decline['t' + id] || '').trim()); S.ui.decline[id] = null; toast('Sent to ' + S.account.ownerFirst); },
  askOpen(el){ S.ui.ask[el.dataset.id] = el.dataset.off ? null : 'open'; },
  askText(el){ S.ui.ask['t' + el.dataset.id] = el.value; },
  askSend(el){ const id = el.dataset.id, q = (S.ui.ask['t' + id] || '').trim(); if(!q){ toast('Write your question first.'); return; } doAsk(id, q); S.ui.ask[id] = null; toast('Sent to ' + S.account.ownerFirst); },
  payNow(el){ doPay(el.dataset.id, +el.dataset.amt); toast('Paid'); },
  acceptPlan(el){ doAcceptPlan(el.dataset.id); toast('Plan accepted'); },
  counterOpen(el){ const id = el.dataset.id; if(el.dataset.off){ S.ui.counter[id] = null; return; } const pl = S.plans[id], rem = due(id), a = Math.min(rem, 15000); S.ui.counter[id] = [{amt:a, d:'2026-10-03'}, {amt:rem - a, d:pl.inst[1] ? pl.inst[1].d : '2026-10-20'}]; },
  counterField(el){ const c = S.ui.counter[el.dataset.id][+el.dataset.k]; if(el.dataset.f === 'amt') c.amt = parseAmt(el.value); else if(el.value) c.d = el.value; },
  sendCounter(el){ const id = el.dataset.id, cu = S.ui.counter[id]; const q = `${fmt(cu[0].amt)} by ${fd(cu[0].d)} ho jayega, baaki ${fmt(cu[1].amt)} ${fd(cu[1].d)} tak.`; S.items.push({id:'i' + S.seq++, kind:'counter', from:id, t:S.today, quote:q, inst:cu.map(x => ({...x})), status:'open'}); hist(id, `Suggested: ${q}`); S.ui.counter[id] = null; toast('Sent to ' + S.account.ownerFirst); },
  wrongOpen(el){ S.ui.wrong[el.dataset.id] = el.dataset.off ? null : 'open'; },
  wrongText(el){ S.ui.wrong['t' + el.dataset.id] = el.value; },
  async wrongSend(el){ const id = el.dataset.id, t = (S.ui.wrong['t' + id] || '').trim(); if(!t){ toast('Write what’s wrong first.'); return; } await routeMessage(id, t); S.ui.wrong[id] = null; S.ui.wrong['t' + id] = ''; toast('Sent to ' + S.account.ownerFirst); },

  // demo
  demoView(el){ S.view = el.dataset.arg; S.ui.preview = null; scrollTo(0, 0); },
  async demoNext(){ const e = demoEvents()[0]; if(!e || e.gate) return; if(e.d && dayNum(e.d) > dayNum(S.today)) S.today = e.d; S.done[e.id] = true; await e.run(); },
  demoRestart(){ fresh(); try{ localStorage.removeItem(LS); }catch(e){} scrollTo(0, 0); },
  demoFillPeople(){ S.people = [{id:'p1', name:'Dr Bhatt', phone:'+91 98200 11111'}, {id:'p2', name:'Dr Arjun', phone:'+91 98200 22222'}, {id:'p3', name:'Dr Dhruv', phone:'+91 98200 33333'}]; S.seq = Math.max(S.seq, 4); S.errors = {}; },
  demoFillText(){ S.text = 'Echo machine EMI of ₹40,000, paid on the 5th, split by number of scans each of us did. Consultation rooms rent of ₹45,000, paid on the 5th, split by sessions. Sunita\'s salary (technician and front desk) ₹25,000, paid on the 7th, split equally between all four of us. Utilities ₹10,000, paid on the 20th — Dhruv pays one-third as he only comes on Tuesdays, the rest split equally.'; S.errors = {}; },
  demoFillStaff(){ S.source.name = 'Sunita'; S.source.phone = '+91 98200 44444'; S.errors = {}; },
  demoFillCounts(){ S.month.draft = exampleCounts(); S.errors = {}; }
};

/* ==================================================================
   RENDER, DISPATCH, SELF-CHECK, PERSISTENCE
   ================================================================== */
const LS = 'shared-collect-v9';
function render(){
  const app = document.getElementById('app');
  let body;
  if(DEMO && S.view.startsWith('p:') && P(S.view.slice(2))){ const id = S.view.slice(2); body = `<div class="phonewrap"><div class="viewlabel">${esc(nm(id))}'s phone — opened from the WhatsApp link</div>${colleagueApp(id)}</div>`; }
  else { if(S.view !== 'owner') S.view = 'owner'; body = ownerApp(); }
  const prev = S.ui.preview && P(S.ui.preview) ? `<div class="overlay" data-action="closePreview" data-self="1"><div class="modal" role="dialog" aria-modal="true" aria-label="Preview"><div class="hd"><h2>What ${esc(nm(S.ui.preview))} sees</h2>${b('', 'closePreview', {cls:'ghost sm', icon:'x', title:'Close'})}</div><p class="small mute" style="margin:0 0 10px">${S.sent && S.invites[S.ui.preview] ? 'Their page right now. Buttons only work on their phone.' : 'How their page will look once you send. Buttons only work on their phone.'}</p>${colleagueApp(S.ui.preview, {ro:true, asInvite:!S.sent || !S.invites[S.ui.preview]})}</div></div>` : '';
  app.innerHTML = demoBar() + body + prev;
  selfCheck(app);
  save();
}
async function run(name, el, ev){
  if(!A[name]){ console.error('UNKNOWN ACTION', name); return; }
  try{ await A[name](el, ev); }catch(e){ console.error(e); }
  render();
}
document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-action]');
  if(!el || el.disabled) return;
  if(el.dataset.self && ev.target !== el) return;
  run(el.dataset.action, el, ev);
});
document.addEventListener('change', ev => { const el = ev.target; if(el.dataset && el.dataset.change) run(el.dataset.change, el, ev); });
document.addEventListener('input', ev => { const el = ev.target; if(el.dataset && el.dataset.live){ if(A[el.dataset.live]) A[el.dataset.live](el); else console.error('UNKNOWN ACTION', el.dataset.live); save(); } });
document.addEventListener('keydown', ev => { if(ev.key === 'Escape' && S.ui.preview){ S.ui.preview = null; render(); } });
function selfCheck(root){
  root.querySelectorAll('button').forEach(x => { if(!x.dataset.action) console.error('UNWIRED BUTTON', (x.textContent || '').trim().slice(0, 60)); else if(!A[x.dataset.action]) console.error('UNKNOWN ACTION', x.dataset.action); });
  root.querySelectorAll('[data-live],[data-change]').forEach(x => { const a = x.dataset.live || x.dataset.change; if(!A[a]) console.error('UNKNOWN ACTION', a); });
}
function save(){ try{ localStorage.setItem(LS, JSON.stringify(S)); }catch(e){} }
function load(){ try{ const s = JSON.parse(localStorage.getItem(LS) || 'null'); if(s && s.v === 9) return s; }catch(e){} return null; }
let toastT;
function toast(msg){ const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2400); }
function copyText(text){
  const fb = () => { try{ const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); toast(ok ? 'Copied' : 'Couldn’t copy — select the text instead'); }catch(e){ toast('Couldn’t copy — select the text instead'); } };
  try{ navigator.clipboard.writeText(text).then(() => toast('Copied'), fb); }catch(e){ fb(); }
}

S = load() || fresh();
S.drafting = false;
render();
</script>
</body>
</html>

```

# Appendix B — Full source: `fitcheck/mvp-test.js`

```js
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

```
