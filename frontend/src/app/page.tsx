"use client";

import { useState } from "react";
import { List } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import Sidebar, { type NavView } from "@/components/Sidebar";
import CampaignsView from "@/components/CampaignsView";
import ConnectionsView from "@/components/ConnectionsView";
import UsersAndRolesView from "@/components/UsersAndRolesView";
import CopilotView from "@/components/CopilotView";
import BigCityLogo from "@/components/BigCityLogo";
import { type Campaign } from "@/app/api/campaigns/route";

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export interface PlanContextForCopilot {
  campaignData: {
    name: string;
    client: string;
    rewardType: string;
    budget: string;
    codeVolume: string;
    startDate: string;
    endDate: string;
    brief: string;
  };
  plan: {
    tasks: any[];
    aspectSummary: any;
  };
}

export default function App() {
  const [currentView, setCurrentView] = useState<NavView>("copilot");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activePlanForCopilot, setActivePlanForCopilot] = useState<PlanContextForCopilot | null>(null);

  const handleModifyInCopilot = (campaignData: any, plan: any) => {
    setActivePlanForCopilot({ campaignData, plan });
    setCurrentView("copilot");
  };

  return (
    <div className="flex h-screen bg-[#FAFAF9] text-stone-900 overflow-hidden font-sans antialiased">
      {/* Persistent Sidebar */}
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
        campaignCount={4}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Mobile Top Bar */}
        <div className="lg:hidden h-14 border-b border-stone-200/70 bg-white/90 backdrop-blur-md px-4 flex items-center justify-between flex-shrink-0 z-30">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 rounded-lg text-stone-600 hover:bg-stone-100 cursor-pointer"
            >
              <List size={20} weight="bold" />
            </button>
            <div className="flex items-center gap-2">
              <BigCityLogo size={24} />
              <span className="text-sm font-bold text-stone-900 capitalize">
                {currentView}
              </span>
            </div>
          </div>
          <div className="w-8" />
        </div>

        {/* Animated View Switcher */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            {currentView === "copilot" && (
              <CopilotView
                initialPlanContext={activePlanForCopilot}
                onClearPlanContext={() => setActivePlanForCopilot(null)}
                onViewCampaigns={() => setCurrentView("campaigns")}
              />
            )}
            {currentView === "campaigns" && (
              <CampaignsView
                onModifyInCopilot={handleModifyInCopilot}
              />
            )}
            {currentView === "connections" && <ConnectionsView />}
            {currentView === "users" && <UsersAndRolesView />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
