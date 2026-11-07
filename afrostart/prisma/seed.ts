/**
 * Starter content. Safe to run more than once (it upserts by slug and never overwrites your edits).
 *
 * Honesty rules for this seed:
 * - Only well-known, stable facts are used (city names and regions, major universities and their official domains).
 * - Nothing is marked as verified: every `lastVerifiedAt` is null, so the site shows "Not yet verified"
 *   until an admin checks the item and sets the date.
 * - No businesses are seeded. Opportunities are seeded as DRAFTS for an admin to check and open.
 */
import { PrismaClient, type GuideStage } from "@prisma/client";

const db = new PrismaClient();

const CATEGORIES: { slug: string; name: string; stage: GuideStage; sortOrder: number; description: string }[] = [
  { slug: "preparing", name: "Preparing to study", stage: "BEFORE_TRAVEL", sortOrder: 10, description: "Choosing, applying and getting ready." },
  { slug: "documents", name: "Documents", stage: "BEFORE_TRAVEL", sortOrder: 20, description: "What to prepare and keep safe." },
  { slug: "packing", name: "Packing", stage: "BEFORE_TRAVEL", sortOrder: 30, description: "What to bring." },
  { slug: "first-days", name: "First days", stage: "AFTER_ARRIVAL", sortOrder: 10, description: "Arrival and your first week." },
  { slug: "accommodation", name: "Accommodation", stage: "AFTER_ARRIVAL", sortOrder: 20, description: "Dormitories and renting." },
  { slug: "everyday-life", name: "Everyday life", stage: "AFTER_ARRIVAL", sortOrder: 30, description: "Shopping, connectivity, money and weather." },
  { slug: "studying", name: "Studying", stage: "STUDENT_LIFE", sortOrder: 10, description: "University life and learning Russian." },
  { slug: "money", name: "Money and budgeting", stage: "STUDENT_LIFE", sortOrder: 20, description: "Managing student expenses." },
];

