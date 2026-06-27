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
import ownerHeroImage from "./assets/zo-expert-owner-hero.png";
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

type BuilderTab = "template" | "ask" | "brief";

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
    <main className="intro-page intro-redesign">
      <nav className="intro-nav">
        <BrandLockup status="Owner expert templates" />
        <button className="ghost-button" onClick={onStart} type="button">
          Open builder
          <ArrowRight size={16} />
        </button>
      </nav>

      <section className="intro-hero intro-photo-hero">
        <div className="intro-copy">
          <h1>Turn an owner&apos;s know-how into a safe customer-facing expert.</h1>
          <p>
            Zo Expert captures how an SME owner answers, advises, and decides, then exposes that
            knowledge through a simple customer portal with clear escalation boundaries.
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
        <div className="intro-photo-frame">
          <img alt="SME owner working at a laptop" src={ownerHeroImage} />
          <div className="intro-floating-chat">
            <span>Customer asks</span>
            <strong>Which service should I choose?</strong>
            <p>Safe answers go out. Sensitive decisions come back to the owner.</p>
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
  const [activeTab, setActiveTab] = useState<BuilderTab>("template");
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
      setActiveTab("ask");
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
    const nextSetupItems = getSetupItems(nextBusiness);

    setBusiness(nextBusiness);
    setBrief(buildLocalBrief(consultations));
    setTemplateStatus(isBlankTemplate(nextBusiness) ? "blank" : "draft");

    if (nextSetupItems.every((item) => item.complete)) {
      setActiveTab("ask");
    }
  };

  const loadSample = () => {
    setBusiness(seed.sampleBusiness);
    setDraft(toDraft(seed.sampleBusiness));
    setConsultations([]);
    setBrief(seed.brief);
    setQuestion("");
    setTemplateStatus("sample");
    setActiveTab("template");
  };

  const resetTemplate = () => {
    setBusiness(seed.business);
    setDraft(toDraft(seed.business));
    setConsultations([]);
    setBrief(seed.brief);
    setQuestion("");
    setTemplateStatus("blank");
    setActiveTab("template");
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

  const tabMeta = getTabMeta(activeTab);

  return (
    <main className="studio-shell">
      <header className="studio-topbar">
        <BrandLockup status={statusLabel} />
        <TabRail activeTab={activeTab} onTabChange={setActiveTab} />
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

      <section className="studio-hero" aria-label="Zo Expert overview">
        <img alt="SME owner working at a laptop" className="hero-photo" src={ownerHeroImage} />
        <div className="hero-shade" />
        <div className="hero-content">
          <div className="hero-copy">
            <h1>Build your owner expert in three simple steps.</h1>
            <p>Capture know-how. Let users ask. Keep the owner in control of what matters.</p>
            <div className="hero-actions">
              <button className="primary-button" onClick={() => setActiveTab("template")} type="button">
                Edit template
              </button>
              <button
                className="glass-button"
                onClick={() => (setupComplete ? setActiveTab("ask") : loadSample())}
                type="button"
              >
                {setupComplete ? "Test portal" : "Load sample"}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
          <HeroPreview business={business} setupComplete={setupComplete} />
        </div>
        <div className="hero-step-strip" aria-label="Flow summary">
          <HeroStep
            active={activeTab === "template"}
            label="Template"
            number="1"
            onClick={() => setActiveTab("template")}
          />
          <HeroStep
            active={activeTab === "ask"}
            label="Ask"
            number="2"
            onClick={() => setActiveTab("ask")}
          />
          <HeroStep
            active={activeTab === "brief"}
            label="Brief"
            number="3"
            onClick={() => setActiveTab("brief")}
          />
        </div>
      </section>

      <section className="tab-workspace" aria-label={`${tabMeta.title} workspace`}>
        <div className="workspace-heading">
          <div>
            <h2>{tabMeta.title}</h2>
            <p>{tabMeta.description}</p>
          </div>
          <SetupProgress setupItems={setupItems} />
        </div>

        {activeTab === "template" ? (
          <TemplateTab
            draft={draft}
            business={business}
            loadSample={loadSample}
            saveTemplate={saveTemplate}
            setActiveTab={setActiveTab}
            setDraft={setDraft}
            setupItems={setupItems}
          />
        ) : null}

        {activeTab === "ask" ? (
          <AskTab
            business={business}
            consultations={consultations}
            error={consultMutation.isError}
            isPending={consultMutation.isPending}
            question={question}
            sampleQuestions={templateStatus === "sample" ? seed.sampleQuestions : genericQuestions}
            setActiveTab={setActiveTab}
            setQuestion={setQuestion}
            setupComplete={setupComplete}
            setupItems={setupItems}
            submitQuestion={submitQuestion}
            updateReviewState={updateReviewState}
          />
        ) : null}

        {activeTab === "brief" ? (
          <BriefTab
            brief={currentBrief}
            consultations={consultations}
            isRefreshing={briefMutation.isPending}
            onRefresh={() => briefMutation.mutate({ consultations })}
            setupItems={setupItems}
            setActiveTab={setActiveTab}
            updateReviewState={updateReviewState}
          />
        ) : null}
      </section>
    </main>
  );
}

