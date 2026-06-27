import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import OpenAI from "openai";
import { demoSeed, emptyBrief } from "../src/data/demoSeed";
import type {
  BriefRequest,
  BusinessProfile,
  ConsultRequest,
  ConsultationResult,
  OwnerBrief,
  OwnerProfileResponse
} from "../src/types/api";

dotenv.config();

const app = express();
const port = Number(process.env.API_PORT ?? 8787);
const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    exaConfigured: Boolean(process.env.EXA_API_KEY)
  });
});

app.get("/api/demo/seed", (_req, res) => {
  res.json(demoSeed);
});

app.post("/api/owner-profile/build", async (req, res) => {
  const business = normalizeBusinessProfile(req.body as BusinessProfile);

  const fallback: OwnerProfileResponse = {
    ownerProfile: {
      businessSummary:
        business.summary ||
        business.knowledgeText ||
        "Template is not complete yet. Add business context before building the owner profile.",
      voiceRules: business.voiceRules?.length ? business.voiceRules : [],
      serviceRules: business.services.map(
        (service) => `${service.name}: ${service.ownerRule}`
      ),
      escalationRules: business.escalationRules.map((rule) => `${rule.trigger} -> ${rule.ownerAction}`)
    }
  };

  if (!openai) {
    res.json(fallback);
    return;
  }

  try {
    const response = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You normalize SME owner knowledge into strict JSON. Return only JSON matching: { ownerProfile: { businessSummary: string, voiceRules: string[], serviceRules: string[], escalationRules: string[] } }."
        },
        {
          role: "user",
          content: JSON.stringify(business)
        }
      ]
    });

    const json = parseJson<OwnerProfileResponse>(response.choices[0]?.message.content);
    res.json(json ?? fallback);
  } catch (error) {
    console.error("owner-profile/build fallback:", error);
    res.json(fallback);
  }
});

app.post("/api/consult", async (req, res) => {
  const request = req.body as ConsultRequest;
  const business = normalizeBusinessProfile(request.knowledgeBase ?? demoSeed.business);
  const fallback = buildFallbackConsultation(request.question, business);

  if (!isTemplateReady(business)) {
    res.json(fallback);
    return;
  }

  if (!openai) {
    res.json(fallback);
    return;
  }

  try {
    const response = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are Zo Expert for an SME owner. Answer from the supplied business knowledge only. If the question is risky, sensitive, asks for policy exceptions, exact quotes, safety/legal advice, or missing essential context, return an escalation object. Return strict JSON matching the provided fallback shape. Never invent final commitments."
        },
        {
          role: "user",
          content: JSON.stringify({
            question: request.question,
            business,
            expectedShape: fallback
          })
        }
      ]
    });

    const json = parseJson<ConsultationResult>(response.choices[0]?.message.content);
    res.json(normalizeConsultation(json, fallback, request.question));
  } catch (error) {
    console.error("consult fallback:", error);
    res.json(fallback);
  }
});

app.post("/api/escalation/check", (req, res) => {
  const request = req.body as ConsultRequest;
  const business = normalizeBusinessProfile(request.knowledgeBase ?? demoSeed.business);
  const result = buildFallbackConsultation(request.question, business);

  res.json({
    needsEscalation: result.needsEscalation,
    status: result.status,
    reason: result.status === "escalated" ? result.reason : "No escalation trigger detected.",
    suggestedOwnerAction:
      result.status === "escalated"
        ? result.suggestedOwnerAction
        : "Answer can be handled by Zo Expert using the current business knowledge base."
  });
});

app.post("/api/brief/generate", async (req, res) => {
  const { consultations = [] } = req.body as BriefRequest;
  const fallback = buildFallbackBrief(consultations);

  if (!openai) {
    res.json(fallback);
    return;
  }

  try {
    const response = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Summarize SME consultation activity into strict JSON: { summary, answeredCount, escalatedCount, knowledgeGaps, suggestedUpdates, priorityQueue }. Be practical and concise."
        },
        {
          role: "user",
          content: JSON.stringify({ consultations })
        }
      ]
    });

    const json = parseJson<OwnerBrief>(response.choices[0]?.message.content);
    res.json(json ?? fallback);
  } catch (error) {
    console.error("brief/generate fallback:", error);
    res.json(fallback);
  }
});

app.post("/api/enrich", (_req, res) => {
  res.json({
    status: "skipped",
    reason: "Exa enrichment is optional for Zo Expert and not required for the core consultation demo."
  });
});

app.listen(port, () => {
  console.log(`Zo Expert API listening on http://localhost:${port}`);
});

