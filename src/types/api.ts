export type Confidence = "high" | "medium" | "low";

export type Service = {
  id: string;
  name: string;
  priceRange: string;
  bestFor: string;
  ownerRule: string;
};

export type Policy = {
  id: string;
  name: string;
  rule: string;
};

export type FAQ = {
  id: string;
  question: string;
  answer: string;
};

export type EscalationRule = {
  id: string;
  trigger: string;
  ownerAction: string;
};

export type BusinessProfile = {
  id: string;
  businessName: string;
  ownerName: string;
  vertical: string;
  summary: string;
  targetCustomer: string;
  tone: string;
  voiceRules: string[];
  services: Service[];
  policies: Policy[];
  faqs: FAQ[];
  escalationRules: EscalationRule[];
};

export type OwnerProfileResponse = {
  ownerProfile: {
    businessSummary: string;
    voiceRules: string[];
    serviceRules: string[];
    escalationRules: string[];
  };
};

export type ConsultRequest = {
  question: string;
  ownerProfile: BusinessProfile;
  knowledgeBase: BusinessProfile;
};

export type ConsultationReviewState = "new" | "reviewed" | "owner-action" | "ignored";

export type AnsweredConsultation = {
  id: string;
  status: "answered";
  question: string;
  answer: string;
  usedKnowledge: string[];
  confidence: Confidence;
  needsEscalation: false;
  knowledgeGaps: string[];
  createdAt: string;
  reviewState?: ConsultationReviewState;
};

export type EscalatedConsultation = {
  id: string;
  status: "escalated";
  question: string;
  answer: null;
  reason: string;
  suggestedOwnerAction: string;
  safeDraft: string;
  usedKnowledge: string[];
  confidence: Confidence;
  needsEscalation: true;
  knowledgeGaps: string[];
  createdAt: string;
  reviewState?: ConsultationReviewState;
};

export type ConsultationResult = AnsweredConsultation | EscalatedConsultation;

export type BriefRequest = {
  consultations: ConsultationResult[];
};

export type OwnerBrief = {
  summary: string;
  answeredCount: number;
  escalatedCount: number;
  knowledgeGaps: string[];
  suggestedUpdates: string[];
  priorityQueue: string[];
};

export type DemoSeedResponse = {
  business: BusinessProfile;
  sampleQuestions: string[];
  consultations: ConsultationResult[];
  brief: OwnerBrief;
};
