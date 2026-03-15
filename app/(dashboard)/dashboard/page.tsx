"use client";
// app/(dashboard)/dashboard/page.tsx
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Skull, Activity, Filter, RefreshCw, Copy, Check, ChevronDown,
  AlertTriangle, Eye, EyeOff, Zap, BarChart3, Settings
} from "lucide-react";

type Endpoint = {
  id: string;
  method: string;
  path: string;
  totalHits: number;
  lastSeen: string;
  isDead: boolean;
  isFlagged: boolean;
  deadSince: string | null;
  framework: string | null;
};

type Stats = { total: number; dead: number; flagged: number; active: number };

type Project = {
  id: string;
  name: string;
  apiKeys: { key: string; name: string }[];
};

const METHOD_COLORS: Record<string, string> = {
  GET: "badge-GET",
  POST: "badge-POST",
  PUT: "badge-PUT",
  PATCH: "badge-PATCH",
  DELETE: "badge-DELETE",
};

function MethodBadge({ method }: { method: string }) {
  return (
    <span className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded ${METHOD_COLORS[method] ?? "bg-zinc-700/50 text-zinc-400 border border-zinc-600/50"}`}>
      {method}
    </span>
  );
}

function DaysAgo({ date, isDead }: { date: string; isDead: boolean }) {
  const d = new Date(date);
  const dist = formatDistanceToNow(d, { addSuffix: true });
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);

  if (isDead) {
    return (
      <span className="flex items-center gap-1.5 text-red-400 font-mono text-sm">
        <span className="skull-pulse">☠</span>
        <span>{days}d ago</span>
      </span>
    );
  }
  return <span className="text-zinc-400 text-sm font-mono">{dist}</span>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-zinc-500 hover:text-zinc-300 transition-colors"
      title="Copy"
    >
      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
    </button>
  );
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filter, setFilter] = useState<"all" | "dead" | "active" | "flagged">("all");
  const [loading, setLoading] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);

  // Redirect if unauthenticated
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Load projects
  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then(({ projects }) => {
        setProjects(projects ?? []);
        if (projects?.length) setActiveProject(projects[0]);
      });
  }, []);

  // Load endpoints when project or filter changes
  const loadEndpoints = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    const r = await fetch(`/api/endpoints/${activeProject.id}?filter=${filter}`);
    const data = await r.json();
    setEndpoints(data.endpoints ?? []);
    setStats(data.stats ?? null);
    setLoading(false);
  }, [activeProject, filter]);

  useEffect(() => { loadEndpoints(); }, [loadEndpoints]);

  const handleAction = async (endpointId: string, action: string) => {
    await fetch(`/api/endpoints/${activeProject?.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpointId, action }),
    });
    loadEndpoints();
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="text-zinc-500 animate-pulse font-mono text-sm">Loading...</div>
      </div>
    );
  }

  const apiKey = activeProject?.apiKeys?.[0]?.key ?? "";

  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      {/* Top nav */}
      <header className="border-b border-[var(--border)] bg-[#0a0a0b]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-red-500 text-lg">☠</span>
            <span className="font-mono font-bold text-white tracking-tight">DeadRoute</span>

            {/* Project switcher */}
            {projects.length > 0 && (
              <div className="flex items-center gap-1 ml-4">
                <span className="text-zinc-600">/</span>
                <button className="flex items-center gap-1.5 text-zinc-300 hover:text-white text-sm font-medium px-2 py-1 rounded hover:bg-white/5 transition-colors">
                  {activeProject?.name ?? "Select project"}
                  <ChevronDown size={14} className="text-zinc-500" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadEndpoints}
              className="p-2 rounded text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button className="p-2 rounded text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors" title="Settings">
              <Settings size={16} />
            </button>
            <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-300">
              {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total endpoints", value: stats.total, icon: BarChart3, color: "text-zinc-300" },
              { label: "Active", value: stats.active, icon: Activity, color: "text-emerald-400" },
              { label: "Dead routes", value: stats.dead, icon: Skull, color: "text-red-400" },
              { label: "Flagged", value: stats.flagged, icon: AlertTriangle, color: "text-amber-400" },
            ].map((s) => (
              <div key={s.label} className="bg-[#111113] border border-[var(--border)] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-500 text-xs">{s.label}</span>
                  <s.icon size={14} className={s.color} />
                </div>
                <div className={`text-3xl font-bold font-mono ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* API Key panel */}
        {activeProject && (
          <div className="bg-[#111113] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Zap size={13} className="text-amber-400" />
                <span>SDK Integration</span>
              </div>
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
              >
                {showApiKey ? <EyeOff size={12} /> : <Eye size={12} />}
                {showApiKey ? "Hide" : "Show"} key
              </button>
            </div>
            <div className="flex items-center gap-2 font-mono text-sm bg-black/40 rounded-lg px-3 py-2 border border-white/5">
              <span className="text-zinc-400 select-none">Authorization: Bearer</span>
              <span className="text-emerald-400 flex-1 truncate">
                {showApiKey ? apiKey : apiKey.slice(0, 12) + "••••••••••••••••••"}
              </span>
              <CopyButton text={apiKey} />
            </div>
            <p className="text-xs text-zinc-600 mt-2">
              Send this header with every request from your SDK. See{" "}
              <a href="#" className="text-zinc-400 hover:text-zinc-200 underline underline-offset-2">the docs</a> for setup.
            </p>
          </div>
        )}

        {/* Endpoints table */}
        <div className="bg-[#111113] border border-[var(--border)] rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-1">
              {(["all", "active", "dead", "flagged"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                    filter === f
                      ? "bg-white/10 text-white"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  {f}
                  {f === "dead" && stats?.dead ? (
                    <span className="ml-1.5 bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.5 rounded-full">
                      {stats.dead}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 text-zinc-600">
              <Filter size={13} />
              <span className="text-xs">{endpoints.length} routes</span>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-500 text-xs border-b border-[var(--border)]">
                <th className="px-4 py-2.5 font-medium">Method</th>
                <th className="px-4 py-2.5 font-medium">Route</th>
                <th className="px-4 py-2.5 font-medium">Last hit</th>
                <th className="px-4 py-2.5 font-medium text-right">Hits</th>
                <th className="px-4 py-2.5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-600 text-sm">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={14} className="animate-spin" />
                      Loading endpoints...
                    </div>
                  </td>
                </tr>
              ) : endpoints.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="text-zinc-600 text-sm">
                      {filter === "dead"
                        ? "No dead routes detected yet. 🎉"
                        : "No endpoints found. Install the SDK to start tracking."}
                    </div>
                  </td>
                </tr>
              ) : (
                endpoints.map((ep) => (
                  <tr
                    key={ep.id}
                    className={`group hover:bg-white/[0.02] transition-colors ${ep.isDead ? "row-dead" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <MethodBadge method={ep.method} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-zinc-200">{ep.path}</span>
                        {ep.isDead && (
                          <span className="text-[10px] bg-red-500/15 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-mono">
                            DEAD
                          </span>
                        )}
                        {ep.isFlagged && !ep.isDead && (
                          <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-mono">
                            FLAGGED
                          </span>
                        )}
                        {ep.framework && (
                          <span className="text-[10px] text-zinc-600 hidden group-hover:inline">{ep.framework}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <DaysAgo date={ep.lastSeen} isDead={ep.isDead} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-mono text-sm ${ep.totalHits === 0 ? "text-red-400" : "text-zinc-300"}`}>
                        {ep.totalHits.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {ep.isDead || ep.isFlagged ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleAction(ep.id, ep.isFlagged ? "unflag" : "flag")}
                            className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors font-mono"
                          >
                            {ep.isFlagged ? "Unflag" : "Flag for deletion"}
                          </button>
                          <button
                            onClick={() => handleAction(ep.id, "ignore")}
                            className="text-xs px-2 py-1 rounded bg-zinc-700/50 text-zinc-500 hover:bg-zinc-700 transition-colors font-mono"
                          >
                            Ignore
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAction(ep.id, "flag")}
                          className="text-xs px-2 py-1 rounded text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-colors font-mono opacity-0 group-hover:opacity-100"
                        >
                          Flag
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
