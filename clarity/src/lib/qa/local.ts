/**
 * On-device question answering.
 *
 * This is extractive: it retrieves the passages that best match the question
 * (BM25) and answers by quoting them. It cannot reason or paraphrase, and it
 * says so plainly when the document does not contain a good match, rather than
 * guessing.
 */
import type { Block, Citation } from "../types";
import { contentTokens, stem, toSentences, type Sentence } from "../text";
import { findDates } from "../analysis/dates";

export interface LocalAnswer {
  answerable: boolean;
  text: string;
  citations: Citation[];
}

export const NOT_ENOUGH = "The document does not provide enough information to answer that.";

const SYNONYMS: Record<string, string[]> = {
  pay: ["payment", "paid", "fee", "rent", "deposit", "tuition", "salary", "charge", "cost"],
  cost: ["fee", "price", "charge", "rent", "tuition", "amount", "deposit"],
  price: ["fee", "cost", "charge", "amount"],
  much: ["fee", "amount", "rent", "salary", "deposit", "tuition", "charge", "cost"],
  deadline: ["due", "later", "by", "before", "until"],
  due: ["deadline", "later", "payable"],
  late: ["after", "overdue", "penalty", "fee"],
  cancel: ["terminate", "withdraw", "end", "termination", "notice"],
  quit: ["resign", "terminate", "notice", "end"],
  leave: ["terminate", "end", "notice", "vacate", "resign"],
  end: ["terminate", "termination", "expire", "notice"],
  start: ["begin", "commence", "starting"],
  begin: ["start", "commence"],
  bring: ["provide", "submit", "documents", "following"],
  documents: ["provide", "submit", "bring", "copy", "proof", "certificate"],
  need: ["must", "required", "provide", "require"],
  allowed: ["permitted", "may", "prohibited", "consent", "not"],
  can: ["may", "permitted", "allowed"],
  pet: ["pets", "animal"],
  money: ["fee", "deposit", "amount", "refund", "salary"],
  refund: ["refundable", "returned", "non-refundable", "nonrefundable"],
  back: ["returned", "refund", "refundable"],
  salary: ["pay", "wage", "remuneration", "gross"],
  holiday: ["leave", "vacation"],
  vacation: ["leave", "holiday"],
  contact: ["email", "phone", "reach", "office"],
  penalty: ["fee", "fine", "charge", "late"],
  happens: ["result", "will", "may"],
  renew: ["renewal", "renewed", "extend"],
  visa: ["consular", "immigration", "permit"],
  housing: ["dormitory", "accommodation"],
  dorm: ["dormitory", "accommodation"],
  move: ["moving", "keys", "tenancy"],
  work: ["employment", "job", "office"],
  remote: ["remotely", "home"],
};

const QUESTION_WORDS = new Set(
  ["what", "when", "where", "who", "whom", "which", "why", "how", "doe", "do", "did", "is", "are", "can", "could", "will", "would", "should", "tell", "me", "about", "pleas", "explain", "document", "say", "there", "any", "thi", "it", "get", "happen", "long", "many", "much", "i", "my", "need", "have"].map(stem),
);

const DATE_WORDS = new Set(["due", "deadline", "date", "latest"].map(stem));

interface Indexed {
  sentence: Sentence;
  tokens: string[];
  tf: Map<string, number>;
}

