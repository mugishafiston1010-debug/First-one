/**
 * The preparation checklist. Item ids are stable: progress is stored against them
 * (localStorage now, a user account later), so never reuse or rename an id — add a new one instead.
 * Items describe general steps only. Exact rules always come from the university and official authorities.
 */
export type ChecklistItem = { id: string; title: string; detail?: string; link?: { label: string; href: string } };
export type ChecklistGroup = { id: string; title: string; items: ChecklistItem[] };

export const CHECKLIST_VERSION = 1;

export const CHECKLIST: ChecklistGroup[] = [
  {
    id: "university",
    title: "University preparation",
    items: [
      { id: "uni-shortlist", title: "Shortlist universities and programmes", detail: "Compare programmes, language of study and city.", link: { label: "City guides", href: "/cities" } },
      { id: "uni-official-req", title: "Read the admission requirements on the university's official website", detail: "Requirements and deadlines differ by university and change every year." },
      { id: "uni-language", title: "Check the language of instruction", detail: "Many programmes are taught in Russian and include a preparatory language year." },
      { id: "uni-apply", title: "Submit your application through the official channel" },
      { id: "uni-offer", title: "Receive your admission letter or invitation", detail: "Keep the original and digital copies." },
      { id: "uni-contact", title: "Save the contact details of the international office", detail: "They are your first point of contact for official questions." },
    ],
  },
  {
    id: "travel",
    title: "Travel preparation",
    items: [
      { id: "travel-passport", title: "Check your passport validity", detail: "Confirm the minimum validity required with the Russian embassy or consulate." },
      { id: "travel-visa", title: "Apply for your study visa through the official embassy or consulate", detail: "Follow the instructions given by your university and the embassy. AfroStart does not give visa advice." },
      { id: "travel-medical", title: "Prepare the medical documents your university asks for" },
      { id: "travel-copies", title: "Make paper and digital copies of all important documents", detail: "Store digital copies somewhere secure that you can access offline." },
      { id: "travel-ticket", title: "Book your flight once your visa is issued" },
      { id: "travel-money", title: "Plan how you will access money in Russia", detail: "Ask your university and current students which options work for international students. See our guides.", link: { label: "Guides", href: "/guides" } },
      { id: "travel-pack", title: "Pack for the climate", detail: "Winters are long and cold in most university cities. Many students buy winter clothing after arrival." },
    ],
  },
  {
    id: "accommodation",
    title: "Accommodation preparation",
    items: [
      { id: "acc-dorm", title: "Ask your university about a dormitory place" },
      { id: "acc-address", title: "Know the address where you will stay on arrival" },
      { id: "acc-private", title: "If renting privately, only use reviewed services and never pay before seeing a contract", link: { label: "Accommodation services", href: "/services?category=accommodation" } },
    ],
  },
  {
    id: "arrival",
    title: "Arrival preparation",
    items: [
      { id: "arr-pickup", title: "Arrange airport pickup or plan your route to the city" },
      { id: "arr-contact", title: "Share your arrival details with your university or a trusted contact" },
      { id: "arr-cash", title: "Carry a small amount of money for the first days" },
      { id: "arr-offline", title: "Download offline maps and a translation app before you fly" },
    ],
  },
  {
    id: "first-week",
    title: "First-week tasks",
    items: [
      { id: "wk-register", title: "Complete migration registration as instructed by your university", detail: "Deadlines are strict. Your university's international office will tell you exactly what to do." },
      { id: "wk-sim", title: "Get a local SIM card" },
      { id: "wk-transport", title: "Learn the public transport routes to your university" },
      { id: "wk-shop", title: "Find the nearest supermarket and pharmacy" },
      { id: "wk-community", title: "Connect with other African students in your city", link: { label: "City guides", href: "/cities" } },
      { id: "wk-docs", title: "Keep all documents you receive in one safe folder" },
    ],
  },
];

export const ALL_ITEM_IDS = CHECKLIST.flatMap((g) => g.items.map((i) => i.id));
