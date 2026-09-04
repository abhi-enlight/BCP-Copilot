"use client";

import { motion } from "motion/react";
import {
  UserFocus,
  Sparkle,
  Database,
  Kanban,
} from "@phosphor-icons/react";
import BigCityLogo from "./BigCityLogo";

interface EmptyStateProps {
  onSelectPrompt?: (suggestion: string) => void;
  onSuggestionClick?: (suggestion: string) => void;
}

const suggestions = [
  {
    icon: UserFocus,
    label: "Search Zoho CRM Leads",
    tag: "CRM · Lead Discovery",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "Search Zoho CRM for our latest client leads and show me their company details.",
  },
  {
    icon: Sparkle,
    label: "Campaign Ideation & Tasks",
    tag: "Campaign · Operational Plan",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    text: "I have a promotional campaign idea for a client lead — help me build the operational tasks, timeline, and budget.",
  },
  {
    icon: Database,
    label: "Count Suite Elements",
    tag: "Intelligence · CRM & Books",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "How many leads do we have in Zoho CRM, and how many invoices are in Zoho Books?",
  },
  {
    icon: Kanban,
    label: "Inspect Zoho Projects",
    tag: "Zoho Projects · Tasks",
    color: "text-sky-600",
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "List our active projects in Zoho Projects and check open execution tasks.",
  },
];

export default function EmptyState({ onSelectPrompt, onSuggestionClick }: EmptyStateProps) {
  const handleClick = (text: string) => {
    if (onSelectPrompt) onSelectPrompt(text);
    else if (onSuggestionClick) onSuggestionClick(text);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 max-w-2xl w-full mx-auto my-auto select-none">
      {/* Brand Hero Glow */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative mb-6"
      >
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-amber-500/15 blur-xl scale-125" />
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
        <h2 className="text-2xl font-bold text-stone-900 tracking-tight mb-2">
          BCP Assist Campaign Intelligence
        </h2>
        <p className="text-[13px] text-stone-600 max-w-md mx-auto leading-relaxed">
          Connected directly to your live <strong className="text-stone-900 font-semibold">Zoho CRM Leads</strong>,{" "}
          <strong className="text-stone-900 font-semibold">Zoho Books</strong>, and{" "}
          <strong className="text-stone-900 font-semibold">Zoho Projects</strong>.
        </p>
      </motion.div>

      {/* Action Starter Cards */}
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
              className="group flex flex-col items-start p-4 rounded-2xl bg-white hover:bg-stone-50/70 border border-stone-200/90 hover:border-amber-300 hover:shadow-md transition-all text-left shadow-2xs cursor-pointer"
            >
              <div className="flex items-center justify-between w-full mb-2.5">
                <div className={`p-2 rounded-xl ${item.bg} ${item.border} border`}>
                  <IconComp size={16} weight="duotone" className={item.color} />
                </div>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 border border-stone-200/80">
                  {item.tag}
                </span>
              </div>
              <span className="text-[13px] font-bold text-stone-900 group-hover:text-amber-700 transition-colors">
                {item.label}
              </span>
              <p className="text-[11.5px] text-stone-500 leading-relaxed mt-1 line-clamp-2">
                {item.text}
              </p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
