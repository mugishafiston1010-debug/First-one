import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
import { dictFor } from "./i18n";
import en from "./i18n/en";

describe("i18n", () => {
  it("falls back to English for missing languages", () => {
    expect(dictFor("rw")).toBe(en);
  });
  it("uses Russian strings and keeps every English key", () => {
    const ru = dictFor("ru");
    expect(ru.nav.guides).toBe("Гайды");
    for (const section of Object.keys(en) as (keyof typeof en)[])
      for (const key of Object.keys(en[section])) expect(ru[section]).toHaveProperty(key);
  });
});
