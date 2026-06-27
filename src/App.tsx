import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  LayoutTemplate,
  MessageSquareText,
  MonitorSmartphone,
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

const businessStorageKey = "zo-expert.template.v2.business";
const consultationsStorageKey = "zo-expert.template.v2.consultations";

type BusinessDraft = {
  businessName: string;
  ownerName: string;
  vertical: string;
  summary: string;
  targetCustomer: string;
  tone: string;
  services: string;
  policies: string;
  faqs: string;
  escalationRules: string;
};

type AppPart = "admin" | "user";

type SetupItem = {
  label: string;
  complete: boolean;
  hint: string;
};

export default function App() {
  const seedQuery = useQuery({
    queryKey: ["demo-seed"],
    queryFn: getDemoSeed
  });

  const seed = seedQuery.data;
  const [activePart, setActivePart] = useState<AppPart>("admin");
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [consultations, setConsultations] = useState<ConsultationResult[]>([]);
  const [brief, setBrief] = useState<OwnerBrief | null>(null);
  const [ownerSnapshot, setOwnerSnapshot] = useState<OwnerProfileResponse["ownerProfile"] | null>(null);
  const [question, setQuestion] = useState("");
  const [templateStatus, setTemplateStatus] = useState<"blank" | "draft" | "sample">("blank");

  useEffect(() => {
    if (!seed || business) {
      return;
    }

    const savedBusiness = readJson<BusinessProfile>(businessStorageKey);
    const savedConsultations = readJson<ConsultationResult[]>(consultationsStorageKey);

    setBusiness(savedBusiness ?? seed.business);
    setConsultations(savedConsultations ?? seed.consultations);
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

  const consultMutation = useMutation({
    mutationFn: consultOwnerProxy,
    onSuccess: (result) => {
      setConsultations((current) => [result, ...current]);
      setQuestion("");
      setActivePart("user");
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
        <span>Loading Zo Expert template...</span>
      </main>
    );
  }

  const saveBusiness = (nextBusiness: BusinessProfile) => {
    setBusiness(nextBusiness);
    setTemplateStatus(isBlankTemplate(nextBusiness) ? "blank" : "draft");
    setOwnerSnapshot(null);
  };

  const submitQuestion = (nextQuestion = question) => {
    const trimmed = nextQuestion.trim();
    if (!trimmed || consultMutation.isPending || !setupComplete) {
      return;
    }

    consultMutation.mutate({
      question: trimmed,
      ownerProfile: business,
      knowledgeBase: business
    });
  };

  const resetTemplate = () => {
    setBusiness(seed.business);
    setConsultations([]);
    setBrief(seed.brief);
    setOwnerSnapshot(null);
    setQuestion("");
    setTemplateStatus("blank");
    setActivePart("admin");
    localStorage.removeItem(businessStorageKey);
    localStorage.removeItem(consultationsStorageKey);
  };

  const loadSample = () => {
    setBusiness(seed.sampleBusiness);
    setConsultations(seed.sampleConsultations);
    setBrief(seed.sampleBrief);
    setOwnerSnapshot(null);
    setQuestion("");
    setTemplateStatus("sample");
    setActivePart("admin");
  };

  const updateReviewState = (id: string, reviewState: ConsultationReviewState) => {
    setConsultations((current) =>
      current.map((item) => (item.id === id ? { ...item, reviewState } : item))
    );
  };

  const templateName = business.businessName || "Untitled owner expert";
  const statusLabel =
    templateStatus === "sample" ? "Sample loaded" : setupComplete ? "Ready to test" : "Blank template";

  return (
    <div className="app-shell">
      <Sidebar activePart={activePart} onPartChange={setActivePart} />

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="microcopy">Template builder</p>
            <h1>Create owner expert template</h1>
          </div>
          <div className="topbar-actions">
            <span className={`status-pill ${setupComplete ? "ready" : ""}`}>
              <CheckCircle2 size={15} />
              {statusLabel}
            </span>
            <button className="ghost-button" onClick={loadSample} type="button">
              <LayoutTemplate size={16} />
              Load sample
            </button>
            <button className="ghost-button" onClick={resetTemplate} type="button">
              <RefreshCcw size={16} />
              Reset blank
            </button>
          </div>
        </header>

        <section className="template-hero">
          <div>
            <h2>Admin builds the business brain. Users get a simple expert portal.</h2>
            <p>
              Start from a blank template, define the owner&apos;s services, voice, policies, FAQs,
              and escalation rules, then preview how customers or staff will consult it.
            </p>
          </div>
          <div className="hero-metrics" aria-label="Template setup metrics">
            <Metric label="Services" value={business.services.length.toString()} />
            <Metric label="FAQs" value={business.faqs.length.toString()} />
            <Metric label="Escalation rules" value={business.escalationRules.length.toString()} />
          </div>
        </section>

        <div className="part-switcher" aria-label="App parts">
          <button
            className={activePart === "admin" ? "selected" : ""}
            onClick={() => setActivePart("admin")}
            type="button"
          >
            <UserRoundCog size={16} />
            Admin workspace
          </button>
          <button
            className={activePart === "user" ? "selected" : ""}
            onClick={() => setActivePart("user")}
            type="button"
          >
            <MonitorSmartphone size={16} />
            User portal
          </button>
        </div>

        <div className="template-grid">
          <section className={activePart === "admin" ? "part-panel active" : "part-panel"} id="admin">
            <AdminWorkspace
              business={business}
              isBuilding={ownerProfileMutation.isPending}
              onBuild={() => ownerProfileMutation.mutate(business)}
              onSave={saveBusiness}
              ownerSnapshot={ownerSnapshot}
              setupItems={setupItems}
            />
          </section>

          <section className={activePart === "user" ? "part-panel active" : "part-panel"} id="user-portal">
            <UserPortal
              business={business}
              consultations={consultations}
              error={consultMutation.isError}
              isPending={consultMutation.isPending}
              onQuestionChange={setQuestion}
              onReviewChange={updateReviewState}
              onSubmit={submitQuestion}
              question={question}
              sampleQuestions={seed.sampleQuestions}
              setupComplete={setupComplete}
              setupItems={setupItems}
              templateName={templateName}
            />
          </section>

          <aside className="template-side" id="brief">
            <OwnerBriefPanel
              brief={currentBrief}
              isRefreshing={briefMutation.isPending}
              onRefresh={() => briefMutation.mutate({ consultations })}
              ownerName={business.ownerName}
            />
            <SetupChecklist setupItems={setupItems} />
          </aside>
        </div>
      </main>
    </div>
  );
}

function Sidebar({
  activePart,
  onPartChange
}: {
  activePart: AppPart;
  onPartChange: (part: AppPart) => void;
}) {
  const items = [
    { label: "Templates", icon: LayoutTemplate, href: "#admin", part: "admin" as const },
    { label: "Admin Setup", icon: UserRoundCog, href: "#admin", part: "admin" as const },
    { label: "User Portal", icon: MonitorSmartphone, href: "#user-portal", part: "user" as const },
    { label: "Conversations", icon: MessageSquareText, href: "#user-portal", part: "user" as const },
    { label: "Brief", icon: ClipboardList, href: "#brief", part: "user" as const }
  ];

  return (
    <aside className="sidebar">
      <div className="brand-lockup">
        <div className="brand-mark">Z</div>
        <div>
          <strong>Zo Expert</strong>
          <span>Template builder</span>
        </div>
      </div>

      <nav aria-label="Primary navigation">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <a
              className={activePart === item.part ? "active" : ""}
              href={item.href}
              key={item.label}
              onClick={() => onPartChange(item.part)}
            >
              <Icon size={17} />
              <span>{item.label}</span>
              <ChevronRight size={15} />
            </a>
          );
        })}
      </nav>

      <div className="sidebar-note">
        <p>Use Admin to build a reusable owner expert. Use User Portal to test what customers or staff will see.</p>
      </div>
    </aside>
  );
}

