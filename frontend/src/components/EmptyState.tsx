"use client";

import { motion } from "motion/react";
import {
  Megaphone,
  QrCode,
  Gift,
  Coffee,
} from "@phosphor-icons/react";
import BigCityLogo from "./BigCityLogo";

interface EmptyStateProps {
  onSelectPrompt?: (suggestion: string) => void;
  onSuggestionClick?: (suggestion: string) => void;
}

const suggestions = [
  {
    icon: QrCode,
    label: "Nestlé Festive Scratch & Win",
    tag: "FMCG · QR Codes",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "Create a 4-aspect campaign plan for Nestlé Festive Scratch & Win with 100k on-pack QR codes and ₹25 Lakh budget.",
  },
  {
    icon: Megaphone,
    label: "Cadbury Silk Valentine Cashback",
    tag: "Cashback · UPI Pool",
    color: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "Plan Mondelez Cadbury Silk Valentine's ₹100 Assured Cashback campaign with 350,000 packs and UPI escrow.",
  },
  {
    icon: Gift,
    label: "Pepsi UEFA Zomato Dining Pass",
    tag: "EGV · Dining Voucher",
    color: "text-sky-600",
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "Generate a campaign launch plan for Pepsi UEFA Champions League ₹200 Zomato Dining Pass with 500,000 cans.",
  },
  {
    icon: Coffee,
    label: "Tata Tea Gold Amazon Reward",
    tag: "EGV · ₹20L Budget",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "Create a milestone execution plan for Tata Tea Gold ₹50 Amazon Pay Assured Reward campaign for 200k packs.",
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
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-amber-500/20 blur-xl scale-125" />
          <BigCityLogo size={64} className="relative shadow-lg rounded-2xl" />
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
          Powered by <strong className="text-slate-900 font-semibold">Supabase pgvector</strong> SOP memory, and live{" "}
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
