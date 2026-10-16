import { analyzeMessage } from "./message";
import { assessLevel } from "./level";
import { getUnavailableChecks } from "./unavailable";
import { analyzeUrl } from "./url";
import { findMissingProof } from "./missingProof";
import type { Analysis, InputType, ParsedUrl } from "../types";

function inferInputType(input: string): InputType {
  const trimmed = input.trim();
  if (trimmed && !/\s/.test(trimmed) && analyzeUrl(trimmed).parsed) return "url";
  return "message";
}

/** Run local URL/message checks and assemble the explainable case analysis. */
export function analyze(input: string, inputType: InputType = inferInputType(input)): Analysis {
  let indicators;
  let extractedUrls: ParsedUrl[] = [];

  if (inputType === "url") {
    const result = analyzeUrl(input);
    indicators = result.indicators;
    if (result.parsed) extractedUrls.push(result.parsed);
  } else {
    const result = analyzeMessage(input);
    indicators = result.indicators;
    extractedUrls = result.urls.flatMap((url) => {
      const parsed = analyzeUrl(url).parsed;
      return parsed ? [parsed] : [];
    });
  }

  const level = assessLevel(indicators);
  const missingProof = findMissingProof({
    input,
    inputType,
    indicators,
    hasUrl: extractedUrls.length > 0 || indicators.some((indicator) => indicator.category === "url"),
  });
  return {
    inputType,
    analyzedAt: new Date().toISOString(),
    indicators,
    extractedUrls,
    unavailableChecks: getUnavailableChecks(),
    level: level.level,
    levelExplanation: level.explanation,
    missingProof,
  };
}
