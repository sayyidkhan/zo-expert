import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  MessageSquareText,
  RefreshCcw,
  Send,
  Settings2,
  Sparkles,
  UserRoundCog
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { buildOwnerProfile, consultOwnerProxy, generateBrief, getDemoSeed } from "./lib/api";
import type {
  BusinessProfile,
  ConsultationResult,
  ConsultationReviewState,
  EscalationRule,
  FAQ,
  OwnerBrief,
  OwnerProfileResponse,
  Policy,
  Service
} from "./types/api";

const businessStorageKey = "zo-expert.business";
const consultationsStorageKey = "zo-expert.consultations";

type BusinessDraft = {
  businessName: string;
  ownerName: string;
  summary: string;
  targetCustomer: string;
  tone: string;
  services: string;
  policies: string;
  faqs: string;
  escalationRules: string;
};

export default function App() {
  const seedQuery = useQuery({
    queryKey: ["demo-seed"],
    queryFn: getDemoSeed
  });

  const seed = seedQuery.data;
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [consultations, setConsultations] = useState<ConsultationResult[]>([]);
  const [brief, setBrief] = useState<OwnerBrief | null>(null);
  const [ownerSnapshot, setOwnerSnapshot] = useState<OwnerProfileResponse["ownerProfile"] | null>(null);
  const [question, setQuestion] = useState("");

  useEffect(() => {
    if (!seed || business) {
      return;
    }

    const savedBusiness = readJson<BusinessProfile>(businessStorageKey);
    const savedConsultations = readJson<ConsultationResult[]>(consultationsStorageKey);

    setBusiness(savedBusiness ?? seed.business);
    setConsultations(savedConsultations ?? seed.consultations);
    setBrief(seed.brief);
  }, [business, seed]);

  useEffect(() => {
    if (business) {
      localStorage.setItem(businessStorageKey, JSON.stringify(business));
    }
  }, [business]);

  useEffect(() => {
    if (consultations.length) {
      localStorage.setItem(consultationsStorageKey, JSON.stringify(consultations));
    }
  }, [consultations]);

  const consultMutation = useMutation({
    mutationFn: consultOwnerProxy,
    onSuccess: (result) => {
      setConsultations((current) => [result, ...current]);
      setQuestion("");
    }
  });

  const briefMutation = useMutation({
    mutationFn: generateBrief,
    onSuccess: setBrief
  });

  const ownerProfileMutation = useMutation({
    mutationFn: buildOwnerProfile,
    onSuccess: (result) => setOwnerSnapshot(result.ownerProfile)
  });

  const currentBrief = useMemo(
    () => brief ?? buildLocalBrief(consultations),
    [brief, consultations]
  );

  if (!business || !seed) {
    return (
      <main className="loading-screen">
        <Sparkles className="spin-soft" size={28} />
        <span>Loading Zo Expert demo seed...</span>
      </main>
    );
  }

  const submitQuestion = (nextQuestion = question) => {
    const trimmed = nextQuestion.trim();
    if (!trimmed || consultMutation.isPending) {
      return;
    }

    consultMutation.mutate({
      question: trimmed,
      ownerProfile: business,
      knowledgeBase: business
    });
  };

  const resetDemo = () => {
    setBusiness(seed.business);
    setConsultations(seed.consultations);
    setBrief(seed.brief);
    setOwnerSnapshot(null);
    localStorage.removeItem(businessStorageKey);
    localStorage.removeItem(consultationsStorageKey);
  };

  const updateReviewState = (id: string, reviewState: ConsultationReviewState) => {
    setConsultations((current) =>
      current.map((item) => (item.id === id ? { ...item, reviewState } : item))
    );
  };

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="microcopy">AI consultation proxy</p>
            <h1>{business.businessName}</h1>
          </div>
          <div className="topbar-actions">
            <span className="status-pill">
              <CheckCircle2 size={15} />
              Demo seed active
            </span>
            <button className="ghost-button" onClick={resetDemo} type="button">
              <RefreshCcw size={16} />
              Reset
            </button>
          </div>
        </header>

        <section className="hero-strip">
          <div>
            <h2>Scale the owner's judgment without losing control.</h2>
            <p>
              Customers and staff can ask practical questions. Zo Expert answers from Alicia's
              business knowledge when safe, then escalates policy exceptions, safety issues, and
              missing-context decisions.
            </p>
          </div>
          <div className="hero-metrics" aria-label="Demo metrics">
            <Metric label="Answered" value={currentBrief.answeredCount.toString()} />
            <Metric label="Escalated" value={currentBrief.escalatedCount.toString()} />
            <Metric label="Knowledge gaps" value={currentBrief.knowledgeGaps.length.toString()} />
          </div>
        </section>

        <div className="main-grid">
          <section className="left-rail" aria-label="Owner setup and knowledge base">
            <OwnerSetup
              business={business}
              ownerSnapshot={ownerSnapshot}
              isBuilding={ownerProfileMutation.isPending}
              onSave={setBusiness}
              onBuild={() => ownerProfileMutation.mutate(business)}
            />
            <KnowledgeBase business={business} />
          </section>

          <section className="consultation-surface" id="consultation">
            <div className="section-heading">
              <div>
                <p className="microcopy">Consultation chat</p>
                <h2>Ask the owner's proxy</h2>
              </div>
              <span className="model-tag">Safe answer or escalation</span>
            </div>

            <div className="sample-row" aria-label="Sample questions">
              {seed.sampleQuestions.map((sample) => (
                <button
                  className="sample-chip"
                  key={sample}
                  onClick={() => submitQuestion(sample)}
                  type="button"
                >
                  {sample}
                </button>
              ))}
            </div>

            <div className="composer">
              <textarea
                aria-label="Ask a consultation question"
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    submitQuestion();
                  }
                }}
                placeholder="Ask as a customer, prospect, or staff member..."
                value={question}
              />
              <button
                className="primary-button"
                disabled={!question.trim() || consultMutation.isPending}
                onClick={() => submitQuestion()}
                type="button"
              >
                <Send size={16} />
                {consultMutation.isPending ? "Consulting..." : "Ask Zo Expert"}
              </button>
            </div>

            <div className="consultation-list" aria-label="Consultation results">
              {consultMutation.isError ? (
                <div className="error-banner">
                  The API call failed. Start the local backend with <code>npm run dev</code>.
                </div>
              ) : null}
              {consultations.map((item) => (
                <ConsultationCard
                  consultation={item}
                  key={item.id}
                  onReviewChange={updateReviewState}
                />
              ))}
            </div>
          </section>

          <section className="right-rail" id="brief">
            <OwnerBriefPanel
              brief={currentBrief}
              isRefreshing={briefMutation.isPending}
              onRefresh={() => briefMutation.mutate({ consultations })}
            />
            <EscalationQueue consultations={consultations} />
          </section>
        </div>
      </main>
    </div>
  );
}