const CITIES = [
  {
    slug: "moscow", name: "Moscow", region: "Moscow", sortOrder: 10,
    tagline: "Russia's capital and largest city, with the widest choice of universities.",
    intro: "Moscow is the capital and largest city of Russia. It hosts many of the country's major universities, and many international students — including students from across Africa — study here.\n\nThe city is large: plan extra time for journeys, and learn the metro early. Living costs are generally higher than in most other Russian cities.",
    universities: [
      ["Lomonosov Moscow State University", "MSU", "https://www.msu.ru"],
      ["Peoples' Friendship University of Russia (RUDN University)", "RUDN", "https://www.rudn.ru"],
      ["HSE University (Higher School of Economics)", "HSE", "https://www.hse.ru"],
      ["Bauman Moscow State Technical University", "BMSTU", "https://bmstu.ru"],
      ["National Research Nuclear University MEPhI", "MEPhI", "https://mephi.ru"],
    ],
  },
  {
    slug: "saint-petersburg", name: "Saint Petersburg", region: "Saint Petersburg", sortOrder: 20,
    tagline: "Russia's second city, known for its historic centre and long summer evenings.",
    intro: "Saint Petersburg is Russia's second-largest city, on the Gulf of Finland. It was the imperial capital and is known for its historic centre, museums and canals.\n\nIn early summer the nights stay light (the “white nights”); in winter the days are short. The city has a large metro and many universities.",
    universities: [
      ["Saint Petersburg State University", "SPbU", "https://spbu.ru"],
      ["Peter the Great St. Petersburg Polytechnic University", "SPbPU", "https://www.spbstu.ru"],
      ["ITMO University", "ITMO", "https://itmo.ru"],
    ],
  },
  {
    slug: "kazan", name: "Kazan", region: "Republic of Tatarstan", sortOrder: 30,
    tagline: "Capital of Tatarstan on the Volga — a major student city.",
    intro: "Kazan is the capital of the Republic of Tatarstan and lies on the Volga River. It is a large university city with a mix of Russian and Tatar culture.",
    universities: [
      ["Kazan Federal University", "KFU", "https://kpfu.ru"],
      ["Kazan State Medical University", "KSMU", "https://kazangmu.ru"],
    ],
  },
  {
    slug: "voronezh", name: "Voronezh", region: "Voronezh Oblast", sortOrder: 40,
    tagline: "A large student city in south-western Russia.",
    intro: "Voronezh is the centre of Voronezh Oblast in south-western European Russia. It has several universities that accept international students, including medical and technical universities.",
    universities: [
      ["Voronezh State University", "VSU", "https://www.vsu.ru"],
      ["Voronezh State Technical University", "VSTU", "https://cchgeu.ru"],
      ["N. N. Burdenko Voronezh State Medical University", "VSMU", "https://vrngmu.ru"],
    ],
  },
  {
    slug: "tomsk", name: "Tomsk", region: "Tomsk Oblast", sortOrder: 50,
    tagline: "One of Siberia's oldest cities and a true student town.",
    intro: "Tomsk is one of the oldest cities in Siberia and is known as a student city: a large share of its population studies at its universities.\n\nWinters are long and very cold, so warm clothing matters. The city is compact, and most universities are close to the centre.",
    universities: [
      ["Tomsk State University", "TSU", "https://www.tsu.ru"],
      ["Tomsk Polytechnic University", "TPU", "https://tpu.ru"],
      ["Siberian State Medical University", "SibMed", "https://ssmu.ru"],
      ["Tomsk State University of Control Systems and Radioelectronics", "TUSUR", "https://tusur.ru"],
    ],
  },
  {
    slug: "nizhny-novgorod", name: "Nizhny Novgorod", region: "Nizhny Novgorod Oblast", sortOrder: 60,
    tagline: "Where the Oka meets the Volga.",
    intro: "Nizhny Novgorod stands where the Oka River flows into the Volga. It is one of Russia's larger cities, with a historic kremlin and several universities.",
    universities: [
      ["Lobachevsky University (National Research Nizhny Novgorod State University)", "UNN", "https://www.unn.ru"],
      ["Privolzhsky Research Medical University", "PRMU", "https://pimunn.ru"],
      ["Nizhny Novgorod State Technical University n.a. R. E. Alekseev", "NNSTU", "https://www.nntu.ru"],
    ],
  },
  {
    slug: "obninsk", name: "Obninsk", region: "Kaluga Oblast", sortOrder: 70,
    tagline: "Russia's first science city, south-west of Moscow.",
    intro: "Obninsk is a science city in Kaluga Oblast, south-west of Moscow. It is where the world's first nuclear power plant to supply electricity to a grid began operating in 1954, and it remains a centre for nuclear science and engineering education.",
    universities: [["Obninsk Institute for Nuclear Power Engineering, NRNU MEPhI", "IATE", "https://oiate.ru"]],
  },
] as const;

