/* Prompt Flight Simulator
   Rule-based checks for the Context - Task - Constraints prompting method.
   No network calls, no storage, no dependencies. */

const MISSIONS = [
  {
    tag: "Planning",
    title: "Two deadlines, one weekend",
    brief: "You are a part-time student with an assignment due Friday and an exam on Monday. You work 15 hours a week and have at most 12 study hours available.",
    goal: "Get a realistic, time-boxed study plan from an AI assistant.",
    facts: [/\b(assignment|exam|deadline|due)\b/i, /\b(12|twelve)\b|\bhours?\b/i, /\bbreaks?\b/i],
    factTips: ["Mention both deadlines (assignment and exam).", "State your available hours (12).", "Ask for breaks to be included."],
    sample: "I'm a part-time student working 15 hours a week. I have an assignment due Friday and an exam on Monday. Create a realistic study plan that prioritizes both deadlines. Use at most 12 study hours in total, include breaks, and keep it under 200 words. Format it as a day-by-day list. If you need more information, ask me one question first.",
  },
  {
    tag: "Summarizing",
    title: "Brief the executive",
    brief: "You have a 40-page vendor report about a new AI tool. Your CFO has two minutes before a meeting and does not trust marketing claims.",
    goal: "Get a short, honest summary a busy executive can act on.",
    facts: [/\b(cfo|executive|manager|leadership|director)\b/i, /\b(bullet|bullets|points)\b|\b5\b|\bfive\b/i, /\b(verify|source|sources|claims?|evidence)\b/i],
    factTips: ["Name the audience (the CFO or an executive).", "Ask for a specific number of bullets.", "Ask the AI to flag claims that need verification."],
    sample: "I'm preparing a briefing for our CFO, who has two minutes and is skeptical of vendor marketing. Summarize the attached 40-page vendor report on an AI tool. Give exactly 5 bullet points, under 120 words in total, in plain language. Flag any claim that needs to be verified against an independent source, and say so if you are unsure about something rather than guessing.",
  },
  {
    tag: "Writing",
    title: "The late order",
    brief: "A customer's order arrived five days late and they sent an angry email. Policy lets you offer a 10% refund.",
    goal: "Draft a reply that calms the customer and stays within policy.",
    facts: [/\b(empath|apolog|sorry|understand)\w*/i, /\b(late|delay|delayed)\b/i, /\b(10%|10 percent|refund)\b/i],
    factTips: ["Ask for an empathetic, apologetic tone.", "Mention that the order arrived late.", "Include the 10% refund offer."],
    sample: "I work in customer support for an online store. A customer's order arrived five days late and they wrote an angry email. Draft a reply that is empathetic, apologizes for the delay and offers a 10% refund, which is our policy. Keep it under 150 words, use a friendly professional tone, and format it as a ready-to-send email with a subject line. Do not promise anything beyond the 10% refund.",
  },
  {
    tag: "Explaining",
    title: "ML vs. deep learning, plainly",
    brief: "A non-technical manager asks you what the difference is between machine learning and deep learning, and why it matters for the team's budget.",
    goal: "Get an explanation a manager can repeat to someone else.",
    facts: [/machine learning/i, /deep learning/i, /\b(non-technical|manager|beginner|plain|simple)\b/i, /\b(example|analogy|compare)\b/i],
    factTips: ["Name machine learning.", "Name deep learning.", "State the audience (non-technical manager, plain language).", "Ask for an example or analogy."],
    sample: "I'm explaining AI to a non-technical manager who controls our budget. Explain the difference between machine learning and deep learning in plain language, using one everyday analogy and one business example. Keep it to three short paragraphs, under 200 words, with no jargon. End with one sentence on why the difference matters for cost. If a point is oversimplified, say so.",
  },
  {
    tag: "Governance",
    title: "A one-page AI policy",
    brief: "You lead technology for a 200-person bank. Staff are already using public AI chatbots, and compliance wants clear rules this month.",
    goal: "Get a first draft of an acceptable-use policy to take to compliance.",
    facts: [/\bpolic(y|ies)\b/i, /\b(customer data|privacy|confidential|sensitive)\b/i, /\b(approved|human review|oversight|accountab\w*)\b/i],
    factTips: ["Say you want a policy.", "Cover customer data, privacy or confidentiality.", "Include approved tools or human oversight."],
    sample: "I lead technology at a 200-person bank where staff already use public AI chatbots. Draft a one-page AI acceptable-use policy for compliance to review. Cover customer data and privacy, approved tools, and human oversight of AI output. Use no more than 8 numbered rules in plain language, and add a short list of open questions for legal. Do not invent regulations. If you are unsure of a legal requirement, flag it for review.",
  },
];

