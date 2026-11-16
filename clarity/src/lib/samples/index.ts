/**
 * Realistic sample documents so Clarity can be explored without uploading
 * anything. They are analysed by the same engine as real uploads - nothing
 * about their analysis is pre-written.
 *
 * Dates use {{+N}} placeholders (days from today) so deadlines stay in the
 * near future whenever the samples are loaded. \f marks a page break.
 */
import { pagesToBlocks } from "../text";
import type { ExtractedDocument } from "../types";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function renderTemplate(template: string, now: Date = new Date()): string {
  return template.replace(/\{\{([+-]\d+)(\|us)?\}\}/g, (_, offset: string, us?: string) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + Number(offset));
    return us ? `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}` : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  });
}

interface SampleSource {
  id: string;
  name: string;
  blurb: string;
  template: string;
}

const LEASE = `RESIDENTIAL LEASE AGREEMENT

Date: {{-3}}

This Residential Lease Agreement (the "Agreement") is made between Northgate Property Management Ltd. (the "Landlord") and Daniel Okafor (the "Tenant") for the apartment at 14 Linden Court, Apartment 6B (the "Premises").

1. TERM

The tenancy shall commence on {{+21}} and shall continue for a fixed term of twelve (12) months. Unless either party gives written notice at least sixty (60) days before the end of the term, this Agreement will automatically renew for a further twelve months at the rent then in effect.

2. RENT

The monthly rent is $1,450. The Tenant shall pay the first month's rent no later than {{+14}}. Thereafter rent is due on the first day of each calendar month and must be paid by bank transfer to the account stated in Schedule A.

If rent is received more than five (5) days after the due date, a late fee of $75 will be charged. Rent that remains unpaid for thirty days constitutes a material breach of this Agreement.

3. SECURITY DEPOSIT

The Tenant must pay a security deposit of $2,175 by {{+7}}. The deposit will be held by the Landlord and returned within 30 days of the end of the tenancy, less any deductions for unpaid rent or damage beyond normal wear and tear.

The holding fee of $200 already paid is non-refundable if the Tenant withdraws before the start date.
\f
4. BEFORE MOVING IN

Before keys are released, the Tenant must provide the following documents to the Landlord's office:

- A copy of a valid passport or government-issued ID
- Proof of income covering the last three months
- Proof of renters insurance with liability cover of at least $100,000
- The signed copy of this Agreement

The Tenant is required to return the signed inventory checklist within 7 days of moving in. If the checklist is not returned, the Landlord's record of the condition of the Premises will be treated as accurate.

The Tenant must set up electricity and internet accounts in their own name before {{+21}}. Water and building maintenance charges are included in the rent.

5. USE OF THE PREMISES

The Tenant shall not sublet the Premises or assign this Agreement without the Landlord's prior written consent. No more than two adults may occupy the Premises.

Pets are permitted only if the Tenant obtains written approval and pays an additional pet deposit of $300. Smoking is prohibited anywhere inside the building.

The Tenant must notify the Landlord immediately of any water leak, electrical fault or other damage. Failure to report damage promptly may result in the Tenant being held liable for the cost of resulting repairs.

6. LANDLORD'S OBLIGATIONS

The Landlord shall keep the structure, heating and plumbing in good repair and shall respond to urgent repair requests within 48 hours. The Landlord may enter the Premises for inspections on at least 24 hours' written notice, except in an emergency.
\f
7. ENDING THE TENANCY

The Tenant may end this Agreement early only after the first six months, by giving sixty (60) days' written notice and paying an early termination fee equal to one month's rent.

If the Tenant intends to leave at the end of the fixed term, written notice must be sent to notices@northgate-pm.example at least sixty (60) days before the end of the term. Otherwise the automatic renewal in Section 1 applies.

On moving out, the Tenant shall return all keys and leave the Premises professionally cleaned. Keys not returned on the final day will be charged at $50 per key.

8. GENERAL

This Agreement is governed by the laws of the jurisdiction in which the Premises are located. If any provision is found unenforceable, the remaining provisions continue in effect (severability). This document is the entire agreement between the parties.

A renewal inspection is scheduled for {{+200}}. The Landlord's office is open Monday to Friday, 9:00 to 17:00, and can be reached on 555-0142.

Signed: ______________________ (Tenant)      ______________________ (Landlord)`;