const GUIDES: { slug: string; title: string; category: string; summary: string; body: string; sources: [string, string][] }[] = [
  {
    slug: "preparing-to-study-in-russia",
    category: "preparing",
    title: "Preparing to study in Russia: where to start",
    summary: "A step-by-step overview of the journey from choosing a university to arriving in Russia, and where to find official information.",
    body: `Moving to Russia to study is a big step. This guide gives you the order of things. The exact rules come from your university and the official authorities — always follow them.

## 1. Choose a programme and a city
Think about your field, the language of instruction and the city. Many programmes are taught in Russian and start with a preparatory year of Russian language. Some programmes are taught in English. Our [city guides](/cities) list major universities in each city.

## 2. Read the official admission requirements
Each university publishes its own requirements, deadlines and fees on its official website. Requirements change every year, so always use the current page.

## 3. Apply through an official channel
Apply directly to the university, or through an official government scholarship programme where you are eligible. Be careful with agents who ask for large fees — ask current students and the university's international office if you are unsure.

## 4. Get your invitation and visa
After admission, the university arranges the documents needed for a study visa. You then apply at the Russian embassy or consulate in your country. AfroStart does not give visa advice: follow the embassy's instructions.

## 5. Prepare to travel
Use our [checklist](/checklist) to track documents, packing and arrival tasks.`,
    sources: [["Study in Russia — official portal for international applicants", "https://russia.study"]],
  },
  {
    slug: "important-documents",
    category: "documents",
    title: "Important documents to prepare and keep safe",
    summary: "The kinds of documents students usually need, and how to keep them safe. Your university gives the definitive list.",
    body: `Your university and the embassy tell you exactly which documents you need. This guide helps you stay organised.

## Documents students commonly need
- A valid passport
- Your admission letter or invitation from the university
- Your study visa
- Education certificates and transcripts, translated or certified **if your university asks for it**
- Medical certificates **if your university asks for them**

## Keep them safe
- Make paper copies and secure digital copies of every document.
- Keep originals in one folder that you carry in your hand luggage when you travel.
- After arrival, keep every document you receive (for example registration papers) together with your passport.

## Never send originals to strangers
No legitimate service needs your original passport sent by post or a scan sent over a chat app to a person you do not know. AfroStart will never ask you for identity documents.`,
    sources: [],
  },
  {
    slug: "what-to-pack",
    category: "packing",
    title: "What to pack for student life in Russia",
    summary: "Practical packing advice for the climate, electronics and your first weeks.",
    body: `## Clothing
Most Russian university cities have long, cold winters. You do not need to bring everything: many students buy a winter coat and boots after arriving, once they see what local people wear. Bring warm layers for your first days.

## Electronics
Russia uses 220 V electricity and European two-pin plugs (types C and F). Bring an adapter if your devices use a different plug.

## Medicines
If you take regular medication, bring a supply with the doctor's prescription, and check with the embassy whether any of your medicines need special permission.

## Food and home
A few familiar spices or foods can help with homesickness in the first weeks. Our [services directory](/services) lists reviewed African food shops as they are added.

## Documents
Keep all documents in your hand luggage. See [Important documents](/guides/important-documents).`,
    sources: [],
  },
  {
    slug: "first-days-in-russia",
    category: "first-days",
    title: "Your first days in Russia",
    summary: "What to focus on in your first week: registration, a SIM card, transport and getting to know your area.",
    body: `## Migration registration comes first
International students must complete migration registration within a short legal deadline after arrival. In most cases your university's international office handles it or tells you exactly what to do. **Go to the international office as soon as you arrive** and follow their instructions. Do not rely on friends' advice for deadlines — ask the office.

## Get a local SIM card
Mobile operators sell SIM cards in their own shops. You will usually need your passport. A local number makes everyday life much easier.

## Learn your routes
Find out how to get from your dormitory to your faculty, the nearest supermarket and a pharmacy. Download offline maps.

## Meet other students
Ask the international office or student associations about communities of African students in your city. See the [city guides](/cities).`,
    sources: [],
  },
  {
    slug: "finding-accommodation-safely",
    category: "accommodation",
    title: "Finding accommodation safely",
    summary: "University dormitories, private rentals, and how to avoid common rental scams.",
    body: `## University dormitories
Most universities offer dormitory places to international students. Ask the international office early: places can be limited.

## Renting privately
If you rent a flat or room privately:
- Visit the place in person, or ask a trusted friend to do so.
- Sign a written contract that states the price, deposit and what is included.
- Make sure the landlord can support your migration registration at that address if needed — ask your international office what is required.

## Avoid scams
- Never pay a deposit before seeing the place and a contract.
- Be careful with offers that are much cheaper than similar places.
- Use services other students have reviewed. Our [accommodation listings](/services?category=accommodation) are checked before publishing.`,
    sources: [],
  },
  {
    slug: "adapting-to-the-russian-winter",
    category: "everyday-life",
    title: "Adapting to the Russian winter",
    summary: "Practical tips for staying warm, safe and well during your first winter.",
    body: `For many African students, the first winter is the biggest adjustment.

## Dress in layers
Several thin layers keep you warmer than one thick one. Protect your head, hands and ears. Choose boots with good grip.

## Watch out for ice
Pavements can be icy. Walk carefully, and be careful near buildings where ice and snow can fall from roofs.

## Short days
Days are short in winter, especially in the north and in Siberia. Keep a regular routine, stay active and spend time with friends. If you feel low for a long time, talk to your university's student support or a doctor.

## Indoors
Buildings are usually well heated, so indoor air can be dry. Drink enough water.`,
    sources: [],
  },
  {
    slug: "learning-russian",
    category: "studying",
    title: "Learning Russian: a practical approach",
    summary: "How to make progress with Russian, whether you study in Russian or in English.",
    body: `Even if your programme is in English, Russian makes daily life much easier.

## Use the preparatory year well
If you join a preparatory faculty, treat it as your most important year: your degree studies will build on it.

## Practise every day
- Learn the Cyrillic alphabet before you travel.
- Speak Russian in shops and on transport, even if it is slow.
- Make Russian-speaking friends and join student clubs.

## Be patient
Everyone finds the first months hard. Progress comes from daily practice.`,
    sources: [],
  },
  {
    slug: "managing-student-expenses",
    category: "money",
    title: "Managing your student budget",
    summary: "Simple ways to plan and control spending as a student in Russia.",
    body: `## Make a monthly plan
List your fixed costs (accommodation, mobile, transport) and your variable costs (food, clothing, leisure). Costs vary a lot between cities — Moscow and Saint Petersburg are usually the most expensive.

## Save on everyday costs
- Cook with friends instead of eating out often.
- Ask about student transport passes in your city.
- Buy winter clothing once, and well.

## Plan how money reaches you
Ask your university and current students which ways of receiving money work for international students in your city, and check fees before you use a service.

## Keep an emergency reserve
Try to keep some money aside for unexpected costs.`,
    sources: [],
  },
];