const CHECKS = [
  { id: "context", label: "Context", pts: 20,
    test: t => /\b(i am|i'm|i have|i work|i lead|my|we are|we have|as a|background|our)\b/i.test(t) && wc(t) >= 12,
    tip: "Say who you are and the situation, in a sentence or two." },
  { id: "task", label: "Clear task", pts: 15,
    test: t => /\b(create|write|draft|summari[sz]e|explain|plan|list|compare|analy[sz]e|generate|outline|review|rewrite|translate|classify|build|design|prepare|give)\b/i.test(t),
    tip: "Start with one clear action verb such as write, summarize, explain or plan." },
  { id: "constraints", label: "Constraints", pts: 20,
    test: t => /\b(at most|no more than|under|maximum|max|limit|within|exactly|between)\b/i.test(t) || /\b\d+\s*(words?|hours?|hrs?|minutes?|mins?|bullets?|sentences?|items?|points?|steps?|rules?|paragraphs?)\b/i.test(t) || /\b(three|five|eight)\s+(short\s+)?(paragraphs?|bullets?|points?|rules?)\b/i.test(t),
    tip: "Add limits: a word count, a number of bullets, a time budget or a maximum." },
  { id: "format", label: "Output format", pts: 15,
    test: t => /\b(table|bullet|bullets|list|day-by-day|json|numbered|steps|paragraphs?|email|headings?|subject line|outline)\b/i.test(t),
    tip: "Say how the answer should look: a list, a table, an email, numbered steps." },
  { id: "facts", label: "Mission details", pts: 20, special: true },
  { id: "guard", label: "Honesty guardrail", pts: 10,
    test: t => /(if you (are|'re) (not sure|unsure)|if you need more|do not (make up|invent|guess|promise)|don't (make up|invent|guess|promise)|ask me|flag|verified?|sources?|say so)/i.test(t),
    tip: "Tell the AI what to do when unsure: say so, ask a question or flag claims to check." },
];

function wc(t) { return t.trim().split(/\s+/).filter(Boolean).length; }
const $ = id => document.getElementById(id);

let m = 0, best = [];

function evaluate(text, mission) {
  const out = [];
  CHECKS.forEach(c => {
    if (c.special) {
      const hits = mission.facts.map(r => r.test(text));
      const n = hits.filter(Boolean).length;
      const pts = Math.round(c.pts * n / mission.facts.length);
      const missing = mission.factTips.filter((_, i) => !hits[i]);
      out.push({ label: c.label, pts, max: c.pts, state: n === hits.length ? "ok" : n ? "part" : "miss",
        tip: n === hits.length ? "You covered every key detail." : missing.join(" ") });
    } else {
      const ok = c.test(text);
      out.push({ label: c.label, pts: ok ? c.pts : 0, max: c.pts, state: ok ? "ok" : "miss", tip: ok ? "Present." : c.tip });
    }
  });
  return out;
}

function show(id) { ["intro", "game", "end"].forEach(s => $(s).hidden = s !== id); window.scrollTo({ top: 0 }); }

function renderMission() {
  const x = MISSIONS[m];
  $("legLabel").textContent = "MISSION " + (m + 1) + " OF " + MISSIONS.length;
  $("tag").textContent = x.tag;
  $("title").textContent = x.title;
  $("brief").textContent = x.brief;
  $("goal").textContent = x.goal;
  $("prompt").value = "";
  $("count").textContent = "0 words";
  $("result").hidden = true;
  $("checkBtn").disabled = false;
  $("prompt").focus({ preventScroll: true });
}

function check() {
  const text = $("prompt").value.trim();
  if (wc(text) < 5) { $("count").textContent = "Write at least a sentence first."; $("prompt").focus(); return; }
  const x = MISSIONS[m];
  const res = evaluate(text, x);
  const score = res.reduce((s, r) => s + r.pts, 0);
  best[m] = Math.max(best[m] || 0, score);

  const sc = $("score"); sc.textContent = score;
  sc.parentElement.className = "score " + (score >= 85 ? "good" : score >= 60 ? "warn" : "bad");
  $("grade").textContent = score >= 85 ? "Cleared for take-off" : score >= 60 ? "Almost there" : "Back to the hangar";
  $("gradeText").textContent = score >= 85 ? "Strong structure. Compare it with the sample to see other ways to say it."
    : score >= 60 ? "Good start. Fix the missing items below and check again."
    : "The prompt is too vague for reliable results. Use the tips below.";

  const ul = $("checks"); ul.innerHTML = "";
  res.forEach(r => {
    const li = document.createElement("li"); li.className = r.state;
    const ic = document.createElement("span"); ic.className = "ic"; ic.textContent = r.state === "ok" ? "✓" : r.state === "part" ? "~" : "✗";
    const mid = document.createElement("div");
    const b = document.createElement("b"); b.textContent = r.label;
    const s = document.createElement("small"); s.textContent = r.tip;
    mid.append(b, s);
    const p = document.createElement("span"); p.className = "pts"; p.textContent = r.pts + "/" + r.max;
    li.append(ic, mid, p); ul.appendChild(li);
  });
  $("sample").textContent = x.sample;
  $("nextBtn").textContent = m === MISSIONS.length - 1 ? "Finish training →" : "Next mission →";
  $("result").hidden = false;
  $("result").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function finish() {
  const avg = Math.round(best.reduce((a, b) => a + (b || 0), 0) / MISSIONS.length);
  $("endTitle").textContent = avg >= 85 ? "Captain: precise prompter" : avg >= 65 ? "First Officer: solid prompter" : "Cadet: keep practicing";
  $("endText").textContent = "Average best score " + avg + "/100. " + (avg >= 85
    ? "You consistently give context, a clear task, limits and guardrails."
    : "Aim for all six elements in every prompt: context, task, constraints, format, key details and an honesty guardrail.");
  const log = $("log"); log.innerHTML = "";
  MISSIONS.forEach((x, i) => {
    const li = document.createElement("li");
    const mid = document.createElement("div");
    const b = document.createElement("b"); b.textContent = x.title;
    const sm = document.createElement("small"); sm.textContent = x.tag;
    mid.append(b, sm);
    const s = best[i] || 0;
    const res = document.createElement("span");
    res.className = "res " + (s >= 85 ? "great" : s >= 60 ? "ok" : "poor"); res.textContent = s + "/100";
    li.append(mid, res); log.appendChild(li);
  });
  show("end");
}

function start() { m = 0; best = []; show("game"); renderMission(); }

$("startBtn").addEventListener("click", start);
$("againBtn").addEventListener("click", start);
$("checkBtn").addEventListener("click", check);
$("retryBtn").addEventListener("click", () => { $("prompt").focus(); });
$("nextBtn").addEventListener("click", () => { if (m === MISSIONS.length - 1) finish(); else { m++; renderMission(); } });
$("prompt").addEventListener("input", e => { $("count").textContent = wc(e.target.value) + " words"; });
$("prompt").addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") check(); });
