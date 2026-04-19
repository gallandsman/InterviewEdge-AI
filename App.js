/**
 * InterviewEdge AI — Final MVP
 * ─────────────────────────────────────────────────────────────────
 * AI-Assisted Rapid Prototype
 * Built using Claude (Anthropic) as the primary development
 * co-pilot for design, logic, and code generation.
 * Human direction + AI execution = this product.
 * ─────────────────────────────────────────────────────────────────
 */

import { useState, useCallback, useRef, useEffect } from "react";

/* ─── Palette ─── */
const C = {
  lav50:"#F5F3FF", lav100:"#EDE9FE", lav300:"#C4B5FD",
  lav500:"#8B5CF6", lav700:"#6D28D9", lav900:"#3B0764",
  mint50:"#ECFDF5", mint200:"#A7F3D0", mint600:"#059669", mint900:"#064E3B",
  peach50:"#FFF1F2", peach200:"#FCA5A5", peach600:"#BE123C",
  amber50:"#FFFBEB", amber200:"#FCD34D", amber600:"#B45309",
  slate100:"#F1F5F9", slate200:"#E2E8F0", slate400:"#94A3B8",
  slate600:"#475569", slate900:"#0F172A",
  white:"#FFFFFF", bg:"#FAFAF9",
};

/* ─── Text Cleaner ─── */
function clean(t) {
  if (!t) return "";
  return t
    .replace(/--+/g, " ")
    .replace(/\[.*?\]/g, "")
    .replace(/^\s*[-•*]\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/* ─── Premium TTS ─── */
let _voices = [];
function refreshVoices() { _voices = window.speechSynthesis?.getVoices() || []; }
if (typeof window !== "undefined" && window.speechSynthesis) {
  refreshVoices();
  window.speechSynthesis.onvoiceschanged = refreshVoices;
}
function bestVoice() {
  if (!_voices.length) refreshVoices();
  const order = [
    v => v.name === "Samantha",
    v => v.name === "Karen",
    v => v.name === "Moira",
    v => v.name === "Google US English",
    v => v.name.includes("Google") && v.lang.startsWith("en"),
    v => v.name.includes("Natural") && v.lang.startsWith("en"),
    v => v.name.includes("Premium") && v.lang.startsWith("en"),
    v => v.lang === "en-US" && !v.name.toLowerCase().includes("compact"),
    v => v.lang.startsWith("en"),
  ];
  for (const t of order) { const m = _voices.find(t); if (m) return m; }
  return null;
}
const TTS = {
  speak(text, onStart, onEnd) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean(text));
    u.rate = 1.05; u.pitch = 1.0; u.volume = 1;
    const v = bestVoice(); if (v) u.voice = v;
    u.onstart = () => onStart?.();
    u.onend = () => onEnd?.();
    u.onerror = () => onEnd?.();
    window.speechSynthesis.speak(u);
  },
  stop() { window.speechSynthesis?.cancel(); },
};

/* ─── JD Analysis ─── */
function detectLevel(jd) {
  const t = jd.toLowerCase();
  const studentTerms = [
    "student","intern","internship","junior","jr.","jr ","entry level","entry-level",
    "entry_level","new grad","new graduate","recent graduate","recent grad",
    "undergraduate","university student","college student","co-op","coop",
    "bootcamp","no experience required","0-1 year","0-2 year","1-2 year",
    "learning opportunity","mentorship provided","early career","associate program",
    "graduate program","apprentice",
  ];
  if (studentTerms.some(k => t.includes(k))) return "student";
  const leadTerms = ["principal","staff engineer","head of","director","vp of","vice president","10+ years","8+ years","manage a team","c-suite","executive","general manager"];
  if (leadTerms.some(k => t.includes(k))) return "lead";
  const seniorTerms = ["senior","sr.","sr ","5+ years","4+ years","3+ years","architect","technical lead","subject matter expert"];
  if (seniorTerms.some(k => t.includes(k))) return "senior";
  if (["mid-level","mid level","3 years","2+ years"].some(k => t.includes(k))) return "mid";
  return "mid";
}
function extractDomains(jd) {
  const map = {
    product:["product manager","roadmap","user story","sprint","backlog","north star","go-to-market","product strategy"],
    engineering:["engineer","developer","architecture","system design","backend","frontend","full-stack","deployment"],
    data:["data analyst","data scientist","sql","python","machine learning","analytics","dashboard","pipeline"],
    design:["ux designer","ui designer","figma","prototype","usability","design system","wireframe"],
    marketing:["marketing","growth","campaign","seo","brand","acquisition","conversion","funnel"],
    finance:["finance","financial","revenue","p&l","budget","forecast","valuation"],
    operations:["operations","process improvement","supply chain","logistics","workflow"],
    sales:["sales","quota","pipeline","crm","enterprise","account executive","closing"],
  };
  const text = jd.toLowerCase();
  return Object.entries(map)
    .map(([d, kws]) => ({ d, hits: kws.filter(k => text.includes(k)).length }))
    .filter(x => x.hits > 0).sort((a,b) => b.hits - a.hits)
    .slice(0,2).map(x => x.d);
}

const INTRO_BY_LEVEL = {
  student: `Hey! I am Alex, your interview coach for today. This looks like a wonderful opportunity to kick off your career. Before we dive in, tell me a bit about yourself, what you are working on or studying, and what excites you most about this role.`,
  mid:     `Hey! I am Alex, your interview coach for today. Great to meet you. Before we get into the role-specific questions, give me the overview. Tell me who you are professionally, where you have been, and what genuinely excites you about this opportunity.`,
  senior:  `Hey! I am Alex, your interview coach for today. This is clearly a senior-level role that needs real depth. Before we get into the substance, give me the high-level view. Tell me about your career arc, what you are best known for, and what drew you to this position.`,
  lead:    `Hey! I am Alex, your interview coach for today. This is a leadership-level position and I want to understand how you think about people, systems, and strategy. Start by telling me about yourself, your leadership journey, and why this role caught your attention.`,
};
INTRO_BY_LEVEL.junior = INTRO_BY_LEVEL.student;

