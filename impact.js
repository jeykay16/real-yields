/* Shared gold-impact engine: classifies any text for its likely effect on gold. */

// Each category has two directional poles (A/B) detected from the headline's own
// wording, plus an M(ixed) reading when the direction can't be inferred. Every
// reading carries a TL;DR, the detailed transmission chain, and a nuance to watch.
const IMPACTS = [
  { tag: "Fed & central banks",
    re: /fed\b|fomc|powell|rate cut|rate hike|interest rate|monetary policy|cash rate|bank rate|rate statement|policy minutes|press conference|rate decision|central bank/i,
    A: { re: /\b(cuts?|cutting|dovish|pause[sd]?|holds? rates|easing|lowers? rates|stimulus)\b/i, v: "bull",
      tldr: "Dovish signal → real yields and the dollar fall → gold's two classic tailwinds at once.",
      detail: "Rate cuts (or hints of them) pull bond yields down, compressing the real yield that is gold's opportunity cost — holding gold suddenly gives up less income. A softer policy path also usually weakens the dollar, making gold cheaper for buyers in every other currency.",
      watch: "If the easing comes because recession fear is spiking, safe-haven demand can accelerate the move. If markets had already fully priced the cut, the reaction may be small — surprise is what moves price." },
    B: { re: /\b(hikes?|hiking|hawkish|raises? rates|higher for longer|tighten(s|ing)?|taper)\b/i, v: "bear",
      tldr: "Hawkish signal → real yields and the dollar rise → gold's opportunity cost goes up.",
      detail: "Higher (or longer-held) rates raise the real return on bonds and cash, making zero-yield gold comparatively expensive to hold. The dollar usually firms as money chases the higher rate, adding a second headwind.",
      watch: "If markets believe the hawkishness will break something — a recession or a credit event — gold can flip to rallying on fear. Watch whether equities and credit sell off alongside." },
    M: { tldr: "Central-bank news moves gold through real yields and the dollar — direction depends on whether it reads dovish (gold up) or hawkish (gold down).",
      detail: "A dovish outcome (cut, pause, soft guidance) lowers real yields and the dollar — bullish. A hawkish one (hike, 'higher for longer') does the opposite — bearish. Gold often moves more on the press conference and guidance than on the decision itself.",
      watch: "The market reacts to the gap versus expectations: a widely expected cut can even see gold fall on the news ('sell the fact')." } },
  { tag: "Inflation",
    re: /inflation|cpi\b|consumer price|pce\b|producer price|ppi\b|deflation/i,
    A: { re: /\b(jumps?|surges?|accelerat\w*|hott?er|above (forecast|expectation)|higher than|beats?|climbs?|rises?|picks? up|(edges?|ticks?|moves?|inch\w*)( \w+)? (up|higher))\b/i, v: "bear",
      tldr: "Hotter inflation → fewer/later rate cuts priced → real yields and dollar up → usually negative for gold at first.",
      detail: "The knee-jerk: a hot print makes traders bet the central bank stays tight for longer, so bond yields and the dollar rise — both raise the cost of holding gold. The important nuance: if the central bank is seen as unwilling or unable to respond, inflation running ahead of rates crushes real yields, which is historically gold's most bullish regime (the 1970s, 2021–22).",
      watch: "Watch the bond market's verdict: if nominal yields rise more than inflation expectations, real yields rise and gold struggles; if inflation expectations rise more, gold wins despite the hot print." },
    B: { re: /\b(cools?|slow(s|ing)?|eases?|falls?|drops?|below (forecast|expectation)|miss(es)?|declin\w*|soft(er|ens)?|(edges?|ticks?|moves?|inch\w*)( \w+)? (down|lower))\b/i, v: "bull",
      tldr: "Cooler inflation → rate cuts closer → yields and dollar down → usually positive for gold.",
      detail: "A soft print gives the central bank room to ease sooner. Bond yields fall in anticipation, lowering gold's opportunity cost, and the dollar typically softens with them.",
      watch: "If inflation is cooling because the economy is cracking, a safe-haven bid adds a second tailwind. The one bad mix for gold is 'immaculate disinflation' with strong growth — that favors stocks over havens." },
    M: { tldr: "Gold reacts to what the inflation number implies for rates: hot → tighter policy → bearish first; cool → cuts closer → bullish.",
      detail: "Hotter-than-forecast inflation pushes yields and the dollar up (gold down); cooler-than-forecast does the reverse (gold up). The exception: hot inflation with a passive central bank crushes real yields and is strongly bullish.",
      watch: "It's the surprise versus the forecast that matters, not the level — check the consensus number next to the release." } },
  { tag: "Growth & jobs data",
    re: /jobs|payroll|employment|unemployment|gdp\b|recession|pmi\b|ism\b|retail sales|consumer confidence|manufacturing|industrial|housing|sentiment|trade balance|jobless/i,
    A: { re: /\b(miss(es)?|weak\w*|falls?|drops?|contract\w*|below|slumps?|layoffs?|cools?|slows?|shrinks?|worse|(edges?|ticks?|inch\w*)( \w+)? (down|lower))\b/i, v: "bull",
      tldr: "Weak data → rate cuts move closer and recession hedging picks up → typically positive for gold.",
      detail: "Soft growth numbers pull forward expected rate cuts, dragging real yields down — gold's main driver. If the weakness looks recessionary, investors also add gold as a hedge, stacking a safe-haven bid on top of the rates effect.",
      watch: "In a violent panic, gold can briefly fall with everything else as funds sell winners to cover losses (March 2020) — before the easing trade reasserts itself." },
    B: { re: /\b(beats?|strong\w*|surges?|jumps?|above|expands?|robust|blowout|rises?|better than|accelerat\w*|(edges?|ticks?|inch\w*)( \w+)? (up|higher))\b/i, v: "bear",
      tldr: "Strong data → rate cuts priced out and the dollar firms → typically a headwind for gold.",
      detail: "Upside surprises push rate-cut expectations further into the future, lifting bond yields and the dollar — both raise the opportunity cost of holding gold.",
      watch: "If strong growth comes with rising inflation expectations, real yields may barely move — which blunts the damage to gold." },
    M: { tldr: "Growth data steers rate expectations: a weak print is usually gold-positive, a strong one gold-negative.",
      detail: "Weak data → cuts closer → yields down → gold up. Strong data → higher-for-longer → yields and dollar up → gold down. The size of the move depends on how far the number lands from the consensus forecast.",
      watch: "For jobs reports, the wage-growth figure inside the release can matter as much as the headline jobs number — fast wages feed inflation." } },
  { tag: "Trade & tariffs",
    re: /tariff|trade war|trade deal|trade talks|import dut|export ban/i,
    A: { re: /\b(imposes?|new|raises?|threat\w*|slaps?|retaliat\w*|escalat\w*|hikes?|widens?)\b/i, v: "bull",
      tldr: "Tariff escalation → stagflation risk + uncertainty → historically supportive for gold.",
      detail: "Tariffs raise import prices (inflationary) while damaging trade and growth (recessionary) — a combination central banks can't fix with one tool, which is exactly the uncertainty gold hedges. Escalation headlines have repeatedly triggered hedging flows into bullion.",
      watch: "A sharp dollar rally on the same headline can offset part of gold's bid — the net effect depends on which safe haven wins the flow." },
    B: { re: /\b(deal|agrees?|cuts?|suspends?|pauses?|rolls? back|truce|exempts?|resolves?)\b/i, v: "bear",
      tldr: "Trade de-escalation → risk-on, hedges unwound → gold often gives back its tariff premium.",
      detail: "Deals and suspensions reduce the stagflation tail-risk investors were hedging, so money rotates from havens back into risk assets.",
      watch: "Trade headlines reverse often — durable agreements matter far more than announcements, and gold traders fade the first headline more than they used to." },
    M: { tldr: "Tariff news is a stagflation story: escalation is usually gold-positive, de-escalation gold-negative.",
      detail: "New or higher tariffs raise inflation and damage growth simultaneously — bullish for gold as a hedge. Deals and suspensions unwind that hedge — bearish.",
      watch: "Watch the dollar's reaction: tariff shocks sometimes strengthen the dollar, which dampens gold's response." } },
  { tag: "Geopolitics",
    re: /war\b|missile|airstrike|strike|sanction|ceasefire|invasion|conflict|military|troops|nuclear|geopolit|drone|explos/i,
    A: { re: /\b(attack\w*|strikes?|missiles?|invades?|invasion|escalat\w*|explos\w*|clash\w*|killed|drones?|shot down|blast|seiz\w*|fires?|risk)\b/i, v: "bull",
      tldr: "Escalation → immediate safe-haven bid → gold typically jumps within minutes.",
      detail: "Gold is the hedge with no counterparty — conflict headlines trigger reflexive buying, often alongside the dollar and Treasury bonds. If the conflict threatens energy supply (Middle East, shipping lanes), an oil-price/inflation channel stacks on top of the fear bid.",
      watch: "Crisis pops fade fast when escalation stalls — the classic 'buy the rumor of war, sell the war' pattern. Whether the gain sticks depends on the real-yield backdrop underneath." },
    B: { re: /\b(ceasefire|truce|peace|de-?escalat\w*|agreement|halts?|withdraws?|talks (resume|progress))\b/i, v: "bear",
      tldr: "De-escalation → the fear premium unwinds → gold usually slips.",
      detail: "As conflict risk recedes, the safe-haven positioning built up during the escalation is unwound and money rotates back to risk assets.",
      watch: "If gold barely falls on genuinely good news, that signals the rally was never mainly about the conflict — usually a bullish tell about the underlying trend." },
    M: { tldr: "Geopolitical news moves gold through fear: escalation bullish, de-escalation bearish, both often quickly.",
      detail: "Gold's safe-haven bid is reflexive and fast but mean-reverting — the market prices conflict risk within hours. Sustained geopolitical premiums require sustained escalation.",
      watch: "Energy-relevant conflicts have a second, slower channel through oil prices and inflation." } },
  { tag: "Banks & credit",
    re: /bank collapse|bank failure|banking|bailout|liquidity|credit|default|contagion|downgrade/i,
    A: { re: /\b(collaps\w*|fail\w*|crisis|contagion|bank run|defaults?|downgrades?|losses|stress|trouble)\b/i, v: "bull",
      tldr: "Banking stress → flight to safety + emergency-easing bets → one of gold's strongest setups.",
      detail: "Bank trouble fires both of gold's engines at once: investors flee counterparty risk into the one asset that can't default, while markets race to price emergency rate cuts, crushing real yields. In March 2023 (SVB), gold rose roughly 10% in two weeks on exactly this mix.",
      watch: "If stress turns into a full liquidation event, gold can dip for a few days as funds sell everything for cash — historically a buying window, not a trend change." },
    B: { re: /\b(rescu\w*|stabili\w*|calms?|recover\w*|backstop|guarantee[sd]?|resolved)\b/i, v: "bear",
      tldr: "Stress contained → haven bid and rate-cut bets fade → gold gives back some gains.",
      detail: "Effective backstops reverse both drivers: counterparty fear recedes and emergency-easing expectations are priced back out.",
      watch: "Markets often doubt the first rescue — gold frequently holds its gains until the calm has lasted more than a few sessions." },
    M: { tldr: "Credit and banking news is a fear-plus-rates story: stress is strongly gold-positive, resolution gold-negative.",
      detail: "Stress means haven demand plus rate-cut bets (both bullish); credible resolution unwinds both (bearish).",
      watch: "The speed of central-bank response is the swing factor — fast liquidity support means more easing priced, which helps gold either way." } },
  { tag: "Dollar & bonds",
    re: /dollar|dxy|treasur|bond|yield/i,
    A: { re: /(dollar|dxy|greenback).{0,25}(weak\w*|falls?|slips?|drops?|slumps?|lows?)|yields?.{0,20}(fall|drop|declin|slide|retreat)|bond (rally|rebound)/i, v: "bull",
      tldr: "Falling dollar / falling yields → gold gets cheaper worldwide and its opportunity cost drops → bullish.",
      detail: "A weaker dollar makes dollar-priced gold cheaper for the rest of the world, lifting demand. Falling bond yields shrink the income you give up by holding gold instead — the two effects usually arrive together and compound.",
      watch: "Check why yields are falling: growth fear (gold-friendly) versus pure disinflation optimism (less so)." },
    B: { re: /(dollar|dxy|greenback).{0,25}(strength\w*|rall\w*|rises?|gains?|surges?|jumps?|highs?)|yields?.{0,20}(rise|jump|surge|climb|spike)|bond (selloff|rout)/i, v: "bear",
      tldr: "Rising dollar / rising yields → gold's opportunity cost climbs → bearish.",
      detail: "Dollar strength makes gold dearer for non-US buyers, and rising yields raise the real return on the competing safe asset. A bond selloff that lifts real yields is the textbook gold headwind.",
      watch: "If yields rise because inflation expectations are exploding (not real rates), gold can rise alongside — the split between real and breakeven yields is the tell." },
    M: { tldr: "Gold trades inversely to the dollar and to real bond yields — this story's direction decides which way.",
      detail: "Dollar/yields up → gold down; dollar/yields down → gold up. This is gold's most mechanical relationship, playing out tick by tick during big bond-market moves.",
      watch: "Real (inflation-adjusted) yields matter more than nominal ones — see this site's front page." } },
  { tag: "Gold market",
    re: /gold|bullion|silver|precious/i,
    A: { re: /\b(rall\w*|records?|highs?|inflows?|buy\w*|surges?|jumps?|upgrades?|targets? raised|demand|climbs?|rises?|(edges?|ticks?|inch\w*)( \w+)? (up|higher))\b/i, v: "bull",
      tldr: "Bullish gold-market news: buying flows, records or raised targets reinforce the uptrend.",
      detail: "Direct demand news — central-bank purchases, ETF inflows, higher bank price targets — adds real buying pressure and draws momentum-followers in. Central-bank buying in particular has been the structural bid under gold since 2022.",
      watch: "New all-time-high headlines attract retail buying but also profit-taking — momentum works until positioning gets crowded (check the COT percentile on the Gold drivers page)." },
    B: { re: /\b(falls?|drops?|outflows?|selloff|slumps?|profit[- ]taking|downgrades?|declines?|retreats?|sinks?|(edges?|ticks?|inch\w*)( \w+)? (down|lower))\b/i, v: "bear",
      tldr: "Bearish gold-market news: selling flows or profit-taking pressure the price directly.",
      detail: "ETF outflows, fund liquidations and downgraded forecasts remove the marginal buyer. Sharp one-day drops are often positioning washouts rather than changes in the fundamental story.",
      watch: "If a drop happens without any move in real yields or the dollar, it's usually positioning noise — the fundamental drivers reassert within days." },
    M: { tldr: "Direct gold-market coverage — the driver here is flows and positioning rather than macro.",
      detail: "Watch which flow the story describes: central-bank reserves and ETF flows are the slow structural forces; futures positioning is the fast, mean-reverting one.",
      watch: "Cross-check the story against the live drivers on the Gold drivers page — flows follow the macro more often than they lead it." } },
];
const DEFAULT_IMPACT = { tag: "General macro",
  M: { tldr: "Reaches gold through three channels: real yields, the US dollar, and fear.",
    detail: "Anything that lowers real yields, weakens the dollar, or raises uncertainty tends to lift gold; anything that does the opposite weighs on it. If a story doesn't clearly touch one of those channels, gold usually ignores it.",
    watch: "The bigger the surprise relative to what markets expected, the bigger the reaction." } };

