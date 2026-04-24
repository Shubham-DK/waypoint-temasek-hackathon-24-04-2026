import { useState, useEffect, useCallback, useMemo } from 'react';
import { Activity, RefreshCw, Download, AlertCircle, Loader2, Wifi, Globe, Sparkles, ArrowLeft } from 'lucide-react';
import { useApp, msgId } from '../../context/AppContext';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { handleSend } from '../../chat-handler';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PerfPhases {
  dns: number; tcp: number; ssl: number;
  request: number; response: number; dom: number; load: number;
}

interface PerfData {
  url: string; title: string;
  lcp: number | null; fcp: number | null; cls: number | null;
  tbt: number | null; ttfb: number | null; dcl: number | null;
  load: number | null; tti: number | null;
  phases: PerfPhases | null;
  resourceCount: number; totalSize: number;
  byType: Record<string, { count: number; size: number }>;
  jsHeap: number | null; jsHeapLimit: number | null;
  effectiveType: string | null; rtt: number | null; downlink: number | null;
  collectedAt: number; error?: string;
}

interface TabEntry {
  id: number; title: string; url: string; favIconUrl?: string;
  perf: PerfData | null; loading: boolean; error?: string;
}

// ─── Page-injected collector (must be fully self-contained) ──────────────────

async function _collectPerfMetrics(): Promise<Record<string, unknown>> {
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const paints = performance.getEntriesByType('paint');
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const lcps = performance.getEntriesByType('largest-contentful-paint') as PerformanceEntry[];
    const shifts = performance.getEntriesByType('layout-shift') as Array<PerformanceEntry & { value: number; hadRecentInput: boolean }>;
    const tasks = performance.getEntriesByType('longtask');

    const fcp = paints.find(e => e.name === 'first-contentful-paint')?.startTime ?? null;
    const lcp = lcps.length ? Math.round(lcps[lcps.length - 1].startTime) : null;
    const cls = Math.round(shifts.reduce((s, e) => s + (e.hadRecentInput ? 0 : e.value), 0) * 1000) / 1000;
    const tbt = Math.round(tasks.reduce((s, t) => s + Math.max(0, t.duration - 50), 0));

    const ttfb = nav ? Math.max(0, Math.round(nav.responseStart - nav.requestStart)) : null;
    const dcl = nav ? Math.max(0, Math.round(nav.domContentLoadedEventEnd - nav.startTime)) : null;
    const load = nav ? Math.max(0, Math.round((nav.loadEventEnd || nav.loadEventStart) - nav.startTime)) : null;
    const tti = nav ? Math.max(0, Math.round(nav.domInteractive - nav.startTime)) : null;

    const phases = nav ? {
      dns: Math.max(0, Math.round(nav.domainLookupEnd - nav.domainLookupStart)),
      tcp: Math.max(0, Math.round(nav.connectEnd - nav.connectStart)),
      ssl: Math.max(0, Math.round(nav.requestStart - nav.connectEnd)),
      request: Math.max(0, Math.round(nav.responseStart - nav.requestStart)),
      response: Math.max(0, Math.round(nav.responseEnd - nav.responseStart)),
      dom: Math.max(0, Math.round(nav.domContentLoadedEventStart - nav.responseEnd)),
      load: Math.max(0, Math.round(
        (nav.loadEventEnd || nav.loadEventStart || nav.domContentLoadedEventStart) - nav.domContentLoadedEventStart
      )),
    } : null;

    const byType: Record<string, { count: number; size: number }> = {};
    let totalSize = 0;
    for (const r of resources) {
      const t = r.initiatorType || 'other';
      if (!byType[t]) byType[t] = { count: 0, size: 0 };
      byType[t].count++;
      const sz = r.transferSize || 0;
      byType[t].size += sz;
      totalSize += sz;
    }

    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    const conn = (navigator as unknown as { connection?: { effectiveType: string; rtt: number; downlink: number } }).connection;

    return {
      url: location.href, title: document.title,
      lcp, fcp: fcp != null ? Math.round(fcp) : null, cls, tbt, ttfb, dcl, load, tti,
      phases, resourceCount: resources.length, totalSize, byType,
      jsHeap: mem?.usedJSHeapSize ?? null,
      jsHeapLimit: mem?.jsHeapSizeLimit ?? null,
      effectiveType: conn?.effectiveType ?? null,
      rtt: conn?.rtt ?? null,
      downlink: conn?.downlink ?? null,
      collectedAt: Date.now(),
    };
  } catch (e) {
    return { error: String(e), url: location.href, title: document.title, collectedAt: Date.now() };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Rating = 'good' | 'needs-improvement' | 'poor';

const THRESHOLDS: Record<string, [number, number]> = {
  lcp:  [2500, 4000], fcp:  [1800, 3000], cls:  [0.1, 0.25],
  ttfb: [800, 1800],  tbt:  [200, 600],   dcl:  [2000, 4000], load: [3000, 6000],
};

const RATING_STYLE: Record<Rating, { label: string; text: string; bar: string; bg: string; border: string }> = {
  'good':               { label: 'Good', text: 'text-emerald-400', bar: 'bg-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  'needs-improvement':  { label: 'Fair', text: 'text-amber-400',   bar: 'bg-amber-500',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
  'poor':               { label: 'Poor', text: 'text-red-400',     bar: 'bg-red-500',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
};

function rate(key: string, value: number | null): Rating {
  if (value === null || value < 0) return 'poor';
  const [good, ni] = THRESHOLDS[key] ?? [Infinity, Infinity];
  return value < good ? 'good' : value < ni ? 'needs-improvement' : 'poor';
}

function overallRating(p: PerfData | null): Rating {
  if (!p) return 'poor';
  const scores = ['lcp', 'fcp', 'cls'].map(k => rate(k, p[k as keyof PerfData] as number | null));
  if (scores.every(s => s === 'good')) return 'good';
  if (scores.some(s => s === 'poor')) return 'poor';
  return 'needs-improvement';
}

function fmtMs(v: number | null): string {
  if (v === null || v < 0) return '—';
  if (v < 1) return '< 1 ms';
  return v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${Math.round(v)} ms`;
}

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

const RESOURCE_COLORS: Record<string, string> = {
  script: '#3b82f6', css: '#a855f7', img: '#f59e0b',
  fetch: '#06b6d4', xmlhttprequest: '#06b6d4',
  font: '#ec4899', link: '#8b5cf6', other: '#64748b',
};

const PHASE_CONFIG = [
  { key: 'dns',     label: 'DNS Lookup',     color: '#3b82f6' },
  { key: 'tcp',     label: 'TCP Connect',    color: '#8b5cf6' },
  { key: 'ssl',     label: 'SSL/TLS',        color: '#a855f7' },
  { key: 'request', label: 'Request / TTFB', color: '#f59e0b' },
  { key: 'response',label: 'Download',       color: '#10b981' },
  { key: 'dom',     label: 'DOM Processing', color: '#06b6d4' },
  { key: 'load',    label: 'Load Event',     color: '#14b8a6' },
];

function buildAiPrompt(perf: PerfData): string {
  const lines = [
    `Analyze these web performance metrics for: ${perf.url}`,
    '',
    '## Core Web Vitals',
    `- LCP: ${perf.lcp != null ? `${perf.lcp}ms` : 'N/A'} (good <2500ms)`,
    `- FCP: ${perf.fcp != null ? `${perf.fcp}ms` : 'N/A'} (good <1800ms)`,
    `- CLS: ${perf.cls != null ? perf.cls.toFixed(3) : 'N/A'} (good <0.1)`,
    `- TTFB: ${perf.ttfb != null ? `${perf.ttfb}ms` : 'N/A'} (good <800ms)`,
    `- TBT: ${perf.tbt != null ? `${perf.tbt}ms` : 'N/A'} (good <200ms)`,
    '',
    '## Page Timing',
    `- DOM Ready: ${perf.dcl != null ? `${perf.dcl}ms` : 'N/A'}`,
    `- Full Load: ${perf.load != null ? `${perf.load}ms` : 'N/A'}`,
    `- Time to Interactive: ${perf.tti != null ? `${perf.tti}ms` : 'N/A'}`,
  ];

  if (perf.phases) {
    lines.push('', '## Navigation Timeline (ms)');
    const p = perf.phases;
    if (p.dns)     lines.push(`- DNS: ${p.dns}ms`);
    if (p.tcp)     lines.push(`- TCP: ${p.tcp}ms`);
    if (p.ssl)     lines.push(`- SSL: ${p.ssl}ms`);
    lines.push(`- Request: ${p.request}ms`, `- Download: ${p.response}ms`, `- DOM: ${p.dom}ms`);
    if (p.load)    lines.push(`- Load Event: ${p.load}ms`);
  }

  lines.push('', `## Resources: ${perf.resourceCount} requests, ${fmtBytes(perf.totalSize)}`);
  Object.entries(perf.byType).forEach(([type, info]) =>
    lines.push(`- ${type}: ${info.count} req, ${fmtBytes(info.size)}`)
  );

  if (perf.jsHeap != null && perf.jsHeapLimit != null) {
    lines.push('', `## Memory: ${fmtBytes(perf.jsHeap)} used / ${fmtBytes(perf.jsHeapLimit)} limit`);
  }
  if (perf.effectiveType || perf.rtt != null) {
    lines.push('', `## Connection: ${perf.effectiveType ?? ''}, RTT ${perf.rtt ?? '?'}ms, ${perf.downlink ?? '?'} Mb/s`);
  }

  lines.push(
    '',
    'Please give:',
    '1. Overall assessment (score and what it means for users)',
    '2. Top 3 specific, actionable fixes for the biggest issues',
    '3. Quick wins to improve Core Web Vitals right now',
    '4. Any red flags in resources or memory'
  );
  return lines.join('\n');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, displayValue, ratingKey }: {
  label: string; value: number | null; displayValue: string; ratingKey: string;
}) {
  const r = rate(ratingKey, value);
  const s = RATING_STYLE[r];
  const pct = value === null ? 0 : r === 'good' ? 30 : r === 'needs-improvement' ? 65 : 90;
  return (
    <div className={`rounded-lg border p-2.5 ${s.bg} ${s.border}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{label}</span>
        <span className={`text-[9px] font-bold uppercase ${s.text}`}>{s.label}</span>
      </div>
      <div className={`text-[18px] font-bold ${s.text} leading-none mb-2`}>{displayValue}</div>
      <div className="h-1 rounded-full bg-slate-700/60 overflow-hidden">
        <div className={`h-full rounded-full ${s.bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function WaterfallChart({ phases }: { phases: PerfPhases }) {
  const max = Math.max(...PHASE_CONFIG.map(p => phases[p.key as keyof PerfPhases] || 0), 1);
  return (
    <div className="space-y-1.5">
      {PHASE_CONFIG.map(({ key, label, color }) => {
        const val = phases[key as keyof PerfPhases] || 0;
        if (val === 0) return null;
        const pct = (val / max) * 100;
        return (
          <div key={key} className="flex items-center gap-2 text-[10px]">
            <span className="text-slate-400 w-[88px] text-right shrink-0 truncate">{label}</span>
            <div className="flex-1 h-4 bg-slate-800 rounded overflow-hidden">
              <div
                className="h-full rounded flex items-center px-1.5 transition-all duration-700"
                style={{ width: `${Math.max(pct, 3)}%`, background: color }}
              >
                {pct > 18 && <span className="text-white font-semibold text-[9px]">{val}ms</span>}
              </div>
            </div>
            {pct <= 18 && <span className="text-slate-400 shrink-0 w-[36px] text-right">{val}ms</span>}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function PerformancePanel() {
  // ── All hooks must come BEFORE any conditional return ──────────────────────
  const { state, dispatch, pendingResumeRef } = useApp();
  const [tabs, setTabs] = useState<TabEntry[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [collecting, setCollecting] = useState(false);

  // Derived values (not hooks — safe to compute here)
  const selected = tabs.find(t => t.id === selectedId) ?? tabs[0] ?? null;
  const perf = selected?.perf ?? null;

  const pieData = useMemo(() =>
    perf
      ? Object.entries(perf.byType)
          .filter(([, v]) => v.size > 0)
          .map(([type, info]) => ({
            name: type, value: info.size, count: info.count,
            color: RESOURCE_COLORS[type] ?? RESOURCE_COLORS.other,
          }))
          .sort((a, b) => b.value - a.value)
      : [],
    [perf]
  );

  const collectAll = useCallback(async () => {
    setCollecting(true);
    try {
      const allTabs = await chrome.tabs.query({});
      const injectable = allTabs.filter(t =>
        t.id != null && t.url &&
        !t.url.startsWith('chrome://') &&
        !t.url.startsWith('chrome-extension://') &&
        !t.url.startsWith('about:') &&
        !t.url.startsWith('devtools://')
      );

      setTabs(injectable.map(t => ({
        id: t.id!, title: t.title || t.url || 'Tab',
        url: t.url || '', favIconUrl: t.favIconUrl,
        perf: null, loading: true,
      })));

      const active = allTabs.find(t => t.active);
      if (active?.id) setSelectedId(active.id);

      await Promise.allSettled(
        injectable.map(async (tab) => {
          try {
            const [result] = await chrome.scripting.executeScript({
              target: { tabId: tab.id! },
              world: 'ISOLATED',
              func: _collectPerfMetrics,
            });
            const data = result?.result as unknown as PerfData | null;
            setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, perf: data, loading: false } : t));
          } catch (err) {
            setTabs(prev => prev.map(t =>
              t.id === tab.id
                ? { ...t, loading: false, error: err instanceof Error ? err.message : 'Failed' }
                : t
            ));
          }
        })
      );
    } finally {
      setCollecting(false);
    }
  }, []);

  useEffect(() => {
    if (state.activePanel !== 'perf') return;
    collectAll();
    const onActivated = () => collectAll();
    chrome.tabs.onActivated.addListener(onActivated);
    return () => chrome.tabs.onActivated.removeListener(onActivated);
  }, [state.activePanel, collectAll]);

  const handleAiInsights = useCallback(() => {
    if (!perf) return;
    const prompt = buildAiPrompt(perf);
    // Close performance panel → return to chat, then fire the prompt
    dispatch({ type: 'SET_ACTIVE_PANEL', panel: 'perf' });
    dispatch({ type: 'ADD_MESSAGE', message: { id: msgId(), role: 'user', content: `Analyze performance for: ${perf.url}` } });
    handleSend(prompt, state, dispatch, pendingResumeRef);
  }, [perf, state, dispatch, pendingResumeRef]);

  const handleDownload = useCallback(() => {
    const report = {
      generatedAt: new Date().toISOString(),
      generatedBy: 'Waypoint Performance Analyzer',
      tabs: tabs.map(t => ({ id: t.id, title: t.title, url: t.url, metrics: t.perf })),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waypoint-perf-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [tabs]);

  // ── Now safe to do conditional render ─────────────────────────────────────
  if (state.activePanel !== 'perf') return null;

  return (
    <div className="absolute inset-0 flex flex-col bg-surface-base z-10">

      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-700/50 bg-surface-card shrink-0">
        <button
          onClick={() => dispatch({ type: 'SET_ACTIVE_PANEL', panel: 'perf' })}
          title="Back to chat"
          className="flex items-center justify-center w-7 h-7 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={15} />
        </button>
        <Activity size={15} className="text-emerald-400" />
        <span className="text-[13px] font-semibold text-slate-100 flex-1">Web Performance</span>
        {perf && (
          <button
            onClick={handleAiInsights}
            title="Analyze with AI"
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
          >
            <Sparkles size={11} /> AI Insights
          </button>
        )}
        <button
          onClick={collectAll}
          disabled={collecting}
          title="Refresh metrics"
          className="flex items-center justify-center w-7 h-7 rounded text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={collecting ? 'animate-spin' : ''} />
        </button>
        <button
          onClick={handleDownload}
          disabled={tabs.length === 0}
          title="Download JSON report"
          className="flex items-center justify-center w-7 h-7 rounded text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
        >
          <Download size={14} />
        </button>
      </div>

      {/* ── Tab Selector ── */}
      {tabs.length > 0 && (
        <div className="flex gap-1.5 px-3 py-2 border-b border-slate-700/30 overflow-x-auto shrink-0 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
          {tabs.map(t => {
            const r = overallRating(t.perf);
            const dot = r === 'good' ? 'bg-emerald-500' : r === 'needs-improvement' ? 'bg-amber-500' : 'bg-red-500';
            const isSelected = (selectedId ?? tabs[0]?.id) === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap shrink-0 transition-colors
                  ${isSelected
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-slate-100'
                    : 'bg-surface-elevated border border-slate-700/50 text-slate-400 hover:text-slate-200'}`}
              >
                {t.loading
                  ? <Loader2 size={8} className="animate-spin" />
                  : t.error
                    ? <AlertCircle size={8} className="text-red-400" />
                    : <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                }
                <span className="max-w-[80px] truncate">{t.title || 'Tab'}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">

        {tabs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-500">
            {collecting
              ? <><Loader2 size={24} className="animate-spin text-emerald-400" /><span className="text-xs">Collecting metrics…</span></>
              : <><Activity size={24} /><span className="text-xs">No tabs found</span></>
            }
          </div>
        )}

        {selected?.error && !perf && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            <AlertCircle size={14} />
            <span>Can't collect metrics for this page</span>
          </div>
        )}

        {selected?.loading && (
          <div className="space-y-3 animate-pulse">
            <div className="grid grid-cols-2 gap-2">
              {[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-lg bg-surface-elevated" />)}
            </div>
            <div className="h-24 rounded-lg bg-surface-elevated" />
            <div className="h-32 rounded-lg bg-surface-elevated" />
          </div>
        )}

        {perf && !selected?.loading && (
          <>
            {/* Page URL */}
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 truncate">
              <Globe size={10} className="shrink-0" />
              <span className="truncate">{perf.url}</span>
            </div>

            {/* Core Web Vitals */}
            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Core Web Vitals</h3>
              <div className="grid grid-cols-2 gap-2">
                <MetricCard label="LCP" ratingKey="lcp" value={perf.lcp} displayValue={fmtMs(perf.lcp)} />
                <MetricCard label="FCP" ratingKey="fcp" value={perf.fcp} displayValue={fmtMs(perf.fcp)} />
                <MetricCard label="CLS" ratingKey="cls" value={perf.cls} displayValue={perf.cls != null ? perf.cls.toFixed(3) : '—'} />
                <MetricCard label="TTFB" ratingKey="ttfb" value={perf.ttfb} displayValue={fmtMs(perf.ttfb)} />
              </div>
            </section>

            {/* Additional timing */}
            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Page Timing</h3>
              <div className="grid grid-cols-3 gap-2">
                {([['TBT', 'tbt', perf.tbt], ['DOM Ready', 'dcl', perf.dcl], ['Load', 'load', perf.load]] as const).map(([label, key, v]) => {
                  const r = rate(key, v as number | null);
                  const s = RATING_STYLE[r];
                  return (
                    <div key={key} className={`rounded-lg border p-2 text-center ${s.bg} ${s.border}`}>
                      <div className="text-[9px] text-slate-400 uppercase tracking-wide mb-0.5">{label}</div>
                      <div className={`text-[13px] font-bold ${s.text}`}>{fmtMs(v as number | null)}</div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Waterfall */}
            {perf.phases && (
              <section>
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Load Timeline
                  <span className="ml-1.5 font-normal text-slate-600 normal-case">total {fmtMs(perf.load)}</span>
                </h3>
                <WaterfallChart phases={perf.phases} />
              </section>
            )}

            {/* Resources */}
            {pieData.length > 0 && (
              <section>
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Resources
                  <span className="ml-1.5 font-normal text-slate-600 normal-case">
                    {perf.resourceCount} req · {fmtBytes(perf.totalSize)}
                  </span>
                </h3>
                <div className="flex gap-3 items-center">
                  <div style={{ width: 130, height: 130, flexShrink: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={36} outerRadius={58} dataKey="value" stroke="none">
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
                          formatter={(value, _name, props) => [`${fmtBytes(Number(value))} · ${(props.payload as { count?: number })?.count ?? 0} req`, String(props.name ?? '')]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-1.5 min-w-0">
                    {pieData.map(entry => (
                      <div key={entry.name} className="flex items-center gap-1.5 text-[10px]">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.color }} />
                        <span className="text-slate-300 capitalize truncate flex-1">{entry.name}</span>
                        <span className="text-slate-500 shrink-0">{fmtBytes(entry.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Memory */}
            {perf.jsHeap != null && perf.jsHeapLimit != null && perf.jsHeapLimit > 0 && (
              <section>
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">JS Memory</h3>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Used: {fmtBytes(perf.jsHeap)}</span>
                    <span>Limit: {fmtBytes(perf.jsHeapLimit)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(100, (perf.jsHeap / perf.jsHeapLimit) * 100)}%`,
                        background: perf.jsHeap / perf.jsHeapLimit > 0.8 ? '#ef4444' : perf.jsHeap / perf.jsHeapLimit > 0.5 ? '#f59e0b' : '#10b981',
                      }}
                    />
                  </div>
                  <div className="text-[9px] text-slate-500 text-right">
                    {((perf.jsHeap / perf.jsHeapLimit) * 100).toFixed(1)}% used
                  </div>
                </div>
              </section>
            )}

            {/* Connection */}
            {(perf.effectiveType || perf.rtt != null) && (
              <section>
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Connection</h3>
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-card border border-slate-700/40">
                  <Wifi size={14} className="text-emerald-400 shrink-0" />
                  <div className="flex gap-4 text-[11px]">
                    {perf.effectiveType && (
                      <div>
                        <div className="text-slate-500 text-[9px] uppercase">Type</div>
                        <div className="text-slate-200 font-semibold uppercase">{perf.effectiveType}</div>
                      </div>
                    )}
                    {perf.rtt != null && (
                      <div>
                        <div className="text-slate-500 text-[9px] uppercase">RTT</div>
                        <div className="text-slate-200 font-semibold">{perf.rtt}ms</div>
                      </div>
                    )}
                    {perf.downlink != null && (
                      <div>
                        <div className="text-slate-500 text-[9px] uppercase">Speed</div>
                        <div className="text-slate-200 font-semibold">{perf.downlink} Mb/s</div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            <div className="text-[9px] text-slate-600 text-center pb-2">
              Collected {new Date(perf.collectedAt).toLocaleTimeString()}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