const Q_BANK = {
  student: {
    general:[
      "Tell me about a project you worked on, in school, online, or on your own. What problem were you solving and how did you approach it?",
      "Describe a time you had to learn something completely new under pressure. What was your process?",
      "What is one thing you have built or contributed to that you are genuinely proud of, and why?",
      "Walk me through how you would tackle a problem you have never seen before. Where do you start?",
      "Tell me about a time you received tough feedback. How did you respond to it?",
    ],
    product:["Walk me through a product or app you use every day. What would you change about it and why?","If you could improve the sign-up experience of any app you love, what would you do first?","How would you figure out what users actually want before building anything?"],
    engineering:["Walk me through a technical project you have built. What decisions did you make along the way?","Describe a bug you spent a long time tracking down. How did you finally find it?","How do you approach picking up a new programming language or framework?"],
    data:["Describe a time you used data to answer a question or support a decision, in any context.","Walk me through a data project or analysis you have worked on. What did you find?","If a metric you cared about suddenly dropped, how would you start investigating why?"],
    design:["Describe something you have designed. Walk me through your process from problem to solution.","Tell me about a time feedback changed the direction of your design. How did you respond?","What is a piece of UX in an app you use that frustrates you, and how would you fix it?"],
    marketing:["Tell me about a piece of content or a campaign you contributed to. What worked and what did not?","How would you approach understanding a new audience you have never marketed to before?","Walk me through how you would write a social post to launch a new product feature."],
  },
  mid: {
    general:[
      "Describe a high-impact project you owned. What was your strategy and how did you drive results?",
      "Give me an example of influencing a key decision without direct authority. What was your approach?",
      "Tell me about a time something you owned failed. What did you do and what did you actually learn?",
      "How do you prioritize when everything feels critical and resources are limited?",
      "Describe a time you had to deliver difficult feedback to someone. How did you handle it?",
    ],
    product:["Walk me through how you built and prioritized a product roadmap. What trade-offs did you make?","Describe how you worked across engineering and design to ship a feature under real constraints.","Tell me about a time metrics told a different story than your intuition. What did you do?"],
    engineering:["Describe a technically complex problem you solved. Walk me through your approach and the trade-offs.","Tell me about a system you designed. What would you do differently with hindsight?","How do you make architecture decisions when facing uncertainty or unclear requirements?"],
    data:["Describe a complex analysis that led to a real business decision. What was your method?","Tell me about a time you had to push back on a flawed metric or data interpretation.","Walk me through how you built a data product or report that stakeholders actually used."],
    design:["Describe a design you led that spanned multiple product areas. How did you drive alignment?","Tell me about a time a usability study significantly changed the direction of your work.","How do you measure the success of a design after it ships?"],
    marketing:["Describe a campaign or channel strategy you owned. What worked and what did not?","How would you approach launching a product into a market you are unfamiliar with?","Tell me about a time you used data to improve messaging or targeting."],
    sales:["Walk me through a deal you owned from prospecting to close. What made the difference?","Describe a time you lost a deal. What did you learn and what would you change?","How do you build trust with a skeptical enterprise buyer?"],
    operations:["Describe a process you redesigned that had measurable business impact.","Tell me about a time you drove change in how a team operates. What was the resistance?","How do you balance short-term operational fires with long-term structural improvements?"],
  },
  senior: {
    general:[
      "Tell me about the highest-leverage project of your career. What made it hard and why did it matter?",
      "Describe a time you changed the strategic direction of a team or product based on your conviction. How did you build the case?",
      "How do you operate in ambiguous, high-stakes environments? Give me a specific example where the path was not clear.",
      "Tell me about a time you had to lead through significant organizational change. What was your role?",
    ],
    product:["Tell me about a time you shaped a multi-quarter product strategy and got organizational buy-in for it.","Describe how you handled a situation where user data and business goals pointed in opposite directions.","Walk me through how you built and scaled a discovery process on a team that did not have one."],
    engineering:["Describe an architecture decision you made that had long-term implications across the org.","Tell me about a time you had to rebuild or modernize a critical system without disrupting production.","How do you approach technical debt at scale? What is your framework for deciding when to address it?"],
    data:["Tell me about a time you built a measurement framework or data culture from scratch. What was the impact?","Describe a situation where your analysis was contested by leadership. How did you handle it?","Walk me through how you connected data infrastructure to real business outcomes at scale."],
    design:["Describe how you led design strategy across multiple product areas. How did you ensure coherence?","Tell me about a time you redesigned a core experience that users were deeply habituated to.","How do you build the business case for investing in design quality when the business is pushing for speed?"],
    marketing:["Describe how you built or scaled a marketing channel from near-zero to meaningful contribution.","Tell me about a go-to-market strategy you designed. What were the key bets and how did they play out?","How have you used data to evolve brand positioning in a competitive market?"],
    finance:["Describe a financial model or analysis that influenced a significant business decision.","Tell me about a time you identified a risk in a financial plan that others had missed.","How do you communicate complex financial analysis to non-finance stakeholders?"],
  },
  lead: {
    general:[
      "Tell me about a team you built or transformed. What was the before, the after, and how did you get there?",
      "Describe a high-stakes organizational decision you had to make with incomplete information.",
      "How do you build a culture of accountability without creating fear on your team?",
      "Tell me about a time you had to let someone go. How did you handle it and what did you learn?",
    ],
    product:["How have you aligned product vision with company strategy at an executive or cross-org level?","Describe how you built and scaled a product organization. What did you get right and what would you change?","Tell me about a time you had to kill a product or major initiative. How did you make the call?"],
    engineering:["Describe your philosophy on engineering org design and how you have put it into practice.","Tell me about a major technical transformation you drove, such as a platform migration or re-architecture.","How do you balance platform investment versus product feature work at an org level?"],
    data:["Describe how you built a data-driven culture across an organization that was not one before.","Tell me about a strategic decision you influenced at the executive level using data and analysis.","How do you build and lead a high-performing data team in a resource-constrained environment?"],
    design:["Describe how you built or led a design organization. What is your leadership philosophy?","Tell me about a time you shaped company strategy through design thinking at an executive level.","How do you advocate for and measure the business value of design at the board or exec level?"],
    operations:["Describe a company-wide operational transformation you led. What made it succeed?","Tell me about how you built systems and processes that scale as a company grows rapidly.","How do you drive alignment and accountability across functions when you do not control all the resources?"],
  },
};
Q_BANK.junior = Q_BANK.student;

function buildSession(jd) {
  const level = detectLevel(jd);
  const domains = extractDomains(jd);
  const introKey = (level === "student" || level === "junior") ? "student" : level;
  const intro = clean(INTRO_BY_LEVEL[introKey] || INTRO_BY_LEVEL.mid);
  const bankKey = (level === "student" || level === "junior") ? "student" : (Q_BANK[level] ? level : "mid");
  const bank = Q_BANK[bankKey];
  const domainPool = (domains[0] && bank[domains[0]]) ? bank[domains[0]] : [];
  const generalPool = bank.general || [];
  const shuffle = a => [...a].sort(() => Math.random() - 0.5);
  let qs = domainPool.length >= 2
    ? [shuffle(domainPool)[0], shuffle(domainPool)[1], shuffle(generalPool)[0]]
    : shuffle(generalPool).slice(0, 3);
  while (qs.length < 3) qs.push(generalPool[qs.length % generalPool.length] || "Tell me about a challenge you faced and how you handled it.");
  return { level, domains, intro, questions: qs.map(clean) };
}

const LEVEL_LABEL = { student:"Student / Intern", junior:"Junior", mid:"Mid-level", senior:"Senior", lead:"Lead / Director" };
const LEVEL_COLOR = { student:C.mint600, junior:C.lav500, mid:C.amber600, senior:C.peach600, lead:C.lav900 };

const STRONG_KW = ["i led","i built","i drove","i created","i designed","i launched","the impact was","we shipped","i owned","i increased","i reduced","i improved","i defined","i delivered","the result","we achieved","i implemented","i decided","my approach","i chose","the outcome","i proposed","i negotiated","i prioritized","i scaled","i managed","i mentored"];
const WEAK_KW = ["i think maybe","i'm not sure","i guess","kind of","sort of","i don't know","probably","might be","i feel like","hopefully","i tried to","i attempted","not really","a little bit","i'm unsure","we kind of","it was okay","i just","nothing really","i didn't really","i suppose"];

function isGibberish(t) {
  const s = t.trim();
  if (s.length < 20) return true;
  const w = s.split(/\s+/);
  if (w.length < 4) return true;
  if (w.filter(x => x.length > 2).length / w.length < 0.4) return true;
  if (new Set(s.toLowerCase().replace(/\s/g,"")).size < 6) return true;
  return false;
}

/* Quality tiers used for honest scoring */
function qualityTier(allAnswers) {
  // allAnswers: array of raw answer strings (including intro)
  const totalChars = allAnswers.reduce((s, a) => s + a.trim().length, 0);
  const totalWords = allAnswers.reduce((s, a) => s + a.trim().split(/\s+/).filter(Boolean).length, 0);
  const emptyCount = allAnswers.filter(a => isGibberish(a)).length;
  // If ALL answers are empty/gibberish → zero tier
  if (emptyCount === allAnswers.length) return "none";
  // If majority are empty → terrible
  if (emptyCount >= allAnswers.length - 1) return "terrible";
  // Under 40 total words → very thin
  if (totalWords < 40) return "thin";
  // Under 100 words → weak
  if (totalWords < 100) return "weak";
  // Under 220 words → fair
  if (totalWords < 220) return "fair";
  // Under 400 words → decent
  if (totalWords < 400) return "decent";
  return "strong";
}

function analyze(t) {
  const s = t.trim();
  if (!s || isGibberish(s)) {
    return { strong: [], weak: [], conf: 0, words: 0, empty: true };
  }
  const l = s.toLowerCase(), w = l.split(/\s+/).filter(Boolean).length;
  const fs = STRONG_KW.filter(k => l.includes(k));
  const fw = WEAK_KW.filter(k => l.includes(k));
  // Honest conf: start at 3 (not 5) and scale up only with evidence
  // Cap base at 7; need strong keywords + word count to reach 8-10
  let c = 3;
  c += Math.min(4, fs.length * 0.9);        // up to +4 for power phrases
  c -= Math.min(2, fw.length * 0.8);        // down for hedging
  c += w > 150 ? 1.5 : w > 80 ? 0.8 : 0;  // depth bonus
  c = Math.min(10, Math.max(1, Math.round(c)));
  return { strong: fs, weak: fw, conf: c, words: w, empty: false };
}
function fv() { return { tone: Math.round(60 + Math.random() * 35), conf: Math.round(55 + Math.random() * 40), clar: Math.round(65 + Math.random() * 30) }; }
function bCol(v) { return v >= 75 ? C.mint600 : v >= 50 ? C.lav500 : "#F59E0B"; }