// how hard each category typically hits gold when it fires (1 mild – 3 strong)
const CAT_WEIGHT = {
  "Fed & central banks": 3, "Inflation": 3, "Banks & credit": 3,
  "Geopolitics": 2, "Trade & tariffs": 2, "Dollar & bonds": 2,
  "Growth & jobs data": 2, "Gold market": 2, "General macro": 1,
};
const INTENSE = /surge|plunge|collaps|crash|soar|crisis|emergency|record|all-?time|biggest|worst|slam|rout|panic|shock|massive|historic|unprecedented|spiral/i;
const MILD = /slight|modest|edge[sd]?|tick[sd]?|marginal|little|barely|small|muted|inch/i;

function analyzeImpact(text) {
  const t = text || "";
  for (const cat of IMPACTS) {
    const catMatch = t.match(cat.re);
    if (!catMatch) continue;
    const build = (pole, dirMatch) => {
      let strength = CAT_WEIGHT[cat.tag] || 1;
      if (INTENSE.test(t)) strength += 1;
      if (MILD.test(t)) strength -= 1;
      strength = Math.max(1, Math.min(3, strength));
      return { tag: cat.tag, ...pole, strength,
        triggers: [...new Set([catMatch[0], dirMatch && dirMatch[0], (t.match(INTENSE) || [])[0]]
          .filter(Boolean).map(s => s.trim().toLowerCase()))] };
    };
    if (cat.A) { const m = t.match(cat.A.re); if (m) return build(cat.A, m); }
    if (cat.B) { const m = t.match(cat.B.re); if (m) return build(cat.B, m); }
    return { tag: cat.tag, v: "mixed", ...cat.M, strength: 0, triggers: [catMatch[0].trim()] };
  }
  return { tag: DEFAULT_IMPACT.tag, v: "mixed", ...DEFAULT_IMPACT.M, strength: 0, triggers: [] };
}
function verdictChip(a) {
  const v = typeof a === "string" ? a : a.v;
  const s = typeof a === "string" ? 0 : (a.strength || 0);
  const word = s >= 3 ? "strongly" : s === 2 ? "clearly" : "mildly";
  if (v === "bull") return `<span class="up">${word} bullish ${"&#9650;".repeat(Math.max(1, s))}</span>`;
  if (v === "bear") return `<span class="down">${word} bearish ${"&#9660;".repeat(Math.max(1, s))}</span>`;
  return `<span class="muted">two-sided</span>`;
}
function impactDetail(a) {
  return `<b>TL;DR:</b> ${colorizeBias(a.tldr)}<br>
    <b>The chain:</b> ${colorizeBias(a.detail)}<br>
    <b>Watch for:</b> ${colorizeBias(a.watch)}<br>
    ${a.triggers && a.triggers.length ?
      `<span class="muted" style="font-size:11px">Signals picked up: ${a.triggers.map(s => `“${s}”`).join(", ")}` +
      `${a.strength ? ` · strength ${a.strength}/3 (category weight ${CAT_WEIGHT[a.tag] || 1} ${INTENSE.test(a.triggers.join(" ")) ? "+ intense wording" : "± wording"})` : ""}` +
      ` — read automatically from the wording; verify against the full story.</span>` :
      `<span class="muted" style="font-size:11px">Read automatically from the wording — verify against the full story.</span>`}`;
}
function impactHtml(text) {
  const a = analyzeImpact(text);
  return `<span class="impact-toggle" onclick="toggleImpact(this)">&#9656; Gold impact
    (${a.tag}): ${verdictChip(a)}</span>
    <div class="impact-detail hidden">${impactDetail(a)}</div>`;
}
function toggleImpact(el) {
  const d = el.nextElementSibling;
  const open = d.classList.toggle("hidden");
  el.innerHTML = el.innerHTML.replace(open ? "▾" : "▸", open ? "▸" : "▾");
}