function BrandLockup({ status }: { status: string }) {
  return (
    <div className="brand-lockup">
      <div className="brand-mark">Z</div>
      <div>
        <strong>Zo Expert</strong>
        <span>{status}</span>
      </div>
    </div>
  );
}

function TabRail({
  activeTab,
  onTabChange
}: {
  activeTab: BuilderTab;
  onTabChange: (tab: BuilderTab) => void;
}) {
  const tabs: Array<{ icon: ReactNode; id: BuilderTab; label: string }> = [
    { id: "template", label: "Template", icon: <BookOpen size={18} /> },
    { id: "ask", label: "Ask", icon: <MessageSquareText size={18} /> },
    { id: "brief", label: "Owner Brief", icon: <ClipboardList size={18} /> }
  ];

  return (
    <div className="tab-rail" role="tablist" aria-label="Zo Expert sections">
      {tabs.map((tab) => (
        <button
          aria-selected={activeTab === tab.id}
          className={activeTab === tab.id ? "selected" : ""}
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          role="tab"
          type="button"
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function HeroPreview({
  business,
  setupComplete
}: {
  business: BusinessProfile;
  setupComplete: boolean;
}) {
  return (
    <div className="hero-preview-card" aria-label="User portal preview">
      <div className="preview-topline">
        <div className="portal-avatar">{business.businessName ? business.businessName.charAt(0) : "Z"}</div>
        <div>
          <strong>{business.businessName || "Your business expert"}</strong>
          <span>{setupComplete ? "Ready for user questions" : "Locked until setup is saved"}</span>
        </div>
      </div>
      <div className="hero-chat-bubble user">
        I need advice before I commit. What should I choose?
      </div>
      <div className="hero-chat-bubble expert">
        I&apos;ll answer from the owner&apos;s saved knowledge and flag risky decisions.
      </div>
      <div className="hero-mini-composer">
        <span>Ask another question...</span>
        <Send size={15} />
      </div>
    </div>
  );
}

function HeroStep({
  active,
  label,
  number,
  onClick
}: {
  active: boolean;
  label: string;
  number: string;
  onClick: () => void;
}) {
  return (
    <button className={active ? "active" : ""} onClick={onClick} type="button">
      <span>{number}</span>
      {label}
    </button>
  );
}

function TemplateTab({
  business,
  draft,
  loadSample,
  saveTemplate,
  setActiveTab,
  setDraft,
  setupItems
}: {
  business: BusinessProfile;
  draft: BusinessDraft;
  loadSample: () => void;
  saveTemplate: () => void;
  setActiveTab: (tab: BuilderTab) => void;
  setDraft: (draft: BusinessDraft) => void;
  setupItems: SetupItem[];
}) {
  return (
    <div className="tab-content-grid template-layout">
      <section className="workspace-panel form-panel">
        <PanelTitle
          icon={<UserRoundCog size={18} />}
          title="Template"
          description="Fill only what the AI needs to answer safely."
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

        <div className="template-textareas">
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
        </div>

        <div className="button-row">
          <button className="primary-button" onClick={saveTemplate} type="button">
            <BookOpen size={16} />
            Save template
          </button>
          <button className="ghost-button" onClick={loadSample} type="button">
            <LayoutTemplate size={16} />
            Use sample
          </button>
        </div>
      </section>

      <aside className="side-stack">
        <section className="image-panel">
          <img alt="Owner workspace" src={ownerHeroImage} />
          <div>
            <strong>{business.businessName || "A reusable owner expert"}</strong>
            <span>One owner brain, one customer portal, one escalation loop.</span>
          </div>
        </section>

        <section className="workspace-panel compact-panel">
          <PanelTitle
            icon={<CheckCircle2 size={18} />}
            title="Readiness"
            description="The user portal unlocks after these are done."
          />
          <SetupChecklist setupItems={setupItems} />
          <button className="ghost-button wide" onClick={() => setActiveTab("ask")} type="button">
            Preview Ask tab
            <ArrowRight size={16} />
          </button>
        </section>
      </aside>
    </div>
  );
}

function AskTab({
  business,
  consultations,
  error,
  isPending,
  question,
  sampleQuestions,
  setActiveTab,
  setQuestion,
  setupComplete,
  setupItems,
  submitQuestion,
  updateReviewState
}: {
  business: BusinessProfile;
  consultations: ConsultationResult[];
  error: boolean;
  isPending: boolean;
  question: string;
  sampleQuestions: string[];
  setActiveTab: (tab: BuilderTab) => void;
  setQuestion: (question: string) => void;
  setupComplete: boolean;
  setupItems: SetupItem[];
  submitQuestion: (question?: string) => void;
  updateReviewState: (id: string, state: ConsultationReviewState) => void;
}) {
  return (
    <div className="tab-content-grid ask-layout">
      <section className="workspace-panel chat-panel">
        <PanelTitle
          icon={<MessageSquareText size={18} />}
          title="User portal"
          description="Ask as a customer, prospect, or staff member."
        />

        <div className={setupComplete ? "portal-stage ready" : "portal-stage"}>
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
                {sampleQuestions.map((sample) => (
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
                disabled={!question.trim() || isPending}
                onClick={() => submitQuestion()}
                type="button"
              >
                <Send size={16} />
                {isPending ? "Asking..." : "Ask expert"}
              </button>
            </>
          ) : (
            <div className="locked-state">
              <AlertTriangle size={22} />
              <strong>Save the template first.</strong>
              <span>Identity, tone, knowledge, and escalation rules must be complete.</span>
              <button className="ghost-button" onClick={() => setActiveTab("template")} type="button">
                Go to Template
              </button>
            </div>
          )}
        </div>

        <ConversationStack
          consultations={consultations}
          error={error}
          onReviewChange={updateReviewState}
        />
      </section>

      <aside className="side-stack">
        <section className="workspace-panel compact-panel">
          <PanelTitle
            icon={<AlertTriangle size={18} />}
            title="Owner guardrails"
            description="The AI answers only inside the saved boundaries."
          />
          <BriefList
            title="Escalates when"
            items={
              business.escalationRules.length
                ? business.escalationRules.map((rule) => rule.trigger)
                : ["Refunds, discounts, safety, legal, and unclear decisions"]
            }
          />
        </section>
        <section className="workspace-panel compact-panel">
          <PanelTitle
            icon={<CheckCircle2 size={18} />}
            title="Setup checklist"
            description="Fix any missing setup before sharing."
          />
          <SetupChecklist setupItems={setupItems} />
        </section>
      </aside>
    </div>
  );
}

function BriefTab({
  brief,
  consultations,
  isRefreshing,
  onRefresh,
  setActiveTab,
  setupItems,
  updateReviewState
}: {
  brief: OwnerBrief;
  consultations: ConsultationResult[];
  isRefreshing: boolean;
  onRefresh: () => void;
  setActiveTab: (tab: BuilderTab) => void;
  setupItems: SetupItem[];
  updateReviewState: (id: string, state: ConsultationReviewState) => void;
}) {
  return (
    <div className="tab-content-grid brief-layout">
      <section className="workspace-panel brief-board">
        <PanelTitle
          icon={<ClipboardList size={18} />}
          title="Owner brief"
          description="See what was answered, escalated, or missing."
        />

        <p className="brief-summary">{brief.summary}</p>
        <div className="brief-stats">
          <Metric label="Answered" value={brief.answeredCount.toString()} />
          <Metric label="Escalated" value={brief.escalatedCount.toString()} />
        </div>

        <div className="brief-columns">
          <BriefList title="Setup checklist" items={setupItems.map((item) => `${item.complete ? "Done" : "Todo"}: ${item.label}`)} />
          <BriefList title="Knowledge gaps" items={brief.knowledgeGaps} />
          <BriefList title="Next updates" items={brief.suggestedUpdates} />
        </div>

        <div className="button-row">
          <button className="primary-button" onClick={onRefresh} type="button">
            <RefreshCcw className={isRefreshing ? "spin-soft" : ""} size={16} />
            Refresh brief
          </button>
          <button className="ghost-button" onClick={() => setActiveTab("ask")} type="button">
            Test another question
          </button>
        </div>
      </section>

      <aside className="workspace-panel compact-panel">
        <PanelTitle
          icon={<MessageSquareText size={18} />}
          title="Latest activity"
          description="Recent user questions and owner actions."
        />
        <ConversationStack
          compact
          consultations={consultations}
          error={false}
          onReviewChange={updateReviewState}
        />
      </aside>
    </div>
  );
}

function PanelTitle({
  description,
  icon,
  title
}: {
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="panel-title">
      <div className="panel-icon">{icon}</div>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
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

function SetupProgress({ setupItems }: { setupItems: SetupItem[] }) {
  const done = setupItems.filter((item) => item.complete).length;
  const total = setupItems.length || 1;

  return (
    <div className="setup-progress">
      <strong>{Math.round((done / total) * 100)}%</strong>
      <span>
        {done} of {setupItems.length} ready
      </span>
      <div className="progress-track">
        <div style={{ width: `${(done / total) * 100}%` }} />
      </div>
    </div>
  );
}

function SetupChecklist({ setupItems }: { setupItems: SetupItem[] }) {
  return (
    <div className="setup-checklist simple">
      {setupItems.map((item) => (
        <div className={item.complete ? "setup-item complete" : "setup-item"} key={item.label}>
          {item.complete ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          <div>
            <strong>{item.label}</strong>
            <span>{item.hint}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ConversationStack({
  compact = false,
  consultations,
  error,
  onReviewChange
}: {
  compact?: boolean;
  consultations: ConsultationResult[];
  error: boolean;
  onReviewChange: (id: string, state: ConsultationReviewState) => void;
}) {
  return (
    <div className={compact ? "conversation-stack compact" : "conversation-stack"}>
      {error ? <div className="error-banner">API call failed. Check the local backend.</div> : null}
      {consultations.length ? (
        consultations
          .slice(0, compact ? 2 : 4)
          .map((item) => (
            <ConsultationCard
              compact={compact}
              consultation={item}
              key={item.id}
              onReviewChange={onReviewChange}
            />
          ))
      ) : (
        <div className="empty-state-box">
          <strong>No test questions yet.</strong>
          <p>Ask one question to check the answer and escalation behavior.</p>
        </div>
      )}
    </div>
  );
}

function ConsultationCard({
  compact = false,
  consultation,
  onReviewChange
}: {
  compact?: boolean;
  consultation: ConsultationResult;
  onReviewChange: (id: string, state: ConsultationReviewState) => void;
}) {
  const isEscalated = consultation.status === "escalated";

  return (
    <article className={`consultation-card ${isEscalated ? "escalated" : "answered"} ${compact ? "compact" : ""}`}>
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

      {!compact ? (
        <>
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
        </>
      ) : null}
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

function getTabMeta(tab: BuilderTab) {
  if (tab === "ask") {
    return {
      title: "Ask",
      description: "Preview the customer-facing expert without leaving the builder."
    };
  }

  if (tab === "brief") {
    return {
      title: "Owner Brief",
      description: "Review activity, escalation pressure, and missing knowledge."
    };
  }

  return {
    title: "Template",
    description: "Capture the owner's knowledge and rules once, then test immediately."
  };
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
