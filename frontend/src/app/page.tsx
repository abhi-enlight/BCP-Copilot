"use client";

import { useState } from "react";
import { List } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import Sidebar, { type NavView } from "@/components/Sidebar";
import CampaignsView from "@/components/CampaignsView";
import ConnectionsView from "@/components/ConnectionsView";
import SettingsView from "@/components/SettingsView";
import CopilotView from "@/components/CopilotView";

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export default function App() {
  const [currentView, setCurrentView] = useState<NavView>("copilot");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 rounded-lg text-stone-600 hover:bg-stone-100 cursor-pointer"
          >
            <List size={20} weight="bold" />
          </button>
          <span className="text-sm font-bold text-stone-900 capitalize">
            {currentView}
          </span>
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
            {currentView === "copilot" && <CopilotView />}
            {currentView === "campaigns" && <CampaignsView />}
            {currentView === "connections" && <ConnectionsView />}
            {currentView === "settings" && <SettingsView />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