/* ---------- presentation helpers shared across pages ---------- */

// green/red the words bullish/bearish wherever they appear in generated text
function colorizeBias(s) {
  return s.replace(/\bbullish\b|\bgold-positive\b/gi, m => `<span class="up">${m}</span>`)
          .replace(/\bbearish\b|\bgold-negative\b/gi, m => `<span class="down">${m}</span>`);
}

// HIGH / MODERATE / LOW impact chip from the 0-3 strength score
function impactLevelChip(strength) {
  const [label, cls] =
    strength >= 3 ? ["HIGH IMPACT", "lvl-high"] :
    strength === 2 ? ["MODERATE", "lvl-med"] : ["LOW IMPACT", "lvl-low"];
  return `<span class="lvl ${cls}">${label}</span>`;
}

// remembers which stories the visitor has already seen, so refreshes can
// highlight genuinely new items; first-ever visit marks everything seen quietly
const SEEN_KEY = "seenNews_v1";
let __seen, __seenFirstRun, __seenDirty = false;
try { __seen = new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]")); }
catch (e) { __seen = new Set(); }
__seenFirstRun = __seen.size === 0;
function isNewItem(key) {
  if (__seen.has(key)) return false;
  __seen.add(key);
  __seenDirty = true;
  return !__seenFirstRun;
}
// persist seen keys; __seenFirstRun stays true for the whole first visit so that
// slow-loading sections don't get spuriously flagged as new
setInterval(() => {
  if (!__seenDirty) return;
  __seenDirty = false;
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...__seen].slice(-900))); } catch (e) {}
}, 4000);

// one consistent card for every list item (headlines, squawk, focus stories)
function newsCard(title, url, metaHtml, fullText) {
  const a = analyzeImpact(fullText || title);
  const key = (title || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 70);
  const fresh = key && isNewItem(key);
  const cls = a.strength >= 3 ? "impact-high" : a.strength === 2 ? "impact-med" : "impact-low";
  return `<div class="news-item ${cls}${fresh ? " fresh" : ""}">
    ${fresh ? `<span class="new-badge">NEW</span>` : ""}
    <a href="${url}" target="_blank" rel="noopener">${title}</a>
    <div class="news-meta">${metaHtml} &middot; ${impactLevelChip(a.strength)}</div>
    <span class="impact-toggle" onclick="toggleImpact(this)">&#9656; Gold impact
      (${a.tag}): ${verdictChip(a)}</span>
    <div class="impact-detail hidden">${impactDetail(a)}</div>
  </div>`;
}
