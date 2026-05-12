import { useState, useEffect } from "react";
import api from "../services/api";

/* ─── tiny helpers ─────────────────────────────────── */
const today = () => new Date().toISOString().split("T")[0];

const minExamDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
};

const maxExamDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d.toISOString().split("T")[0];
};

const daysUntil = (dateStr) => {
  const diff = new Date(dateStr) - new Date(today());
  return Math.ceil(diff / 86400000);
};

const formatDate = (dateStr) =>
  new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

const difficultyMeta = {
  easy: { label: "Easy", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  medium: { label: "Medium", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  hard: { label: "Hard", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

const focusMeta = {
  Foundation: { icon: "🏗️", color: "#60a5fa" },
  "Core Concepts": { icon: "🧠", color: "#a78bfa" },
  "Deep Dive": { icon: "🔬", color: "#34d399" },
  Practice: { icon: "✏️", color: "#fb923c" },
  Revision: { icon: "🔄", color: "#f472b6" },
  "Mock Test": { icon: "📝", color: "#facc15" },
  Study: { icon: "📖", color: "#94a3b8" },
};

/* ─── components ────────────────────────────────────── */

function ProgressRing({ days, total }) {
  const pct = Math.min(1, (total - days) / total);
  const r = 28;
  const circ = 2 * Math.PI * r;
  return (
    <svg width="72" height="72" style={{ transform: "rotate(-90deg)" }}>
      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke="#60a5fa"
        strokeWidth="5"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
    </svg>
  );
}

function PlanCard({ plan, onOpen, onDelete }) {
  const days = daysUntil(plan.examDate);
  const isUrgent = days <= 3;
  const docName = plan.DocMeta?.filename || "Document";

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "16px",
        padding: "20px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.07)";
        e.currentTarget.style.borderColor = "rgba(96,165,250,0.4)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
      onClick={() => onOpen(plan)}
    >
      {/* accent bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "3px",
        background: isUrgent
          ? "linear-gradient(90deg,#ef4444,#f97316)"
          : "linear-gradient(90deg,#60a5fa,#a78bfa)",
        borderRadius: "16px 16px 0 0",
      }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <p style={{ color: "#94a3b8", fontSize: "11px", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            📄 {docName.replace(/\.pdf$/i, "")}
          </p>
          <h3 style={{ color: "#f1f5f9", fontSize: "17px", fontWeight: "700", margin: "0 0 6px" }}>
            {plan.subject}
          </h3>
          <p style={{ color: "#64748b", fontSize: "12px", margin: 0 }}>
            Exam: {formatDate(plan.examDate)} · {plan.totalDays} days
          </p>
        </div>

        <div style={{ position: "relative", textAlign: "center", flexShrink: 0 }}>
          <ProgressRing days={days} total={plan.totalDays} />
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            flexDirection: "column", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: isUrgent ? "#ef4444" : "#60a5fa", fontSize: "16px", fontWeight: "800", lineHeight: 1 }}>
              {Math.max(0, days)}
            </span>
            <span style={{ color: "#64748b", fontSize: "9px" }}>days</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "6px", marginTop: "14px", flexWrap: "wrap" }}>
        {(plan.keyTopics || []).slice(0, 3).map((t, i) => (
          <span key={i} style={{
            background: "rgba(96,165,250,0.12)", color: "#60a5fa",
            borderRadius: "6px", padding: "2px 8px", fontSize: "11px",
          }}>
            {t.length > 25 ? t.slice(0, 25) + "…" : t}
          </span>
        ))}
        {(plan.keyTopics || []).length > 3 && (
          <span style={{ color: "#475569", fontSize: "11px", alignSelf: "center" }}>
            +{plan.keyTopics.length - 3} more
          </span>
        )}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onDelete(plan.id); }}
        style={{
          position: "absolute", top: "14px", right: "14px",
          background: "rgba(239,68,68,0.1)", border: "none",
          color: "#ef4444", borderRadius: "6px", padding: "3px 8px",
          fontSize: "12px", cursor: "pointer", opacity: 0,
          transition: "opacity 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
      >
        ✕
      </button>
    </div>
  );
}

function DayCard({ day, isToday }) {
  const [expanded, setExpanded] = useState(isToday);
  const diff = difficultyMeta[day.difficulty] || difficultyMeta.medium;
  const focus = focusMeta[day.focus] || focusMeta.Study;
  const isPast = new Date(day.date + "T00:00:00") < new Date(today() + "T00:00:00");

  return (
    <div
      style={{
        background: isToday
          ? "rgba(96,165,250,0.08)"
          : isPast
          ? "rgba(255,255,255,0.02)"
          : "rgba(255,255,255,0.04)",
        border: isToday
          ? "1px solid rgba(96,165,250,0.4)"
          : "1px solid rgba(255,255,255,0.07)",
        borderRadius: "12px",
        overflow: "hidden",
        opacity: isPast && !isToday ? 0.55 : 1,
        transition: "all 0.2s",
      }}
    >
      {/* Header row */}
      <div
        onClick={() => setExpanded((p) => !p)}
        style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: "14px 16px", cursor: "pointer",
        }}
      >
        {/* day badge */}
        <div style={{
          width: "38px", height: "38px", borderRadius: "10px",
          background: isToday ? "rgba(96,165,250,0.2)" : "rgba(255,255,255,0.05)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <span style={{ color: isToday ? "#60a5fa" : "#94a3b8", fontSize: "13px", fontWeight: "700" }}>
            D{day.day}
          </span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ color: "#f1f5f9", fontSize: "13px", fontWeight: "600" }}>
              {formatDate(day.date)}
            </span>
            {isToday && (
              <span style={{
                background: "#60a5fa", color: "#0f172a", borderRadius: "4px",
                padding: "1px 6px", fontSize: "10px", fontWeight: "700",
              }}>TODAY</span>
            )}
            <span style={{ color: focus.color, fontSize: "12px" }}>
              {focus.icon} {day.focus}
            </span>
          </div>
          <p style={{ color: "#64748b", fontSize: "11px", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {(day.topics || []).join(" · ")}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <span style={{
            background: diff.bg, color: diff.color,
            borderRadius: "6px", padding: "2px 8px", fontSize: "11px", fontWeight: "600",
          }}>
            {diff.label}
          </span>
          <span style={{ color: "#475569", fontSize: "11px" }}>{day.hours}h</span>
          <span style={{ color: "#475569", fontSize: "16px", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
            ›
          </span>
        </div>
      </div>

      {/* Expanded tasks */}
      {expanded && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <p style={{ color: "#64748b", fontSize: "11px", margin: "12px 0 8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Tasks
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "6px" }}>
            {(day.tasks || []).map((task, i) => (
              <li key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                <span style={{ color: "#60a5fa", fontSize: "14px", marginTop: "1px", flexShrink: 0 }}>◦</span>
                <span style={{ color: "#cbd5e1", fontSize: "13px", lineHeight: 1.5 }}>{task}</span>
              </li>
            ))}
          </ul>

          {day.topics?.length > 0 && (
            <>
              <p style={{ color: "#64748b", fontSize: "11px", margin: "12px 0 6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Topics
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {day.topics.map((t, i) => (
                  <span key={i} style={{
                    background: "rgba(167,139,250,0.12)", color: "#a78bfa",
                    borderRadius: "6px", padding: "3px 10px", fontSize: "12px",
                  }}>
                    {t}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────── */
export default function StudyPlanPage() {
  const [view, setView] = useState("list"); // "list" | "create" | "detail"
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Form state
  const [form, setForm] = useState({
    docId: "",
    examDate: "",
    subject: "",
    hoursPerDay: 2,
  });

  useEffect(() => {
    fetchPlans();
    fetchDocs();
  }, []);

  const fetchPlans = async () => {
    setLoadingPlans(true);
    try {
      const res = await api.get("/study-plans");
      setPlans(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPlans(false);
    }
  };

  const fetchDocs = async () => {
    try {
      const res = await api.get("/upload");
      setDocuments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.docId) return setError("Please select a document.");
    if (!form.examDate) return setError("Please set an exam date.");

    setGenerating(true);
    try {
      const res = await api.post("/study-plans/generate", {
        docId: form.docId,
        examDate: form.examDate,
        subject: form.subject,
        hoursPerDay: form.hoursPerDay,
      });
      await fetchPlans();
      setSelectedPlan(res.data.plan);
      setView("detail");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to generate study plan. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this study plan?")) return;
    try {
      await api.delete(`/study-plans/${id}`);
      setPlans((p) => p.filter((x) => x.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const openPlan = (plan) => {
    setSelectedPlan(plan);
    setView("detail");
  };

  /* — render — */
  const todayStr = today();

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0f1e",
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
      color: "#f1f5f9",
    }}>
      {/* Top bar */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "0 24px",
      }}>
        <div style={{
          maxWidth: "900px", margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: "64px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {view !== "list" && (
              <button
                onClick={() => setView("list")}
                style={{
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "#94a3b8", borderRadius: "8px", padding: "6px 12px",
                  fontSize: "13px", cursor: "pointer",
                }}
              >
                ← Back
              </button>
            )}
            <div>
              <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#f1f5f9" }}>
                📅 Study Plans
              </h1>
              <p style={{ margin: 0, fontSize: "11px", color: "#475569" }}>
                {view === "list" && `${plans.length} plan${plans.length !== 1 ? "s" : ""}`}
                {view === "create" && "Create new plan"}
                {view === "detail" && selectedPlan?.subject}
              </p>
            </div>
          </div>

          {view === "list" && (
            <button
              onClick={() => { setForm({ docId: "", examDate: "", subject: "", hoursPerDay: 2 }); setError(""); setView("create"); }}
              style={{
                background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                border: "none", color: "#fff", borderRadius: "10px",
                padding: "9px 18px", fontSize: "13px", fontWeight: "600",
                cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
              }}
            >
              + New Plan
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 24px" }}>

        {/* ── LIST VIEW ── */}
        {view === "list" && (
          <>
            {loadingPlans ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#475569" }}>
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div>
                Loading your plans…
              </div>
            ) : plans.length === 0 ? (
              <div style={{
                textAlign: "center", padding: "80px 24px",
                background: "rgba(255,255,255,0.02)",
                border: "1px dashed rgba(255,255,255,0.1)",
                borderRadius: "20px",
              }}>
                <div style={{ fontSize: "52px", marginBottom: "16px" }}>🗓️</div>
                <h2 style={{ color: "#94a3b8", fontSize: "20px", fontWeight: "700", margin: "0 0 8px" }}>
                  No study plans yet
                </h2>
                <p style={{ color: "#475569", fontSize: "14px", margin: "0 0 24px" }}>
                  Upload a document and generate a personalized day-by-day study schedule.
                </p>
                <button
                  onClick={() => setView("create")}
                  style={{
                    background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                    border: "none", color: "#fff", borderRadius: "10px",
                    padding: "11px 24px", fontSize: "14px", fontWeight: "600", cursor: "pointer",
                  }}
                >
                  Create Your First Plan
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
                {plans.map((p) => (
                  <PlanCard key={p.id} plan={p} onOpen={openPlan} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── CREATE VIEW ── */}
        {view === "create" && (
          <div style={{ maxWidth: "560px", margin: "0 auto" }}>
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "20px", padding: "32px",
            }}>
              <h2 style={{ margin: "0 0 6px", fontSize: "22px", fontWeight: "800" }}>
                Generate Study Plan
              </h2>
              <p style={{ color: "#64748b", margin: "0 0 28px", fontSize: "14px" }}>
                We'll analyze your document and create a personalized schedule.
              </p>

              <form onSubmit={handleGenerate} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

                {/* Document selector */}
                <div>
                  <label style={{ display: "block", color: "#94a3b8", fontSize: "12px", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Select Document *
                  </label>
                  {documents.length === 0 ? (
                    <div style={{
                      background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
                      borderRadius: "10px", padding: "12px 14px", color: "#f59e0b", fontSize: "13px",
                    }}>
                      ⚠️ No documents uploaded.{" "}
                      <a href="/upload" style={{ color: "#fbbf24" }}>Upload a PDF first →</a>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {documents.map((doc) => (
                        <label
                          key={doc.id}
                          style={{
                            display: "flex", alignItems: "center", gap: "10px",
                            background: form.docId === doc.id
                              ? "rgba(96,165,250,0.12)"
                              : "rgba(255,255,255,0.04)",
                            border: form.docId === doc.id
                              ? "1px solid rgba(96,165,250,0.4)"
                              : "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "10px", padding: "12px 14px",
                            cursor: "pointer", transition: "all 0.15s",
                          }}
                        >
                          <input
                            type="radio"
                            name="docId"
                            value={doc.id}
                            checked={form.docId === doc.id}
                            onChange={() => {
                              setForm((f) => ({
                                ...f,
                                docId: doc.id,
                                subject: doc.filename.replace(/\.pdf$/i, ""),
                              }));
                            }}
                            style={{ accentColor: "#60a5fa" }}
                          />
                          <span style={{ fontSize: "13px", color: "#cbd5e1" }}>
                            📄 {doc.filename}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Subject name */}
                <div>
                  <label style={{ display: "block", color: "#94a3b8", fontSize: "12px", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Subject / Plan Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Data Structures Final Exam"
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "10px", padding: "11px 14px",
                      color: "#f1f5f9", fontSize: "14px", outline: "none",
                    }}
                  />
                </div>

                {/* Exam date */}
                <div>
                  <label style={{ display: "block", color: "#94a3b8", fontSize: "12px", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Exam Date *
                  </label>
                  <input
                    type="date"
                    min={minExamDate()}
                    max={maxExamDate()}
                    value={form.examDate}
                    onChange={(e) => setForm((f) => ({ ...f, examDate: e.target.value }))}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "10px", padding: "11px 14px",
                      color: "#f1f5f9", fontSize: "14px", outline: "none",
                      colorScheme: "dark",
                    }}
                  />
                  {form.examDate && (
                    <p style={{ color: "#60a5fa", fontSize: "12px", margin: "6px 0 0" }}>
                      📅 {daysUntil(form.examDate)} days to prepare
                    </p>
                  )}
                </div>

                {/* Hours per day */}
                <div>
                  <label style={{ display: "block", color: "#94a3b8", fontSize: "12px", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Study Hours Per Day: <span style={{ color: "#60a5fa" }}>{form.hoursPerDay}h</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={8}
                    value={form.hoursPerDay}
                    onChange={(e) => setForm((f) => ({ ...f, hoursPerDay: parseInt(e.target.value) }))}
                    style={{ width: "100%", accentColor: "#60a5fa" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#475569", fontSize: "11px", marginTop: "2px" }}>
                    <span>1h (light)</span>
                    <span>4h (balanced)</span>
                    <span>8h (intensive)</span>
                  </div>
                </div>

                {error && (
                  <div style={{
                    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
                    borderRadius: "10px", padding: "10px 14px", color: "#f87171", fontSize: "13px",
                  }}>
                    ⚠️ {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={generating || documents.length === 0}
                  style={{
                    background: generating
                      ? "rgba(99,102,241,0.4)"
                      : "linear-gradient(135deg, #3b82f6, #6366f1)",
                    border: "none", color: "#fff", borderRadius: "12px",
                    padding: "13px", fontSize: "15px", fontWeight: "700",
                    cursor: generating ? "wait" : "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {generating ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                      <span style={{
                        width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "#fff", borderRadius: "50%",
                        display: "inline-block", animation: "spin 0.8s linear infinite",
                      }} />
                      Analyzing document &amp; generating plan…
                    </span>
                  ) : (
                    "✨ Generate Study Plan"
                  )}
                </button>
              </form>
            </div>

            {/* Info box */}
            <div style={{
              marginTop: "20px",
              background: "rgba(96,165,250,0.06)",
              border: "1px solid rgba(96,165,250,0.15)",
              borderRadius: "14px", padding: "16px 20px",
            }}>
              <p style={{ margin: "0 0 8px", color: "#60a5fa", fontSize: "13px", fontWeight: "600" }}>
                💡 How it works
              </p>
              <ol style={{ margin: 0, paddingLeft: "18px", color: "#64748b", fontSize: "12px", lineHeight: 1.8 }}>
                <li>We retrieve content from your uploaded document</li>
                <li>AI extracts key topics and chapter structure</li>
                <li>A day-by-day schedule is created with tasks and difficulty levels</li>
                <li>Last days are automatically set for revision &amp; mock tests</li>
              </ol>
            </div>
          </div>
        )}

        {/* ── DETAIL VIEW ── */}
        {view === "detail" && selectedPlan && (
          <div>
            {/* Plan header */}
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "16px", padding: "24px", marginBottom: "24px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
                <div>
                  <h2 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: "800" }}>
                    {selectedPlan.subject}
                  </h2>
                  <p style={{ margin: "0 0 12px", color: "#64748b", fontSize: "13px" }}>
                    📅 Exam on {formatDate(selectedPlan.examDate)} ·{" "}
                    <span style={{ color: daysUntil(selectedPlan.examDate) <= 3 ? "#ef4444" : "#60a5fa" }}>
                      {Math.max(0, daysUntil(selectedPlan.examDate))} days remaining
                    </span>
                    {" · "}{selectedPlan.totalDays} days total
                  </p>
                  {selectedPlan.overview && (
                    <p style={{ margin: 0, color: "#94a3b8", fontSize: "13px", lineHeight: 1.6, maxWidth: "560px" }}>
                      {selectedPlan.overview}
                    </p>
                  )}
                </div>

                {/* Stats */}
                <div style={{ display: "flex", gap: "12px" }}>
                  {[
                    { label: "Days", value: selectedPlan.totalDays },
                    { label: "Topics", value: (selectedPlan.keyTopics || []).length },
                    { label: "Hrs/Day", value: selectedPlan.dailyPlan?.[0]?.hours || "—" },
                  ].map((s) => (
                    <div key={s.label} style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "12px", padding: "12px 16px", textAlign: "center",
                    }}>
                      <p style={{ margin: "0 0 2px", fontSize: "22px", fontWeight: "800", color: "#60a5fa" }}>
                        {s.value}
                      </p>
                      <p style={{ margin: 0, fontSize: "11px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Topics */}
              {(selectedPlan.keyTopics || []).length > 0 && (
                <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <p style={{ margin: "0 0 8px", color: "#64748b", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Key Topics
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {selectedPlan.keyTopics.map((t, i) => (
                      <span key={i} style={{
                        background: "rgba(167,139,250,0.1)", color: "#a78bfa",
                        borderRadius: "6px", padding: "3px 10px", fontSize: "12px",
                      }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Daily plan */}
            <h3 style={{ margin: "0 0 14px", fontSize: "14px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Day-by-Day Schedule
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(selectedPlan.dailyPlan || []).map((day) => (
                <DayCard
                  key={day.day}
                  day={day}
                  isToday={day.date === todayStr}
                />
              ))}
            </div>

            {(selectedPlan.dailyPlan || []).length === 0 && (
              <div style={{ textAlign: "center", padding: "40px", color: "#475569" }}>
                No schedule data available.
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(0.6);
        }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}