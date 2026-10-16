import type { Indicator } from "../types";

export type AnalysisLevel = "none-found" | "some-indicators" | "multiple-indicators" | "strong-indicators";
export interface LevelResult { level: AnalysisLevel; explanation: string }

export function levelLabel(level: AnalysisLevel): string {
  switch (level) {
    case "none-found": return "No indicators found";
    case "some-indicators": return "Some indicators";
    case "multiple-indicators": return "Notable indicators";
    case "strong-indicators": return "Strong indicators";
  }
}

const LIMITATION_NOTICE = "Automated checks can miss threats and can flag legitimate content.";

/** Derive a qualitative level from non-informational observations only. */
export function assessLevel(indicators: Indicator[]): LevelResult {
  const counted = indicators.filter((indicator) => indicator.severity !== "info");
  const high = counted.filter((indicator) => indicator.severity === "high").length;
  const medium = counted.filter((indicator) => indicator.severity === "medium").length;
  const low = counted.filter((indicator) => indicator.severity === "low").length;

  if (counted.length === 0) {
    return {
      level: "none-found",
      explanation: `These local checks found no indicators. This does not mean the content is genuine or safe. ${LIMITATION_NOTICE}`,
    };
  }

  let level: AnalysisLevel;
  if (high >= 2 || (high >= 1 && medium >= 2)) level = "strong-indicators";
  else if (counted.length >= 3 || high >= 1) level = "multiple-indicators";
  else level = "some-indicators";

  const observationCount = `${counted.length} non-info observation${counted.length === 1 ? "" : "s"}`;
  return {
    level,
    explanation: `${high} high, ${medium} medium, and ${low} low indicators were found by local rules (${observationCount}). Informational observations are excluded from this level. ${LIMITATION_NOTICE}`,
  };
}
