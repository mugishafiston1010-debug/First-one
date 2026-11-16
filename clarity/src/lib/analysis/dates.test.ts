import { describe, expect, it } from "vitest";
import { daysUntil, findDates, isDeadline, relativeLabel } from "./dates";

const now = new Date(2026, 10, 16); // 16 Nov 2026

describe("findDates", () => {
  it("reads the common written formats", () => {
    const text = "Signed on 3 March 2027, effective March 15, 2027, reviewed 2027-04-01 and filed 02.05.2027.";
    expect(findDates(text).map((d) => d.iso)).toEqual(["2027-03-03", "2027-03-15", "2027-04-01", "2027-05-02"]);
  });

  it("handles ordinals and abbreviated months", () => {
    expect(findDates("Due on the 1st of Feb. 2027 and Sept 22nd, 2027.").map((d) => d.iso)).toEqual(["2027-02-01", "2027-09-22"]);
  });

  it("rejects impossible dates instead of guessing", () => {
    expect(findDates("Meet on 31 February 2027 or 2027-13-40.")).toEqual([]);
  });

  it("flags ambiguous numeric dates for verification", () => {
    const [d] = findDates("Induction on 03/04/2027.");
    expect(d.iso).toBe("2027-03-04");
    expect(d.uncertainty).toMatch(/day-first or month-first/);
  });

  it("resolves numeric dates that can only be read one way", () => {
    expect(findDates("Paid 25/12/2026.")[0]).toMatchObject({ iso: "2026-12-25" });
    expect(findDates("Paid 25/12/2026.")[0].uncertainty).toBeUndefined();
  });

  it("flags a missing year and says which year it assumed", () => {
    const [d] = findDates("Return the form by 5 January.", { now });
    expect(d.iso).toBe("2027-01-05");
    expect(d.uncertainty).toMatch(/no year/);
  });

  it("keeps relative deadlines without inventing a calendar date", () => {
    const [d] = findDates("You must register within 3 working days of arrival.");
    expect(d.relative).toBe(true);
    expect(d.iso).toBeUndefined();
    expect(d.raw).toBe("within 3 working days of arrival");
  });

  it('does not mistake the verb "may" for a month', () => {
    expect(findDates("The tenant may 2 times request a repair.")).toEqual([]);
  });
});

describe("isDeadline", () => {
  it("distinguishes deadlines from plain events", () => {
    const due = "Pay the deposit no later than 1 December 2026.";
    const event = "Classes begin on 21 January 2027.";
    expect(isDeadline(due, findDates(due)[0])).toBe(true);
    expect(isDeadline(event, findDates(event)[0])).toBe(false);
  });
});

describe("relative labels", () => {
  it("counts whole days", () => {
    expect(daysUntil("2026-11-23", now)).toBe(7);
    expect(relativeLabel("2026-11-16", now)).toBe("Today");
    expect(relativeLabel("2026-11-13", now)).toBe("3 days ago");
  });
});
