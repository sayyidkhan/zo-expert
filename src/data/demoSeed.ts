import type { BusinessProfile, ConsultationResult, DemoSeedResponse, OwnerBrief } from "../types/api";

export const seedBusiness: BusinessProfile = {
  id: "oak-grid-studio",
  businessName: "Oak & Grid Studio",
  ownerName: "Alicia Tan",
  vertical: "Renovation and interior consultation",
  summary:
    "A Singapore appointment-led renovation advisory studio helping HDB and condo homeowners scope practical layouts, budgets, contractor questions, and pre-renovation decisions before they commit to a full design package.",
  targetCustomer:
    "Busy HDB, BTO, resale, and condo homeowners who need practical guidance before speaking to contractors or interior designers.",
  tone:
    "Warm, practical, precise, and non-pushy. Alicia gives ranges, explains trade-offs, asks for missing context, and avoids over-promising.",
  voiceRules: [
    "Answer like an experienced owner, not a generic bot.",
    "Give practical next steps before trying to sell a package.",
    "Use Singapore renovation context where relevant.",
    "Escalate structural, legal, refund, safety, or policy exception questions."
  ],
  services: [
    {
      id: "space-planning-sprint",
      name: "Space Planning Sprint",
      priceRange: "S$180-S$280 remote",
      bestFor: "Homeowners comparing layout options before engaging a contractor.",
      ownerRule: "Recommend this when the user has a floor plan, rough goals, and needs early feasibility guidance."
    },
    {
      id: "onsite-reno-clinic",
      name: "Onsite Reno Clinic",
      priceRange: "S$350-S$480 onsite",
      bestFor: "Resale or older homes where site condition, defects, or measurements matter.",
      ownerRule: "Recommend this when the user mentions resale, defects, hacking, water damage, or unclear site conditions."
    },
    {
      id: "contractor-quote-review",
      name: "Contractor Quote Review",
      priceRange: "S$220-S$420 per quote pack",
      bestFor: "Owners comparing contractor quotations and wanting hidden-cost checks.",
      ownerRule: "Recommend this when the user already has quotes, line items, or scope confusion."
    },
    {
      id: "full-concept-package",
      name: "Full Concept Package",
      priceRange: "From S$1,200",
      bestFor: "Owners who want room-by-room concepts, material direction, and handover notes.",
      ownerRule: "Do not push this first unless the user asks for a full design direction."
    }
  ],
  policies: [
    {
      id: "deposit-policy",
      name: "Booking deposit",
      rule: "Confirmed consultation slots require a 30% deposit. Deposits are movable once with at least 48 hours notice, but not waived by the AI."
    },
    {
      id: "quote-boundary",
      name: "No final quotation without review",
      rule: "The AI can provide budget ranges and preparation guidance, but final quotes need owner review and project details."
    },
    {
      id: "safety-boundary",
      name: "Safety and structural boundary",
      rule: "Questions about hacking walls, structural works, electrical safety, waterproofing failure, permits, or urgent defects must be escalated."
    },
    {
      id: "response-window",
      name: "Owner response window",
      rule: "Alicia reviews escalations within one business day and urgent safety cases should be handled by licensed professionals immediately."
    }
  ],
  faqs: [
    {
      id: "faq-prepare",
      question: "What should I prepare before a consultation?",
      answer:
        "Prepare your floor plan, 5-8 photos or videos of the current space, rough budget, renovation timeline, must-haves, and any contractor quotes you already have."
    },
    {
      id: "faq-which-service",
      question: "Which service should I choose?",
      answer:
        "Choose Space Planning Sprint for early layout decisions, Onsite Reno Clinic for resale/site-condition questions, Quote Review for contractor scope checks, and Full Concept Package only when you need full design direction."
    },
    {
      id: "faq-pricing",
      question: "Can the AI give exact pricing?",
      answer:
        "The AI can give consultation package ranges and explain common cost drivers, but exact renovation pricing requires owner review of scope, measurements, materials, and site constraints."
    },
    {
      id: "faq-timeline",
      question: "How fast can I get guidance?",
      answer:
        "Remote consultation summaries are usually sent within two business days after the session. Quote reviews usually take three business days after all documents are received."
    }
  ],
  escalationRules: [
    {
      id: "rule-policy-exception",
      trigger: "Waiving deposit, refund exceptions, cancellation disputes, or custom discounts.",
      ownerAction: "Owner reviews context, relationship history, and schedule impact before deciding."
    },
    {
      id: "rule-structural-risk",
      trigger: "Hacking walls, structural works, electrical safety, waterproofing, permits, or urgent defects.",
      ownerAction: "Owner requests photos and routes the customer to licensed contractor or professional inspection."
    },
    {
      id: "rule-final-quote",
      trigger: "Requests for exact renovation quote, timeline guarantee, or commitment before reviewing documents.",
      ownerAction: "Owner asks for floor plan, measurements, photos, target materials, and contractor quote pack."
    },
    {
      id: "rule-complaint",
      trigger: "Complaint, refund threat, legal issue, or emotionally charged customer message.",
      ownerAction: "Owner handles directly with a calm acknowledgement and documented next step."
    }
  ]
};