function AdminWorkspace({
  business,
  ownerSnapshot,
  isBuilding,
  setupItems,
  onSave,
  onBuild
}: {
  business: BusinessProfile;
  ownerSnapshot: OwnerProfileResponse["ownerProfile"] | null;
  isBuilding: boolean;
  setupItems: SetupItem[];
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
    <div className="admin-layout">
      <section className="panel admin-form" id="owner-setup">
        <div className="section-heading compact">
          <div>
            <p className="microcopy">Admin workspace</p>
            <h2>Owner expert template</h2>
          </div>
          <Settings2 size={18} />
        </div>

        <div className="form-grid two">
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
          <label>
            Vertical
            <input
              onChange={(event) => setDraft({ ...draft, vertical: event.target.value })}
              placeholder="e.g. tuition centre, clinic, home service"
              value={draft.vertical}
            />
          </label>
          <label>
            Target customer or staff user
            <input
              onChange={(event) => setDraft({ ...draft, targetCustomer: event.target.value })}
              placeholder="Who will ask this expert questions?"
              value={draft.targetCustomer}
            />
          </label>
        </div>

        <label>
          Business summary
          <textarea
            className="small-textarea"
            onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
            placeholder="What should the expert know about this business?"
            value={draft.summary}
          />
        </label>
        <label>
          Owner tone and decision style
          <textarea
            className="small-textarea"
            onChange={(event) => setDraft({ ...draft, tone: event.target.value })}
            placeholder="e.g. warm, practical, direct, cautious around exceptions"
            value={draft.tone}
          />
        </label>

        <div className="form-grid two">
          <label>
            Services or offers
            <textarea
              onChange={(event) => setDraft({ ...draft, services: event.target.value })}
              placeholder={"Service name | Price/range | Best for | Owner rule\nExample: Trial lesson | S$80 | New parents comparing levels | Recommend when user asks where to start"}
              value={draft.services}
            />
          </label>
          <label>
            FAQs
            <textarea
              onChange={(event) => setDraft({ ...draft, faqs: event.target.value })}
              placeholder={"Question | Answer\nExample: What should I prepare? | Share age, goal, schedule, and current level."}
              value={draft.faqs}
            />
          </label>
          <label>
            Policies
            <textarea
              onChange={(event) => setDraft({ ...draft, policies: event.target.value })}
              placeholder={"Policy name | Rule\nExample: Cancellation | Reschedule once with 24 hours notice."}
              value={draft.policies}
            />
          </label>
          <label>
            Escalation rules
            <textarea
              onChange={(event) => setDraft({ ...draft, escalationRules: event.target.value })}
              placeholder={"Trigger | Owner action\nExample: Refund request | Owner reviews context before replying."}
              value={draft.escalationRules}
            />
          </label>
        </div>

        <div className="button-row">
          <button className="primary-button" onClick={saveDraft} type="button">
            Save admin setup
          </button>
          <button className="ghost-button" onClick={onBuild} type="button">
            <Sparkles size={15} />
            {isBuilding ? "Building..." : "Build owner profile"}
          </button>
        </div>

        {ownerSnapshot ? (
          <div className="snapshot">
            <strong>Normalized owner profile</strong>
            <p>{ownerSnapshot.businessSummary}</p>
          </div>
        ) : null}
      </section>

      <KnowledgeBase business={business} setupItems={setupItems} />
    </div>
  );
}