const ADMISSION = `RIVERSIDE TECHNICAL UNIVERSITY
Office of International Admissions

{{-5|us}}

Reference: INT-2027-04418

Dear Ms. Amara Nkemelu,

We are pleased to inform you that you have been offered conditional admission to the Bachelor of Engineering programme in Energy Systems, starting in the spring semester. This letter explains what you need to do to secure your place and prepare for arrival.

1. ACCEPTING YOUR OFFER

To accept this offer you must sign and return the enclosed acceptance form by {{+10|us}}. Offers that are not accepted by this date will lapse and the place may be given to another applicant.

You are required to pay a tuition deposit of $1,200 no later than {{+17|us}}. The deposit is non-refundable, but it will be deducted from your first semester tuition of $6,800.

2. CONDITIONS OF YOUR OFFER

Your admission is conditional. It becomes final only if you provide an official transcript showing completion of secondary education with an average of at least 75%, and proof of English proficiency (IELTS 6.0 or equivalent).

Certified translations are required for any document that is not in English. Documents issued outside the country must carry an apostille or consular legalization.

If you cannot meet a condition by the start of the semester, contact the admissions office before {{+30|us}} to request a deferral to the autumn intake. Deferral requests received after that date will not be considered.
\f
3. VISA AND ARRIVAL

Once your deposit is received, the university will issue a visa support letter within 15 business days. You should apply for your student visa as soon as you receive it, because consular processing can take up to six weeks.

Please bring the following documents with you when you arrive:

- Your passport, valid for at least 18 months after your arrival date
- The original transcript and diploma with certified translations
- A medical certificate issued within the last three months
- Six passport-size photographs
- Proof of health insurance valid for the full academic year

International students must register with the International Office within 3 working days of arrival. Failure to register on time may result in a fine and can affect your visa status.

Orientation for new international students takes place on {{+62|us}}. Attendance is mandatory. Classes begin on {{+66|us}}.

4. ACCOMMODATION

A place in the university dormitory is guaranteed only if you submit the housing application form by {{+24|us}}. The dormitory fee is $180 per month, payable at the start of each semester. If you prefer private accommodation, you are responsible for arranging it yourself.

5. FEES AND SCHOLARSHIPS

Tuition for each semester must be paid in full before the first day of classes. Students with an unpaid balance will not be able to register for courses.

You have been awarded a merit scholarship covering 20% of tuition for the first academic year. The scholarship is renewed each year provided that you maintain a grade average of at least 80% and complete a full course load.

If you have questions, contact us at admissions@riverside-tech.example or +1 555-0199. We look forward to welcoming you to campus.

Sincerely,

Dr. Helena Voss
Director of International Admissions`;

const EMPLOYMENT = `HALDEN ANALYTICS

{{-2}}

Private and confidential

Dear Priya Raman,

OFFER OF EMPLOYMENT - DATA ANALYST

We are delighted to offer you the position of Data Analyst at Halden Analytics (the "Company"). This letter sets out the main terms of your employment. Please read it carefully before signing.

Start date and place of work

Your employment will begin on {{+35}}. Your normal place of work will be our Harbour Street office, with the option to work remotely up to two days per week once your probation is complete.

Salary and benefits

Your gross annual salary will be $64,000, paid monthly in arrears on the last working day of each month. You will be eligible for a discretionary annual bonus of up to 8% of salary. The bonus is not guaranteed and depends on company and individual performance.

You are entitled to 25 days of paid annual leave per year, in addition to public holidays. Unused leave of up to five days may be carried over; any remaining days will be forfeited.

The Company will reimburse reasonable relocation expenses up to $3,000. If you resign within 12 months of your start date, you must repay the relocation payment in full.

Probation

Your employment is subject to a probationary period of three months. During probation either party may terminate the employment by giving one week's written notice. After probation the notice period is one month.
\f
What we need from you

To accept this offer, please sign and return this letter by {{+9}}. If we do not hear from you by that date, the offer will be withdrawn.

This offer is conditional on satisfactory references and proof of your right to work. You must provide the following before your start date:

- A copy of your passport or national identity card
- Proof of your right to work, such as a work permit or residence permit
- Contact details for two professional references
- Your degree certificate
- A completed direct deposit form

Please complete the online background check within 5 working days of receiving the invitation email. You should also send your bank details to payroll@halden.example by {{+28}} so that your first salary payment is not delayed.

Confidentiality and other work

You must not disclose confidential information belonging to the Company or its clients, during or after your employment. You shall not undertake other paid work without prior written consent from your manager.

Any intellectual property you create in the course of your employment belongs to the Company.

For six months after your employment ends, you agree not to solicit clients you worked with during your final year. This non-compete restriction applies only within the same metropolitan area.

General

Your first day will include an induction session at 9:30 at the Harbour Street office. A performance review is held after the probationary period, on or around {{+126}}.

This letter, together with the Employee Handbook, forms the entire agreement between you and the Company. It is governed by local employment law.

We very much hope you will accept, and we look forward to working with you.

Yours sincerely,

Marcus Lindqvist
Head of People, Halden Analytics

I accept the offer on the terms set out above.

Signed: ______________________    Date: ______________`;

export const SAMPLE_SOURCES: SampleSource[] = [
  { id: "sample-lease", name: "Apartment lease agreement.pdf", blurb: "12-month residential lease", template: LEASE },
  { id: "sample-admission", name: "University admission letter.pdf", blurb: "Conditional offer for an international student", template: ADMISSION },
  { id: "sample-employment", name: "Employment offer letter.pdf", blurb: "Job offer with conditions", template: EMPLOYMENT },
];

export function buildSample(source: SampleSource, now: Date = new Date()): ExtractedDocument & { id: string } {
  const text = renderTemplate(source.template, now);
  const pages = text.split("\f");
  const blocks = pagesToBlocks(pages);
  return {
    id: source.id,
    name: source.name,
    kind: "pdf",
    size: new TextEncoder().encode(text).length,
    pageCount: pages.length,
    paged: true,
    blocks,
    charCount: text.length,
    warnings: [],
  };
}
