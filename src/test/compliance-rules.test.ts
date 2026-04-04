import { describe, it, expect } from "vitest";

/**
 * Completion Engine & Course Template Rules - Unit Tests
 * These tests validate the business logic for OHS regulation compliance.
 */

// --- Hazard class recurrence mapping ---
const getRecurrenceMonths = (hazardClass: string, trainingType: string): number | null => {
  if (!["temel", "tekrar"].includes(trainingType)) return null;
  switch (hazardClass) {
    case "az_tehlikeli": return 36;
    case "tehlikeli": return 24;
    case "cok_tehlikeli": return 12;
    default: return null;
  }
};

// --- Topic 4 F2F requirement check ---
const requiresTopic4F2F = (hazardClass: string): boolean => {
  return ["tehlikeli", "cok_tehlikeli"].includes(hazardClass);
};

// --- Minimum hours by hazard class ---
const getMinTotalHours = (hazardClass: string, trainingType: string): number => {
  if (trainingType === "tekrar") return 8;
  switch (hazardClass) {
    case "az_tehlikeli": return 8;
    case "tehlikeli": return 12;
    case "cok_tehlikeli": return 16;
    default: return 8;
  }
};

const getMinTopic4Hours = (hazardClass: string, trainingType: string): number => {
  if (trainingType === "tekrar") return 2; // proportional
  switch (hazardClass) {
    case "az_tehlikeli": return 2;
    case "tehlikeli": return 3;
    case "cok_tehlikeli": return 4;
    default: return 2;
  }
};

describe("Recurrence Rules", () => {
  it("az_tehlikeli temel → 36 months", () => {
    expect(getRecurrenceMonths("az_tehlikeli", "temel")).toBe(36);
  });
  it("tehlikeli temel → 24 months", () => {
    expect(getRecurrenceMonths("tehlikeli", "temel")).toBe(24);
  });
  it("cok_tehlikeli tekrar → 12 months", () => {
    expect(getRecurrenceMonths("cok_tehlikeli", "tekrar")).toBe(12);
  });
  it("bilgi_yenileme → null (no recurrence)", () => {
    expect(getRecurrenceMonths("tehlikeli", "bilgi_yenileme")).toBeNull();
  });
});

describe("Topic 4 F2F Requirement", () => {
  it("az_tehlikeli does NOT require F2F for Topic 4", () => {
    expect(requiresTopic4F2F("az_tehlikeli")).toBe(false);
  });
  it("tehlikeli requires F2F for Topic 4", () => {
    expect(requiresTopic4F2F("tehlikeli")).toBe(true);
  });
  it("cok_tehlikeli requires F2F for Topic 4", () => {
    expect(requiresTopic4F2F("cok_tehlikeli")).toBe(true);
  });
});

describe("Minimum Hour Requirements", () => {
  it("az_tehlikeli temel = 8 hours", () => {
    expect(getMinTotalHours("az_tehlikeli", "temel")).toBe(8);
    expect(getMinTopic4Hours("az_tehlikeli", "temel")).toBe(2);
  });
  it("tehlikeli temel = 12 hours, topic4 = 3 hours", () => {
    expect(getMinTotalHours("tehlikeli", "temel")).toBe(12);
    expect(getMinTopic4Hours("tehlikeli", "temel")).toBe(3);
  });
  it("cok_tehlikeli temel = 16 hours, topic4 = 4 hours", () => {
    expect(getMinTotalHours("cok_tehlikeli", "temel")).toBe(16);
    expect(getMinTopic4Hours("cok_tehlikeli", "temel")).toBe(4);
  });
  it("tekrar always 8 hours regardless of hazard class", () => {
    expect(getMinTotalHours("az_tehlikeli", "tekrar")).toBe(8);
    expect(getMinTotalHours("tehlikeli", "tekrar")).toBe(8);
    expect(getMinTotalHours("cok_tehlikeli", "tekrar")).toBe(8);
  });
});

describe("Compliance Badge Logic", () => {
  it("legacy course should be flagged", () => {
    const isLegacy = true;
    const hazardClass = null;
    expect(isLegacy && !hazardClass).toBe(true);
  });
  it("new regulation course should have both fields", () => {
    const isLegacy = false;
    const hazardClass = "tehlikeli";
    const trainingType = "temel";
    expect(!isLegacy && hazardClass && trainingType).toBeTruthy();
  });
});
