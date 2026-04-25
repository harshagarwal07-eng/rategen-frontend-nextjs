import { describe, expect, it } from "vitest";
import { generateDates } from "@/components/forms/fd-tabs/departure-bulk-generate";

describe("generateDates", () => {
  describe("daily", () => {
    it("includes both endpoints across a month boundary", () => {
      const result = generateDates("2025-01-30", "2025-02-02", "daily", []);
      expect(result).toEqual([
        "2025-01-30",
        "2025-01-31",
        "2025-02-01",
        "2025-02-02",
      ]);
    });
  });

  describe("weekly", () => {
    it("steps every 7 days across a year boundary", () => {
      // Dec 20, 2025 (Sat) → Jan 17, 2026: should yield 5 dates 7 days apart
      const result = generateDates("2025-12-20", "2026-01-17", "weekly", []);
      expect(result).toEqual([
        "2025-12-20",
        "2025-12-27",
        "2026-01-03",
        "2026-01-10",
        "2026-01-17",
      ]);
    });
  });

  describe("monthly with day=31", () => {
    it("skips Feb, Apr, Jun, Sep, Nov in the same year", () => {
      const result = generateDates("2025-01-31", "2025-12-31", "monthly", []);
      expect(result).toEqual([
        "2025-01-31",
        "2025-03-31",
        "2025-05-31",
        "2025-07-31",
        "2025-08-31",
        "2025-10-31",
        "2025-12-31",
      ]);
    });
  });

  describe("monthly with day=29", () => {
    it("includes Feb 29 in a leap year", () => {
      // 2024 is a leap year → Feb 29 exists
      const result = generateDates("2024-01-29", "2024-04-29", "monthly", []);
      expect(result).toEqual([
        "2024-01-29",
        "2024-02-29",
        "2024-03-29",
        "2024-04-29",
      ]);
    });

    it("skips Feb in a non-leap year", () => {
      // 2025 is not a leap year → Feb has no 29th, skip
      const result = generateDates("2025-01-29", "2025-04-29", "monthly", []);
      expect(result).toEqual([
        "2025-01-29",
        "2025-03-29",
        "2025-04-29",
      ]);
    });
  });

  describe("every_weekday frequency", () => {
    it("returns Mon–Fri across a week, skipping Sat/Sun", () => {
      // Jul 7 2025 = Mon, Jul 13 2025 = Sun
      const result = generateDates("2025-07-07", "2025-07-13", "every_weekday", []);
      expect(result).toEqual([
        "2025-07-07", // Mon
        "2025-07-08", // Tue
        "2025-07-09", // Wed
        "2025-07-10", // Thu
        "2025-07-11", // Fri
      ]);
    });

    it("ignores the weekdays argument", () => {
      // Same range with explicit weekdays — should still only return Mon-Fri.
      const result = generateDates("2025-07-07", "2025-07-13", "every_weekday", [0, 6]);
      expect(result).toEqual([
        "2025-07-07",
        "2025-07-08",
        "2025-07-09",
        "2025-07-10",
        "2025-07-11",
      ]);
    });
  });

  describe("custom frequency", () => {
    it("returns days matching multiple selected weekdays (Mon, Wed, Fri)", () => {
      // Jul 7 2025 = Mon, Jul 13 2025 = Sun
      // Mon=1, Wed=3, Fri=5
      const result = generateDates("2025-07-07", "2025-07-13", "custom", [1, 3, 5]);
      expect(result).toEqual([
        "2025-07-07", // Mon
        "2025-07-09", // Wed
        "2025-07-11", // Fri
      ]);
    });

    it("returns empty array when no weekdays selected", () => {
      const result = generateDates("2025-07-07", "2025-07-13", "custom", []);
      expect(result).toEqual([]);
    });
  });

  describe("range edge cases", () => {
    it("returns the single date when end === start", () => {
      const result = generateDates("2025-07-14", "2025-07-14", "daily", []);
      expect(result).toEqual(["2025-07-14"]);
    });

    it("returns empty array when end < start", () => {
      const result = generateDates("2025-07-14", "2025-07-13", "daily", []);
      expect(result).toEqual([]);
    });
  });
});