function Sidebar() {
  const items = [
    { label: "Owner Setup", icon: UserRoundCog, href: "#owner-setup" },
    { label: "Knowledge Base", icon: BookOpen, href: "#knowledge-base" },
    { label: "Consultation", icon: MessageSquareText, href: "#consultation" },
    { label: "Escalations", icon: AlertTriangle, href: "#escalations" },
    { label: "Owner Brief", icon: ClipboardList, href: "#brief" }
  ];

  return (
    <aside className="sidebar">
      <div className="brand-lockup">
        <div className="brand-mark">Z</div>
        <div>
          <strong>Zo Expert</strong>
          <span>Owner proxy</span>
        </div>
      </div>

      <nav aria-label="Primary navigation">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <a href={item.href} key={item.label}>
              <Icon size={17} />
              <span>{item.label}</span>
              <ChevronRight size={15} />
            </a>
          );
        })}
      </nav>

      <div className="sidebar-note">
        <p>Built for appointment-led SMEs where the owner is still the router, memory, and decision engine.</p>
      </div>
    </aside>
  );
}

function OwnerSetup({
  business,
  ownerSnapshot,
  isBuilding,
  onSave,
  onBuild
}: {
  business: BusinessProfile;
  ownerSnapshot: OwnerProfileResponse["ownerProfile"] | null;
  isBuilding: boolean;
  onSave: (business: BusinessProfile) => void;
  onBuild: () => void;
}) {
  const [draft, setDraft] = useState<BusinessDraft>(() => toDraft(business));

  useEffect(() => {
    setDraft(toDraft(business));
  }, [business]);

  const saveDraft = () => {
    onSave(fromDraft(business, draft));
  };

  return (
    <section className="panel" id="owner-setup">
      <div className="section-heading compact">
        <div>
          <p className="microcopy">Owner setup</p>
          <h2>Business brain</h2>
        </div>
        <Settings2 size={18} />
      </div>

      <label>
        Business
        <input
          onChange={(event) => setDraft({ ...draft, businessName: event.target.value })}
          value={draft.businessName}
        />
      </label>
      <label>
        Owner
        <input
          onChange={(event) => setDraft({ ...draft, ownerName: event.target.value })}
          value={draft.ownerName}
        />
      </label>
      <label>
        Summary
        <textarea
          className="small-textarea"
          onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
          value={draft.summary}
        />
      </label>
      <label>
        Tone
        <textarea
          className="small-textarea"
          onChange={(event) => setDraft({ ...draft, tone: event.target.value })}
          value={draft.tone}
        />
      </label>

      <details className="editor-details">
        <summary>Edit services, FAQs, policies, and escalation rules</summary>
        <label>
          Services: name | price | best for | owner rule
          <textarea
            onChange={(event) => setDraft({ ...draft, services: event.target.value })}
            value={draft.services}
          />
        </label>
        <label>
          FAQs: question | answer
          <textarea
            onChange={(event) => setDraft({ ...draft, faqs: event.target.value })}
            value={draft.faqs}
          />
        </label>
        <label>
          Policies: name | rule
          <textarea
            onChange={(event) => setDraft({ ...draft, policies: event.target.value })}
            value={draft.policies}
          />
        </label>
        <label>
          Escalation rules: trigger | owner action
          <textarea
            onChange={(event) => setDraft({ ...draft, escalationRules: event.target.value })}
            value={draft.escalationRules}
          />
        </label>
      </details>

      <div className="button-row">
        <button className="primary-button slim" onClick={saveDraft} type="button">
          Save setup
        </button>
        <button className="ghost-button slim" onClick={onBuild} type="button">
          <Sparkles size={15} />
          {isBuilding ? "Building..." : "Build profile"}
        </button>
      </div>

      {ownerSnapshot ? (
        <div className="snapshot">
          <strong>Normalized owner profile</strong>
          <p>{ownerSnapshot.businessSummary}</p>
        </div>
      ) : null}
    </section>
  );
}

