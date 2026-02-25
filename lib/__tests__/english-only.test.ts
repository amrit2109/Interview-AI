import { describe, it, expect } from "vitest";
import { isEnglish } from "@/lib/language/english-only";

describe("isEnglish", () => {
  it("accepts empty or short text", () => {
    expect(isEnglish("").isEnglish).toBe(true);
    expect(isEnglish("   ").isEnglish).toBe(true);
    expect(isEnglish("Hi").isEnglish).toBe(true);
    expect(isEnglish("Yes").isEnglish).toBe(true);
  });

  it("accepts English text", () => {
    expect(isEnglish("I have five years of experience in React.").isEnglish).toBe(true);
    expect(isEnglish("The quick brown fox jumps over the lazy dog.").isEnglish).toBe(true);
  });

  it("rejects Devanagari (Hindi)", () => {
    const r = isEnglish("मैं रिएक्ट में पांच साल का अनुभव रखता हूं।");
    expect(r.isEnglish).toBe(false);
    expect(r.reason).toContain("English");
  });

  it("rejects Cyrillic (Russian)", () => {
    const r = isEnglish("У меня пять лет опыта в React.");
    expect(r.isEnglish).toBe(false);
    expect(r.reason).toContain("English");
  });

  it("rejects Arabic", () => {
    const r = isEnglish("لدي خمس سنوات من الخبرة في React.");
    expect(r.isEnglish).toBe(false);
    expect(r.reason).toContain("English");
  });

  it("rejects CJK (Chinese)", () => {
    const r = isEnglish("我有五年React经验，擅长前端开发。");
    expect(r.isEnglish).toBe(false);
    expect(r.reason).toContain("English");
  });
});