export function answerLocally(blocks: Block[], question: string): LocalAnswer {
  const sentences = toSentences(blocks).filter((s) => !s.heading && s.text.trim().length > 15);
  if (!sentences.length) return { answerable: false, text: NOT_ENOUGH, citations: [] };

  const index: Indexed[] = sentences.map((sentence) => {
    const tokens = contentTokens(sentence.text);
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    return { sentence, tokens, tf };
  });
  const df = new Map<string, number>();
  for (const d of index) for (const t of d.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const N = index.length;
  const avgLen = index.reduce((a, d) => a + d.tokens.length, 0) / N || 1;
  const idf = (t: string) => Math.log(1 + (N - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));

  const rawTerms = [...new Set(contentTokens(question))];
  // Core terms carry the meaning of the question; question words do not.
  const q = question.toLowerCase();
  const wantsDate = /\b(when|what date|which date|deadline|due|how long|by what|until when)\b/.test(q);
  let core = rawTerms.filter((t) => !QUESTION_WORDS.has(t));
  // In "when is X due?", "due" asks for a date; it is not something to look up.
  if (wantsDate) {
    const withoutDateWords = core.filter((t) => !DATE_WORDS.has(t));
    if (withoutDateWords.length) core = withoutDateWords;
  }
  const wantsMoney = /\b(how much|cost|price|fee|amount|salary|rent|deposit|pay)\b/.test(q);

  if (!core.length) {
    return { answerable: false, text: `${NOT_ENOUGH} Try asking about something specific in the document, such as a payment, a date or a requirement.`, citations: [] };
  }

  const expanded = new Map<string, number>();
  for (const t of core) expanded.set(t, 1);
  for (const word of q.match(/[a-z]+/g) ?? []) {
    for (const syn of SYNONYMS[word] ?? SYNONYMS[stem(word)] ?? []) {
      const s = stem(syn);
      if (!expanded.has(s)) expanded.set(s, 0.45);
    }
  }

  const k1 = 1.4;
  const b = 0.7;
  const scored = index
    .map((d, i) => {
      let score = 0;
      for (const [t, weight] of expanded) {
        const f = d.tf.get(t);
        if (!f) continue;
        score += weight * idf(t) * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.tokens.length) / avgLen)));
      }
      if (score > 0) {
        if (wantsDate) {
          const found = findDates(d.sentence.text);
          if (found.some((f) => f.iso)) score *= 1.7;
          else if (found.length) score *= 1.15;
        }
        if (wantsMoney && /[$€£₽]\s?\d|\d\s?(?:USD|EUR|RUB|%)/.test(d.sentence.text)) score *= 1.4;
      }
      return { d, i, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b2) => b2.score - a.score);

  if (!scored.length) return { answerable: false, text: NOT_ENOUGH, citations: [] };

  // How much of the question's core vocabulary does the best passage cover?
  const coverage = (d: Indexed) => {
    let total = 0;
    let hit = 0;
    for (const t of core) {
      const w = df.has(t) ? idf(t) : 2.5; // words absent from the document weigh heavily
      total += w;
      if (d.tf.has(t)) hit += w;
    }
    return total ? hit / total : 0;
  };

  const best = scored[0];
  const bestCoverage = coverage(best.d);
  const missing = core.filter((t) => !df.has(t));
  const toCitation = (s: Sentence): Citation => ({ page: s.page, blockId: s.blockId, quote: s.text });

  const top = scored.filter((x) => x.score >= best.score * 0.55).slice(0, 3);
  const citations = dedupe(top.map((x) => toCitation(x.d.sentence)));

  const confident = bestCoverage >= 0.6 || (bestCoverage >= 0.45 && core.length >= 3 && missing.length === 0);
  if (!confident) {
    return {
      answerable: false,
      text:
        bestCoverage >= 0.3
          ? `${NOT_ENOUGH} The passages below are the closest matches, but they may not answer your question.`
          : NOT_ENOUGH,
      citations: bestCoverage >= 0.3 ? citations.slice(0, 2) : [],
    };
  }

  // Include the following sentence when it continues the same paragraph and the hit is short.
  let answer = best.d.sentence.text;
  const next = index[best.i + 1];
  if (next && next.sentence.blockId === best.d.sentence.blockId && answer.length < 140) answer = `${answer} ${next.sentence.text}`;

  return { answerable: true, text: answer.replace(/^\s*(?:[-*•–]|\(?[a-z\d]{1,3}[.)])\s+/i, ""), citations };
}

function dedupe(citations: Citation[]): Citation[] {
  const seen = new Set<string>();
  return citations.filter((c) => (seen.has(c.quote) ? false : (seen.add(c.quote), true)));
}
