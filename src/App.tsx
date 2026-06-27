import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  HelpCircle,
  LayoutTemplate,
  MessageSquareText,
  RefreshCcw,
  Send,
  Sparkles,
  UserRoundCog
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { consultOwnerProxy, generateBrief, getDemoSeed } from "./lib/api";
import type {
  BusinessProfile,
  ConsultationResult,
  ConsultationReviewState,
  EscalationRule,
  OwnerBrief
} from "./types/api";

const businessStorageKey = "zo-expert.simple.v1.business";
const consultationsStorageKey = "zo-expert.simple.v1.consultations";

type BusinessDraft = {
  businessName: string;
  ownerName: string;
  vertical: string;
  tone: string;
  knowledgeText: string;
  escalationRules: string;
};

type SetupItem = {
  label: string;
  complete: boolean;
  hint: string;
};

export default function App() {
  const [path, navigate] = usePathname();

  if (path === "/intro") {
    return <IntroPage onStart={() => navigate("/")} />;
  }

  return <BuilderPage onIntro={() => navigate("/intro")} />;
}

function IntroPage({ onStart }: { onStart: () => void }) {
  return (
    <main className="intro-page">
      <nav className="intro-nav">
        <div className="brand-lockup">
          <div className="brand-mark">Z</div>
          <div>
            <strong>Zo Expert</strong>
            <span>Owner expert templates</span>
          </div>
        </div>
        <button className="ghost-button" onClick={onStart} type="button">
          Open builder
          <ArrowRight size={16} />
        </button>
      </nav>

      <section className="intro-hero">
        <div className="intro-copy">
          <p className="microcopy">AI consultation proxy for SMEs</p>
          <h1>Turn an owner&apos;s know-how into a safe customer-facing expert.</h1>
          <p>
            Small businesses do not need a complicated CRM to start with AI. They need a simple
            way to capture how the owner answers, advises, and decides, then expose that knowledge
            through a user portal with clear escalation boundaries.
          </p>
          <div className="intro-actions">
            <button className="primary-button" onClick={onStart} type="button">
              Start template
              <ArrowRight size={16} />
            </button>
            <a className="text-link" href="#how-it-works">
              See how it works
            </a>
          </div>
        </div>
        <div className="intro-preview" aria-label="Zo Expert preview">
          <div className="preview-window">
            <div className="preview-bar">
              <span />
              <span />
              <span />
            </div>
            <div className="preview-message customer">Which service should I choose?</div>
            <div className="preview-message expert">
              Start with the lowest-risk option. I&apos;ll answer from saved owner knowledge and
              escalate anything sensitive.
            </div>
            <div className="preview-escalation">
              <AlertTriangle size={16} />
              Policy exceptions go back to the owner.
            </div>
          </div>
        </div>
      </section>

      <section className="intro-steps" id="how-it-works">
        <IntroStep
          icon={<UserRoundCog size={22} />}
          title="1. Capture owner knowledge"
          body="Paste services, FAQs, policies, tone, and the owner's usual decision rules."
        />
        <IntroStep
          icon={<MessageSquareText size={22} />}
          title="2. Let users ask"
          body="Customers, prospects, or staff ask questions through a simple portal."
        />
        <IntroStep
          icon={<AlertTriangle size={22} />}
          title="3. Escalate safely"
          body="Refunds, discounts, safety, legal, or unclear decisions go back to the real owner."
        />
      </section>
    </main>
  );
}

