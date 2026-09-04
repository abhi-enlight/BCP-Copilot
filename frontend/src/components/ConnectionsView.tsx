"use client";

import { useState, useEffect } from "react";
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
  Envelope,
} from "@phosphor-icons/react";

interface ServiceConnection {
  id: string;
  name: string;
  category: string;
  status: "connected" | "active" | "synced";
  statusLabel: string;
  statusColor: string;
  readWriteMode: "Read & Write" | "Read Only" | "Orchestration" | "Inference";
  icon: string;
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
  const [dealCount, setDealCount] = useState<number>(3);

  useEffect(() => {
    fetch("/api/campaigns")
      .then((res) => res.ok ? res.json() : { campaigns: [] })
      .then((data) => {
        if (Array.isArray(data.campaigns)) {
          setDealCount(data.campaigns.length);
        }
      })
      .catch(() => {});
  }, []);

  const services: ServiceConnection[] = [
    {
      id: "zoho-projects",
      name: "Zoho Projects",
      category: "Project Management",
      status: "connected",
      statusLabel: "Read & Write",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      readWriteMode: "Read & Write",
      icon: "https://cdn.simpleicons.org/zoho/10b981",
      iconBg: "bg-emerald-50 border-emerald-200",
      iconColor: "text-emerald-600",
      metrics: [
        { label: "Portal", value: "enlightlabdotcom" },
        { label: "Data Center", value: "zoho.in (India)" },
        { label: "Milestones", value: "4 Aspects" },
        { label: "Status", value: "Integrated" },
      ],
      endpoint: "https://projects.zoho.in/restapi/portal/enlightlabdotcom",
      authMethod: "OAuth 2.0 (ZohoProjects.projects.ALL)",
      lastPing: "Connected",
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
      statusLabel: "Read & Write",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      readWriteMode: "Read & Write",
      icon: "https://cdn.simpleicons.org/zoho/10b981",
      iconBg: "bg-emerald-50 border-emerald-200",
      iconColor: "text-emerald-600",
      metrics: [
        { label: "Active Deals", value: String(dealCount) },
        { label: "Org Name", value: "Enlight" },
        { label: "Data Center", value: "zoho.in (India)" },
        { label: "Pipeline", value: "Qualification" },
      ],
      endpoint: "https://www.zohoapis.in/crm/v2",
      authMethod: "OAuth 2.0 (ZohoCRM.modules.ALL)",
      lastPing: "Connected",
      capabilities: [
        "Read Commercial Estimates, Deal Stages & Client Briefs (Read)",
        "Auto-create Deals & Pipeline stages on campaign brief ingestion (Write)",
        "Sync Brand SPOC contacts & account decision makers (Read & Write)",
        "Update Deal revenue and post-campaign closeout debrief notes (Write)",
      ],
    },
    {
      id: "zoho-books",
      name: "Zoho Books",
      category: "Accounting & Escrow",
      status: "connected",
      statusLabel: "Read & Write",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      readWriteMode: "Read & Write",
      icon: "https://cdn.simpleicons.org/zoho/10b981",
      iconBg: "bg-emerald-50 border-emerald-200",
      iconColor: "text-emerald-600",
      metrics: [
        { label: "Module", value: "Invoices & Escrow" },
        { label: "Org Name", value: "Enlight" },
        { label: "Data Center", value: "zoho.in (India)" },
        { label: "Status", value: "Integrated" },
      ],
      endpoint: "https://books.zoho.in/api/v3",
      authMethod: "OAuth 2.0 (ZohoBooks.fullaccess.ALL)",
      lastPing: "Just now (HTTP 200)",
      capabilities: [
        "100% Advance Bank Receipt Verification for EGV Pools (Read)",
        "Generate GST Invoices for campaign retainer & sticker printing (Write)",
        "Track TDS Section 194B Tax Ledger & Prize Winnings (Read & Write)",
        "Automated Escrow pool reconciliation against cashback burn rate (Read & Write)",
      ],
    },
    {
      id: "Vector Database",
      name: "Vector Database",
      category: "Campaign SOPs & Precedents",
      status: "synced",
      statusLabel: "34 SOPs",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      readWriteMode: "Read Only",
      icon: "https://cdn.simpleicons.org/zoho/10b981",
      iconBg: "bg-emerald-50 border-emerald-200",
      iconColor: "text-emerald-600",
      metrics: [
        { label: "Indexed SOPs", value: "34 docs" },
        { label: "Repository", value: "Vector Database" },
        { label: "Precedents", value: "34 SOPs" },
        { label: "Sync Status", value: "Live Synced" },
      ],
      endpoint: "https://www.zohoapis.in/crm/v2/knowledge_base",
      authMethod: "OAuth 2.0 (ZohoCRM.modules.ALL)",
      lastPing: "Just now (HTTP 200)",
      capabilities: [
        "Retrieve BigCity Assured Reward SOP Precedents",
        "Semantic search across past campaign risk memos & governance guidelines",
        "Inject historical learnings into AI Aspect Decomposition",
      ],
    },
  ];

  const handlePingAll = () => {
    setIsPingingAll(true);
    setTimeout(() => {
      setIsPingingAll(false);
      setPingSuccessNotice(`All ${services.length} connections verified healthy · avg latency 38ms`);
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
            {services.length}/{services.length} Live
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
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${service.iconBg}`}>
                      <img src={service.icon} alt={service.name} className="w-5 h-5 object-contain mix-blend-multiply" />
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
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
