import { useState, useEffect } from "react";
import { sendToBackground } from "@/lib/messaging";
import type { AuditResult } from "@/lib/messaging";

type ViewState = "idle" | "loading" | "results" | "error";

const GOALS = [
  "Lead generation",
  "E-commerce sales",
  "SaaS signup",
  "Newsletter signup",
  "Appointment booking",
  "Phone calls",
];

const TYPES = [
  "Professional services",
  "E-commerce",
  "SaaS",
  "Agency",
  "Local business",
  "Other",
];

export function Popup() {
  const [view, setView] = useState<ViewState>("idle");
  const [tabUrl, setTabUrl] = useState("");
  const [conversionGoal, setConversionGoal] = useState("Lead generation");
  const [businessType, setBusinessType] = useState("Professional services");
  const [results, setResults] = useState<AuditResult | null>(null);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    // Get current tab URL
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) setTabUrl(tab.url);

    // Get remaining audits
    const usageRes = await sendToBackground("GET_USAGE", undefined as void);
    if (usageRes.success && usageRes.data) {
      setRemaining(usageRes.data.remaining);
    }
  }

  async function runAudit() {
    if (!tabUrl) return;
    setView("loading");
    setError("");

    const res = await sendToBackground("RUN_AUDIT", {
      url: tabUrl,
      conversionGoal,
      businessType,
    });

    if (res.success && res.data) {
      setResults(res.data.result);
      setRemaining(res.data.remaining);
      setView("results");
    } else {
      setError(res.error || "Something went wrong");
      setView("error");
    }
  }

  function scoreColor(score: number): string {
    if (score >= 7) return "text-green-600";
    if (score >= 5) return "text-amber-500";
    return "text-red-500";
  }

  function scoreBg(score: number): string {
    if (score >= 7) return "bg-green-500";
    if (score >= 5) return "bg-amber-400";
    return "bg-red-500";
  }

  function scoreRingColor(score: number): string {
    if (score >= 7) return "border-green-500";
    if (score >= 5) return "border-amber-400";
    return "border-red-500";
  }

  const statusIcon = (status: string) => {
    if (status === "good") return <span className="text-green-500">&#10003;</span>;
    if (status === "warning") return <span className="text-amber-500">&#9888;</span>;
    return <span className="text-red-500">&#10005;</span>;
  };

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="bg-slate-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={chrome.runtime.getURL("public/icons/icon-32.png")} alt="Optimise Digital" className="w-6 h-6" />
          <span className="text-white text-sm font-semibold">CRO Audit</span>
        </div>
        {remaining !== null && (
          <span className="text-[10px] text-slate-400">
            {remaining} audit{remaining !== 1 ? "s" : ""} left today
          </span>
        )}
      </div>

      {/* Idle view */}
      {view === "idle" && (
        <div className="p-4 space-y-3">
          {/* Current URL */}
          <div className="bg-slate-50 rounded-lg p-2.5">
            <p className="text-[10px] text-slate-400 mb-0.5">Current page</p>
            <p className="text-xs text-slate-700 truncate">{tabUrl || "No URL detected"}</p>
          </div>

          {/* Conversion goal */}
          <div>
            <label className="text-[10px] text-slate-500 block mb-1">Conversion goal</label>
            <select
              value={conversionGoal}
              onChange={(e) => setConversionGoal(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-orange-400"
            >
              {GOALS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          {/* Business type */}
          <div>
            <label className="text-[10px] text-slate-500 block mb-1">Business type</label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-orange-400"
            >
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Run button */}
          <button
            onClick={runAudit}
            disabled={!tabUrl || remaining === 0}
            className="w-full py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {remaining === 0 ? "No audits remaining today" : "Run CRO Audit"}
          </button>

          {/* Usage note */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            <p className="text-[10px] text-blue-700">
              {remaining === 0
                ? "You've used your 2 free audits for today. Come back tomorrow!"
                : remaining !== null
                  ? `You have ${remaining} free audit${remaining !== 1 ? "s" : ""} remaining today. You get 2 audits per day.`
                  : "Loading usage..."}
            </p>
          </div>
        </div>
      )}

      {/* Loading view */}
      {view === "loading" && (
        <div className="p-8 flex flex-col items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-slate-200 border-t-orange-500"></div>
          <p className="text-sm text-slate-600">Analysing page...</p>
          <p className="text-[10px] text-slate-400">This usually takes 5-10 seconds</p>
        </div>
      )}

      {/* Results view */}
      {view === "results" && results && (
        <div className="p-4 space-y-4">
          {/* Overall score */}
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full border-4 ${scoreRingColor(results.overallScore)} flex items-center justify-center flex-shrink-0`}>
              <span className={`text-2xl font-bold ${scoreColor(results.overallScore)}`}>
                {results.overallScore.toFixed(1)}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Overall CRO Score</p>
              <p className="text-[10px] text-slate-400 truncate max-w-[240px]">{results.websiteUrl}</p>
            </div>
          </div>

          {/* Category scores */}
          <div className="space-y-2">
            {[
              { label: "First Impression", score: results.firstImpressionScore },
              { label: "Trust & Social Proof", score: results.trustSocialProofScore },
              { label: "Call-to-Actions", score: results.ctaScore },
              { label: "Lead Capture", score: results.leadCaptureScore },
              { label: "Content & Readability", score: results.contentReadabilityScore },
              { label: "Navigation", score: results.navigationScore },
            ].map(({ label, score }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 w-[120px] flex-shrink-0">{label}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${scoreBg(score)}`}
                    style={{ width: `${score * 10}%` }}
                  />
                </div>
                <span className={`text-[11px] font-semibold w-6 text-right ${scoreColor(score)}`}>
                  {score.toFixed(1)}
                </span>
              </div>
            ))}
          </div>

          {/* Key findings */}
          {results.findings && results.findings.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">Key Findings</p>
              <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                {results.findings.slice(0, 8).map((f, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[10px]">
                    <span className="flex-shrink-0 mt-0.5">{statusIcon(f.status)}</span>
                    <span className="text-slate-600">{f.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top recommendations */}
          {results.recommendations && results.recommendations.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">Top Recommendations</p>
              <div className="space-y-2">
                {results.recommendations.slice(0, 3).map((r, i) => (
                  <div key={i} className="bg-orange-50 border border-orange-100 rounded-lg p-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[9px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">
                        #{r.priority}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-800">{r.title}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-2">{r.description}</p>
                    {r.estimatedLift && (
                      <p className="text-[9px] text-green-600 mt-0.5">Est. lift: {r.estimatedLift}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Run another */}
          <button
            onClick={() => { setView("idle"); setResults(null); }}
            className="w-full py-2 text-xs font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
          >
            Run Another Audit
          </button>
        </div>
      )}

      {/* Error view */}
      {view === "error" && (
        <div className="p-6 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <span className="text-red-500 text-xl">!</span>
          </div>
          <p className="text-sm text-slate-700 text-center">{error}</p>
          <button
            onClick={() => setView("idle")}
            className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-between">
        <a
          href="https://www.optimisedigital.online"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9px] text-slate-400 hover:text-orange-500 transition-colors"
        >
          Powered by Optimise Digital
        </a>
        <span className="text-[9px] text-slate-300">v{chrome.runtime.getManifest().version}</span>
      </div>
    </div>
  );
}