function BuilderPage({ onIntro }: { onIntro: () => void }) {
  const seedQuery = useQuery({
    queryKey: ["demo-seed"],
    queryFn: getDemoSeed
  });

  const seed = seedQuery.data;
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [draft, setDraft] = useState<BusinessDraft | null>(null);
  const [consultations, setConsultations] = useState<ConsultationResult[]>([]);
  const [brief, setBrief] = useState<OwnerBrief | null>(null);
  const [question, setQuestion] = useState("");
  const [templateStatus, setTemplateStatus] = useState<"blank" | "draft" | "sample">("blank");

  useEffect(() => {
    if (!seed || business) {
      return;
    }

    const savedBusiness = readJson<BusinessProfile>(businessStorageKey);
    const savedConsultations = readJson<ConsultationResult[]>(consultationsStorageKey);
    const initialBusiness = normalizeBusiness(savedBusiness ?? seed.business);

    setBusiness(initialBusiness);
    setDraft(toDraft(initialBusiness));
    setConsultations(savedConsultations ?? []);
    setBrief(seed.brief);
    setTemplateStatus(savedBusiness ? "draft" : "blank");
  }, [business, seed]);

  useEffect(() => {
    if (business) {
      localStorage.setItem(businessStorageKey, JSON.stringify(business));
    }
  }, [business]);

  useEffect(() => {
    localStorage.setItem(consultationsStorageKey, JSON.stringify(consultations));
  }, [consultations]);

  const setupItems = useMemo(() => (business ? getSetupItems(business) : []), [business]);
  const setupComplete = setupItems.every((item) => item.complete);
  const currentBrief = useMemo(
    () => brief ?? buildLocalBrief(consultations),
    [brief, consultations]
  );

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

  if (!seed || !business || !draft) {
    return (
      <main className="loading-screen">
        <Sparkles className="spin-soft" size={28} />
        <span>Loading Zo Expert...</span>
      </main>
    );
  }

  const saveTemplate = () => {
    const nextBusiness = fromDraft(business, draft);
    setBusiness(nextBusiness);
    setBrief(buildLocalBrief(consultations));
    setTemplateStatus(isBlankTemplate(nextBusiness) ? "blank" : "draft");
  };

  const loadSample = () => {
    setBusiness(seed.sampleBusiness);
    setDraft(toDraft(seed.sampleBusiness));
    setConsultations([]);
    setBrief(seed.brief);
    setQuestion("");
    setTemplateStatus("sample");
  };

  const resetTemplate = () => {
    setBusiness(seed.business);
    setDraft(toDraft(seed.business));
    setConsultations([]);
    setBrief(seed.brief);
    setQuestion("");
    setTemplateStatus("blank");
    localStorage.removeItem(businessStorageKey);
    localStorage.removeItem(consultationsStorageKey);
  };

  const submitQuestion = (nextQuestion = question) => {
    const trimmed = nextQuestion.trim();
    if (!trimmed || !setupComplete || consultMutation.isPending) {
      return;
    }

    consultMutation.mutate({
      question: trimmed,
      ownerProfile: business,
      knowledgeBase: business
    });
  };

  const updateReviewState = (id: string, reviewState: ConsultationReviewState) => {
    setConsultations((current) =>
      current.map((item) => (item.id === id ? { ...item, reviewState } : item))
    );
  };

  const statusLabel =
    templateStatus === "sample" ? "Sample loaded" : setupComplete ? "Ready to test" : "Draft";

  return (
    <main className="simple-shell">
      <header className="simple-topbar">
        <div className="brand-lockup">
          <div className="brand-mark">Z</div>
          <div>
            <strong>Zo Expert</strong>
            <span>{statusLabel}</span>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="ghost-button" onClick={onIntro} type="button">
            <HelpCircle size={16} />
            Intro
          </button>
          <button className="ghost-button" onClick={loadSample} type="button">
            <LayoutTemplate size={16} />
            Load sample
          </button>
          <button className="ghost-button" onClick={resetTemplate} type="button">
            <RefreshCcw size={16} />
            Reset
          </button>
        </div>
      </header>

      <section className="simple-hero">
        <div>
          <p className="microcopy">Template builder</p>
          <h1>Build the owner expert in three steps.</h1>
          <p>
            Capture the owner&apos;s know-how, test the user portal, and review what needs human
            judgment. No CRM setup, no integrations, no extra workflow.
          </p>
        </div>
        <SetupProgress setupItems={setupItems} />
      </section>

      <div className="simple-grid">
        <section className="simple-panel setup-flow">
          <StepHeader
            icon={<UserRoundCog size={18} />}
            step="1"
            title="Setup expert"
            subtitle="Fill only what the AI needs to answer safely."
          />

          <div className="simple-form two">
            <label>
              Business name
              <input
                onChange={(event) => setDraft({ ...draft, businessName: event.target.value })}
                placeholder="e.g. BrightPath Tuition"
                value={draft.businessName}
              />
            </label>
            <label>
              Owner name
              <input
                onChange={(event) => setDraft({ ...draft, ownerName: event.target.value })}
                placeholder="e.g. Mei Ling"
                value={draft.ownerName}
              />
            </label>
          </div>

          <div className="simple-form two">
            <label>
              Business type
              <input
                onChange={(event) => setDraft({ ...draft, vertical: event.target.value })}
                placeholder="e.g. tuition centre, beauty clinic, home service"
                value={draft.vertical}
              />
            </label>
            <label>
              Owner tone
              <input
                onChange={(event) => setDraft({ ...draft, tone: event.target.value })}
                placeholder="e.g. warm, practical, direct"
                value={draft.tone}
              />
            </label>
          </div>

          <label>
            Owner knowledge
            <textarea
              className="knowledge-textarea"
              onChange={(event) => setDraft({ ...draft, knowledgeText: event.target.value })}
              placeholder={"Paste what the owner usually explains:\n- services / packages\n- pricing ranges\n- FAQs\n- policies\n- preparation steps\n- staff instructions"}
              value={draft.knowledgeText}
            />
          </label>

          <label>
            Escalate to owner when...
            <textarea
              className="small-textarea"
              onChange={(event) => setDraft({ ...draft, escalationRules: event.target.value })}
              placeholder={"One rule per line. Example:\nRefund or discount request | Owner reviews before replying\nSafety or legal issue | Owner handles directly"}
              value={draft.escalationRules}
            />
          </label>

          <div className="button-row">
            <button className="primary-button" onClick={saveTemplate} type="button">
              Save template
            </button>
            <button className="ghost-button" onClick={loadSample} type="button">
              Use sample
            </button>
          </div>
        </section>

        <section className="simple-panel user-flow">
          <StepHeader
            icon={<MessageSquareText size={18} />}
            step="2"
            title="Test user portal"
            subtitle="Ask as a customer, prospect, or staff member."
          />

          <div className={setupComplete ? "portal-mini ready" : "portal-mini"}>
            <div className="portal-header">
              <div className="portal-avatar">{business.businessName ? business.businessName.charAt(0) : "Z"}</div>
              <div>
                <strong>{business.businessName || "Your business expert"}</strong>
                <span>{business.vertical || "Complete setup to unlock"}</span>
              </div>
            </div>

            {setupComplete ? (
              <>
                <div className="sample-row" aria-label="Sample questions">
                  {(templateStatus === "sample" ? seed.sampleQuestions : genericQuestions).map((sample) => (
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
                <textarea
                  aria-label="Ask the user portal"
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Ask the expert..."
                  value={question}
                />
                <button
                  className="primary-button wide"
                  disabled={!question.trim() || consultMutation.isPending}
                  onClick={() => submitQuestion()}
                  type="button"
                >
                  <Send size={16} />
                  {consultMutation.isPending ? "Asking..." : "Ask expert"}
                </button>
              </>
            ) : (
              <div className="locked-state">
                <AlertTriangle size={22} />
                <strong>Save the setup first.</strong>
                <span>The user portal unlocks after identity, tone, knowledge, and escalation rules are complete.</span>
              </div>
            )}
          </div>

          <div className="conversation-stack">
            {consultMutation.isError ? (
              <div className="error-banner">API call failed. Check the local backend.</div>
            ) : null}
            {consultations.length ? (
              consultations.slice(0, 3).map((item) => (
                <ConsultationCard
                  consultation={item}
                  key={item.id}
                  onReviewChange={updateReviewState}
                />
              ))
            ) : (
              <div className="empty-state-box">
                <strong>No test questions yet.</strong>
                <p>Once the template is saved, ask one question to check the answer and escalation behavior.</p>
              </div>
            )}
          </div>
        </section>

        <aside className="simple-panel brief-flow">
          <StepHeader
            icon={<ClipboardList size={18} />}
            step="3"
            title="Owner brief"
            subtitle="See what was answered, escalated, or missing."
          />

          <div className="brief-stats">
            <Metric label="Answered" value={currentBrief.answeredCount.toString()} />
            <Metric label="Escalated" value={currentBrief.escalatedCount.toString()} />
          </div>

          <BriefList title="Setup checklist" items={setupItems.map((item) => `${item.complete ? "Done" : "Todo"}: ${item.label}`)} />
          <BriefList title="Knowledge gaps" items={currentBrief.knowledgeGaps} />
          <BriefList title="Next updates" items={currentBrief.suggestedUpdates} />

          <button
            className="ghost-button wide"
            onClick={() => briefMutation.mutate({ consultations })}
            type="button"
          >
            <RefreshCcw className={briefMutation.isPending ? "spin-soft" : ""} size={16} />
            Refresh brief
          </button>
        </aside>
      </div>
    </main>
  );
}

function IntroStep({
  body,
  icon,
  title
}: {
  body: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <article className="intro-step">
      <div className="intro-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{body}</p>
    </article>
  );
}

function StepHeader({
  icon,
  step,
  subtitle,
  title
}: {
  icon: ReactNode;
  step: string;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="step-header">
      <div className="step-number">{step}</div>
      <div>
        <div className="step-title-row">
          {icon}
          <h2>{title}</h2>
        </div>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function SetupProgress({ setupItems }: { setupItems: SetupItem[] }) {
  const done = setupItems.filter((item) => item.complete).length;
  const total = setupItems.length || 1;

  return (
    <div className="setup-progress">
      <strong>{Math.round((done / total) * 100)}%</strong>
      <span>{done} of {setupItems.length} ready</span>
      <div className="progress-track">
        <div style={{ width: `${(done / total) * 100}%` }} />
      </div>
    </div>
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

      <div className="review-controls">
        {(["new", "reviewed", "owner-action"] as ConsultationReviewState[]).map((state) => (
          <button
            className={consultation.reviewState === state ? "selected" : ""}
            key={state}
            onClick={() => onReviewChange(consultation.id, state)}
            type="button"
          >
            {state.replace("-", " ")}
          </button>
        ))}
      </div>
    </article>
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
        <p>No items yet.</p>
      )}
    </div>
  );
}

function toDraft(business: BusinessProfile): BusinessDraft {
  return {
    businessName: business.businessName,
    ownerName: business.ownerName,
    vertical: business.vertical,
    tone: business.tone,
    knowledgeText: business.knowledgeText ?? business.summary ?? "",
    escalationRules: business.escalationRules
      .map((rule) => [rule.trigger, rule.ownerAction].join(" | "))
      .join("\n")
  };
}

function fromDraft(base: BusinessProfile, draft: BusinessDraft): BusinessProfile {
  const knowledgeText = draft.knowledgeText.trim();
  const tone = draft.tone.trim();

  return {
    ...base,
    businessName: draft.businessName.trim(),
    ownerName: draft.ownerName.trim(),
    vertical: draft.vertical.trim(),
    summary: firstSentence(knowledgeText),
    targetCustomer: base.targetCustomer || "Customers, prospects, or staff",
    tone,
    knowledgeText,
    voiceRules: tone ? [tone] : [],
    escalationRules: parseEscalations(draft.escalationRules)
  };
}

function parseEscalations(value: string) {
  return value
    .split("\n")
    .map((line, index) => {
      const [trigger, ownerAction] = line.split("|").map((part) => part.trim());
      if (!trigger) {
        return null;
      }
      return {
        id: slugify(trigger) || `rule-${index}`,
        trigger,
        ownerAction: ownerAction || "Owner reviews this directly before replying."
      };
    })
    .filter(Boolean) as EscalationRule[];
}

function getSetupItems(business: BusinessProfile): SetupItem[] {
  return [
    {
      label: "Identity",
      complete: Boolean(business.businessName && business.ownerName && business.vertical),
      hint: "Business, owner, and type"
    },
    {
      label: "Tone",
      complete: Boolean(business.tone),
      hint: "How the owner sounds"
    },
    {
      label: "Owner knowledge",
      complete: (business.knowledgeText ?? "").trim().length >= 40,
      hint: "Services, FAQs, policies, instructions"
    },
    {
      label: "Escalation rules",
      complete: Boolean(business.escalationRules.length),
      hint: "What AI must not decide"
    }
  ];
}

function isBlankTemplate(business: BusinessProfile) {
  return (
    !business.businessName &&
    !business.ownerName &&
    !business.vertical &&
    !business.tone &&
    !(business.knowledgeText ?? "") &&
    !business.escalationRules.length
  );
}

function buildLocalBrief(consultations: ConsultationResult[]): OwnerBrief {
  const answeredCount = consultations.filter((item) => item.status === "answered").length;
  const escalatedCount = consultations.filter((item) => item.status === "escalated").length;
  const knowledgeGaps = Array.from(new Set(consultations.flatMap((item) => item.knowledgeGaps))).slice(0, 5);

  return {
    summary:
      consultations.length === 0
        ? "No questions yet. Save the template, then test one user question."
        : `${answeredCount} answered and ${escalatedCount} escalated from this template.`,
    answeredCount,
    escalatedCount,
    knowledgeGaps,
    suggestedUpdates: consultations.length
      ? ["Turn repeated gaps into owner-approved answers.", "Add one escalation rule for each risky decision."]
      : ["Save the template.", "Ask one test question.", "Tighten escalation rules before sharing."],
    priorityQueue: consultations
      .filter((item) => item.status === "escalated")
      .map((item) => item.question)
      .slice(0, 4)
  };
}

function usePathname(): [string, (path: string) => void] {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = (nextPath: string) => {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  };

  return [path, navigate];
}

function readJson<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function normalizeBusiness(business: BusinessProfile): BusinessProfile {
  return {
    ...business,
    summary: business.summary ?? "",
    targetCustomer: business.targetCustomer ?? "",
    tone: business.tone ?? "",
    knowledgeText: business.knowledgeText ?? business.summary ?? "",
    voiceRules: business.voiceRules ?? [],
    services: business.services ?? [],
    policies: business.policies ?? [],
    faqs: business.faqs ?? [],
    escalationRules: business.escalationRules ?? []
  };
}

function firstSentence(value: string) {
  return value.split(/[.\n]/).find((line) => line.trim())?.trim() ?? "";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const genericQuestions = [
  "What service should I choose?",
  "What should I prepare?",
  "Can you make an exception for me?"
];