export const sampleQuestions = [
  "I just collected keys for my 4-room BTO. Which service should I choose before meeting contractors?",
  "Can you waive the 30% deposit if I promise to confirm after the call?",
  "I have two contractor quotes and the carpentry lines look very different. Can you help me compare them?",
  "My resale flat has damp patches near the bathroom wall. Can I still plan the renovation first?",
  "What should I prepare before a remote consultation?"
];

export const seedConsultations: ConsultationResult[] = [
  {
    id: "seed-answered-1",
    status: "answered",
    question: "What should I prepare before a remote consultation?",
    answer:
      "For a remote consultation, prepare your floor plan, 5-8 photos or short videos, rough budget, key must-haves, and your target move-in date. If you already have contractor quotes, add them too so I can spot scope gaps early.",
    usedKnowledge: ["FAQ: consultation preparation", "Policy: no final quotation without review"],
    confidence: "high",
    needsEscalation: false,
    knowledgeGaps: [],
    createdAt: new Date().toISOString(),
    reviewState: "reviewed"
  },
  {
    id: "seed-escalated-1",
    status: "escalated",
    question: "Can you waive the deposit for me this week?",
    answer: null,
    reason: "Deposit waiver is a policy exception and should not be decided automatically.",
    suggestedOwnerAction: "Alicia should review the customer's situation and decide whether to hold the slot, offer a one-time move, or keep the standard deposit policy.",
    safeDraft:
      "I cannot waive the booking deposit from here, but I can flag this for Alicia to review. If you share the preferred slot and reason for the request, she can reply with the available options.",
    usedKnowledge: ["Policy: booking deposit", "Escalation: policy exception"],
    confidence: "high",
    needsEscalation: true,
    knowledgeGaps: ["Customer reason for requesting the waiver", "Preferred consultation slot"],
    createdAt: new Date().toISOString(),
    reviewState: "owner-action"
  }
];

export const seedBrief: OwnerBrief = {
  summary:
    "Most consultations are routine service-selection and preparation questions. Deposit exceptions and site-condition questions should stay owner-reviewed.",
  answeredCount: 1,
  escalatedCount: 1,
  knowledgeGaps: ["Customer waiver reason", "Preferred slot", "Site photos for defect-related cases"],
  suggestedUpdates: [
    "Add a short FAQ explaining when deposits can be moved versus refunded.",
    "Add a photo checklist for resale-flat damp patches and bathroom-adjacent issues.",
    "Create a quote-review upload checklist for contractor line items."
  ],
  priorityQueue: [
    "Review deposit exception request",
    "Prepare resale defect escalation script",
    "Add quote review checklist to knowledge base"
  ]
};

export const demoSeed: DemoSeedResponse = {
  business: seedBusiness,
  sampleQuestions,
  consultations: seedConsultations,
  brief: seedBrief
};
