"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkle,
  Database,
  Brain,
  Cpu,
  CheckCircle,
  Lightning,
  CaretDown,
  CaretUp,
} from "@phosphor-icons/react";

interface IntegrationItem {
  id: string;
  name: string;
  shortName: string;
  category: string;
  status: "active" | "connected" | "synced";
  metric: string;
  detail: string;
  icon: any;
  color: string;
  bg: string;
  border: string;
  badgeBg: string;
  badgeText: string;
}

const INTEGRATIONS: IntegrationItem[] = [
  {
    id: "n8n",
    name: "n8n Orchestrator",
    shortName: "n8n Engine",
    category: "Workflow Automation",
    status: "active",
    metric: "4 Workflows",
    detail: "Port 5678 • Real-time NDJSON streaming & active chat webhooks",
    icon: Lightning,
    color: "text-emerald-700",
    bg: "bg-emerald-50/70",
    border: "border-emerald-200/80",
    badgeBg: "bg-emerald-100/80",
    badgeText: "text-emerald-800",
  },
  {
    id: "zoho",
    name: "Zoho CRM Suite",
    shortName: "Zoho CRM",
    category: "Enterprise Cloud SaaS",
    status: "connected",
    metric: "OAuth 2.0",
    detail: "Deals, Milestones, Campaigns & automatic task logging",
    icon: Database,
    color: "text-amber-700",
    bg: "bg-amber-50/70",
    border: "border-amber-200/80",
    badgeBg: "bg-amber-100/80",
    badgeText: "text-amber-800",
  },
  {
    id: "supabase",
    name: "Supabase pgvector",
    shortName: "pgvector",
    category: "Vector Knowledge Base",
    status: "synced",
    metric: "34 SOPs",
    detail: "HNSW Vector Index • BigCity Assured Reward SOP Precedents",
    icon: Brain,
    color: "text-sky-700",
    bg: "bg-sky-50/70",
    border: "border-sky-200/80",
    badgeBg: "bg-sky-100/80",
    badgeText: "text-sky-800",
  },
  {
    id: "gemini",
    name: "Google Gemini 2.5 Flash",
    shortName: "Gemini 2.5",
    category: "LLM Reasoning Engine",
    status: "active",
    metric: "0.3 Temp",
    detail: "Low-latency task extraction, policy guardrail & campaign synthesizer",
    icon: Cpu,
    color: "text-indigo-700",
    bg: "bg-indigo-50/70",
    border: "border-indigo-200/80",
    badgeBg: "bg-indigo-100/80",
    badgeText: "text-indigo-800",
  },
];

export default function IntegrationStatus() {
  const [isSectionOpen, setIsSectionOpen] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="border-b border-slate-100 bg-slate-50/40 p-3">
      {/* Section Header with Toggle */}
      <button
        type="button"
        onClick={() => setIsSectionOpen(!isSectionOpen)}
        className="w-full flex items-center justify-between px-1 py-1 text-left cursor-pointer group"
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-bold text-slate-700 tracking-tight uppercase">
            Live Infrastructure
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 shadow-2xs">
            4/4
          </span>
          <span className="text-slate-400 group-hover:text-slate-700 transition-colors">
            {isSectionOpen ? <CaretUp size={12} /> : <CaretDown size={12} />}
          </span>
        </div>
      </button>

      {/* Collapsible List */}
      <AnimatePresence>
        {isSectionOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-1.5 mt-2 overflow-hidden"
          >
            {INTEGRATIONS.map((item) => {
              const isSelected = selectedId === item.id;
              const IconComp = item.icon;

              return (
                <div key={item.id} className="relative">
                  <button
                    type="button"
                    onClick={() => setSelectedId(isSelected ? null : item.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-all duration-150 text-left border ${
                      isSelected
                        ? `${item.bg} ${item.border} shadow-xs ring-1 ring-slate-300`
                        : "bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${item.bg} ${item.border} border`}
                      >
                        <IconComp size={13} weight="duotone" className={item.color} />
                      </div>
                      <div className="truncate">
                        <span className="text-[12px] font-semibold text-slate-800 block leading-tight truncate">
                          {item.shortName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal block leading-tight truncate">
                          {item.category}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0 pl-1.5">
                      <span
                        className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-md border ${item.bg} ${item.border} ${item.color}`}
                      >
                        {item.metric}
                      </span>
                    </div>
                  </button>

                  {/* Detail Drawer */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-1 p-2.5 rounded-xl bg-slate-900 text-white text-[11px] leading-relaxed shadow-md border border-slate-800 space-y-1">
                          <div className="flex items-center justify-between text-slate-400 font-mono text-[9.5px]">
                            <span>{item.name.toUpperCase()}</span>
                            <span className="text-emerald-400 flex items-center gap-1">
                              <CheckCircle size={11} weight="fill" /> READY
                            </span>
                          </div>
                          <p className="text-slate-200 font-medium text-[11.5px] leading-snug">{item.detail}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
