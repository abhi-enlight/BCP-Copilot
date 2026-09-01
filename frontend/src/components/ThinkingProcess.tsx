"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkle,
  Database,
  ShieldCheck,
  Brain,
  CheckCircle,
  CaretDown,
  CaretUp,
  CircleNotch,
} from "@phosphor-icons/react";

interface ThinkingProcessProps {
  elapsedTime?: number;
  mode?: "plan" | "chat";
  /** Live tool-call label forwarded from n8n begin frames (e.g. "Querying Zoho CRM invoices...") */
  toolCallLabel?: string;
}

const PLAN_THINKING_STEPS = [
  {
    id: "zoho",
    title: "Querying Zoho CRM & Suite",
    desc: "Fetching active deals, milestones, and commercial budgets",
    icon: Database,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  {
    id: "supabase",
    title: "Searching Supabase Vector Knowledge Base",
    desc: "Matching 34 BigCity SOP tasks & historical OTP precedents",
    icon: Brain,
    color: "text-sky-600",
    bg: "bg-sky-50",
    border: "border-sky-200",
  },
  {
    id: "guardrail",
    title: "Evaluating SOW Policy Guardrails",
    desc: "Verifying SPOC assignments (Sachin, Khaleel, CS Heads)",
    icon: ShieldCheck,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  {
    id: "synthesis",
    title: "Synthesizing Campaign Strategy",
    desc: "Generating structured recommendation and action timeline",
    icon: Sparkle,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
  },
];

const CHAT_THINKING_STEPS = [
  {
    id: "supabase",
    title: "Searching Supabase Vector Knowledge Base",
    desc: "Retrieving campaign precedents and SOPs",
    icon: Brain,
    color: "text-sky-600",
    bg: "bg-sky-50",
    border: "border-sky-200",
  },
  {
    id: "synthesis",
    title: "Generating Response",
    desc: "Synthesizing answer based on BCP guidelines",
    icon: Sparkle,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
  },
];

export default function ThinkingProcess({ elapsedTime = 0, mode = "plan", toolCallLabel }: ThinkingProcessProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);
  const [seconds, setSeconds] = useState(elapsedTime);
  const steps = mode === "plan" ? PLAN_THINKING_STEPS : CHAT_THINKING_STEPS;

  // When a live tool-call label arrives, freeze step advancement
  // and display the label at the current step position.
  const activeLabel = toolCallLabel ?? null;

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => +(prev + 0.1).toFixed(1));
    }, 100);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Pause step cycling while a live tool-call label is being shown
    if (activeLabel) return;
    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1200);
    return () => clearInterval(stepInterval);
  }, [steps.length, activeLabel]);

  const currentStep = steps[currentStepIndex] || steps[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-3xl w-full my-3"
    >
      <div className="rounded-2xl bg-white border border-slate-200/90 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.06)] overflow-hidden">
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors border-b border-slate-100"
        >
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center">
              <CircleNotch size={17} weight="bold" className="animate-spin text-indigo-600" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold tracking-tight text-slate-900">
                {activeLabel
                  ? activeLabel
                  : mode === "plan" ? "Thinking & Processing Brief" : "Processing Query"}
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 tabular-nums font-medium">
                {seconds.toFixed(1)}s
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11.5px] text-slate-500 hidden sm:inline font-medium">
              Stage {Math.min(currentStepIndex + 1, steps.length)} of {steps.length}
            </span>
            <button
              type="button"
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 transition-colors"
            >
              {isExpanded ? <CaretUp size={14} /> : <CaretDown size={14} />}
            </button>
          </div>
        </div>

        {/* Live Active Step Badge (When collapsed) */}
        {!isExpanded && currentStep && (
          <div className="px-4 py-2 bg-indigo-50/50 flex items-center gap-2 text-[12px] text-indigo-900 font-medium">
            <currentStep.icon size={14} className={currentStep.color} />
            <span>{currentStep.title}</span>
          </div>
        )}

        {/* Collapsible Stepper Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              key="thinking-stepper-body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="p-4 space-y-2"
            >
              {steps.map((step, idx) => {
                const isCurrent = idx === currentStepIndex;
                const isPassed = idx < currentStepIndex;
                const IconComponent = step.icon;

                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className={`flex items-start gap-3 p-2.5 rounded-xl transition-all duration-200 border ${
                      isCurrent
                        ? `${step.bg} ${step.border} shadow-2xs`
                        : isPassed
                        ? "bg-slate-50/50 border-slate-100 opacity-80"
                        : "opacity-40 border-transparent bg-transparent"
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 ${
                        isCurrent
                          ? `${step.bg} ${step.color}`
                          : isPassed
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {isPassed ? (
                        <CheckCircle size={16} weight="fill" className="text-emerald-600" />
                      ) : isCurrent ? (
                        <CircleNotch size={16} weight="bold" className="animate-spin text-indigo-600" />
                      ) : (
                        <IconComponent size={15} weight="duotone" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[12.5px] font-medium leading-tight ${
                            isCurrent
                              ? "text-slate-900 font-semibold"
                              : isPassed
                              ? "text-slate-700"
                              : "text-slate-400"
                          }`}
                        >
                          {step.title}
                        </span>
                        {isPassed && (
                          <span className="text-[10.5px] text-emerald-600 font-mono font-medium">Done</span>
                        )}
                        {isCurrent && (
                          <span className="text-[10.5px] text-indigo-600 animate-pulse font-mono font-medium">
                            Processing...
                          </span>
                        )}
                      </div>
                      <p className="text-[11.5px] text-slate-500 truncate mt-0.5">
                        {isCurrent && activeLabel ? activeLabel : step.desc}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
