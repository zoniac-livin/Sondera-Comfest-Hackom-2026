import { describe, expect, it } from "vitest";
import { clearStoredData, loadCase, saveCase, STORAGE_KEY } from "./index";
import type { Case } from "@/types";

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    values,
  };
}

const sampleCase: Case = {
  id: "case-1", createdAt: "2026-10-16T10:00:00Z", updatedAt: "2026-10-16T10:00:00Z",
  input: "hello", inputType: "message", evidence: [], dates: { checked: "2026-10-16" },
  checkedQuestions: [], userNotes: "", revisions: [{ at: "2026-10-16T10:00:00Z", summary: "Case created" }],
};

describe("versioned local case storage", () => {
  it("saves and restores a valid active case", () => {
    const storage = memoryStorage();
    saveCase(storage, sampleCase);
    expect(loadCase(storage)).toEqual({ status: "loaded", activeCase: sampleCase });
  });

  it("offers recovery for corrupt JSON", () => {
    expect(loadCase(memoryStorage({ [STORAGE_KEY]: "{" })).status).toBe("recovery");
  });

  it("offers recovery for an unsupported schema version", () => {
    expect(loadCase(memoryStorage({ [STORAGE_KEY]: JSON.stringify({ schemaVersion: 99, activeCase: sampleCase }) }))).toMatchObject({ status: "recovery" });
  });

  it("degrades gracefully when storage reads or writes throw", () => {
    const throwingStorage = {
      getItem: () => { throw new Error("unavailable"); },
      setItem: () => { throw new Error("quota exceeded"); },
      removeItem: () => { throw new Error("unavailable"); },
    };
    expect(loadCase(throwingStorage).status).toBe("recovery");
    expect(() => saveCase(throwingStorage, sampleCase)).toThrow("quota exceeded");
    expect(() => clearStoredData(throwingStorage)).toThrow("unavailable");
  });
});