function KnowledgeBase({ business }: { business: BusinessProfile }) {
  return (
    <section className="panel" id="knowledge-base">
      <div className="section-heading compact">
        <div>
          <p className="microcopy">Knowledge base</p>
          <h2>Rules Zo Expert can cite</h2>
        </div>
        <BookOpen size={18} />
      </div>

      <div className="knowledge-group">
        <h3>Services</h3>
        {business.services.map((service) => (
          <div className="rule-row" key={service.id}>
            <strong>{service.name}</strong>
            <span>{service.priceRange}</span>
            <p>{service.bestFor}</p>
          </div>
        ))}
      </div>

      <div className="knowledge-group">
        <h3>Escalation boundaries</h3>
        {business.escalationRules.map((rule) => (
          <div className="rule-row warning" key={rule.id}>
            <strong>{rule.trigger}</strong>
            <p>{rule.ownerAction}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ConsultationCard({
  consultation,
  onReviewChange
}: {
  consultation: ConsultationResult;
  onReviewChange: (id: string, state: ConsultationReviewState) => void;
}) {
  const isEscalated = consultation.status === "escalated";

  return (
    <article className={`consultation-card ${isEscalated ? "escalated" : "answered"}`}>
      <div className="question-row">
        <div>
          <span className="role-label">{isEscalated ? "Escalation" : "Answered"}</span>
          <h3>{consultation.question}</h3>
        </div>
        {isEscalated ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
      </div>

      {isEscalated ? (
        <div className="answer-block">
          <p>
            <strong>Reason:</strong> {consultation.reason}
          </p>
          <p>
            <strong>Owner action:</strong> {consultation.suggestedOwnerAction}
          </p>
          <p>
            <strong>Safe draft:</strong> {consultation.safeDraft}
          </p>
        </div>
      ) : (
        <div className="answer-block">
          <p>{consultation.answer}</p>
        </div>
      )}

      <div className="chips">
        {consultation.usedKnowledge.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>

      {consultation.knowledgeGaps.length ? (
        <div className="gap-row">
          <strong>Missing context</strong>
          <span>{consultation.knowledgeGaps.join(", ")}</span>
        </div>
      ) : null}

      <div className="review-controls">
        {(["new", "reviewed", "owner-action", "ignored"] as ConsultationReviewState[]).map(
          (state) => (
            <button
              className={consultation.reviewState === state ? "selected" : ""}
              key={state}
              onClick={() => onReviewChange(consultation.id, state)}
              type="button"
            >
              {state.replace("-", " ")}
            </button>
          )
        )}
      </div>
    </article>
  );
}

function OwnerBriefPanel({
  brief,
  isRefreshing,
  onRefresh
}: {
  brief: OwnerBrief;
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <section className="panel brief-panel">
      <div className="section-heading compact">
        <div>
          <p className="microcopy">Owner brief</p>
          <h2>What needs Alicia</h2>
        </div>
        <button className="icon-button" onClick={onRefresh} type="button">
          <RefreshCcw className={isRefreshing ? "spin-soft" : ""} size={16} />
        </button>
      </div>

      <p className="brief-summary">{brief.summary}</p>

      <div className="brief-stats">
        <Metric label="Handled" value={brief.answeredCount.toString()} />
        <Metric label="Escalated" value={brief.escalatedCount.toString()} />
      </div>

      <BriefList title="Priority queue" items={brief.priorityQueue} />
      <BriefList title="Knowledge gaps" items={brief.knowledgeGaps} />
      <BriefList title="Suggested updates" items={brief.suggestedUpdates} />
    </section>
  );
}

function EscalationQueue({ consultations }: { consultations: ConsultationResult[] }) {
  const escalations = consultations.filter((item) => item.status === "escalated");

  return (
    <section className="panel" id="escalations">
      <div className="section-heading compact">
        <div>
          <p className="microcopy">Escalation review</p>
          <h2>Unsafe to answer blindly</h2>
        </div>
        <AlertTriangle size={18} />
      </div>

      {escalations.length ? (
        escalations.slice(0, 4).map((item) => (
          <div className="queue-item" key={item.id}>
            <strong>{item.question}</strong>
            <p>{item.status === "escalated" ? item.reason : ""}</p>
          </div>
        ))
      ) : (
        <p className="empty-state">No escalations open.</p>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function BriefList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="brief-list">
      <h3>{title}</h3>
      {items.length ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>No items.</p>
      )}
    </div>
  );
}

function toDraft(business: BusinessProfile): BusinessDraft {
  return {
    businessName: business.businessName,
    ownerName: business.ownerName,
    summary: business.summary,
    targetCustomer: business.targetCustomer,
    tone: business.tone,
    services: business.services
      .map((service) => [service.name, service.priceRange, service.bestFor, service.ownerRule].join(" | "))
      .join("\n"),
    policies: business.policies.map((policy) => [policy.name, policy.rule].join(" | ")).join("\n"),
    faqs: business.faqs.map((faq) => [faq.question, faq.answer].join(" | ")).join("\n"),
    escalationRules: business.escalationRules
      .map((rule) => [rule.trigger, rule.ownerAction].join(" | "))
      .join("\n")
  };
}

function fromDraft(base: BusinessProfile, draft: BusinessDraft): BusinessProfile {
  return {
    ...base,
    businessName: draft.businessName.trim() || base.businessName,
    ownerName: draft.ownerName.trim() || base.ownerName,
    summary: draft.summary.trim() || base.summary,
    targetCustomer: draft.targetCustomer.trim() || base.targetCustomer,
    tone: draft.tone.trim() || base.tone,
    services: parseServices(draft.services, base.services),
    policies: parsePolicies(draft.policies, base.policies),
    faqs: parseFaqs(draft.faqs, base.faqs),
    escalationRules: parseEscalations(draft.escalationRules, base.escalationRules)
  };
}

function parseServices(value: string, fallback: Service[]) {
  const parsed = value
    .split("\n")
    .map((line, index) => {
      const [name, priceRange, bestFor, ownerRule] = line.split("|").map((part) => part.trim());
      if (!name || !priceRange || !bestFor) {
        return null;
      }
      return {
        id: slugify(name) || `service-${index}`,
        name,
        priceRange,
        bestFor,
        ownerRule: ownerRule || bestFor
      };
    })
    .filter(Boolean) as Service[];

  return parsed.length ? parsed : fallback;
}

function parsePolicies(value: string, fallback: Policy[]) {
  const parsed = value
    .split("\n")
    .map((line, index) => {
      const [name, rule] = line.split("|").map((part) => part.trim());
      if (!name || !rule) {
        return null;
      }
      return { id: slugify(name) || `policy-${index}`, name, rule };
    })
    .filter(Boolean) as Policy[];

  return parsed.length ? parsed : fallback;
}

function parseFaqs(value: string, fallback: FAQ[]) {
  const parsed = value
    .split("\n")
    .map((line, index) => {
      const [question, answer] = line.split("|").map((part) => part.trim());
      if (!question || !answer) {
        return null;
      }
      return { id: slugify(question) || `faq-${index}`, question, answer };
    })
    .filter(Boolean) as FAQ[];

  return parsed.length ? parsed : fallback;
}

function parseEscalations(value: string, fallback: EscalationRule[]) {
  const parsed = value
    .split("\n")
    .map((line, index) => {
      const [trigger, ownerAction] = line.split("|").map((part) => part.trim());
      if (!trigger || !ownerAction) {
        return null;
      }
      return { id: slugify(trigger) || `rule-${index}`, trigger, ownerAction };
    })
    .filter(Boolean) as EscalationRule[];

  return parsed.length ? parsed : fallback;
}

function buildLocalBrief(consultations: ConsultationResult[]): OwnerBrief {
  const answeredCount = consultations.filter((item) => item.status === "answered").length;
  const escalatedCount = consultations.filter((item) => item.status === "escalated").length;
  const knowledgeGaps = Array.from(new Set(consultations.flatMap((item) => item.knowledgeGaps))).slice(0, 5);

  return {
    summary:
      escalatedCount > 0
        ? `${answeredCount} answers handled by Zo Expert. ${escalatedCount} items need owner review.`
        : `${answeredCount} answers handled by Zo Expert with no current escalation.`,
    answeredCount,
    escalatedCount,
    knowledgeGaps,
    suggestedUpdates: ["Add FAQs for repeated questions", "Create owner-approved scripts for escalations"],
    priorityQueue: consultations
      .filter((item) => item.status === "escalated")
      .map((item) => item.question)
      .slice(0, 4)
  };
}

function readJson<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
