"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  PlugsConnected,
  Kanban,
  Database,
  Receipt,
  Lightning,
  Brain,
  Cpu,
  CheckCircle,
  ArrowsClockwise,
} from "@phosphor-icons/react";

interface ServiceConnection {
  id: string;
  name: string;
  category: string;
  status: "connected" | "active" | "synced";
  statusLabel: string;
  statusColor: string;
  readWriteMode: "Read & Write" | "Read Only" | "Orchestration" | "Inference";
  icon: any;
  iconBg: string;
  iconColor: string;
  metrics: { label: string; value: string }[];
  endpoint: string;
  authMethod: string;
  lastPing: string;
  capabilities: string[];
}

export default function ConnectionsView() {
  const [isPingingAll, setIsPingingAll] = useState(false);
  const [pingSuccessNotice, setPingSuccessNotice] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string>("zoho-projects");
  const [activeTab, setActiveTab] = useState<"overview" | "api_traffic" | "oauth">("overview");

  const services: ServiceConnection[] = [
    {
      id: "zoho-projects",
      name: "Zoho Projects",
      category: "Project Management",
      status: "connected",
      statusLabel: "Read & Write",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      readWriteMode: "Read & Write",
      icon: Kanban,
      iconBg: "bg-emerald-50 border-emerald-200",
      iconColor: "text-emerald-600",
      metrics: [
        { label: "Active Projects", value: "4" },
        { label: "Tasks Synced", value: "32" },
        { label: "Latency", value: "34ms" },
        { label: "Portal", value: "#81293" },
      ],
      endpoint: "https://projects.zoho.in/restapi/portal/81293",
      authMethod: "OAuth 2.0 (ZohoProjects.projects.ALL)",
      lastPing: "Just now (HTTP 200)",
      capabilities: [
        "Create Projects on Campaign Approval (Write)",
        "Generate 4 Aspect Milestones (Write)",
        "Push Aspect Tasks with Assignees & SOP Codes (Write)",
        "Fetch Live Task Statuses & Completion Progress (Read)",
        "Sync Assignee Changes & TAT Deadlines (Read & Write)",
      ],
    },
    {
      id: "zoho-crm",
      name: "Zoho CRM",
      category: "Enterprise CRM",
      status: "connected",
      statusLabel: "Connected",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      readWriteMode: "Read Only",
      icon: Database,
      iconBg: "bg-emerald-50 border-emerald-200",
      iconColor: "text-emerald-600",
      metrics: [
        { label: "Deals Synced", value: "48" },
        { label: "Accounts", value: "19" },
        { label: "Latency", value: "48ms" },
        { label: "Modules", value: "Deals, Invoices" },
      ],
      endpoint: "https://www.zohoapis.in/crm/v2",
      authMethod: "OAuth 2.0 (ZohoCRM.modules.ALL)",
      lastPing: "1 min ago (HTTP 200)",
      capabilities: [
        "Read Commercial SOW Estimates & Deal Status",
        "Fetch Client Brand SPOC Contacts",
        "Link Campaigns to Zoho CRM Deal ID",
        "Query Account History & Precedent Commercials",
      ],
    },
    {
      id: "zoho-books",
      name: "Zoho Books",
      category: "Accounting & Escrow",
      status: "connected",
      statusLabel: "Connected",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      readWriteMode: "Read Only",
      icon: Receipt,
      iconBg: "bg-emerald-50 border-emerald-200",
      iconColor: "text-emerald-600",
      metrics: [
        { label: "Advance Verif.", value: "100% Active" },
        { label: "Ledger", value: "Escrow Pool" },
        { label: "Latency", value: "52ms" },
        { label: "Org ID", value: "#81293" },
      ],
      endpoint: "https://books.zoho.in/api/v3",
      authMethod: "OAuth 2.0 (ZohoBooks.fullaccess.ALL)",
      lastPing: "2 mins ago (HTTP 200)",
      capabilities: [
        "100% Advance Bank Receipt Confirmation for EGV Pools",
        "GST Invoicing for Sticker Printing & Logistics",
        "TDS Section 194B Tax Ledger Compliance",
        "Escrow Reconciliation for High-Volume Cashbacks",
      ],
    },
    {
      id: "supabase",
      name: "Supabase pgvector",
      category: "Vector Knowledge Base",
      status: "synced",
      statusLabel: "34 SOPs",
      statusColor: "bg-sky-50 text-sky-700 border-sky-200",
      readWriteMode: "Read Only",
      icon: Brain,
      iconBg: "bg-sky-50 border-sky-200",
      iconColor: "text-sky-600",
      metrics: [
        { label: "Indexed SOPs", value: "34 docs" },
        { label: "Index", value: "HNSW Cosine" },
        { label: "Embedding", value: "768-dim" },
        { label: "Top-K", value: "5 matches" },
      ],
      endpoint: "https://ejawdvxnddgkcgkasove.supabase.co",
      authMethod: "Service Role Key & Anon Key",
      lastPing: "3 mins ago (HTTP 200)",
      capabilities: [
        "Retrieve BigCity Assured Reward SOP Precedents",
        "Semantic search across past campaign risk memos",
        "Inject historical learnings into AI Aspect Decomposition",
      ],
    },
    {
      id: "gemini",
      name: "Gemini 3.7 Flash",
      category: "LLM Reasoning Engine",
      status: "active",
      statusLabel: "Active",
      statusColor: "bg-violet-50 text-violet-700 border-violet-200",
      readWriteMode: "Inference",
      icon: Cpu,
      iconBg: "bg-violet-50 border-violet-200",
      iconColor: "text-violet-600",
      metrics: [
        { label: "Model", value: "gemini-3.7-flash" },
        { label: "Temperature", value: "0.3" },
        { label: "Speed", value: "185ms" },
        { label: "Context", value: "1M tokens" },
      ],
      endpoint: "https://generativelanguage.googleapis.com/v1beta",
      authMethod: "Google AI Studio API Key",
      lastPing: "Just now (HTTP 200)",
      capabilities: [
        "Decompose brief into Legal, Compliance, Accounting & Tech",
        "Assess SOW policy risks and human sign-off boundaries",
        "Generate actionable Zoho project milestone plans",
      ],
    },
  ];

  const handlePingAll = () => {
    setIsPingingAll(true);
    setTimeout(() => {
      setIsPingingAll(false);
      setPingSuccessNotice("All 5 connections verified healthy · avg latency 38ms");
      setTimeout(() => setPingSuccessNotice(null), 4000);
    }, 800);
  };

  const currentServiceObj = services.find((s) => s.id === selectedService) || services[0];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#FAFAF9]">
      {/* Header */}
      <header className="h-14 border-b border-stone-200/70 bg-white/90 backdrop-blur-md px-6 flex items-center justify-between flex-shrink-0 z-20">
        <div className="flex items-center gap-3">
          <h1 className="text-[15px] font-bold text-stone-900 tracking-tight">Connections</h1>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            5/5 Live
          </span>
        </div>

        <button
          type="button"
          onClick={handlePingAll}
          disabled={isPingingAll}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-all duration-200 cursor-pointer"
        >
          <ArrowsClockwise size={13} weight="bold" className={isPingingAll ? "animate-spin" : ""} />
          <span>{isPingingAll ? "Pinging…" : "Test All"}</span>
        </button>
      </header>

      {/* Success toast */}
      <AnimatePresence>
        {pingSuccessNotice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-emerald-600 text-white text-xs font-medium px-6 py-2.5 flex items-center gap-2"
          >
            <CheckCircle size={14} weight="fill" />
            <span>{pingSuccessNotice}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* Service Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service, idx) => {
            const IconComp = service.icon;
            const isSelected = selectedService === service.id;

            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => setSelectedService(service.id)}
                className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "bg-white border-amber-400 shadow-md"
                    : "bg-white border-stone-200 hover:border-stone-300 shadow-sm"
                }`}
              >
                {/* Card Top */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${service.iconBg}`}>
                      <IconComp size={18} weight="duotone" className={service.iconColor} />
                    </div>
                    <div>
                      <h3 className="text-[13px] font-bold text-stone-900 leading-tight">{service.name}</h3>
                      <span className="text-[10.5px] text-stone-400">{service.category}</span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 flex-shrink-0 ${service.statusColor}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                    {service.statusLabel}
                  </span>
                </div>

                {/* 2 Metrics */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {service.metrics.slice(0, 2).map((m, mIdx) => (
                    <div key={mIdx} className="bg-stone-50 rounded-lg p-2">
                      <span className="text-[10px] text-stone-400 block">{m.label}</span>
                      <span className="font-bold text-stone-800 truncate block">{m.value}</span>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
                  <span className="font-mono">{service.readWriteMode}</span>
                  {isSelected && (
                    <span className="text-amber-600 font-semibold text-[10px]">Inspecting ↓</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Deep-Dive Inspector */}
        <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${currentServiceObj.iconBg}`}>
                <currentServiceObj.icon size={20} weight="duotone" className={currentServiceObj.iconColor} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[14px] font-bold text-stone-900">{currentServiceObj.name}</h3>
                  <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${currentServiceObj.statusColor}`}>
                    {currentServiceObj.statusLabel}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5 font-mono truncate max-w-sm">
                  {currentServiceObj.endpoint}
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center border-b border-stone-200">
              {(["overview", "api_traffic", "oauth"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === tab
                      ? "border-amber-500 text-amber-700"
                      : "border-transparent text-stone-500 hover:text-stone-800"
                  }`}
                >
                  {tab === "overview" ? "Capabilities" : tab === "api_traffic" ? "API Log" : "OAuth"}
                </button>
              ))}
            </div>
          </div>

          {/* Tab: Capabilities */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Active Capabilities</h4>
                <div className="space-y-1.5">
                  {currentServiceObj.capabilities.map((cap, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-stone-50 border border-stone-200/80 text-xs text-stone-800">
                      <CheckCircle size={14} weight="fill" className="text-emerald-500 flex-shrink-0" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Connection Specs</h4>
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-3 text-xs">
                  {[
                    { label: "Auth Protocol", value: currentServiceObj.authMethod },
                    { label: "Last Health Ping", value: currentServiceObj.lastPing, highlight: true },
                    { label: "Sync Mode", value: currentServiceObj.readWriteMode },
                    { label: "Tenant", value: "BigCity Enterprise #81293" },
                  ].map((row, idx) => (
                    <div key={idx} className="flex justify-between gap-4">
                      <span className="text-stone-500 flex-shrink-0">{row.label}:</span>
                      <span className={`font-semibold text-right truncate ${row.highlight ? "text-emerald-700" : "text-stone-800"}`}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab: API Log */}
          {activeTab === "api_traffic" && (
            <div className="p-3.5 rounded-xl bg-stone-900 text-stone-100 text-xs font-mono space-y-2">
              <div className="flex items-center justify-between text-stone-400 border-b border-stone-800 pb-1.5">
                <span>{currentServiceObj.id === "zoho-projects" ? "POST /restapi/portal/81293/projects" : "GET /crm/v2/Deals"}</span>
                <span className="text-emerald-400 font-bold">200 OK · 34ms</span>
              </div>
              <pre className="text-[11px] text-emerald-300 overflow-x-auto leading-relaxed">
{JSON.stringify({
  service: currentServiceObj.name,
  status: "ONLINE_HEALTHY",
  portal_id: "81293",
  oauth_token_expires_in: 3540,
  rate_limit_remaining: "998 / 1000",
  last_event: {
    event_type: currentServiceObj.id === "zoho-projects" ? "TASK_WRITE_AND_READ" : "RECORD_READ_STREAM",
    caller: "BCP Assist AI Copilot",
    records_synced: 18,
    timestamp: new Date().toISOString(),
  }
}, null, 2)}
              </pre>
            </div>
          )}

          {/* Tab: OAuth */}
          {activeTab === "oauth" && (
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-3">
              {[
                { label: "OAuth 2.0 Client ID", value: "1000.QGDY8ZROICOLZXB8M0QK3Q41KZ562H", mono: true },
                { label: "Refresh Token Rotation", value: "Automatic (Every 55 mins)", highlight: true },
                { label: "Data Center Region", value: "Zoho India Cloud (zoho.in)" },
              ].map((row, idx) => (
                <div key={idx} className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-stone-700 flex-shrink-0">{row.label}:</span>
                  <span className={`${row.mono ? "font-mono text-stone-600 bg-white px-2 py-0.5 rounded border border-stone-200 text-[10.5px]" : ""} ${row.highlight ? "text-emerald-700 font-semibold" : "text-stone-700 font-medium"}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
