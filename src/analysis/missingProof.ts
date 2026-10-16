import type { InputType, Indicator, MissingProofQuestion } from "../types";

export interface MissingProofContext {
  input: string;
  inputType: InputType;
  indicators: Indicator[];
  hasUrl: boolean;
  publishedDate?: string;
}

const AUTHOR_QUESTION: MissingProofQuestion = {
  id: "proof.original-author",
  question: "Who first made this claim, and can you reach them through a separate channel?",
  why: "A copied message can lose its original context and attribution.",
  suggestedAction: "Look for the original author or publisher and contact them using details found independently.",
};

const QUESTION_TEMPLATES = {
  organization: {
    id: "proof.organization-channel",
    question: "Have you contacted the organization using a phone number or website you already trust?",
    why: "A message can use an organization’s name without coming from that organization.",
    suggestedAction: "Use contact details from a card, saved contact, or address you type yourself—not the message.",
  },
  request: {
    id: "proof.request-policy",
    question: "Does the organization officially ask for this information or payment by message?",
    why: "A separate policy check can clarify whether the request is expected.",
    suggestedAction: "Check the organization’s official help or security page, or contact its support through a known channel.",
  },
  link: {
    id: "proof.link-destination",
    question: "Does the link’s real destination match the official website you would type yourself?",
    why: "A link’s visible wording does not establish which site it opens.",
    suggestedAction: "Do not open the message link; type the official address yourself and compare the domain.",
  },
  claim: {
    id: "proof.primary-source",
    question: "Is there an original announcement or primary source for this claim?",
    why: "An original record is easier to compare than repeated summaries or forwards.",
    suggestedAction: "Look for an official announcement, press release, court order, or gazette entry.",
  },
  viral: {
    id: "proof.independent-confirmation",
    question: "Has an independent outlet or official body confirmed this, or are the copies all the same forward?",
    why: "Many reposts can repeat one source rather than independently confirm it.",
    suggestedAction: "Compare reporting from independent publishers and check for a primary source.",
  },
  date: {
    id: "proof.publication-date",
    question: "When was this first published, and does that date apply to the current situation?",
    why: "Old content can be recirculated without the date or context that originally applied.",
    suggestedAction: "Find the earliest publication date and compare it with the event and received dates.",
  },
  statistic: {
    id: "proof.statistic-source",
    question: "Where does this number or statistic come from?",
    why: "A figure without its method or source is difficult to interpret.",
    suggestedAction: "Find the original dataset, report, or publication and check what the figure measures.",
  },
} satisfies Record<string, MissingProofQuestion>;

/** Suggests user-checkable questions based on local observations; it never verifies them. */
export function findMissingProof(context: MissingProofContext): MissingProofQuestion[] {
  const ids = new Set(context.indicators.map((indicator) => indicator.id));
  const questions: MissingProofQuestion[] = [];
  const impersonation = ids.has("msg.impersonation")
    || ids.has("url.brand-in-domain")
    || ids.has("url.brand-in-subdomain")
    || ids.has("url.lookalike-brand");
  const requestedSensitiveAction = ids.has("msg.payment-request") || ids.has("msg.credential-request");
  const forwarded = ids.has("msg.forward-pressure") || /\b(?:forwarded|fwd:|viral|whatsapp forward)\b/i.test(context.input);
  const sourcePhrase = /\b(?:source\s*:|according to|original report|press release|official announcement)\b/i.test(context.input);
  const hasNumber = /\b\d+(?:[,.]\d+)?\s?(?:%|percent|people|million|billion|crore|lakh)?\b/i.test(context.input);

  if (impersonation) questions.push(QUESTION_TEMPLATES.organization);
  if (requestedSensitiveAction) questions.push(QUESTION_TEMPLATES.request);
  if (context.hasUrl) questions.push(QUESTION_TEMPLATES.link);
  if (forwarded) questions.push(QUESTION_TEMPLATES.viral);
  if (context.inputType === "claim" && !context.hasUrl && !sourcePhrase) questions.push(QUESTION_TEMPLATES.claim);
  if (!context.publishedDate) questions.push(QUESTION_TEMPLATES.date);
  if (hasNumber) questions.push(QUESTION_TEMPLATES.statistic);

  const selected = questions.slice(0, 5);
  if (!selected.some((question) => question.id === AUTHOR_QUESTION.id)) selected.push(AUTHOR_QUESTION);
  return selected.slice(0, 6);
}