const OPPORTUNITIES = [
  {
    slug: "russian-government-scholarship-quota",
    title: "Russian Government scholarships for international students (quota)",
    type: "SCHOLARSHIP" as const,
    summary: "The Russian Government offers state-funded study places for international students each year. Check the official portal for the current round.",
    description: "DRAFT — an admin must check the official source and update this description, eligibility and the deadline before opening it.",
    eligibility: "DRAFT — copy the current eligibility rules from the official source.",
    countryEligibility: "DRAFT — check the official source",
    applyUrl: "https://education-in-russia.com",
    sourceName: "Official application portal",
    sourceUrl: "https://education-in-russia.com",
  },
  {
    slug: "open-doors-olympiad",
    title: "Open Doors: Russian Scholarship Project",
    type: "COMPETITION" as const,
    summary: "An international olympiad for prospective master's and doctoral students; winners can receive admission to Russian universities.",
    description: "DRAFT — an admin must check the official source and update this description, eligibility and the deadline before opening it.",
    eligibility: "DRAFT — copy the current eligibility rules from the official source.",
    countryEligibility: "DRAFT — check the official source",
    applyUrl: "https://od.globaluni.ru",
    sourceName: "Open Doors official website",
    sourceUrl: "https://od.globaluni.ru",
  },
];

async function main() {
  const cats: Record<string, string> = {};
  for (const c of CATEGORIES) {
    const row = await db.guideCategory.upsert({ where: { slug: c.slug }, update: {}, create: c });
    cats[c.slug] = row.id;
  }

  for (const c of CITIES) {
    const { universities, ...data } = c;
    const city = await db.city.upsert({ where: { slug: c.slug }, update: {}, create: { ...data, published: true } });
    for (const [name, shortName, websiteUrl] of universities) {
      const slug = `${c.slug}-${shortName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      await db.university.upsert({ where: { slug }, update: {}, create: { slug, name, shortName, websiteUrl, cityId: city.id } });
    }
  }

  for (const g of GUIDES) {
    const exists = await db.guide.findUnique({ where: { slug_locale: { slug: g.slug, locale: "en" } } });
    if (exists) continue;
    await db.guide.create({
      data: {
        slug: g.slug, locale: "en", title: g.title, summary: g.summary, body: g.body, categoryId: cats[g.category],
        country: "Russia", trust: "EDITORIAL", published: true, publishedAt: new Date(),
        sources: { create: [...new Map(g.sources.map(([label, url]) => [url, label])).entries()].map(([url, label], i) => ({ label, url, sort: i })) },
      },
    });
  }

  for (const o of OPPORTUNITIES) {
    await db.opportunity.upsert({ where: { slug: o.slug }, update: {}, create: { ...o, status: "DRAFT", trust: "OFFICIAL" } });
  }

  console.log("Seed complete: categories, cities, universities, editorial guides, draft opportunities.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
