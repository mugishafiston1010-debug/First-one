/**
 * On-device analysis engine.
 *
 * Runs entirely in the browser with no network access. It is rule-based: it
 * finds obligations, dates, conditions and terminology by pattern, and quotes
 * the document rather than generating new prose. That makes it less fluent
 * than a language model, but everything it reports can be traced to a passage.
 */
import type { Analysis, Basis, Block, DateItem, Insight, Priority, SourceRef, Task, Term } from "../types";
import { contentTokens, normalize, toSentences, truncate, type Sentence } from "../text";
import { daysUntil, findDates, findYears, isDeadline, type FoundDate } from "./dates";
import { GLOSSARY, plainify } from "./glossary";

const LIST_MARKER = /^\s*(?:[-*•▪◦–]|\(?[a-z\d]{1,3}[.)])\s+/i;

const OBLIGATION =
  /\b(must|shall|(?:is|are|will be) (?:required|obliged|obligated|expected) to|(?:is|are) to be|required to|needs? to|ha(?:s|ve) to|(?:is|are|will be|remains?) responsible for|agrees? to|undertakes? to|should|ought to|(?:is|are) (?:asked|requested|advised|encouraged|recommended) to|we (?:ask|request|advise|recommend) (?:that )?you)\b/i;
const SOFT = /\b(should|ought to|advised|encouraged|recommended|recommend|may wish)\b/i;
const PROHIBITION = /\b(?:must|shall|may|should|can|will)\s*not\b|\b(?:cannot|can't|prohibited|forbidden|not permitted|not allowed|under no circumstances)\b/i;

const IMPERATIVE =
  /^(?:please\s+|kindly\s+|then\s+|also\s+|you (?:will |would )?need to\s+|make sure (?:to|you)\s+|be sure to\s+|remember to\s+|don'?t forget to\s+)?(submit|complete|sign|return|pay|provide|send|bring|upload|register|attend|contact|notify|confirm|review|keep|ensure|fill|apply|renew|schedule|book|read|check|obtain|arrange|report|file|deliver|inform|transfer|collect|present|attach|include|enclose|email|call|visit|update|activate|accept|reply|respond|request|choose|select|download|print|carry|retain|arrive|purchase|open|enrol|enroll|log|create|verify|prepare|undergo|take|make|give|let|have|set)\b/i;

/** Subjects that mean "the other side", whose duties are not the reader's tasks. */
const COUNTERPARTY =
  /\b(landlord|lessor|employer|company|university|college|school|institution|insurer|provider|bank|lender|agency|supplier|seller|vendor|we|our|us|management|the office|the department|the committee|the board|the ministry|administrator|contractor|owner|licensor|the organi[sz]ation|the firm|the service)\b/i;
const READER =
  /\b(you|your|tenant|lessee|employee|student|applicant|policyholder|customer|borrower|member|participant|candidate|client|recipient|insured|holder|resident|subscriber|user|buyer|purchaser|licensee|guest|attendee|signatory|undersigned|taxpayer|patient|parent|guardian|all (?:students|employees|applicants|tenants|participants))s?\b/i;

const CONDITION =
  /\b(if|unless|provided that|subject to|in the event|only (?:if|when|where)|as long as|so long as|on condition|except (?:where|when|if|as|for)|otherwise|contingent (?:on|upon)|conditional (?:on|upon)|depend(?:s|ent|ing)? on|in case of|should you|until such time|whether or not)\b/i;

const CONSEQUENCE =
  /\b(penalt\w+|late (?:fee|charge|payment)|non-?refundable|no refunds?|forfeit\w*|terminat\w+|void\w*|cancel\w+|withdraw\w+|liable|liabilit\w+|interest (?:of|at|will|shall|accrues)|automatic(?:ally)? renew\w*|waive\w*|irrevocabl\w+|at (?:your|the \w+'s) (?:own )?(?:expense|cost|risk)|evict\w*|deport\w*|fine[sd]?|failure to|fails? to|may result|will result|result in|strictly|will not be (?:accepted|considered|refunded|extended|processed)|without (?:further |prior )?notice|binding|deduct\w*|suspend\w+|revok\w+|expel\w*|dismiss\w+|disciplinary|legal action|lose (?:your|the)|loss of|not be eligible|ineligible|important|please note|note that|be aware)\b/i;

const URGENT = /\b(penalt\w+|late fee|failure to|fails? to|terminat\w+|forfeit\w*|cancel\w+|void|immediately|mandatory|withdraw\w+|evict\w*|deport\w*|strictly|will not be accepted|lose (?:your|the)|revok\w+|urgent)\b/i;

const MONEY = /(?:[$€£₽¥]\s?\d[\d,.\s]*\d|\b\d[\d,.\s]*\d?\s?(?:USD|EUR|GBP|RUB|RWF|rubles?|roubles?|dollars?|euros?|pounds?)\b|\b(?:USD|EUR|GBP|RUB|RWF)\s?\d[\d,.]*)/i;

const DOC_CUE = /\b(submit|provide|bring|attach|include|upload|present|required|requires?|must|need|enclose|send|return|supply|produce|show|carry|accompanied|following documents?|documents? (?:required|needed)|together with|along with)\b/i;
const DOC_PATTERNS: RegExp[] = [
  /\b(?:valid |original |international |foreign |current )?passports?(?: (?:copy|photo page|bio page))?\b/i,
  /\b(?:student |work |entry |study |residence )?visas?(?: (?:support letter|invitation|application))?\b(?! ?card)/i,
  /\bbirth certificates?\b/i,
  /\bmarriage certificates?\b/i,
  /\b(?:medical|health|vaccination|HIV|police clearance|insurance|enrol(?:l)?ment|graduation|language|tax|employment|income) certificates?\b/i,
  /\bcertificates? of [a-z][a-z ]{2,40}?(?=[,.;:)]|\s+(?:and|or|by|to|from|within|before|issued|must|is|are|for|with)\b|$)/i,
  /\bproof of [a-z][a-z' ]{2,40}?(?=[,.;:)(]|\s+(?:and|or|by|from|within|before|must|is|are|such|with|dated)\b|$)/i,
  /\bevidence of [a-z][a-z' ]{2,40}?(?=[,.;:)(]|\s+(?:and|or|by|to|from|within|before|must|is|are|such|with)\b|$)/i,
  /\b(?:signed |completed |certified |notari[sz]ed |scanned |two |three )?cop(?:y|ies) of (?:the |your |this |an? )?[a-z][a-z' ]{2,40}?(?=[,.;:)(]|\s+(?:and|or|by|to|from|within|before|must|is|are|with)\b|$)/i,
  /\b(?:official |academic |certified )?transcripts?\b/i,
  /\b(?:diploma|degree certificate)s?\b/i,
  /\bbank statements?\b/i,
  /\b(?:pay ?slips?|pay ?stubs?|salary slips?)\b/i,
  /\b(?:passport[- ](?:size|sized|style) |recent )?photo(?:graph)?s\b/i,
  /\b(?:photo |government[- ]issued |national |valid )(?:ID|identification|identity (?:card|document))s?\b/i,
  /\bdriver'?s?'? licen[cs]e\b/i,
  /\btax returns?\b/i,
  /\b(?:application|registration|consent|claim|enrol(?:l)?ment|declaration|medical|direct deposit|tax|emergency contact|acceptance) forms?\b/i,
  /\bform [A-Z0-9][A-Z0-9-]{1,10}\b/,
  /\b(?:reference|recommendation|invitation|motivation|cover|offer|acceptance|sponsor(?:ship)?|guarantee|admission) letters?\b/i,
  /\bletters? of [a-z][a-z ]{2,30}?(?=[,.;:)]|\s+(?:and|or|by|to|from|within|before|must|is|are)\b|$)/i,
  /\bmigration card\b/i,
  /\butility bills?\b/i,
  /\b(?:payment |deposit )?receipts?\b/i,
  /\b(?:renters?'?|tenant'?s?|health|medical|liability|travel) insurance(?: policy| card| certificate)?\b/i,
  /\b(?:signed|countersigned) (?:agreement|contract|lease|offer|form|letter|copy)\b/i,
  /\b(?:curriculum vitae|CV|résumé|resume)\b/,
  /\bwork permit\b/i,
  /\bresidence permit\b/i,
  /\b(?:social security|tax identification|taxpayer) number\b/i,
];

const DOC_TYPES: Array<[label: string, pattern: RegExp]> = [
  ["Residential lease agreement", /\b(tenant|landlord|lease|tenancy|rent|premises|security deposit|sublet)\b/gi],
  ["Employment offer or contract", /\b(employee|employer|employment|salary|probation\w*|start date|position|job title|annual leave|benefits|offer of employment)\b/gi],
  ["Insurance policy document", /\b(insurer|insured|policy|premium|coverage|claim|deductible|policyholder|exclusions?)\b/gi],
  ["Admission or enrolment letter", /\b(admission|admitted|enrol\w+|tuition|university|semester|student|programme|program|faculty|academic|dormitory|orientation)\b/gi],
  ["Invoice or payment notice", /\b(invoice|amount due|balance|payment due|bill|billing|remit|account number|overdue)\b/gi],
  ["Loan or credit agreement", /\b(loan|borrower|lender|interest rate|principal|repayment|instal?lments?|APR|credit)\b/gi],
  ["Immigration or government notice", /\b(visa|immigration|migration|permit|consulate|embassy|ministry|registration|passport|residence)\b/gi],
  ["Terms and conditions", /\b(terms of service|terms and conditions|user|account|service|licen[cs]e|privacy|subscription)\b/gi],
  ["Medical document", /\b(patient|diagnosis|treatment|prescription|appointment|clinic|hospital|medication|dosage)\b/gi],
  ["Policy or handbook", /\b(policy|procedure|guidelines?|handbook|code of conduct|compliance|employees must)\b/gi],
];

let counter = 0;
const uid = (prefix: string) => `${prefix}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function ref(s: Sentence): SourceRef {
  return { blockId: s.blockId, page: s.page, quote: s.text };
}

function clean(text: string): string {
  return text.replace(LIST_MARKER, "").trim();
}

function insight(s: Sentence, basis: Basis = "stated", text?: string, note?: string): Insight {
  return { id: uid("i"), text: text ?? clean(s.text), basis, source: ref(s), ...(note ? { note } : {}) };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const TITLE_STOPS =
  /,\s|;|:|\s+(?:by|before|until|no later than|not later than|on or before|within|prior to|if|unless|when|once|after|in order to|so that|which|who|as soon as|at least|otherwise|failure|and (?:must|shall|will|should)|or (?:the|your|you))\b|\s+\(/i;

function makeTitle(fragment: string): string {
  let t = clean(fragment).replace(/^(?:also|then|always|first|immediately|promptly|either)\s+/i, "");
  const stop = t.slice(12).search(TITLE_STOPS);
  if (stop >= 0) t = t.slice(0, stop + 12);
  t = t.replace(/[.\s]+$/, "");
  const words = t.split(/\s+/);
  if (words.length > 11) t = `${words.slice(0, 11).join(" ")}…`;
  return capitalize(t);
}

interface TaskCandidate {
  title: string;
  soft: boolean;
}

const VERBS = IMPERATIVE.source.slice(IMPERATIVE.source.indexOf("?(") + 1).replace(/\\b$/, "");
const PLEASE_ANYWHERE = new RegExp(`\\b(?:please|kindly)\\s+${VERBS}\\b`, "i");
const AFTER_CLAUSE = new RegExp(`^(?:if|when|once|to|after|before|for|in order|upon|on|as soon as)\\b[^,]{3,90},\\s+(?:then\\s+|please\\s+|you (?:must|should|need to)\\s+)?${VERBS}\\b`, "i");
const ONLY_IF_YOU = new RegExp(`\\b(?:only if|provided that|as long as|on condition that) you\\s+${VERBS}\\b`, "i");

const GERUNDS: Record<string, string> = {
  paying: "pay", arranging: "arrange", obtaining: "obtain", providing: "provide", ensuring: "ensure", maintaining: "maintain",
  keeping: "keep", returning: "return", notifying: "notify", submitting: "submit", covering: "cover", making: "make",
  setting: "set", booking: "book", organising: "organise", organizing: "organize", renewing: "renew", registering: "register",
  cleaning: "clean", repairing: "repair", reporting: "report", checking: "check", completing: "complete", securing: "secure",
  purchasing: "purchase", applying: "apply", informing: "inform", updating: "update", bringing: "bring", meeting: "meet",
};

function fromVerb(body: string, match: RegExpExecArray, soft = false): TaskCandidate {
  const verb = match[1];
  const start = match.index + match[0].toLowerCase().lastIndexOf(verb.toLowerCase());
  return { title: makeTitle(body.slice(start)), soft };
}

function detectTask(text: string, inherited: { obligation: boolean; docs: boolean }): TaskCandidate | null {
  const body = clean(text);
  if (body.length < 12 || body.endsWith("?")) return null;

  // Items of a "bring these documents" list are documents, not tasks.
  if (inherited.docs && LIST_MARKER.test(text)) return null;

  const imp = IMPERATIVE.exec(body);
  if (imp) return fromVerb(body, imp);
  const later = PLEASE_ANYWHERE.exec(body) ?? AFTER_CLAUSE.exec(body) ?? ONLY_IF_YOU.exec(body);
  if (later && !PROHIBITION.test(body)) return fromVerb(body, later);

  const m = OBLIGATION.exec(body);
  if (m) {
    if (PROHIBITION.test(body.slice(Math.max(0, m.index - 4), m.index + m[0].length + 6))) return null;
    const subject = body.slice(0, m.index);
    const subjectTail = (subject.split(/[,;]/).pop() ?? subject).trim();
    // "This letter explains what you need to do" describes, it does not instruct.
    if (/\b(?:what|how|whether|why|everything)\b[^,]*$/i.test(subjectTail)) return null;
    const reader = READER.test(subjectTail);
    const request = /\bwe (?:ask|request|advise|recommend)/i.test(m[0]);
    let rest = body.slice(m.index + m[0].length).trim();
    // Passive voice: "The form must be returned to..." -> "Return the form to..."
    const passive = /^be\s+(\w+)\b\s*(.*)$/i.exec(rest);
    if (passive) {
      const verb = passiveToImperative(passive[1]);
      const object = subjectTail.replace(/^(?:and|but|however|therefore|all|any|each)\s+/i, "").trim();
      if (!verb || !object || object.split(/\s+/).length > 12) return null;
      rest = `${verb} ${object.charAt(0).toLowerCase()}${object.slice(1)} ${passive[2]}`.trim();
    } else if (!reader && !request) {
      // The subject is the other party or a thing ("The tenancy shall commence...").
      return null;
    }
    rest = rest.replace(/^(?:that you|you)\s+/i, "");
    const gerund = /^(\w+ing)\b/.exec(rest);
    if (gerund && GERUNDS[gerund[1].toLowerCase()]) rest = GERUNDS[gerund[1].toLowerCase()] + rest.slice(gerund[1].length);
    if (rest.split(/\s+/).length < 2) return null;
    return { title: makeTitle(rest), soft: SOFT.test(m[0]) };
  }

  // Items of a "You must:" list. Items of a "bring these documents" list are documents, not tasks.
  if (inherited.obligation && !inherited.docs && LIST_MARKER.test(text) && body.split(/\s+/).length >= 2 && !PROHIBITION.test(body)) {
    return { title: makeTitle(body), soft: false };
  }
  return null;
}

const IRREGULAR: Record<string, string> = {
  paid: "pay", sent: "send", made: "make", kept: "keep", given: "give", taken: "take", done: "do", brought: "bring",
  submitted: "submit", returned: "return", completed: "complete", signed: "sign", provided: "provide", received: "",
  notified: "notify", filed: "file", delivered: "deliver", uploaded: "upload", renewed: "renew", obtained: "obtain",
  reported: "report", registered: "register", confirmed: "confirm", attached: "attach", included: "include",
  presented: "present", requested: "request", addressed: "address", directed: "direct", lodged: "lodge",
  cancelled: "cancel", canceled: "cancel", arranged: "arrange", booked: "book", scheduled: "schedule",
  transferred: "transfer", carried: "carry", retained: "retain", collected: "collect", accompanied: "", deemed: "",
  considered: "", entitled: "", treated: "", charged: "", refunded: "", applied: "", held: "", based: "", used: "",
};

function passiveToImperative(participle: string): string | null {
  const p = participle.toLowerCase();
  if (p in IRREGULAR) return IRREGULAR[p] || null;
  return null;
}

function priorityFor(text: string, context: string, soft: boolean, due?: string, now?: Date): Priority {
  if (due !== undefined && daysUntil(due, now) <= 14) return "high";
  if (soft) return due ? "medium" : "low";
  if (URGENT.test(text) || URGENT.test(context)) return "high";
  return "medium";
}

function classify(fullText: string): string {
  const scored = DOC_TYPES.map(([label, re]) => {
    const hits = fullText.match(re) ?? [];
    return { label, score: hits.length, distinct: new Set(hits.map((h) => h.toLowerCase())).size };
  }).sort((a, b) => b.distinct * 3 + b.score - (a.distinct * 3 + a.score));
  const top = scored[0];
  return top && top.distinct >= 3 && top.score >= 5 ? top.label : "General document";
}

export interface LocalOptions {
  now?: Date;
}

export function analyzeLocally(blocks: Block[], opts: LocalOptions = {}): Analysis {
  const now = opts.now ?? new Date();
  const sentences = toSentences(blocks);
  const body = sentences.filter((s) => !s.heading && clean(s.text).length > 0);
  const fullText = blocks.map((b) => b.text).join("\n");
  const knownYears = findYears(fullText);
  const dateCtx = { now, knownYears };
  const blockById = new Map(blocks.map((b) => [b.id, b]));

  // Which sentences sit in a list introduced by an obligation ("You must:") or
  // a request for documents ("Please bring the following:").
  const inheritObligation = new Set<number>();
  const inheritDocs = new Set<number>();
  {
    let obligation = false;
    let docs = false;
    for (const b of blocks) {
      const isItem = LIST_MARKER.test(b.text);
      if (!isItem) {
        const intro = /[:：]\s*$/.test(b.text) || /\bfollowing\b/i.test(b.text);
        obligation = intro && (OBLIGATION.test(b.text) || IMPERATIVE.test(clean(b.text))) && !COUNTERPARTY.test(b.text.split(OBLIGATION)[0] ?? "");
        docs = intro && DOC_CUE.test(b.text);
        if (b.heading) {
          obligation = /\b(what you (?:need|must)|next steps|action|to do|checklist|your (?:responsibilities|obligations)|required steps|before you arrive)\b/i.test(b.text);
          docs = /\b(documents?|checklist|what to bring|required (?:items|materials)|enclosures?)\b/i.test(b.text);
        }
      } else {
        if (obligation) inheritObligation.add(b.id);
        if (docs) inheritDocs.add(b.id);
      }
    }
  }

  // ---- Tasks and dates ---------------------------------------------------
  const tasks: Task[] = [];
  const dates: DateItem[] = [];
  const taskTitles = new Set<string>();
  const taskSentences = new Set<number>();

  body.forEach((s, i) => {
    const found = findDates(s.text, dateCtx);
    const candidate = detectTask(s.text, { obligation: inheritObligation.has(s.blockId), docs: inheritDocs.has(s.blockId) });
    let task: Task | undefined;

    if (candidate && tasks.length < 40) {
      const key = normalize(candidate.title).toLowerCase();
      if (!taskTitles.has(key)) {
        taskTitles.add(key);
        // A deadline has to come after the instruction itself; a date in a leading
        // "If you resign within 12 months, ..." clause is a condition, not a due date.
        const from = Math.max(0, s.text.toLowerCase().indexOf(candidate.title.replace(/…$/, "").slice(0, 12).toLowerCase()) - 30);
        const usable = found.filter((d) => d.index >= from);
        const deadline: FoundDate | undefined = usable.find((d) => d.iso && isDeadline(s.text, d)) ?? usable.find((d) => d.relative);
        const next = body[i + 1]?.blockId === s.blockId ? body[i + 1].text : "";
        const uncertain = deadline?.uncertainty;
        task = {
          id: uid("t"),
          title: candidate.title,
          detail: clean(s.text),
          ...(deadline?.iso ? { due: deadline.iso } : {}),
          ...(deadline ? { dueText: deadline.raw } : {}),
          priority: priorityFor(s.text, next, candidate.soft, deadline?.iso, now),
          done: false,
          basis: uncertain ? "verify" : "stated",
          source: ref(s),
          ...(uncertain ? { note: uncertain } : deadline?.relative ? { note: "The deadline depends on another event, so no calendar date is set." } : {}),
        };
        tasks.push(task);
        taskSentences.add(s.index);
      }
    }

    for (const d of found) {
      const deadline = isDeadline(s.text, d);
      const documentDate = /^\s*(?:date[d]?|issued|issue date)\s*[:\-]/i.test(s.text) || (s.index < 4 && s.text.length < 60 && !deadline);
      const linked = task && (task.due === d.iso || (d.relative && task.dueText === d.raw)) ? task : undefined;
      dates.push({
        id: uid("d"),
        ...(d.iso ? { iso: d.iso } : {}),
        raw: d.raw,
        label: documentDate ? "Date of the document" : linked ? linked.title : truncate(clean(s.text), 120),
        kind: deadline && !documentDate ? "deadline" : "event",
        basis: d.uncertainty ? "verify" : "stated",
        source: ref(s),
        ...(d.uncertainty ? { note: d.uncertainty } : d.relative ? { note: "Relative deadline: work out the calendar date from the event it refers to." } : {}),
        starred: false,
        done: false,
        ...(linked ? { taskId: linked.id } : {}),
      });
    }
  });

  // Remove duplicate dates (same day cited in the same paragraph).
  const seenDates = new Set<string>();
  const uniqueDates = dates.filter((d) => {
    const key = `${d.iso ?? d.raw.toLowerCase()}|${d.source?.blockId}`;
    if (seenDates.has(key)) return false;
    seenDates.add(key);
    return true;
  });

  // ---- Details -----------------------------------------------------------
  const requirements: Insight[] = [];
  const conditions: Insight[] = [];
  const dontOverlook: Insight[] = [];
  for (const s of body) {
    const text = clean(s.text);
    if (text.length < 25) continue;
    const obligation = OBLIGATION.test(text) || PROHIBITION.test(text) || inheritObligation.has(s.blockId);
    if (obligation && !SOFT.test(text) && requirements.length < 24) requirements.push(insight(s));
    if (CONDITION.test(text) && conditions.length < 18) conditions.push(insight(s));
    if (CONSEQUENCE.test(text) && dontOverlook.length < 12 && text.length > 40 && !LIST_MARKER.test(s.text)) dontOverlook.push(insight(s));
  }

  const documentsNeeded: Insight[] = [];
  {
    const seen = new Set<string>();
    for (const s of body) {
      const cue = DOC_CUE.test(s.text) || inheritDocs.has(s.blockId);
      if (!cue) continue;
      for (const re of DOC_PATTERNS) {
        const m = re.exec(s.text);
        if (!m) continue;
        const phrase = normalize(m[0]).replace(/^(?:the|your|an?)\s+/i, "");
        const key = phrase.toLowerCase().replace(/s$/, "");
        if (phrase.length < 3 || [...seen].some((k) => k.includes(key) || key.includes(k))) continue;
        seen.add(key);
        if (documentsNeeded.length < 16) documentsNeeded.push({ id: uid("i"), text: capitalize(phrase), basis: "stated", source: ref(s) });
      }
    }
  }

  // ---- Understand --------------------------------------------------------
  const docType = classify(fullText);
  const ranked = rankSentences(body);
  const purposeSentence =
    body.slice(0, 14).find((s) => /\b(this (?:agreement|letter|notice|document|policy|contract|lease|offer)|we are (?:pleased|writing|delighted)|purpose of|is to (?:inform|confirm|notify)|hereby|confirms? (?:that|your)|is made (?:and entered|between|on)|entered into)\b/i.test(s.text) && s.text.length > 40) ??
    ranked[0] ??
    body[0];

  const purpose: Insight = purposeSentence
    ? insight(purposeSentence)
    : { id: uid("i"), text: "The document has no readable sentences to summarise.", basis: "verify" };

  const keyPoints = ranked
    .filter((s) => s.index !== purposeSentence?.index && !taskSentences.has(s.index))
    .slice(0, 6)
    .sort((a, b) => a.index - b.index)
    .map((s) => insight(s));

  const summary: Insight[] = [];
  const pages = blocks.length ? blocks[blocks.length - 1].page : 0;
  const words = fullText.split(/\s+/).filter(Boolean).length;
  summary.push({
    id: uid("i"),
    text:
      docType === "General document"
        ? `This document is about ${words.toLocaleString("en")} words long. Its type could not be recognised automatically.`
        : `This looks like ${/^[aeiou]/i.test(docType) ? "an" : "a"} ${docType.toLowerCase()}, about ${words.toLocaleString("en")} words${pages > 1 ? ` over ${pages} pages` : ""}.`,
    basis: "interpreted",
  });
  if (tasks.length) {
    const dated = tasks.filter((t) => t.due).sort((a, b) => a.due!.localeCompare(b.due!));
    const first = dated[0];
    summary.push({
      id: uid("i"),
      text: `It asks you to do ${tasks.length} thing${tasks.length === 1 ? "" : "s"}${first ? `. The earliest dated one is "${first.title}", due ${first.dueText}` : ", none with a fixed calendar date"}.`,
      basis: "interpreted",
      ...(first?.source ? { source: first.source } : {}),
    });
  } else {
    summary.push({ id: uid("i"), text: "No clear instructions addressed to the reader were found.", basis: "interpreted" });
  }
  const moneySentence = body.find((s) => MONEY.test(s.text));
  if (moneySentence) {
    const amounts = [...new Set(body.flatMap((s) => s.text.match(new RegExp(MONEY.source, "gi")) ?? []).map((a) => a.trim()))].slice(0, 5);
    summary.push({
      id: uid("i"),
      text: `Money is involved. Amounts mentioned include ${amounts.join(", ")}.`,
      basis: "interpreted",
      source: ref(moneySentence),
    });
  }
  // Reworded versions of the most central sentences.
  for (const s of ranked.slice(0, 3).sort((a, b) => a.index - b.index)) {
    const plain = plainify(clean(s.text));
    summary.push({
      id: uid("i"),
      text: plain,
      basis: plain === clean(s.text) ? "stated" : "interpreted",
      source: ref(s),
    });
  }
  if (conditions.length || dontOverlook.length) {
    summary.push({
      id: uid("i"),
      text: `${conditions.length} condition${conditions.length === 1 ? "" : "s"} and ${dontOverlook.length} warning${dontOverlook.length === 1 ? "" : "s"} or consequence${dontOverlook.length === 1 ? "" : "s"} were found. They are listed under Important details.`,
      basis: "interpreted",
    });
  }

  // ---- Glossary ----------------------------------------------------------
  const glossary: Term[] = [];
  const seenTerms = new Set<string>();
  // Definitions the document gives itself.
  for (const s of body) {
    for (const m of s.text.matchAll(/["“]([^"”]{2,40})["”]\s+(?:means|shall mean|refers to|is defined as|has the meaning)\s+([^.;]{8,220})/g)) {
      const key = m[1].toLowerCase();
      if (seenTerms.has(key)) continue;
      seenTerms.add(key);
      glossary.push({ id: uid("g"), term: m[1], definition: capitalize(m[2].trim()) + ".", basis: "stated", source: ref(s) });
    }
    for (const m of s.text.matchAll(/([^(.;]{4,90})\((?:hereinafter(?: referred to as)?,?\s+|the\s+|each an?\s+|collectively,?\s+(?:the\s+)?)?["“]([^"”]{2,40})["”]\)/g)) {
      const key = m[2].toLowerCase();
      if (seenTerms.has(key)) continue;
      seenTerms.add(key);
      const before = m[1].trim().replace(/[,\s]+$/, "");
      const named = /((?:[A-Z0-9][\w.&'-]*)(?:,? (?:of|and|the|for|[A-Z0-9][\w.&'-]*))*)$/.exec(before);
      const meaning = (named?.[1] ?? before).replace(/^(?:This|The)\s+/, (w) => w.toLowerCase());
      if (meaning.length < 3) continue;
      glossary.push({ id: uid("g"), term: m[2], definition: `In this document, "${m[2]}" is the short name for ${meaning}.`, basis: "stated", source: ref(s) });
    }
  }
  for (const [term, definition, pattern] of GLOSSARY) {
    const re = new RegExp(`(?<![\\p{L}-])(?:${pattern ?? term})(?![\\p{L}-])`, "iu");
    const hit = body.find((s) => re.test(s.text));
    if (!hit || seenTerms.has(term.toLowerCase())) continue;
    seenTerms.add(term.toLowerCase());
    glossary.push({ id: uid("g"), term, definition, basis: "interpreted", source: ref(hit) });
    if (glossary.length >= 28) break;
  }

  void blockById;
  return {
    engine: "local",
    createdAt: now.toISOString(),
    docType,
    understand: { purpose, summary, keyPoints },
    tasks,
    dates: uniqueDates,
    details: { requirements, conditions, documentsNeeded, dontOverlook },
    glossary,
  };
}

/** Rank sentences by how central their vocabulary is to the document. */
function rankSentences(body: Sentence[]): Sentence[] {
  const df = new Map<string, number>();
  const tokens = body.map((s) => [...new Set(contentTokens(s.text))]);
  for (const ts of tokens) for (const t of ts) df.set(t, (df.get(t) ?? 0) + 1);
  const n = Math.max(1, body.length);
  return body
    .map((s, i) => {
      const ts = tokens[i];
      const len = s.text.split(/\s+/).length;
      if (len < 8 || len > 60 || LIST_MARKER.test(s.text)) return { s, score: -1 };
      let score = 0;
      for (const t of ts) {
        const f = df.get(t) ?? 0;
        if (f > 1) score += Math.log(1 + f);
      }
      score /= Math.sqrt(ts.length || 1);
      if (MONEY.test(s.text)) score *= 1.25;
      if (/\d/.test(s.text)) score *= 1.1;
      if (i < n * 0.15) score *= 1.2;
      return { s, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.s);
}
