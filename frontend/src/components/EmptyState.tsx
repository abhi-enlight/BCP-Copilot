"use client";

import { motion } from "motion/react";
import {
  Sparkle,
  Database,
  ShieldCheck,
  Brain,
  QrCode,
} from "@phosphor-icons/react";

interface EmptyStateProps {
  onSelectPrompt?: (suggestion: string) => void;
  onSuggestionClick?: (suggestion: string) => void;
}

const suggestions = [
  {
    icon: QrCode,
    label: "Nestle QR Brief",
    tag: "High Volume OTP",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "We are launching the Nestle Festive Scratch & Win with 100k on-pack QR codes. What historical risks and OTP fallbacks should we prepare?",
  },
  {
    icon: Database,
    label: "Zoho CRM Live Query",
    tag: "Live Deals",
    color: "text-sky-600",
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "What are our active deals and highest-value campaigns currently logged in Zoho CRM?",
  },
  {
    icon: Brain,
    label: "BigCity SOP Matrix",
    tag: "34 SOP Tasks",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    text: "What is the mandatory BigCity SOP checklist and SPOC ownership for campaign setup, server provisioning, and 72h UAT testing?",
  },
  {
    icon: ShieldCheck,
    label: "SOW Policy Guard",
    tag: "Human Sign-Off",
    color: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "A client requested a ₹10 Lakh budget increase and change in prize pool mechanics. How does BCP Assist handle this?",
  },
];

export default function EmptyState({ onSelectPrompt, onSuggestionClick }: EmptyStateProps) {
  const handleClick = (text: string) => {
    if (onSelectPrompt) onSelectPrompt(text);
    else if (onSuggestionClick) onSuggestionClick(text);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 max-w-2xl w-full mx-auto my-auto">
      {/* Brand Hero Glow */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative mb-6"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-4 ring-indigo-50">
          <Sparkle size={30} weight="fill" />
        </div>
      </motion.div>

      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="text-center mb-8"
      >
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
          BCP Assist Campaign Intelligence
        </h2>
        <p className="text-[13px] text-slate-600 max-w-md mx-auto leading-relaxed">
          Powered by <strong className="text-slate-900 font-semibold">Google Gemini 2.5 Flash</strong>,{" "}
          <strong className="text-slate-900 font-semibold">Supabase pgvector</strong> SOP memory, and live{" "}
          <strong className="text-slate-900 font-semibold">Zoho CRM Suite</strong> integration.
        </p>
      </motion.div>

      {/* Suggestion Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
        {suggestions.map((item, i) => {
          const IconComp = item.icon;
          return (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.12 + i * 0.06 }}
              whileHover={{ scale: 1.015, y: -2 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => handleClick(item.text)}
              className="group flex flex-col items-start p-4.5 rounded-2xl bg-white hover:bg-slate-50/60 border border-slate-200/90 hover:border-indigo-300 hover:shadow-[0_8px_20px_-4px_rgba(15,23,42,0.06)] transition-all text-left shadow-2xs cursor-pointer"
            >
              <div className="flex items-center justify-between w-full mb-2.5">
                <div className={`p-2 rounded-xl ${item.bg} ${item.border} border`}>
                  <IconComp size={16} weight="duotone" className={item.color} />
                </div>
                <span className="text-[10.5px] font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80">
                  {item.tag}
                </span>
              </div>
              <span className="text-[13.5px] font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                {item.label}
              </span>
              <p className="text-[12px] text-slate-500 leading-relaxed mt-1 line-clamp-2">
                {item.text}
              </p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