function buildFallbackConsultation(question: string | undefined, business: BusinessProfile): ConsultationResult {
  const normalizedQuestion = (question ?? "").trim() || "Empty user question";
  const lower = normalizedQuestion.toLowerCase();
  const id = `consult-${Date.now()}`;
  const createdAt = new Date().toISOString();
  const usedKnowledge: string[] = [];

  if (!isTemplateReady(business)) {
    return {
      id,
      status: "escalated",
      question: normalizedQuestion,
      answer: null,
      reason: "The owner template is not complete enough to answer user questions.",
      suggestedOwnerAction:
        "Complete business identity, owner tone, owner knowledge, and escalation rules before sharing the user portal.",
      safeDraft:
        "This expert is not ready yet. The business owner still needs to finish the setup before I can answer accurately.",
      usedKnowledge: ["Template readiness check"],
      confidence: "high",
      needsEscalation: true,
      knowledgeGaps: getTemplateGaps(business),
      createdAt,
      reviewState: "new"
    };
  }

  const escalation = matchEscalation(lower, business);
  if (escalation) {
    return {
      id,
      status: "escalated",
      question: normalizedQuestion,
      answer: null,
      reason: escalation.reason,
      suggestedOwnerAction: escalation.ownerAction,
      safeDraft: escalation.safeDraft,
      usedKnowledge: escalation.usedKnowledge,
      confidence: "high",
      needsEscalation: true,
      knowledgeGaps: escalation.knowledgeGaps,
      createdAt,
      reviewState: "new"
    };
  }

  const service = chooseService(lower, business);
  if (service) {
    usedKnowledge.push(`Service: ${service.name}`, "FAQ: which service should I choose?");
    return {
      id,
      status: "answered",
      question: normalizedQuestion,
      answer:
        `Based on what you shared, I would start with ${service.name}. It is best for ${service.bestFor.toLowerCase()} The current range is ${service.priceRange}. ` +
        `Before confirming, share your situation, goal, budget or constraints, and timing so ${business.ownerName || "the owner"} can give specific guidance if follow-up is needed.`,
      usedKnowledge,
      confidence: "high",
      needsEscalation: false,
      knowledgeGaps: ["User situation", "Goal", "Budget or constraints", "Target timing"],
      createdAt,
      reviewState: "new"
    };
  }

  const faq = chooseFaq(lower, business);
  if (faq) {
    usedKnowledge.push(`FAQ: ${faq.question}`);
    return {
      id,
      status: "answered",
      question: normalizedQuestion,
      answer: faq.answer,
      usedKnowledge,
      confidence: "high",
      needsEscalation: false,
      knowledgeGaps: [],
      createdAt,
      reviewState: "new"
    };
  }

  if (containsAny(lower, ["prepare", "bring", "before", "remote consultation", "documents"])) {
    usedKnowledge.push("FAQ: preparation", "Policy: owner review boundaries");
    return {
      id,
      status: "answered",
      question: normalizedQuestion,
      answer:
        `Prepare the key context ${business.ownerName || "the owner"} would need: your current situation, target outcome, timing, constraints, and any relevant files or examples. If your question touches a policy exception or high-risk decision, I will escalate it instead of guessing.`,
      usedKnowledge,
      confidence: "high",
      needsEscalation: false,
      knowledgeGaps: [],
      createdAt,
      reviewState: "new"
    };
  }

  if (containsAny(lower, ["quote", "quotation", "contractor", "carpentry", "line item", "compare"])) {
    const service = business.services.find((item) => item.id === "contractor-quote-review");
    usedKnowledge.push("Service: Contractor Quote Review", "Policy: no final quotation without review");
    return {
      id,
      status: "answered",
      question: normalizedQuestion,
      answer:
        `Yes, this fits ${service?.name ?? "a review workflow"}. ${business.ownerName || "The owner"} can compare scope, missing assumptions, and line-item gaps. ` +
        `The guide range is ${service?.priceRange ?? "based on the saved service rules"}. Share the relevant documents, constraints, and decision you need help with before the review.`,
      usedKnowledge,
      confidence: "high",
      needsEscalation: false,
      knowledgeGaps: ["Full contractor quote pack", "Floor plan", "Must-have list"],
      createdAt,
      reviewState: "new"
    };
  }

  usedKnowledge.push("Business summary", "Owner tone rules");
  const knowledgeText = business.knowledgeText ?? "";
  const knowledgeExcerpt = knowledgeText
    ? `Based on the saved owner knowledge: ${knowledgeText.slice(0, 420)}${knowledgeText.length > 420 ? "..." : ""}`
    : "";
  return {
    id,
    status: "answered",
    question: normalizedQuestion,
    answer:
      `${knowledgeExcerpt || `I can help with a first pass from ${business.businessName}'s current knowledge base.`} Please share your situation, what you are trying to decide, timing, budget or constraints, and any relevant files. I will answer from the saved owner rules and escalate anything that needs ${business.ownerName || "the owner"}.`,
    usedKnowledge,
    confidence: "medium",
    needsEscalation: false,
    knowledgeGaps: ["Situation", "Decision needed", "Constraints", "Timing"],
    createdAt,
    reviewState: "new"
  };
}