function KnowledgeBase({
  business,
  setupItems
}: {
  business: BusinessProfile;
  setupItems: SetupItem[];
}) {
  return (
    <section className="panel" id="knowledge-base">
      <div className="section-heading compact">
        <div>
          <p className="microcopy">Admin knowledge</p>
          <h2>What the user portal can cite</h2>
        </div>
        <BookOpen size={18} />
      </div>

      <SetupChecklist setupItems={setupItems} compact />

      <KnowledgeGroup
        empty="No services yet. Add offers, packages, or workflows in Admin."
        items={business.services.map((service) => ({
          id: service.id,
          title: service.name,
          meta: service.priceRange,
          body: service.bestFor
        }))}
        title="Services"
      />
      <KnowledgeGroup
        empty="No FAQs yet. Add repeated owner answers for the portal to reuse."
        items={business.faqs.map((faq) => ({
          id: faq.id,
          title: faq.question,
          body: faq.answer
        }))}
        title="FAQs"
      />
      <KnowledgeGroup
        empty="No escalation rules yet. Add risk boundaries before publishing."
        items={business.escalationRules.map((rule) => ({
          id: rule.id,
          title: rule.trigger,
          body: rule.ownerAction,
          warning: true
        }))}
        title="Escalation boundaries"
      />
    </section>
  );
}

