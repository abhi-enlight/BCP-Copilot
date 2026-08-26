"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Megaphone,
  Plus,
  MagnifyingGlass,
  Sparkle,
  CheckCircle,
  Clock,
  Kanban,
  Scales,
  ShieldCheck,
  Receipt,
  Cpu,
  User,
  ArrowsClockwise,
  X,
  Buildings,
  Lightning,
  CaretRight,
} from "@phosphor-icons/react";
import { type Campaign, type AspectTask, INITIAL_CAMPAIGNS, generateAspectPlan } from "@/app/api/campaigns/route";
import ZohoProjectsDrawer from "./ZohoProjectsDrawer";

interface CampaignsViewProps {
  onOpenChatWithPrompt?: (prompt: string) => void;
}

export default function CampaignsView({ onOpenChatWithPrompt }: CampaignsViewProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_CAMPAIGNS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"All" | "Live" | "Planning" | "In Review">("All");

  const [selectedCampaignForDrawer, setSelectedCampaignForDrawer] = useState<Campaign | null>(null);

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<"input" | "ai_generating" | "plan_review" | "zoho_pushing" | "push_success">("input");
  const [generationProgress, setGenerationProgress] = useState(0);

  const [formData, setFormData] = useState({
    name: "",
    client: "",
    category: "FMCG",
    rewardType: "Cashback",
    budget: "₹25,00,000",
    codeVolume: "250,000 packs",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
    brief: "",
  });

  const [generatedPlan, setGeneratedPlan] = useState<{
    tasks: AspectTask[];
    aspectSummary: Campaign["aspectSummary"];
  } | null>(null);

  const [createdCampaign, setCreatedCampaign] = useState<Campaign | null>(null);

  const demoPresets = [
    {
      label: "Cadbury Silk Valentine Pool",
      name: "Mondelez Cadbury Silk Valentine's ₹100 Assured Cashback",
      client: "Mondelez India Foods Pvt Ltd",
      category: "FMCG",
      rewardType: "Cashback",
      budget: "₹35,00,000",
      codeVolume: "350,000 packs",
      brief: "Valentine season on-pack campaign with unique QR code inside pack. Users scan, verify mobile via OTP, and receive instant ₹100 UPI transfer.",
    },
    {
      label: "Pepsi UEFA Zomato Pass",
      name: "Pepsi UEFA Champions League ₹200 Zomato Dining Pass",
      client: "PepsiCo India Holdings",
      category: "Beverages",
      rewardType: "EGV",
      budget: "₹50,00,000",
      codeVolume: "500,000 cans",
      brief: "Co-branded soccer tournament promotion offering ₹200 Zomato Dineout voucher with purchase of 2 Pepsi Max cans.",
    },
    {
      label: "Tata Tea Gold Amazon EGV",
      name: "Tata Tea Gold ₹50 Amazon Pay Assured Reward",
      client: "Tata Consumer Products",
      category: "FMCG",
      rewardType: "EGV",
      budget: "₹20,00,000",
      codeVolume: "200,000 packs",
      brief: "Festive morning tea reward with instant Amazon Pay gift card code delivered via SMS post verification.",
    },
  ];

  const handleApplyPreset = (preset: typeof demoPresets[0]) => {
    setFormData({ ...formData, ...preset });
  };

  const handleStartAIGeneration = async () => {
    if (!formData.name || !formData.client) return;
    setWizardStep("ai_generating");
    setGenerationProgress(10);

    const interval = setInterval(() => {
      setGenerationProgress((prev) => {
        if (prev >= 90) { clearInterval(interval); return 90; }
        return prev + 20;
      });
    }, 300);

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_plan", campaignInput: formData }),
      });
      const data = await res.json();
      clearInterval(interval);
      setGenerationProgress(100);
      setTimeout(() => {
        const plan = data.plan || generateAspectPlan(formData);
        setGeneratedPlan(plan);
        setWizardStep("plan_review");
      }, 500);
    } catch {
      clearInterval(interval);
      const plan = generateAspectPlan(formData);
      setGeneratedPlan(plan);
      setWizardStep("plan_review");
    }
  };

  const handleApproveAndPushToZoho = async () => {
    if (!generatedPlan) return;
    setWizardStep("zoho_pushing");
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_and_push_zoho", campaignData: formData, tasks: generatedPlan.tasks }),
      });
      const data = await res.json();
      setTimeout(() => {
        if (data.campaign) {
          setCreatedCampaign(data.campaign);
          setCampaigns((prev) => [data.campaign, ...prev]);
          setWizardStep("push_success");
        }
      }, 1200);
    } catch (e) {
      console.error("Failed to push to Zoho", e);
    }
  };

  const handleResetModal = () => {
    setIsNewModalOpen(false);
    setWizardStep("input");
    setGenerationProgress(0);
    setGeneratedPlan(null);
    setCreatedCampaign(null);
    setFormData({
      name: "",
      client: "",
      category: "FMCG",
      rewardType: "Cashback",
      budget: "₹25,00,000",
      codeVolume: "250,000 packs",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
      brief: "",
    });
  };

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.zohoProjectId && c.zohoProjectId.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;
    if (selectedFilter === "Live") return c.status.includes("Live");
    if (selectedFilter === "Planning") return c.status === "Planning" || c.status === "Draft";
    if (selectedFilter === "In Review") return c.status === "In Review";
    return true;
  });

  const aspectColors = {
    legal: "text-violet-700 bg-violet-50 border-violet-200",
    compliance: "text-amber-700 bg-amber-50 border-amber-200",
    accounting: "text-emerald-700 bg-emerald-50 border-emerald-200",
    implementation: "text-sky-700 bg-sky-50 border-sky-200",
  };

  const getStatusStyles = (status: string) => {
    if (status.includes("Live")) return "bg-emerald-50 text-emerald-800 border-emerald-200";
    if (status === "In Review") return "bg-amber-50 text-amber-800 border-amber-200";
    return "bg-stone-100 text-stone-600 border-stone-200";
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#FAFAF9]">
      {/* Top Header */}
      <header className="h-14 border-b border-stone-200/70 bg-white/90 backdrop-blur-md px-6 flex items-center justify-between flex-shrink-0 z-20">
        <div className="flex items-center gap-3">
          <h1 className="text-[15px] font-bold text-stone-900 tracking-tight">
            Campaigns
          </h1>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200">
            {campaigns.length} total
          </span>
        </div>

        <button
          type="button"
          onClick={() => { setWizardStep("input"); setIsNewModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-all duration-200 cursor-pointer"
        >
          <Plus size={14} weight="bold" />
          <span>New Campaign</span>
        </button>
      </header>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {/* Search + Filter — floats directly on background */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-96">
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search campaigns, clients…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-sm bg-white border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-stone-800 placeholder-stone-400 shadow-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            {(["All", "Live", "In Review", "Planning"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setSelectedFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                  selectedFilter === filter
                    ? "bg-stone-900 text-white shadow-sm"
                    : "bg-white text-stone-600 hover:bg-stone-100 hover:text-stone-900 border border-stone-200"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Campaigns Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredCampaigns.map((camp, idx) => {
            const isLive = camp.status.includes("Live");
            const totalTasks = camp.tasks?.length || 0;
            const doneTasks = camp.tasks?.filter(t => t.status === "COMPLETED").length || 0;
            const legalSummary = `${camp.aspectSummary?.legal?.done || 0}/${camp.aspectSummary?.legal?.total || 3}`;
            const complianceSummary = `${camp.aspectSummary?.compliance?.done || 0}/${camp.aspectSummary?.compliance?.total || 3}`;
            const accountingSummary = `${camp.aspectSummary?.accounting?.done || 0}/${camp.aspectSummary?.accounting?.total || 3}`;
            const techSummary = `${camp.aspectSummary?.implementation?.done || 0}/${camp.aspectSummary?.implementation?.total || 4}`;

            return (
              <motion.div
                key={camp.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -1 }}
                className="p-5 rounded-2xl bg-white border border-stone-200/80 hover:border-amber-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-default"
              >
                <div>
                  {/* Top Row: Campaign label, status, Zoho ID */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-stone-100 text-stone-500 border border-stone-200">
                        #{idx + 1}
                      </span>
                      <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full border ${getStatusStyles(camp.status)}`}>
                        {camp.status}
                      </span>
                    </div>

                    {camp.zohoProjectId && (
                      <button
                        type="button"
                        onClick={() => setSelectedCampaignForDrawer(camp)}
                        className="inline-flex items-center gap-1 text-[10.5px] font-mono font-semibold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                      >
                        <Kanban size={11} weight="fill" />
                        <span>{camp.zohoProjectId}</span>
                        <CaretRight size={10} weight="bold" className="text-emerald-500" />
                      </button>
                    )}
                  </div>

                  {/* Title & Client */}
                  <h3 className="text-[14px] font-bold text-stone-900 leading-snug mb-1">
                    {camp.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-4">
                    <Buildings size={12} className="text-stone-400 flex-shrink-0" />
                    <span className="font-medium text-stone-700">{camp.client}</span>
                    <span className="text-stone-300">·</span>
                    <span className="font-mono text-stone-500">{camp.rewardType}</span>
                  </div>

                  {/* Aspect inline summary */}
                  <div className="text-[11px] text-stone-400 font-mono mb-4 flex flex-wrap gap-x-3 gap-y-1">
                    <span>
                      <span className="text-stone-500 font-medium">Legal</span>{" "}
                      <span className={camp.aspectSummary?.legal?.done === camp.aspectSummary?.legal?.total ? "text-emerald-600" : "text-stone-400"}>
                        {legalSummary}
                      </span>
                    </span>
                    <span className="text-stone-200">·</span>
                    <span>
                      <span className="text-stone-500 font-medium">Compliance</span>{" "}
                      <span className={camp.aspectSummary?.compliance?.done === camp.aspectSummary?.compliance?.total ? "text-emerald-600" : "text-stone-400"}>
                        {complianceSummary}
                      </span>
                    </span>
                    <span className="text-stone-200">·</span>
                    <span>
                      <span className="text-stone-500 font-medium">Accounting</span>{" "}
                      <span className={camp.aspectSummary?.accounting?.done === camp.aspectSummary?.accounting?.total ? "text-emerald-600" : "text-stone-400"}>
                        {accountingSummary}
                      </span>
                    </span>
                    <span className="text-stone-200">·</span>
                    <span>
                      <span className="text-stone-500 font-medium">Tech</span>{" "}
                      <span className={camp.aspectSummary?.implementation?.done === camp.aspectSummary?.implementation?.total ? "text-emerald-600" : "text-stone-400"}>
                        {techSummary}
                      </span>
                    </span>
                  </div>

                  {/* Progress bar — thin, clean */}
                  <div className="w-full h-1 bg-stone-100 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${isLive ? "bg-emerald-500" : "bg-amber-500"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${camp.completionRate}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.05 + 0.2, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>

                {/* Card Footer */}
                <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-stone-400 font-mono">
                    Synced {camp.lastZohoSync || "recently"}
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedCampaignForDrawer(camp)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-amber-700 text-white text-xs font-semibold transition-all duration-200 cursor-pointer shadow-sm"
                  >
                    <Kanban size={13} weight="bold" />
                    <span>View Plan · {totalTasks} tasks</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* NEW CAMPAIGN MODAL */}
      <AnimatePresence>
        {isNewModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleResetModal}
              className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden z-10 border border-stone-200 flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-stone-200 bg-stone-50/60 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-stone-900 text-white flex items-center justify-center shadow-sm">
                    <Sparkle size={16} weight="fill" className="text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-stone-900">
                      {wizardStep === "input" && "New Campaign"}
                      {wizardStep === "ai_generating" && "AI Generating Plan…"}
                      {wizardStep === "plan_review" && "Review & Approve Plan"}
                      {wizardStep === "zoho_pushing" && "Pushing to Zoho…"}
                      {wizardStep === "push_success" && "Campaign Live!"}
                    </h3>
                    <p className="text-xs text-stone-500">
                      Step {wizardStep === "input" ? "1" : wizardStep === "plan_review" ? "2" : "3"} of 3 · BigCity SOP Intelligence
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResetModal}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  <X size={17} weight="bold" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-5">
                {/* STEP 1: INPUT */}
                {wizardStep === "input" && (
                  <div className="space-y-4">
                    {/* Demo Presets */}
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                          <Lightning size={12} weight="fill" className="text-amber-600" />
                          Quick Demo Presets
                        </span>
                        <span className="text-[10px] text-amber-600 font-medium">Click to auto-fill</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {demoPresets.map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => handleApplyPreset(preset)}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-amber-100 text-amber-900 text-[11px] font-semibold border border-amber-200 transition-all cursor-pointer shadow-sm"
                          >
                            + {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1.5">Campaign Name *</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g. Cadbury Silk Valentine's ₹100 Cashback"
                          className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1.5">Client / Brand *</label>
                        <input
                          type="text"
                          value={formData.client}
                          onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                          placeholder="e.g. Mondelez India Foods"
                          className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1.5">Reward Mechanism</label>
                        <select
                          value={formData.rewardType}
                          onChange={(e) => setFormData({ ...formData, rewardType: e.target.value })}
                          className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                        >
                          <option value="Cashback">Assured UPI Cashback</option>
                          <option value="EGV">Digital EGV (Swiggy / Amazon / Zomato)</option>
                          <option value="Scratch & Win">Scratch & Win Lucky Draw</option>
                          <option value="Merchandise">Physical Merchandise</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1.5">Total Pool Budget</label>
                        <input
                          type="text"
                          value={formData.budget}
                          onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                          placeholder="₹25,00,000"
                          className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1.5">Pack / Code Volume</label>
                        <input
                          type="text"
                          value={formData.codeVolume}
                          onChange={(e) => setFormData({ ...formData, codeVolume: e.target.value })}
                          placeholder="250,000 packs"
                          className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1.5">Start Date</label>
                          <input
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            className="w-full px-2.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1.5">End Date</label>
                          <input
                            type="date"
                            value={formData.endDate}
                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            className="w-full px-2.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1.5">Campaign Brief</label>
                      <textarea
                        rows={3}
                        value={formData.brief}
                        onChange={(e) => setFormData({ ...formData, brief: e.target.value })}
                        placeholder="Describe campaign mechanics, redemption flow, client constraints…"
                        className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* STEP 2: AI GENERATING */}
                {wizardStep === "ai_generating" && (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-5">
                    <div className="relative w-16 h-16 rounded-2xl bg-stone-900 flex items-center justify-center shadow-lg">
                      <Sparkle size={30} weight="fill" className="text-amber-400 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-[15px] font-bold text-stone-900">Synthesizing 4-Aspect Plan…</h4>
                      <p className="text-xs text-stone-500 max-w-md mt-1.5 leading-relaxed">
                        Analyzing BigCity SOP precedents for Legal clearances, DLT compliance, Zoho Books advance verification, and tech failover setup.
                      </p>
                    </div>
                    <div className="w-full max-w-sm space-y-2">
                      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-amber-500 rounded-full"
                          animate={{ width: `${generationProgress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono">
                        <span>Legal & Compliance</span>
                        <span>Escrow & Accounting</span>
                        <span>Tech & QR</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: PLAN REVIEW */}
                {wizardStep === "plan_review" && generatedPlan && (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-emerald-900 block">Plan Generated Successfully</span>
                        <span className="text-[11px] text-emerald-700">
                          {generatedPlan.tasks.length} tasks across 4 mandatory SOP gates
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-white text-emerald-800 border border-emerald-200">
                        TAT: 12 Days
                      </span>
                    </div>

                    {/* Aspect summary chips */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { icon: Scales, label: "Legal", desc: "3 Tasks · T&C, Consents", color: "text-violet-700 bg-violet-50 border-violet-200" },
                        { icon: ShieldCheck, label: "Compliance", desc: "3 Tasks · DLT, 72h UAT", color: "text-amber-700 bg-amber-50 border-amber-200" },
                        { icon: Receipt, label: "Accounting", desc: "3 Tasks · 100% Adv", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
                        { icon: Cpu, label: "Tech", desc: "4 Tasks · QR & Failover", color: "text-sky-700 bg-sky-50 border-sky-200" },
                      ].map((asp) => (
                        <div key={asp.label} className={`p-2.5 rounded-xl border ${asp.color}`}>
                          <span className={`text-[11px] font-bold block flex items-center gap-1 mb-0.5`}>
                            <asp.icon size={11} weight="fill" />
                            {asp.label}
                          </span>
                          <span className="text-[10.5px] leading-tight block">{asp.desc}</span>
                        </div>
                      ))}
                    </div>

                    {/* Task list */}
                    <div className="border border-stone-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-2.5 bg-stone-50 border-b border-stone-200 font-semibold text-xs text-stone-700 flex items-center justify-between">
                        <span>Task Matrix for Zoho Projects</span>
                        <span className="font-mono text-[11px] text-stone-400">{generatedPlan.tasks.length} tasks</span>
                      </div>
                      <div className="divide-y divide-stone-100 max-h-56 overflow-y-auto">
                        {generatedPlan.tasks.map((task) => (
                          <div key={task.id} className="p-3 text-xs flex items-center justify-between gap-3 hover:bg-stone-50/60">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[10px] font-mono font-semibold px-1.5 rounded bg-stone-100 text-stone-600">
                                  {task.sopCode}
                                </span>
                                <span className={`text-[9.5px] font-semibold px-1.5 rounded capitalize ${aspectColors[task.aspect]}`}>
                                  {task.aspect}
                                </span>
                                <span className="font-semibold text-stone-900 truncate">{task.title}</span>
                              </div>
                              <span className="text-[11px] text-stone-500 block truncate">
                                {task.assignee} · TAT: {task.tat}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 flex-shrink-0">
                              {task.urgency}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: PUSHING */}
                {wizardStep === "zoho_pushing" && (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <ArrowsClockwise size={28} weight="bold" className="animate-spin" />
                    </div>
                    <div>
                      <h4 className="text-[15px] font-bold text-stone-900">Writing to Zoho Projects…</h4>
                      <p className="text-xs text-stone-500 max-w-sm mt-1.5 leading-relaxed">
                        Creating project in BigCity Portal #81293, building 4 milestone lists, and generating all tasks with assignees & due dates.
                      </p>
                    </div>
                  </div>
                )}

                {/* STEP 5: SUCCESS */}
                {wizardStep === "push_success" && createdCampaign && (
                  <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg">
                      <CheckCircle size={34} weight="fill" />
                    </div>
                    <div>
                      <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        LIVE · {createdCampaign.zohoProjectId}
                      </span>
                      <h4 className="text-lg font-bold text-stone-900 mt-2 max-w-md">{createdCampaign.name}</h4>
                      <p className="text-xs text-stone-500 max-w-md mt-1.5 leading-relaxed">
                        Pushed to Zoho Projects with 4 milestones and all aspect tasks initialized. Read & Write connections are live.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        type="button"
                        onClick={() => { setIsNewModalOpen(false); setSelectedCampaignForDrawer(createdCampaign); }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer shadow-sm transition-all"
                      >
                        <Kanban size={14} weight="bold" />
                        <span>Open Zoho Projects View</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleResetModal}
                        className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold cursor-pointer transition-all"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 border-t border-stone-200 bg-stone-50/60 flex items-center justify-between flex-shrink-0">
                {wizardStep === "input" && (
                  <>
                    <button
                      type="button"
                      onClick={handleResetModal}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-200 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleStartAIGeneration}
                      disabled={!formData.name || !formData.client}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-stone-900 hover:bg-amber-700 disabled:opacity-40 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                    >
                      <Sparkle size={14} weight="fill" className="text-amber-400" />
                      <span>Generate AI Aspect Plan</span>
                    </button>
                  </>
                )}

                {wizardStep === "plan_review" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setWizardStep("input")}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-200 transition-colors cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleApproveAndPushToZoho}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                    >
                      <CheckCircle size={16} weight="fill" />
                      <span>Approve & Push to Zoho Projects</span>
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Zoho Projects Drawer */}
      {selectedCampaignForDrawer && (
        <ZohoProjectsDrawer
          campaign={selectedCampaignForDrawer}
          isOpen={!!selectedCampaignForDrawer}
          onClose={() => setSelectedCampaignForDrawer(null)}
          onTaskUpdated={(updatedCamp) => {
            setSelectedCampaignForDrawer(updatedCamp);
            setCampaigns((prev) => prev.map((c) => (c.id === updatedCamp.id ? updatedCamp : c)));
          }}
        />
      )}
    </div>
  );
}