function matchEscalation(lower: string, business: BusinessProfile) {
  const customEscalation = business.escalationRules.find((rule) => overlapScore(lower, rule.trigger) >= 2);
  if (customEscalation) {
    return {
      reason: `This matches an owner escalation rule: ${customEscalation.trigger}`,
      ownerAction: customEscalation.ownerAction,
      safeDraft:
        "I need the owner to review this before giving a firm answer. Please share the relevant context, preferred outcome, and any deadlines so the owner can respond properly.",
      usedKnowledge: [`Escalation: ${customEscalation.trigger}`],
      knowledgeGaps: ["Context", "Preferred outcome", "Deadline or urgency"]
    };
  }

  const policyException = containsAny(lower, [
    "waive",
    "refund",
    "discount",
    "exception",
    "cancel",
    "deposit",
    "free",
    "promise to confirm",
    "after the call"
  ]);
  if (policyException) {
    return {
      reason: "The question asks for a pricing, deposit, refund, or policy exception that should stay with the owner.",
      ownerAction:
        business.escalationRules.find((rule) => rule.id === "rule-policy-exception")?.ownerAction ??
        "Owner should review the exception request before replying.",
      safeDraft:
        "I cannot approve deposit, refund, discount, or policy exceptions from here. I can flag this for owner review; please share the context and what outcome you are hoping for.",
      usedKnowledge: ["Escalation: policy exception"],
      knowledgeGaps: ["Reason for exception", "Customer context", "Requested outcome"]
    };
  }

  const structuralRisk = containsAny(lower, [
    "hack",
    "hacking",
    "structural",
    "wall",
    "electrical",
    "waterproofing",
    "permit",
    "danger",
    "urgent",
    "damp",
    "leak",
    "mould",
    "mold",
    "fire",
    "defect"
  ]);
  if (structuralRisk) {
    return {
      reason: "The question may involve site safety, structural works, permits, defects, or licensed-professional judgment.",
      ownerAction:
        business.escalationRules.find((rule) => rule.id === "rule-structural-risk")?.ownerAction ??
        "Owner should review photos and route to a licensed professional if needed.",
      safeDraft:
        "This needs owner review before giving advice. Please send clear photos, a short video, relevant context, and whether a qualified professional has inspected it. For urgent safety concerns, contact a licensed professional immediately.",
      usedKnowledge: ["Policy: safety and structural boundary", "Escalation: structural risk"],
      knowledgeGaps: ["Photos or video", "Home type", "Affected area", "Contractor inspection status"]
    };
  }

  const finalQuote = containsAny(lower, ["exact price", "final price", "guarantee", "commit", "confirm price"]);
  if (finalQuote) {
    return {
      reason: "The question asks for a final quote or guarantee without enough project review.",
      ownerAction:
        business.escalationRules.find((rule) => rule.id === "rule-final-quote")?.ownerAction ??
        "Owner should request documents and review scope before committing.",
      safeDraft:
        "I can share ranges from the saved template, but the owner needs relevant documents, scope, materials, constraints, and context before giving any final commitment.",
      usedKnowledge: ["Policy: no final quotation without review", "Escalation: final quote"],
      knowledgeGaps: ["Measurements", "Materials", "Floor plan", "Quote pack"]
    };
  }

  return null;
}

function chooseService(lower: string, business: BusinessProfile) {
  const scored = business.services
    .map((service) => ({
      service,
      score: overlapScore(lower, `${service.name} ${service.bestFor} ${service.ownerRule}`)
    }))
    .sort((a, b) => b.score - a.score);

  if (scored[0]?.score > 0) {
    return scored[0].service;
  }

  if (containsAny(lower, ["which service", "choose", "recommend", "start", "best option", "package"])) {
    return business.services[0] ?? null;
  }

  if (containsAny(lower, ["resale", "onsite", "site", "old flat", "defect"])) {
    return business.services.find((service) => service.id === "onsite-reno-clinic");
  }

  if (containsAny(lower, ["quote", "contractor", "carpentry", "compare"])) {
    return business.services.find((service) => service.id === "contractor-quote-review");
  }

  if (containsAny(lower, ["full design", "concept", "moodboard", "material"])) {
    return business.services.find((service) => service.id === "full-concept-package");
  }

  if (containsAny(lower, ["which service", "choose", "bto", "layout", "floor plan", "planning"])) {
    return business.services.find((service) => service.id === "space-planning-sprint");
  }

  return null;
}

