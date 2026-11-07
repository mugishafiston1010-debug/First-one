import type { BusinessCategory, CityResourceKind, GuideStage, OpportunityType, TrustLevel } from "@prisma/client";

export const BUSINESS_CATEGORIES: { value: BusinessCategory; label: string; slug: string }[] = [
  { value: "ACCOMMODATION", label: "Accommodation", slug: "accommodation" },
  { value: "FOOD_GROCERY", label: "African food & groceries", slug: "food-grocery" },
  { value: "RESTAURANT", label: "Restaurants", slug: "restaurants" },
  { value: "TRANSLATION", label: "Translation", slug: "translation" },
  { value: "TUTORING", label: "Tutoring", slug: "tutoring" },
  { value: "TRANSPORT", label: "Transport", slug: "transport" },
  { value: "STUDENT_SUPPORT", label: "Student support", slug: "student-support" },
  { value: "OTHER", label: "Other services", slug: "other" },
];
export const businessCategoryLabel = (c: BusinessCategory) => BUSINESS_CATEGORIES.find((x) => x.value === c)?.label ?? c;
export const categoryFromSlug = (s: string | undefined) => BUSINESS_CATEGORIES.find((x) => x.slug === s)?.value;

export const OPPORTUNITY_TYPES: { value: OpportunityType; label: string }[] = [
  { value: "SCHOLARSHIP", label: "Scholarship" },
  { value: "ADMISSION", label: "Admission" },
  { value: "COMPETITION", label: "Competition" },
  { value: "INTERNSHIP", label: "Internship" },
  { value: "EVENT", label: "Event" },
  { value: "PROGRAMME", label: "Programme" },
];
export const opportunityTypeLabel = (t: OpportunityType) => OPPORTUNITY_TYPES.find((x) => x.value === t)?.label ?? t;

export const GUIDE_STAGES: { value: GuideStage; label: string; slug: string; blurb: string }[] = [
  { value: "BEFORE_TRAVEL", label: "Before travelling", slug: "before-travelling", blurb: "Documents, admission and what to pack." },
  { value: "AFTER_ARRIVAL", label: "After arriving", slug: "after-arriving", blurb: "Your first days, transport, housing and money." },
  { value: "STUDENT_LIFE", label: "Student life", slug: "student-life", blurb: "Studying, language, community and budgeting." },
];

export const CITY_RESOURCE_KINDS: { value: CityResourceKind; label: string }[] = [
  { value: "ACCOMMODATION", label: "Accommodation" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "USEFUL_LOCATION", label: "Useful locations" },
  { value: "LOCAL_RESOURCE", label: "Local resources" },
  { value: "OTHER", label: "Other" },
];

export const TRUST_LEVELS: { value: TrustLevel; label: string; explain: string }[] = [
  { value: "OFFICIAL", label: "Official source", explain: "Taken from a government, university or other official source. Always confirm on the linked source." },
  { value: "EDITORIAL", label: "AfroStart editorial", explain: "Written by the AfroStart team from practical experience. General guidance, not legal advice." },
  { value: "VERIFIED_PROVIDER", label: "Verified provider", explain: "Supplied by a business the AfroStart team has checked." },
  { value: "STUDENT", label: "Student contributed", explain: "Shared by a student. Not independently checked." },
  { value: "SPONSORED", label: "Sponsored", explain: "Paid content. The sponsor paid for visibility, not for our verification." },
];
export const trustInfo = (t: TrustLevel) => TRUST_LEVELS.find((x) => x.value === t)!;