/* ═══════════════════════════════════════════════════════════════
   ALEX — Polished Female Tech Coach
   Clean premium flat illustration. Warm medium skin, straight
   dark-brown shoulder-length hair with a clean side part,
   slim rectangular dark frames, lavender blazer, confident smile.
═══════════════════════════════════════════════════════════════ */
function CoachAlex({ mood = "idle", speaking = false, size = 120 }) {
  const SKIN   = "#E8A87C";
  const SKIN_S = "#D4895C";
  const SKIN_L = "#F0BB96";
  const HAIR   = "#2C1A0E";
  const HAIR_H = "#4A2E14";
  const LIP    = "#C0586A";
  const EYE    = "#1C1008";
  const BLAZE  = "#7C3AED";
  const BLAZE_D= "#5B21B6";
  const SHIRT  = "#EDE9FE";

  // Brow shapes per mood
  const lBrow = mood === "curious" ? "M21 31 Q27 26 33 30"
              : mood === "warn"    ? "M22 32 Q27 27 32 32"
              :                     "M21 32 Q27 29 33 32";
  const rBrow = mood === "curious" ? "M37 30 Q43 26 49 31"
              : mood === "warn"    ? "M38 32 Q43 27 48 32"
              :                     "M37 32 Q43 29 49 32";

  // Mouth shapes
  const mouthPath = speaking       ? null
    : mood === "happy" || mood === "grad" ? "M26 51 Q35 60 44 51"
    : mood === "warn"                     ? "M27 54 Q35 49 43 54"
    : mood === "curious"                  ? "M27 51 Q35 56 43 51"
    :                                       "M27 51 Q35 55 43 51";

  return (
    <svg width={size} height={size} viewBox="0 0 80 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      <style>{`
        @keyframes af  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        @keyframes ar  { 0%,100%{opacity:.4} 50%{opacity:.1} }
        @keyframes ab  { 0%,88%,100%{transform:scaleY(1)} 93%{transform:scaleY(.07)} }
        @keyframes asp { 0%,100%{transform:scaleY(1)} 35%{transform:scaleY(1.4)} 70%{transform:scaleY(.7)} }
        .ag  { animation: af 3.4s ease-in-out infinite; }
        .ael { animation: ab 5s 0.4s ease-in-out infinite; transform-origin: 28px 39px; }
        .aer { animation: ab 5s 0.4s ease-in-out infinite; transform-origin: 46px 39px; }
        .asp { animation: asp .42s ease-in-out infinite; transform-origin: 35px 53px; }
      `}</style>

      {/* Speaking pulse ring */}
      {speaking && (
        <circle cx="40" cy="42" r="37" fill="none" stroke={C.lav300} strokeWidth="2"
          style={{animation:"ar .55s ease-in-out infinite"}}/>
      )}

      <g className="ag">

        {/* ── Laptop base ── */}
        <rect x="5" y="82" width="70" height="24" rx="5" fill="#CBD5E1"/>
        <rect x="8" y="85" width="64" height="18" rx="3" fill="#1E293B"/>
        {/* screen lines */}
        <rect x="12" y="89" width="28" height="2" rx="1" fill={C.lav300} opacity=".8"/>
        <rect x="12" y="93" width="18" height="2" rx="1" fill={C.mint200} opacity=".7"/>
        <rect x="12" y="97" width="22" height="2" rx="1" fill={C.lav300} opacity=".5"/>
        {/* blinking cursor */}
        <rect x="42" y="89" width="1.6" height="10" rx=".8" fill={C.lav500} opacity=".9"/>
        <rect x="5" y="80" width="70" height="4" rx="2" fill="#94A3B8"/>

        {/* ── Arms ── */}
        <path d="M14 72 Q10 78 12 83" stroke={SKIN} strokeWidth="8" strokeLinecap="round" fill="none"/>
        <path d="M66 72 Q70 78 68 83" stroke={SKIN} strokeWidth="8" strokeLinecap="round" fill="none"/>
        {/* cuffs */}
        <rect x="7"  y="81" width="11" height="4" rx="2" fill={BLAZE}/>
        <rect x="62" y="81" width="11" height="4" rx="2" fill={BLAZE}/>
        {/* hands */}
        <ellipse cx="13" cy="83.5" rx="6" ry="3.5" fill={SKIN}/>
        <ellipse cx="67" cy="83.5" rx="6" ry="3.5" fill={SKIN}/>

        {/* ── Blazer body ── */}
        <path d="M17 63 Q17 58 22 57 L40 57 L58 57 Q63 58 63 63 L63 88 Q40 92 17 88 Z" fill={BLAZE}/>
        {/* lapels */}
        <path d="M22 57 L32 65 L40 57 Z" fill={BLAZE_D}/>
        <path d="M58 57 L48 65 L40 57 Z" fill={BLAZE_D}/>
        {/* shirt under */}
        <path d="M32 65 L40 74 L48 65 Q44 60 40 60 Q36 60 32 65 Z" fill={SHIRT}/>
        {/* blazer buttons */}
        <circle cx="40" cy="77" r="1.5" fill={BLAZE_D}/>
        <circle cx="40" cy="82" r="1.5" fill={BLAZE_D}/>

        {/* ── Neck ── */}
        <path d="M33 57 Q33 50 40 50 Q47 50 47 57 Z" fill={SKIN}/>

        {/* ── Head ── */}
        <ellipse cx="40" cy="38" rx="22" ry="21" fill={SKIN_L}/>

        {/* ── Ears ── */}
        <ellipse cx="18.5" cy="38" rx="3.5" ry="5.5" fill={SKIN}/>
        <ellipse cx="18.5" cy="38" rx="2"   ry="3.5" fill={SKIN_S}/>
        <ellipse cx="61.5" cy="38" rx="3.5" ry="5.5" fill={SKIN}/>
        <ellipse cx="61.5" cy="38" rx="2"   ry="3.5" fill={SKIN_S}/>
        {/* gold stud earrings */}
        <circle cx="18.5" cy="44" r="2" fill="#F59E0B"/>
        <circle cx="61.5" cy="44" r="2" fill="#F59E0B"/>

        {/* ── Hair — straight, shoulder-length, side-parted ──
             Rendered back-to-front: back volume first, then sides, then top */}
        {/* back / behind-shoulder volume */}
        <path d="M18 28 Q12 36 13 60 Q16 66 20 65 Q16 50 19 35 Z" fill={HAIR}/>
        <path d="M62 28 Q68 36 67 60 Q64 66 60 65 Q64 50 61 35 Z" fill={HAIR}/>
        {/* main hair cap */}
        <path d="M18 22 Q22 10 40 10 Q58 10 62 22 Q62 35 59 38 Q50 18 40 18 Q30 18 21 38 Q18 35 18 22 Z" fill={HAIR}/>
        {/* side fill so hair hugs head */}
        <path d="M18 22 Q17 30 18 38 Q20 28 21 38 Q20 26 20 22 Z" fill={HAIR}/>
        <path d="M62 22 Q63 30 62 38 Q60 28 59 38 Q60 26 60 22 Z" fill={HAIR}/>
        {/* centre part line — subtle highlight */}
        <path d="M38 10 Q40 12 42 10" stroke={HAIR_H} strokeWidth="1.2" fill="none" strokeLinecap="round"/>
        {/* side-part sweep */}
        <path d="M22 14 Q30 11 40 12" stroke={HAIR_H} strokeWidth="1.5" fill="none" strokeLinecap="round"/>

        {/* Grad cap */}
        {mood === "grad" && <>
          <rect x="21" y="9" width="38" height="5" rx="2" fill="#1E293B"/>
          <polygon points="40,1 60,9 40,12 20,9" fill="#1E293B"/>
          <line x1="60" y1="9" x2="63" y2="16" stroke={C.amber200} strokeWidth="2" strokeLinecap="round"/>
          <circle cx="63" cy="17.5" r="2.5" fill={C.amber200}/>
        </>}

        {/* ── Glasses — slim rectangular dark frames ── */}
        {/* left lens */}
        <rect x="19" y="33" width="16" height="10" rx="3.5" fill="none" stroke="#111827" strokeWidth="2"/>
        {/* right lens */}
        <rect x="38" y="33" width="16" height="10" rx="3.5" fill="none" stroke="#111827" strokeWidth="2"/>
        {/* bridge */}
        <line x1="35" y1="38" x2="38" y2="38" stroke="#111827" strokeWidth="1.8"/>
        {/* temple arms */}
        <line x1="19" y1="38" x2="14" y2="37" stroke="#111827" strokeWidth="1.6" strokeLinecap="round"/>
        <line x1="54" y1="38" x2="59" y2="37" stroke="#111827" strokeWidth="1.6" strokeLinecap="round"/>
        {/* very subtle lens tint */}
        <rect x="20" y="34" width="14" height="8" rx="2.5" fill="#111827" opacity=".04"/>
        <rect x="39" y="34" width="14" height="8" rx="2.5" fill="#111827" opacity=".04"/>

        {/* ── Eyebrows ── */}
        <path d={lBrow} stroke={HAIR} strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d={rBrow} stroke={HAIR} strokeWidth="2" strokeLinecap="round" fill="none"/>

        {/* ── Eyes ── */}
        <g className="ael">
          <ellipse cx="27" cy="39" rx="4"   ry="4.5" fill="white"/>
          <circle  cx="27.8" cy="39.5" r="2.8" fill={EYE}/>
          <circle  cx="28.8" cy="38.4" r="1.1" fill="white"/>
        </g>
        <g className="aer">
          <ellipse cx="46" cy="39" rx="4"   ry="4.5" fill="white"/>
          <circle  cx="46.8" cy="39.5" r="2.8" fill={EYE}/>
          <circle  cx="47.8" cy="38.4" r="1.1" fill="white"/>
        </g>

        {/* ── Nose — clean minimal ── */}
        <path d="M38 44 Q39.5 47.5 41 47.5 Q42.5 47.5 44 44"
          stroke={SKIN_S} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity=".55"/>

        {/* ── Blush ── */}
        <ellipse cx="21" cy="45" rx="5.5" ry="3.5" fill="#E8896A" opacity=".28"/>
        <ellipse cx="59" cy="45" rx="5.5" ry="3.5" fill="#E8896A" opacity=".28"/>

        {/* ── Mouth / lip ── */}
        {speaking ? (
          <g className="asp">
            <path d="M26 51 Q35 61 44 51" stroke={LIP} strokeWidth="1.6" fill="none" strokeLinecap="round"/>
            <path d="M26 51 Q35 61 44 51 Q35 54 26 51 Z" fill={LIP} opacity=".55"/>
            <path d="M28 52 Q35 57 42 52 Q35 53.5 28 52 Z" fill="white" opacity=".75"/>
          </g>
        ) : (
          <>
            {/* upper lip subtle shape */}
            <path d="M28 50 Q31 48 35 50 Q39 48 42 50" stroke={LIP} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity=".6"/>
            {/* main smile/mouth */}
            <path d={mouthPath} stroke={LIP} strokeWidth="2.2" fill="none" strokeLinecap="round"/>
          </>
        )}

        {/* ── Code badge ── */}
        <g transform="translate(54,1)">
          <rect width="24" height="14" rx="4" fill={C.lav100} stroke={C.lav300} strokeWidth=".8"/>
          <text x="3" y="10" fontSize="7" fill={C.lav700} fontFamily="monospace" fontWeight="700">{"{ }"}</text>
          <circle cx="20" cy="4" r="3"   fill={C.mint200}/>
          <circle cx="20" cy="4" r="1.5" fill={C.mint600}/>
        </g>

      </g>
    </svg>
  );
}

/* ─── Sound wave ─── */
function SoundWave({ active }) {
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
      <style>{`@keyframes sw{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.2)}}`}</style>
      {[{x:1,d:0},{x:5.5,d:.1},{x:10,d:.2}].map(({x,d}) => (
        <rect key={x} x={x} y="1" width="2.5" height="12" rx="1.25" fill="currentColor"
          style={active?{animation:`sw .6s ${d}s ease-in-out infinite`,transformOrigin:`${x+1.25}px 7px`}:{opacity:.3}}/>
      ))}
    </svg>
  );
}

/* ─── Micro UI ─── */
function Tag({ children, v = "p" }) {
  const m = { g:{bg:C.mint50,c:C.mint900,b:C.mint200}, a:{bg:C.amber50,c:C.amber600,b:C.amber200}, p:{bg:C.lav50,c:C.lav900,b:C.lav300} };
  return <span style={{fontSize:12,padding:"4px 12px",borderRadius:20,background:m[v].bg,color:m[v].c,border:`1px solid ${m[v].b}`,fontWeight:500}}>{children}</span>;
}
function Chip({ children, t }) {
  return <span style={{fontSize:11,padding:"2px 9px",borderRadius:20,fontWeight:500,background:t==="s"?C.mint50:C.amber50,color:t==="s"?C.mint600:C.amber600,border:`1px solid ${t==="s"?C.mint200:C.amber200}`}}>{children}</span>;
}
function VBar({ label, pct, color }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
      <span style={{fontSize:12,color:C.amber600,width:72,minWidth:72}}>{label}</span>
      <div style={{flex:1,height:6,background:"#FEE2CF",borderRadius:3,overflow:"hidden"}}>
        <div style={{width:`${pct}%`,height:"100%",borderRadius:3,background:color,transition:"width .6s ease"}}/>
      </div>
      <span style={{fontSize:12,fontWeight:600,width:32,textAlign:"right",color:C.amber600}}>{pct}%</span>
    </div>
  );
}
function PlayBtn({ onClick, playing }) {
  return (
    <button onClick={onClick} style={{display:"inline-flex",alignItems:"center",gap:5,background:playing?C.lav100:"transparent",border:`1px solid ${C.lav300}`,borderRadius:20,padding:"3px 11px",cursor:"pointer",fontSize:11,fontWeight:500,color:C.lav700,transition:"all .2s"}}>
      <SoundWave active={playing}/>
      {playing ? "Speaking..." : "Play audio"}
    </button>
  );
}

/* ─── Chat bubbles ─── */
function CoachBub({ text, mood="curious", speaking, onPlay, playing }) {
  return (
    <div style={{display:"flex",gap:12,alignItems:"flex-end"}}>
      <div style={{background:C.lav100,borderRadius:"50%",padding:7,border:`1.5px solid ${C.lav300}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <CoachAlex mood={mood} speaking={speaking} size={76}/>
      </div>
      <div style={{maxWidth:"78%"}}>
        <div style={{fontSize:10,fontWeight:700,color:C.lav500,marginBottom:4,textTransform:"uppercase",letterSpacing:".06em"}}>Alex</div>
        <div style={{padding:"12px 16px",background:C.lav50,borderRadius:18,borderBottomLeftRadius:3,border:`1px solid ${C.lav300}`,fontSize:14,color:C.lav900,lineHeight:1.75}}>{clean(text)}</div>
        <div style={{marginTop:5}}><PlayBtn onClick={onPlay} playing={playing}/></div>
      </div>
    </div>
  );
}
function UserBub({ text }) {
  const an = analyze(text);
  return (
    <div style={{display:"flex",gap:10,alignItems:"flex-end",flexDirection:"row-reverse"}}>
      <div style={{width:36,height:36,borderRadius:"50%",background:C.mint50,border:`1.5px solid ${C.mint200}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:C.mint600,flexShrink:0}}>Me</div>
      <div style={{maxWidth:"78%"}}>
        <div style={{padding:"12px 16px",background:C.mint50,borderRadius:18,borderBottomRightRadius:3,border:`1px solid ${C.mint200}`,fontSize:14,color:C.mint900,lineHeight:1.75}}>{clean(text)}</div>
        {(an.strong.length>0||an.weak.length>0)&&(
          <div style={{marginTop:6,display:"flex",flexWrap:"wrap",gap:4}}>
            {an.strong.slice(0,3).map(k=><Chip key={k} t="s">{k}</Chip>)}
            {an.weak.slice(0,2).map(k=><Chip key={k} t="w">{k}</Chip>)}
          </div>
        )}
      </div>
    </div>
  );
}
function WarnBub({ onPlay, playing, speaking }) {
  return (
    <div style={{display:"flex",gap:12,alignItems:"flex-end"}}>
      <div style={{background:C.peach50,borderRadius:"50%",padding:7,border:`1.5px solid ${C.peach200}`,flexShrink:0}}>
        <CoachAlex mood="warn" speaking={speaking} size={76}/>
      </div>
      <div style={{maxWidth:"78%"}}>
        <div style={{fontSize:10,fontWeight:700,color:C.peach600,marginBottom:4,textTransform:"uppercase",letterSpacing:".06em"}}>Alex</div>
        <div style={{padding:"12px 16px",background:C.peach50,borderRadius:18,borderBottomLeftRadius:3,border:`1px solid ${C.peach200}`,fontSize:14,color:"#7F1D1D",lineHeight:1.75}}>
          Hey, I did not quite catch that. Can you give me a more detailed answer? I need real substance here to give you honest, useful feedback.
        </div>
        <div style={{marginTop:5}}><PlayBtn onClick={onPlay} playing={playing}/></div>
      </div>
    </div>
  );
}
function Typing() {
  return (
    <div style={{display:"flex",gap:12,alignItems:"flex-end"}}>
      <div style={{background:C.lav100,borderRadius:"50%",padding:7,border:`1.5px solid ${C.lav300}`,flexShrink:0}}>
        <CoachAlex mood="curious" size={76}/>
      </div>
      <div style={{padding:"14px 18px",background:C.lav50,borderRadius:18,borderBottomLeftRadius:3,border:`1px solid ${C.lav300}`}}>
        <style>{`@keyframes bob{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>
        {[0,.15,.3].map((d,i)=><span key={i} style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:C.lav500,margin:"0 2px",animation:`bob 1s ${d}s infinite`}}/>)}
      </div>
    </div>
  );
}

/* ─── Setup Screen ─── */
function Setup({ jd, setJd, onStart, analyzing }) {
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    if (jd.trim().length < 25) { setPreview(null); return; }
    const t = setTimeout(() => setPreview({ level: detectLevel(jd), domains: extractDomains(jd) }), 400);
    return () => clearTimeout(t);
  }, [jd]);

  return (
    <div style={{background:C.white,borderRadius:24,border:`1px solid ${C.slate200}`,padding:28,boxShadow:"0 4px 32px rgba(139,92,246,.08)"}}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:24}}>
        <div style={{background:C.lav100,borderRadius:"50%",padding:18,marginBottom:12,border:`2px solid ${C.lav300}`}}>
          <CoachAlex mood="happy" size={132}/>
        </div>
        <div style={{fontSize:22,fontWeight:700,color:C.lav900,marginBottom:4}}>Meet Alex</div>
        <div style={{fontSize:13,color:C.slate400,textAlign:"center",maxWidth:300}}>Your AI interview coach. Friendly, direct, and no sugar-coating.</div>
        <div style={{marginTop:10,fontSize:11,color:C.slate400,background:C.slate100,padding:"4px 12px",borderRadius:20,border:`1px solid ${C.slate200}`}}>
          AI-assisted rapid prototype
        </div>
      </div>

      <div style={{background:C.lav50,borderRadius:16,padding:"14px 18px",border:`1px solid ${C.lav300}`,marginBottom:20}}>
        <div style={{fontSize:10,fontWeight:700,color:C.lav500,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>From Alex</div>
        <p style={{fontSize:14,color:C.lav900,lineHeight:1.75,margin:0}}>
          Ready to practice? Paste the job description below. I'll analyze the requirements and walk you through a realistic interview simulation, including a brief intro and three specific questions. I'll provide honest feedback at the end.
        </p>
      </div>

      <label style={{fontSize:11,fontWeight:700,color:C.slate600,display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:".05em"}}>Job Description</label>
      <textarea
        value={jd} onChange={e => setJd(e.target.value)}
        placeholder="Paste any job description here..."
        style={{width:"100%",minHeight:130,padding:"12px 14px",border:`1.5px solid ${jd.length>25?C.lav300:C.slate200}`,borderRadius:14,fontFamily:"inherit",fontSize:14,color:C.slate900,background:C.white,resize:"vertical",lineHeight:1.6,outline:"none",transition:"border-color .2s",boxSizing:"border-box"}}
      />

      {preview && (
        <div style={{marginTop:10,padding:"10px 14px",background:C.lav50,borderRadius:12,border:`1px solid ${C.lav300}`,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <span style={{fontSize:12,color:C.slate600,fontWeight:500}}>Detected:</span>
          <span style={{fontSize:12,fontWeight:700,color:LEVEL_COLOR[preview.level]||C.lav500,background:C.white,padding:"2px 10px",borderRadius:20,border:`1px solid ${C.lav300}`}}>{LEVEL_LABEL[preview.level]||"Mid-level"}</span>
          {preview.domains.map(d=><span key={d} style={{fontSize:12,fontWeight:500,color:C.slate600,background:C.white,padding:"2px 10px",borderRadius:20,border:`1px solid ${C.slate200}`}}>{d.charAt(0).toUpperCase()+d.slice(1)}</span>)}
        </div>
      )}

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:12}}>
        <span style={{fontSize:12,color:C.slate400}}>{jd.length} chars</span>
        <button onClick={onStart} disabled={jd.trim().length<20||analyzing}
          style={{display:"inline-flex",alignItems:"center",gap:8,background:jd.trim().length<20?C.slate200:C.lav500,color:jd.trim().length<20?C.slate400:C.white,border:"none",borderRadius:50,padding:"11px 26px",fontSize:14,fontWeight:600,cursor:jd.trim().length<20?"not-allowed":"pointer",transition:"all .2s"}}>
          {analyzing ? "Analyzing role..." : "Begin interview"}
          {!analyzing && <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M5 3l6 5-6 5V3z"/></svg>}
        </button>
      </div>
    </div>
  );
}

/* ─── Interview Screen ─── */
function Interview({ st, onSubmit, onMic }) {
  const { level, domains, stage, questions, answers, introText, introAnswer, cur, typing, micActive, vaScores, answerDraft, setAnswerDraft, warnVisible, speakingBub, onPlayBub } = st;
  const totalPips = 1 + questions.length;
  const filledPips = stage === "intro" ? 0 : cur + 1;
  const curKey = stage === "intro" ? "intro_cur" : `q${cur}_cur`;

  const history = [];
  if (introAnswer) {
    history.push({ type:"coach", text:introText, key:"intro_h", mood:"happy" });
    history.push({ type:"user", text:introAnswer });
  }
  answers.forEach((a,i) => {
    history.push({ type:"coach", text:questions[i], key:`q${i}_h`, mood:"curious" });
    history.push({ type:"user", text:a });
  });

  return (
    <div>
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",gap:5}}>
          {Array.from({length:totalPips}).map((_,i)=>(
            <div key={i} style={{height:4,flex:1,borderRadius:2,background:i<filledPips?C.mint600:i===filledPips?C.lav500:C.slate200,transition:"background .3s"}}/>
          ))}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6}}>
          <span style={{fontSize:11,fontWeight:600,color:LEVEL_COLOR[level]||C.lav500,background:C.lav50,padding:"2px 9px",borderRadius:20,border:`1px solid ${C.lav300}`}}>
            {LEVEL_LABEL[level]||"Mid-level"}{domains.length>0?` · ${domains[0].charAt(0).toUpperCase()+domains[0].slice(1)}`:""}
          </span>
          <span style={{fontSize:11,color:C.slate400}}>
            {stage==="intro" ? `Warm-up · 1 of ${totalPips}` : `Question ${cur+2} of ${totalPips}`}
          </span>
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:14}}>
        {history.map((m,i) =>
          m.type==="coach"
            ? <CoachBub key={i} text={m.text} mood={m.mood} speaking={speakingBub===m.key} playing={speakingBub===m.key} onPlay={() => onPlayBub(m.key, m.text)}/>
            : <UserBub key={i} text={m.text}/>
        )}
        {typing && <Typing/>}
        {!typing && <>
          <CoachBub text={stage==="intro"?introText:questions[cur]} mood={stage==="intro"?"happy":"curious"}
            speaking={speakingBub===curKey} playing={speakingBub===curKey}
            onPlay={() => onPlayBub(curKey, stage==="intro"?introText:questions[cur])}/>
          {warnVisible && <WarnBub speaking={speakingBub==="warn"} playing={speakingBub==="warn"}
            onPlay={() => onPlayBub("warn","Hey, I did not quite catch that. Can you give me a more detailed answer?")}/>}
        </>}
      </div>

      {!typing && (
        <div style={{background:C.white,border:`1.5px solid ${C.lav300}`,borderRadius:18,overflow:"hidden",boxShadow:"0 2px 16px rgba(139,92,246,.09)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 14px",background:C.lav50,borderBottom:`1px solid ${C.lav300}`}}>
            <span style={{fontSize:11,fontWeight:700,color:C.lav500,textTransform:"uppercase",letterSpacing:".05em"}}>
              {stage==="intro" ? "Your intro" : `Answer — Q${cur+1} of ${questions.length}`}
            </span>
            <button onClick={onMic} style={{display:"flex",alignItems:"center",gap:5,background:micActive?C.peach200:C.peach50,border:`1.5px solid ${micActive?"#F87171":C.peach200}`,borderRadius:50,padding:"5px 12px",cursor:"pointer",fontSize:12,fontWeight:600,color:micActive?"#7F1D1D":C.peach600,transition:"all .2s"}}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a3 3 0 0 1 3 3v4a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3zm-5 7a5 5 0 0 0 10 0h-1.5a3.5 3.5 0 0 1-7 0H3zm5 6v-2h-1v2H5v1h6v-1H8z"/></svg>
              <span style={{width:7,height:7,borderRadius:"50%",background:"currentColor",opacity:micActive?.5:.8}}/>
              {micActive ? "Analyzing..." : vaScores[cur] ? "Re-check" : "Tone check"}
            </button>
          </div>
          {vaScores[cur] && (
            <div style={{margin:"10px 14px 0",padding:"10px 12px",background:"#FFF7ED",borderRadius:10,border:`1px solid ${C.amber200}`}}>
              <div style={{fontSize:11,fontWeight:700,color:C.amber600,textTransform:"uppercase",letterSpacing:".05em",marginBottom:8}}>Live tone analysis</div>
              <VBar label="Tone" pct={vaScores[cur].tone} color={bCol(vaScores[cur].tone)}/>
              <VBar label="Confidence" pct={vaScores[cur].conf} color={bCol(vaScores[cur].conf)}/>
              <VBar label="Clarity" pct={vaScores[cur].clar} color={bCol(vaScores[cur].clar)}/>
            </div>
          )}
          <textarea value={answerDraft} onChange={e => setAnswerDraft(e.target.value)}
            placeholder={stage==="intro" ? "Tell Alex about yourself..." : "Type your answer — be specific, use real examples, own your impact..."}
            style={{width:"100%",minHeight:100,padding:"12px 14px",border:"none",fontFamily:"inherit",fontSize:14,color:C.slate900,background:C.white,resize:"vertical",lineHeight:1.6,outline:"none",boxSizing:"border-box"}}/>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 14px",borderTop:`1px solid ${C.lav300}`,background:C.lav50}}>
            <span style={{fontSize:12,color:C.slate400}}>{answerDraft.length} chars — aim for 80+ words</span>
            <button onClick={onSubmit} disabled={answerDraft.trim().length<5}
              style={{display:"inline-flex",alignItems:"center",gap:6,background:answerDraft.trim().length<5?C.slate200:C.lav500,color:answerDraft.trim().length<5?C.slate400:C.white,border:"none",borderRadius:50,padding:"9px 22px",fontSize:13,fontWeight:600,cursor:answerDraft.trim().length<5?"not-allowed":"pointer",transition:"background .2s"}}>
              {stage==="intro" ? "Continue to interview" : cur<questions.length-1 ? "Next question" : "See my results"}
              <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M5 3l6 5-6 5V3z"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Summary Screen ─── */
function Summary({ level, domains, introAnswer, questions, answers, vscores, onRestart }) {
  const [showReview, setShowReview] = useState(false);
  const [speakingBub, setSpeakingBub] = useState(null);

  const allAnswers = [introAnswer, ...answers];
  const tier = qualityTier(allAnswers);

  // Aggregate analysis across all answers
  const all = allAnswers.join(" ");
  const an = analyze(all);
  const totalWords = allAnswers.reduce((s,a) => s + a.trim().split(/\s+/).filter(Boolean).length, 0);
  const emptyCount = allAnswers.filter(a => isGibberish(a)).length;

  // ── Honest scoring by tier ──
  let cs, ss, os;
  if (tier === "none") {
    cs = 0; ss = 0; os = 0;
  } else if (tier === "terrible") {
    cs = 1; ss = 1; os = 1;
  } else if (tier === "thin") {
    cs = Math.min(3, an.conf);
    ss = Math.min(2, 1 + (an.strong.length > 0 ? 1 : 0));
    os = Math.min(2, Math.round(cs * .5 + ss * .3));
  } else if (tier === "weak") {
    cs = Math.min(4, an.conf);
    ss = Math.min(3, 2 + (an.strong.length > 1 ? 1 : 0));
    os = Math.min(4, Math.round(cs * .5 + ss * .3));
  } else if (tier === "fair") {
    cs = Math.min(6, an.conf);
    ss = Math.min(5, 3 + (an.strong.length > 2 ? 1 : 0) + (totalWords > 160 ? 1 : 0));
    os = Math.min(6, Math.round(cs * .45 + ss * .35 + (an.strong.length > 2 ? .5 : 0)));
  } else if (tier === "decent") {
    cs = Math.min(8, an.conf);
    ss = Math.min(7, 4 + an.strong.length * .4 + (totalWords > 300 ? 1 : 0));
    ss = Math.min(7, Math.round(ss));
    os = Math.min(8, Math.round(cs * .45 + ss * .35 + (an.strong.length > 3 ? .75 : 0)));
  } else {
    // strong
    cs = an.conf;
    ss = Math.min(10, Math.max(1, Math.round(4 + an.strong.length * .5 + (totalWords > 400 ? 2 : totalWords > 250 ? 1 : 0))));
    os = Math.min(10, Math.round(cs * .45 + ss * .35 + (totalWords > 800 ? 1.5 : totalWords > 400 ? .75 : 0) + (an.strong.length > 4 ? .5 : 0)));
  }
  // Hard floor: always 0 if nothing was entered
  if (tier === "none") { cs = 0; ss = 0; os = 0; }

  const av = vscores.length
    ? {t:Math.round(vscores.reduce((s,v)=>s+v.tone,0)/vscores.length), c:Math.round(vscores.reduce((s,v)=>s+v.conf,0)/vscores.length), cl:Math.round(vscores.reduce((s,v)=>s+v.clar,0)/vscores.length)}
    : {t: tier==="none"?0:42, c: tier==="none"?0:38, cl: tier==="none"?0:45};

  // ── Presence label & note — honest by tier ──
  const ppLabel = tier === "none"   ? "No answer provided"
    : tier === "terrible"           ? "Essentially no content"
    : tier === "thin"               ? "Too brief to evaluate"
    : tier === "weak"               ? "Weak presence, needs major work"
    : cs >= 8                       ? "Executive presence"
    : cs >= 6                       ? "Confident and articulate"
    : cs >= 4                       ? "Measured, needs sharpening"
    :                                 "Hesitant, significant work needed";

  const ppNote = tier === "none"
    ? "Hey, it looks like you have not entered any answers yet. Go back and provide detailed answers to each question to get real feedback."
    : tier === "terrible"
    ? "Almost nothing was submitted. One or two words do not give an interviewer anything to evaluate. You need to return and answer each question with substance."
    : tier === "thin"
    ? "Your answers were far too short. Interviewers expect at least a minute or two of spoken content per question. Right now there is not enough here to assess your presence or strategic thinking."
    : tier === "weak"
    ? "Your answers had some content but lacked the depth and specificity that interviewers expect. Every question needs a concrete example, a clear outcome, and your personal role in it."
    : cs >= 8
    ? "Your language consistently signals ownership and results. That projects genuine executive presence."
    : cs >= 6
    ? "Solid assertiveness. Anchoring your claims with specific metrics would push your delivery from good to great."
    : cs >= 4
    ? "Your answers had real content but were undermined by hedging. Every uncertain phrase costs you credibility. Rebuild around ownership verbs."
    : "Your answers felt uncertain and underconfident. Interviewers read hesitance as inexperience. Reframe these stories around concrete decisions you owned and the outcomes you drove.";

  const STRENGTHS_BY_LEVEL = {
    student:["Curiosity and growth mindset","Willingness to learn","Clear personal examples","Genuine enthusiasm"],
    mid:    ["Impact-focused storytelling","Cross-functional awareness","Data-backed reasoning","Strategic framing"],
    senior: ["Executive-level thinking","Systems perspective","Influence without authority","Trade-off articulation"],
    lead:   ["Organizational thinking","People leadership signals","Strategic clarity","Stakeholder alignment"],
  };
  const WEAKNESSES_BY_LEVEL = {
    student:["Quantify your project outcomes","Name the tools you used","Show initiative beyond coursework","Connect skills to the role"],
    mid:    ["Make trade-offs explicit","Anchor claims with numbers","Show strategic thinking","Connect to business impact"],
    senior: ["Demonstrate org-level influence","Name your strategic bets","Show how you changed culture","Articulate your decision frameworks"],
    lead:   ["Show board-level thinking","Quantify org-wide impact","Demonstrate talent development","Frame through business outcomes"],
  };

  const lk = (level==="student"||level==="junior") ? "student" : (STRENGTHS_BY_LEVEL[level] ? level : "mid");
  const domainTip = domains.length > 0
    ? `For this ${domains[0]} role, interviewers want you to connect your stories directly to ${domains[0]} outcomes and decisions. Generic answers will not land with a hiring manager who lives in this space every day.`
    : "Connect every story directly to business outcomes. Generic answers do not land with experienced interviewers.";

  const handlePlay = (idx, text) => {
    if (speakingBub === idx) { TTS.stop(); setSpeakingBub(null); return; }
    setSpeakingBub(idx);
    TTS.speak(clean(text), undefined, () => setSpeakingBub(null));
  };

  return (
    <div>
      <div style={{background: tier==="none" ? C.peach50 : C.lav50, borderRadius:24, padding:"22px", marginBottom:12, border:`1px solid ${tier==="none" ? C.peach200 : C.lav300}`, display:"flex", gap:18, alignItems:"center"}}>
        <div style={{background: tier==="none" ? C.peach50 : C.lav100, borderRadius:"50%", padding:10, border:`2px solid ${tier==="none" ? C.peach200 : C.lav300}`, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center"}}>
          <CoachAlex mood={tier==="none" ? "warn" : "grad"} size={84}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:11, fontWeight:700, color: tier==="none" ? C.peach600 : (LEVEL_COLOR[level]||C.lav500), textTransform:"uppercase", letterSpacing:".06em", marginBottom:4}}>
            {tier==="none" ? "No answers detected" : `${LEVEL_LABEL[level]||"Mid-level"} interview complete`}
          </div>
          <div style={{fontSize:18, fontWeight:700, color:C.lav900, marginBottom:6}}>
            {tier==="none" ? "Nothing to score yet" : "Here is your honest breakdown"}
          </div>
          <div style={{display:"flex", alignItems:"baseline", gap:4}}>
            <span style={{fontSize:40, fontWeight:700, color: os===0 ? C.peach600 : os<=3 ? "#DC2626" : os<=5 ? C.amber600 : C.lav500, lineHeight:1}}>{os}</span>
            <span style={{fontSize:18, color:C.lav300, fontWeight:500}}>/10</span>
            <span style={{fontSize:13, color:C.slate400, marginLeft:8}}>overall</span>
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:8,marginBottom:12}}>
        {[
          {l:"Presence",    v:`${cs}/10`, bg:cs<=2?C.peach50:C.lav50,   b:cs<=2?C.peach200:C.lav300,   c:cs<=2?C.peach600:C.lav700},
          {l:"Strategic",   v:`${ss}/10`, bg:ss<=2?C.peach50:C.amber50,  b:ss<=2?C.peach200:C.amber200, c:ss<=2?C.peach600:C.amber600},
          {l:"Power phrases",v:an.strong.length, bg:C.mint50,  b:C.mint200,  c:C.mint600},
          {l:"Hedge words",  v:an.weak.length,   bg:C.peach50, b:C.peach200, c:C.peach600},
        ].map(x=>(
          <div key={x.l} style={{background:x.bg,border:`1px solid ${x.b}`,borderRadius:14,padding:"12px 14px",textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:700,color:x.c,lineHeight:1}}>{x.v}</div>
            <div style={{fontSize:11,color:x.c,marginTop:4,fontWeight:500}}>{x.l}</div>
          </div>
        ))}
      </div>

      <div style={{background:C.white,border:`1px solid ${tier==="none"||tier==="terrible"?C.peach200:C.slate200}`,borderRadius:16,padding:"16px 18px",marginBottom:10}}>
        <div style={{fontSize:10,fontWeight:700,color:C.lav500,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>Professional presence</div>
        <div style={{fontSize:15,fontWeight:600,color:C.slate900,marginBottom:6}}>{ppLabel}</div>
        <p style={{fontSize:13,color: tier==="none"||tier==="terrible" ? "#7F1D1D" : C.slate600,lineHeight:1.75,marginBottom:tier==="none"?0:12,background: tier==="none"||tier==="terrible" ? C.peach50 : "transparent", borderRadius:tier==="none"||tier==="terrible"?10:0, padding:tier==="none"||tier==="terrible"?"10px 12px":0}}>{ppNote}</p>
        {tier !== "none" && tier !== "terrible" && <>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            {[["Voice tone",av.t===0?"N/A":`${av.t}%`,C.lav500],["Confidence",av.c===0?"N/A":`${av.c}%`,C.mint600],["Clarity",av.cl===0?"N/A":`${av.cl}%`,C.peach600],["Total words",an.words,C.amber600]].map(([l,v,c])=>(
              <div key={l} style={{background:C.slate100,borderRadius:10,padding:"9px 12px"}}>
                <div style={{fontSize:11,color:C.slate400,textTransform:"uppercase",letterSpacing:".04em",marginBottom:3}}>{l}</div>
                <div style={{fontSize:15,fontWeight:600,color:c}}>{v}</div>
              </div>
            ))}
          </div>
          {an.strong.length>0&&<div style={{marginBottom:8}}><div style={{fontSize:11,color:C.slate400,textTransform:"uppercase",letterSpacing:".04em",marginBottom:6}}>Power phrases used</div><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{an.strong.slice(0,5).map(k=><Chip key={k} t="s">{k}</Chip>)}</div></div>}
          {an.weak.length>0&&<div><div style={{fontSize:11,color:C.slate400,textTransform:"uppercase",letterSpacing:".04em",marginBottom:6}}>Phrases to eliminate</div><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{an.weak.slice(0,4).map(k=><Chip key={k} t="w">{k}</Chip>)}</div></div>}
        </>}
      </div>

      {tier !== "none" && tier !== "terrible" && (
        <div style={{background:C.white,border:`1px solid ${C.slate200}`,borderRadius:16,padding:"16px 18px",marginBottom:10}}>
          <div style={{fontSize:10,fontWeight:700,color:C.mint600,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>What you showed well</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>{STRENGTHS_BY_LEVEL[lk].map(s=><Tag key={s} v="g">{s}</Tag>)}</div>
          <div style={{fontSize:10,fontWeight:700,color:C.amber600,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>Where you need to improve</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{WEAKNESSES_BY_LEVEL[lk].map(w=><Tag key={w} v="a">{w}</Tag>)}</div>
        </div>
      )}

      {emptyCount > 0 && tier !== "none" && (
        <div style={{background:C.peach50,border:`1px solid ${C.peach200}`,borderRadius:14,padding:"12px 16px",marginBottom:10,fontSize:13,color:"#7F1D1D",lineHeight:1.7}}>
          <strong>Note:</strong> {emptyCount} of your {allAnswers.length} answers {emptyCount===1?"was":"were"} empty or too short to evaluate. These were excluded from scoring — which is why your scores are lower than they could be. Retry with full answers to see your real potential.
        </div>
      )}

      {tier !== "none" && tier !== "terrible" && (
        <div style={{background:C.mint50,border:`1px solid ${C.mint200}`,borderRadius:16,padding:"16px 18px",marginBottom:16,display:"flex",gap:12,alignItems:"flex-start"}}>
          <div style={{background:C.lav100,borderRadius:"50%",padding:6,border:`1.5px solid ${C.lav300}`,flexShrink:0}}>
            <CoachAlex mood="happy" speaking={speakingBub==="tip"} size={52}/>
          </div>
          <div>
            <div style={{fontSize:10,fontWeight:700,color:C.mint600,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>Alex's tip for this role</div>
            <p style={{fontSize:14,color:C.mint900,lineHeight:1.75,margin:"0 0 8px"}}>{domainTip}</p>
            <PlayBtn onClick={() => handlePlay("tip", domainTip)} playing={speakingBub==="tip"}/>
          </div>
        </div>
      )}

      <hr style={{border:"none",borderTop:`1px solid ${C.slate200}`,margin:"16px 0"}}/>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
        <button onClick={onRestart} style={{display:"inline-flex",alignItems:"center",gap:8,background:C.lav500,color:C.white,border:"none",borderRadius:50,padding:"11px 24px",fontSize:14,fontWeight:600,cursor:"pointer"}}>Try another role</button>
        <button onClick={() => setShowReview(r => !r)} style={{display:"inline-flex",alignItems:"center",gap:6,background:"transparent",border:`1.5px solid ${C.lav300}`,borderRadius:50,padding:"9px 20px",fontSize:13,fontWeight:600,color:C.lav700,cursor:"pointer"}}>
          {showReview ? "Hide answers" : "Review my answers"}
        </button>
      </div>
      {showReview && [introAnswer,...answers].map((a,i) => (
        <div key={i} style={{background:C.white,border:`1px solid ${C.slate200}`,borderRadius:14,padding:"14px 16px",marginBottom:10}}>
          <div style={{fontSize:12,fontWeight:600,color:C.slate400,marginBottom:6}}>
            {i===0?"Warm-up intro":`Question ${i}`}: {i===0?"Tell me about yourself":clean(questions[i-1])}
          </div>
          <div style={{fontSize:14,color:C.slate900,lineHeight:1.75}}>{clean(a)}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── Main App ─── */
export default function App() {
  const [phase, setPhase]               = useState("jd");
  const [jd, setJd]                     = useState("");
  const [analyzing, setAnalyzing]       = useState(false);
  const [level, setLevel]               = useState("mid");
  const [domains, setDomains]           = useState([]);
  const [introText, setIntroText]       = useState("");
  const [questions, setQuestions]       = useState([]);
  const [stage, setStage]               = useState("intro");
  const [introAnswer, setIntroAnswer]   = useState("");
  const [answers, setAnswers]           = useState([]);
  const [vscores, setVscores]           = useState([]);
  const [cur, setCur]                   = useState(0);
  const [typing, setTyping]             = useState(false);
  const [micActive, setMicActive]       = useState(false);
  const [vaScores, setVaScores]         = useState({});
  const [pendingVoice, setPendingVoice] = useState(null);
  const [answerDraft, setAnswerDraft]   = useState("");
  const [warnVisible, setWarnVisible]   = useState(false);
  const [speakingBub, setSpeakingBub]   = useState(null);

  useEffect(() => {
    if (window.speechSynthesis) { refreshVoices(); window.speechSynthesis.onvoiceschanged = refreshVoices; }
  }, []);

  const doSpeak = useCallback((key, text) => {
    setSpeakingBub(key);
    TTS.speak(clean(text), undefined, () => setSpeakingBub(p => p === key ? null : p));
  }, []);

  const handlePlayBub = useCallback((key, text) => {
    if (speakingBub === key) { TTS.stop(); setSpeakingBub(null); return; }
    doSpeak(key, text);
  }, [speakingBub, doSpeak]);

  const handleStart = useCallback(() => {
    setAnalyzing(true); TTS.stop();
    setTimeout(() => {
      const { level:lv, domains:dm, intro, questions:qs } = buildSession(jd);
      setLevel(lv); setDomains(dm); setIntroText(intro); setQuestions(qs);
      setAnswers([]); setVscores([]); setCur(0); setStage("intro");
      setIntroAnswer(""); setTyping(false); setVaScores({});
      setAnswerDraft(""); setWarnVisible(false); setSpeakingBub(null);
      setAnalyzing(false); setPhase("interview");
      setTimeout(() => doSpeak("intro_cur", intro), 700);
    }, 900);
  }, [jd, doSpeak]);

  const handleMic = useCallback(() => {
    if (micActive) return;
    setMicActive(true);
    const vs = fv();
    setTimeout(() => { setVaScores(p => ({...p, [cur]: vs})); setPendingVoice(vs); }, 900);
    setTimeout(() => setMicActive(false), 2300);
  }, [micActive, cur]);

  const handleSubmit = useCallback(() => {
    if (isGibberish(answerDraft)) { setWarnVisible(true); return; }
    setWarnVisible(false); TTS.stop(); setSpeakingBub(null);
    if (stage === "intro") {
      setIntroAnswer(answerDraft); setAnswerDraft("");
      setTyping(true); setStage("main"); setCur(0);
      setTimeout(() => { setTyping(false); setTimeout(() => doSpeak("q0_cur", questions[0]), 300); }, 1400);
    } else {
      const na = [...answers, answerDraft];
      const nv = [...vscores, pendingVoice || fv()];
      setAnswers(na); setVscores(nv); setPendingVoice(null); setAnswerDraft(""); setVaScores({});
      if (cur < questions.length - 1) {
        const next = cur + 1; setCur(next); setTyping(true);
        setTimeout(() => { setTyping(false); setTimeout(() => doSpeak(`q${next}_cur`, questions[next]), 300); }, 1300);
      } else { setPhase("summary"); }
    }
  }, [answerDraft, stage, answers, vscores, pendingVoice, cur, questions, doSpeak]);

  const handleRestart = useCallback(() => {
    TTS.stop();
    setPhase("jd"); setJd(""); setAnswers([]); setVscores([]);
    setCur(0); setStage("intro"); setIntroAnswer(""); setTyping(false);
    setMicActive(false); setVaScores({}); setAnswerDraft("");
    setWarnVisible(false); setSpeakingBub(null); setAnalyzing(false);
  }, []);

  return (
    <div style={{fontFamily:"'Segoe UI', system-ui, sans-serif",maxWidth:660,margin:"0 auto",padding:"16px 16px 48px",background:C.bg,minHeight:"100vh"}}>
      <style>{`* { box-sizing: border-box; } textarea { font-family: inherit; } @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`}</style>

      <div style={{background:C.lav100,borderRadius:20,padding:"14px 20px",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between",border:`1px solid ${C.lav300}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{background:C.lav500,borderRadius:10,width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2L11.5 7H16.5L12.5 10.5L14 15.5L9 12.5L4 15.5L5.5 10.5L1.5 7H6.5L9 2Z" fill="white"/></svg>
          </div>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:C.lav900}}>InterviewEdge AI</div>
            <div style={{fontSize:11,color:C.lav500}}>Master any job interview with AI-powered coaching</div>
          </div>
        </div>
        <span style={{background:C.lav500,color:C.white,fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:20,letterSpacing:".05em"}}>FREE BETA</span>
      </div>

      <div style={{animation:"fadeUp .3s ease"}}>
        {phase==="jd"      && <Setup jd={jd} setJd={setJd} onStart={handleStart} analyzing={analyzing}/>}
        {phase==="interview" && (
          <Interview
            st={{level,domains,stage,questions,answers,introText,introAnswer,cur,typing,micActive,vaScores,answerDraft,setAnswerDraft,warnVisible,speakingBub,onPlayBub:handlePlayBub}}
            onSubmit={handleSubmit} onMic={handleMic}/>
        )}
        {phase==="summary" && <Summary level={level} domains={domains} introAnswer={introAnswer} questions={questions} answers={answers} vscores={vscores} onRestart={handleRestart}/>}
      </div>
    </div>
  );
}