function buildFallbackBrief(consultations: ConsultationResult[]): OwnerBrief {
  if (!consultations.length) {
    return emptyBrief;
  }

  const answered = consultations.filter((item) => item.status === "answered");
  const escalated = consultations.filter((item) => item.status === "escalated");
  const gaps = unique(consultations.flatMap((item) => item.knowledgeGaps).filter(Boolean));
  const escalatedQuestions = escalated.map((item) => item.question.slice(0, 90));

  return {
    summary:
      escalated.length > 0
        ? `${answered.length} consultations can be handled by Zo Expert. ${escalated.length} need owner review before the user gets a firm answer.`
        : `${answered.length} consultations were handled from the current business knowledge base. No high-risk escalation is open right now.`,
    answeredCount: answered.length,
    escalatedCount: escalated.length,
    knowledgeGaps: gaps.slice(0, 6),
    suggestedUpdates: [
      gaps.includes("Floor plan") ? "Add a floor-plan upload checklist to the consultation intake." : "",
      gaps.includes("Reason for exception") ? "Add a deposit exception policy template for owner review." : "",
      escalated.length ? "Create canned owner review scripts for common escalation categories." : "Add more examples of good consultation answers."
    ].filter(Boolean),
    priorityQueue: escalatedQuestions.length
      ? escalatedQuestions
      : ["Review whether answered consultations need FAQ updates", "Add more seed examples for service selection"]
  };
}

function chooseFaq(lower: string, business: BusinessProfile) {
  const scored = business.faqs
    .map((faq) => ({
      faq,
      score: overlapScore(lower, `${faq.question} ${faq.answer}`)
    }))
    .sort((a, b) => b.score - a.score);

  return scored[0]?.score > 0 ? scored[0].faq : null;
}

function isTemplateReady(business: BusinessProfile) {
  return Boolean(
    business.businessName &&
      business.ownerName &&
      business.vertical &&
      (business.summary || business.knowledgeText) &&
      business.tone &&
      (business.knowledgeText || business.services.length || business.faqs.length || business.policies.length) &&
      business.escalationRules.length
  );
}

function getTemplateGaps(business: BusinessProfile) {
  const gaps: string[] = [];

  if (!business.businessName || !business.ownerName || !business.vertical) {
    gaps.push("Business identity");
  }
  if (!business.tone) {
    gaps.push("Owner tone");
  }
  if (!business.summary && !business.knowledgeText) {
    gaps.push("Owner knowledge");
  }
  if (!business.escalationRules.length) {
    gaps.push("Escalation rules");
  }

  return gaps;
}

function hasUsefulOverlap(question: string, corpus: string) {
  return overlapScore(question, corpus) > 0;
}

function overlapScore(question: string, corpus: string) {
  const corpusTokens = new Set(tokenize(corpus));
  return tokenize(question).filter((token) => corpusTokens.has(token)).length;
}

function tokenize(value: string) {
  const stopwords = new Set([
    "the",
    "and",
    "for",
    "with",
    "you",
    "your",
    "this",
    "that",
    "what",
    "when",
    "where",
    "how",
    "can",
    "should",
    "would",
    "could",
    "have",
    "need",
    "want",
    "from",
    "into",
    "about"
  ]);

  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !stopwords.has(token));
}

function normalizeConsultation(
  json: ConsultationResult | null,
  fallback: ConsultationResult,
  question: string
): ConsultationResult {
  if (!json || (json.status !== "answered" && json.status !== "escalated")) {
    return fallback;
  }

  return {
    ...fallback,
    ...json,
    id: json.id || fallback.id,
    question: json.question || question,
    createdAt: json.createdAt || new Date().toISOString(),
    reviewState: json.reviewState ?? "new"
  } as ConsultationResult;
}

function containsAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function parseJson<T>(content: string | null | undefined): T | null {
  if (!content) {
    return null;
  }

  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function normalizeBusinessProfile(business?: BusinessProfile | null): BusinessProfile {
  const source = business ?? demoSeed.business;

  return {
    ...demoSeed.business,
    ...source,
    summary: source.summary ?? "",
    targetCustomer: source.targetCustomer ?? "",
    tone: source.tone ?? "",
    knowledgeText: source.knowledgeText ?? source.summary ?? "",
    voiceRules: source.voiceRules ?? [],
    services: source.services ?? [],
    policies: source.policies ?? [],
    faqs: source.faqs ?? [],
    escalationRules: source.escalationRules ?? []
  };
}