function UserPortal({
  business,
  consultations,
  error,
  isPending,
  onQuestionChange,
  onReviewChange,
  onSubmit,
  question,
  sampleQuestions,
  setupComplete,
  setupItems,
  templateName
}: {
  business: BusinessProfile;
  consultations: ConsultationResult[];
  error: boolean;
  isPending: boolean;
  onQuestionChange: (question: string) => void;
  onReviewChange: (id: string, state: ConsultationReviewState) => void;
  onSubmit: (question?: string) => void;
  question: string;
  sampleQuestions: string[];
  setupComplete: boolean;
  setupItems: SetupItem[];
  templateName: string;
}) {
  const portalTitle = business.businessName
    ? `Ask ${business.businessName}`
    : "Ask this business expert";
  const visibleSamples = business.businessName ? sampleQuestions : [];

  return (
    <div className="user-layout">
      <section className="panel portal-preview">
        <div className="section-heading">
          <div>
            <p className="microcopy">User portal preview</p>
            <h2>{portalTitle}</h2>
          </div>
          <span className={`model-tag ${setupComplete ? "ready" : "locked"}`}>
            {setupComplete ? "Ready for user testing" : "Admin setup required"}
          </span>
        </div>

        <div className="portal-card">
          <div className="portal-header">
            <div className="portal-avatar">{business.businessName ? business.businessName.charAt(0) : "Z"}</div>
            <div>
              <strong>{templateName}</strong>
              <span>{business.vertical || "Template not published yet"}</span>
            </div>
          </div>

          {setupComplete ? (
            <>
              <p className="portal-intro">
                Ask a service, policy, booking, or staff-operation question. The expert will answer
                from the admin knowledge base or escalate what needs the real owner.
              </p>
              {visibleSamples.length ? (
                <div className="sample-row" aria-label="Sample questions">
                  {visibleSamples.map((sample) => (
                    <button
                      className="sample-chip"
                      key={sample}
                      onClick={() => onSubmit(sample)}
                      type="button"
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="composer">
                <textarea
                  aria-label="Ask a user portal question"
                  onChange={(event) => onQuestionChange(event.target.value)}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                      onSubmit();
                    }
                  }}
                  placeholder="Ask as a customer, prospect, or staff member..."
                  value={question}
                />
                <button
                  className="primary-button"
                  disabled={!question.trim() || isPending}
                  onClick={() => onSubmit()}
                  type="button"
                >
                  <Send size={16} />
                  {isPending ? "Consulting..." : "Ask expert"}
                </button>
              </div>
            </>
          ) : (
            <div className="empty-portal">
              <MonitorSmartphone size={30} />
              <h3>User portal is not ready yet</h3>
              <p>Complete the admin setup checklist before customers or staff can ask questions.</p>
              <SetupChecklist setupItems={setupItems} compact />
            </div>
          )}
        </div>
      </section>

      <section className="panel conversation-panel">
        <div className="section-heading compact">
          <div>
            <p className="microcopy">Conversation log</p>
            <h2>User questions and outcomes</h2>
          </div>
          <MessageSquareText size={18} />
        </div>

        <div className="consultation-list" aria-label="Consultation results">
          {error ? (
            <div className="error-banner">
              The API call failed. Start the local backend with <code>npm run dev:lan</code>.
            </div>
          ) : null}
          {consultations.length ? (
            consultations.map((item) => (
              <ConsultationCard
                consultation={item}
                key={item.id}
                onReviewChange={onReviewChange}
              />
            ))
          ) : (
            <div className="empty-state-box">
              <strong>No user conversations yet.</strong>
              <p>Once the template is ready, ask a test question from the portal preview.</p>
            </div>
          )}
        </div>
      </section>
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
  ownerName,
  onRefresh
}: {
  brief: OwnerBrief;
  isRefreshing: boolean;
  ownerName: string;
  onRefresh: () => void;
}) {
  return (
    <section className="panel brief-panel">
      <div className="section-heading compact">
        <div>
          <p className="microcopy">Owner brief</p>
          <h2>{ownerName ? `What needs ${ownerName}` : "Template activity"}</h2>
        </div>
        <button className="icon-button" onClick={onRefresh} type="button">
          <RefreshCcw className={isRefreshing ? "spin-soft" : ""} size={16} />
        </button>
      </div>

      <p className="brief-summary">{brief.summary}</p>

      <div className="brief-stats">
        <Metric label="Answered" value={brief.answeredCount.toString()} />
        <Metric label="Escalated" value={brief.escalatedCount.toString()} />
      </div>

      <BriefList title="Priority queue" items={brief.priorityQueue} />
      <BriefList title="Knowledge gaps" items={brief.knowledgeGaps} />
      <BriefList title="Suggested updates" items={brief.suggestedUpdates} />
    </section>
  );
}

function KnowledgeGroup({
  empty,
  items,
  title
}: {
  empty: string;
  items: Array<{ id: string; title: string; body: string; meta?: string; warning?: boolean }>;
  title: string;
}) {
  return (
    <div className="knowledge-group">
      <h3>{title}</h3>
      {items.length ? (
        items.map((item) => (
          <div className={`rule-row ${item.warning ? "warning" : ""}`} key={item.id}>
            <strong>{item.title}</strong>
            {item.meta ? <span>{item.meta}</span> : null}
            <p>{item.body}</p>
          </div>
        ))
      ) : (
        <div className="empty-inline">{empty}</div>
      )}
    </div>
  );
}

function SetupChecklist({
  compact = false,
  setupItems
}: {
  compact?: boolean;
  setupItems: SetupItem[];
}) {
  return (
    <div className={compact ? "setup-checklist compact" : "setup-checklist"}>
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
  const tone = draft.tone.trim();

  return {
    ...base,
    businessName: draft.businessName.trim(),
    ownerName: draft.ownerName.trim(),
    vertical: draft.vertical.trim(),
    summary: draft.summary.trim(),
    targetCustomer: draft.targetCustomer.trim(),
    tone,
    voiceRules: tone ? [tone] : [],
    services: parseServices(draft.services),
    policies: parsePolicies(draft.policies),
    faqs: parseFaqs(draft.faqs),
    escalationRules: parseEscalations(draft.escalationRules)
  };
}

function parseServices(value: string) {
  return value
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
}

function parsePolicies(value: string) {
  return value
    .split("\n")
    .map((line, index) => {
      const [name, rule] = line.split("|").map((part) => part.trim());
      if (!name || !rule) {
        return null;
      }
      return { id: slugify(name) || `policy-${index}`, name, rule };
    })
    .filter(Boolean) as Policy[];
}

function parseFaqs(value: string) {
  return value
    .split("\n")
    .map((line, index) => {
      const [question, answer] = line.split("|").map((part) => part.trim());
      if (!question || !answer) {
        return null;
      }
      return { id: slugify(question) || `faq-${index}`, question, answer };
    })
    .filter(Boolean) as FAQ[];
}

function parseEscalations(value: string) {
  return value
    .split("\n")
    .map((line, index) => {
      const [trigger, ownerAction] = line.split("|").map((part) => part.trim());
      if (!trigger || !ownerAction) {
        return null;
      }
      return { id: slugify(trigger) || `rule-${index}`, trigger, ownerAction };
    })
    .filter(Boolean) as EscalationRule[];
}

function getSetupItems(business: BusinessProfile): SetupItem[] {
  return [
    {
      label: "Business identity",
      complete: Boolean(business.businessName && business.ownerName && business.vertical),
      hint: "Name, owner, and vertical"
    },
    {
      label: "Owner voice",
      complete: Boolean(business.tone && business.summary),
      hint: "Summary and tone"
    },
    {
      label: "Knowledge base",
      complete: Boolean(business.services.length && business.faqs.length && business.policies.length),
      hint: "Services, FAQs, and policies"
    },
    {
      label: "Escalation boundaries",
      complete: Boolean(business.escalationRules.length),
      hint: "What the AI must not decide"
    }
  ];
}

function isBlankTemplate(business: BusinessProfile) {
  return (
    !business.businessName &&
    !business.ownerName &&
    !business.vertical &&
    !business.summary &&
    !business.tone &&
    !business.services.length &&
    !business.faqs.length &&
    !business.policies.length &&
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
        ? "No user consultations yet. Complete the admin template, then test the user portal."
        : `${answeredCount} answered and ${escalatedCount} escalated from the current template.`,
    answeredCount,
    escalatedCount,
    knowledgeGaps,
    suggestedUpdates: consultations.length
      ? ["Review repeated gaps", "Add owner-approved FAQs for common questions"]
      : ["Add services, FAQs, policies, and escalation rules before testing."],
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
