"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  UserPlus,
  Crown,
  Briefcase,
  Scales,
  MagnifyingGlass,
  Check,
  X,
  Buildings,
  ShieldCheck,
  TreeStructure,
  CaretDown,
  CheckCircle,
  Clock,
  Trash,
  Key,
  Info,
  SlidersHorizontal,
  ArrowSquareOut,
  Envelope,
  User,
  Sparkle,
} from "@phosphor-icons/react";

export type RoleType = "Admin" | "Project Manager" | "Legal";

export interface BigCityUser {
  id: string;
  name: string;
  email: string;
  role: RoleType;
  department: string;
  status: "active" | "invited" | "active_now";
  assignedCampaigns: string[];
  lastActive: string;
  initials: string;
  avatarColor: string;
}

const INITIAL_USERS: BigCityUser[] = [
  {
    id: "usr-1",
    name: "Rohit Sharma",
    email: "rohit.sharma@bigcity.in",
    role: "Admin",
    department: "Enterprise Architecture & SOW",
    status: "active_now",
    assignedCampaigns: ["All Enterprise Campaigns", "34 SOP Precedents"],
    lastActive: "Active now",
    initials: "RS",
    avatarColor: "from-indigo-600 to-indigo-800",
  },
  {
    id: "usr-2",
    name: "Priya Nair",
    email: "priya.nair@bigcity.in",
    role: "Admin",
    department: "Digital Operations & CRM",
    status: "active",
    assignedCampaigns: ["Zoho CRM Sync", "Server Infrastructure"],
    lastActive: "12m ago",
    initials: "PN",
    avatarColor: "from-purple-600 to-indigo-700",
  },
  {
    id: "usr-3",
    name: "Vikram Mehta",
    email: "vikram.mehta@bigcity.in",
    role: "Project Manager",
    department: "FMCG Brand Campaigns",
    status: "active_now",
    assignedCampaigns: ["Nestle QR Festive (100k Codes)", "Britannia Reward Box"],
    lastActive: "Active now",
    initials: "VM",
    avatarColor: "from-emerald-600 to-teal-700",
  },
  {
    id: "usr-4",
    name: "Ananya Deshmukh",
    email: "ananya.deshmukh@bigcity.in",
    role: "Project Manager",
    department: "Consumer Electronics",
    status: "active",
    assignedCampaigns: ["Samsung Diwali Bonanza", "LG Scratch & Win"],
    lastActive: "1h ago",
    initials: "AD",
    avatarColor: "from-teal-600 to-emerald-800",
  },
  {
    id: "usr-5",
    name: "Arjun Patel",
    email: "arjun.patel@bigcity.in",
    role: "Project Manager",
    department: "Platforms & OTP Gateways",
    status: "active",
    assignedCampaigns: ["Mondelez Assured Cash", "OTP Routing Fallback"],
    lastActive: "3h ago",
    initials: "AP",
    avatarColor: "from-cyan-600 to-blue-700",
  },
  {
    id: "usr-6",
    name: "Kavita Rao",
    email: "kavita.rao@bigcity.in",
    role: "Legal",
    department: "Legal & Regulatory Affairs",
    status: "active",
    assignedCampaigns: ["SOW Policy Guardrails", "Prize Pool Indemnity"],
    lastActive: "45m ago",
    initials: "KR",
    avatarColor: "from-amber-600 to-orange-700",
  },
  {
    id: "usr-7",
    name: "Siddharth Verma",
    email: "siddharth.verma@bigcity.in",
    role: "Legal",
    department: "Compliance & Governance",
    status: "active",
    assignedCampaigns: ["Campaign T&C Auditing", "Data Privacy & GDPR"],
    lastActive: "Yesterday",
    initials: "SV",
    avatarColor: "from-orange-600 to-amber-700",
  },
  {
    id: "usr-8",
    name: "Tanvi Joshi",
    email: "tanvi.joshi@bigcity.in",
    role: "Project Manager",
    department: "Vendor & Reward Operations",
    status: "invited",
    assignedCampaigns: ["Vendor Voucher Dispatch", "Tier 2 Partner SLAs"],
    lastActive: "Invite sent",
    initials: "TJ",
    avatarColor: "from-slate-500 to-slate-700",
  },
];

const ROLE_CONFIG: Record<
  RoleType,
  {
    icon: typeof Crown;
    title: string;
    level: string;
    levelNumber: number;
    color: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    cardBg: string;
    cardBorder: string;
    description: string;
    keyPermissions: string[];
  }
> = {
  Admin: {
    icon: Crown,
    title: "Admin",
    level: "Level 1 — Supreme Authority",
    levelNumber: 1,
    color: "text-indigo-600",
    badgeBg: "bg-indigo-50",
    badgeText: "text-indigo-700",
    badgeBorder: "border-indigo-200",
    cardBg: "bg-gradient-to-b from-indigo-50/60 to-white",
    cardBorder: "border-indigo-200/90",
    description:
      "Full workspace administration, budget approval overrides (>₹10L), SOW policy waivers, and integration keys.",
    keyPermissions: [
      "Manage all BigCity team members & roles",
      "Approve out-of-scope budget changes (>₹10 Lakhs)",
      "Supabase pgvector SOP knowledge ingestion",
      "Configure n8n Webhooks & Zoho CRM OAuth credentials",
    ],
  },
  "Project Manager": {
    icon: Briefcase,
    title: "Project Manager",
    level: "Level 2 — Execution & Operations",
    levelNumber: 2,
    color: "text-emerald-600",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
    badgeBorder: "border-emerald-200",
    cardBg: "bg-gradient-to-b from-emerald-50/60 to-white",
    cardBorder: "border-emerald-200/90",
    description:
      "Campaign scoping, SOP milestone tracking (34 tasks), Zoho CRM deal sync, and OTP fallback management.",
    keyPermissions: [
      "Launch & monitor campaign copilot sessions",
      "Assign SPOCs and 72h UAT testing milestones",
      "Write & sync deals and tasks to Zoho CRM",
      "Trigger high-volume OTP & server scaling fallbacks",
    ],
  },
  Legal: {
    icon: Scales,
    title: "Legal",
    level: "Level 2 — Compliance & Governance",
    levelNumber: 2,
    color: "text-amber-600",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    badgeBorder: "border-amber-200",
    cardBg: "bg-gradient-to-b from-amber-50/60 to-white",
    cardBorder: "border-amber-200/90",
    description:
      "SOW policy verification, prize pool legal terms, indemnity review, contract sign-offs, and compliance guardrails.",
    keyPermissions: [
      "Validate SOW scope against legal clauses",
      "Enforce mandatory Human Sign-Off on indemnity shifts",
      "Audit and approve campaign Terms & Conditions",
      "Export full compliance trail & decision audit logs",
    ],
  },
};

const PERMISSION_MATRIX = [
  {
    module: "AI Campaign Copilot & Chat",
    capability: "Prompting, SOP querying, and campaign brainstorming",
    admin: true,
    pm: true,
    legal: true,
  },
  {
    module: "SOP Task Matrix & SPOCs",
    capability: "Assigning 34 SOP checklist tasks & tracking timelines",
    admin: true,
    pm: true,
    legal: false,
  },
  {
    module: "Zoho CRM Deal & Task Sync",
    capability: "Create and update deals, milestones, and customer records",
    admin: true,
    pm: true,
    legal: false,
  },
  {
    module: "SOW Policy Guardrail Override",
    capability: "Authorize changes beyond standard Scope of Work",
    admin: true,
    pm: false,
    legal: true,
  },
  {
    module: "Budget Approvals > ₹10 Lakhs",
    capability: "Approve significant client budget expansion requests",
    admin: true,
    pm: false,
    legal: false,
  },
  {
    module: "Prize Pool & T&C Legal Sign-Off",
    capability: "Mandatory compliance sign-off on consumer contest terms",
    admin: true,
    pm: false,
    legal: true,
  },
  {
    module: "Supabase Vector SOP Ingestion",
    capability: "Upload new SOP documents and reindex vector embeddings",
    admin: true,
    pm: false,
    legal: false,
  },
  {
    module: "User & Role Provisioning",
    capability: "Invite team members and assign BigCity workspace roles",
    admin: true,
    pm: false,
    legal: false,
  },
];

interface UsersAndRolesViewProps {
  onUserCountChange?: (count: number) => void;
}

export default function UsersAndRolesView({ onUserCountChange }: UsersAndRolesViewProps) {
  const [users, setUsers] = useState<BigCityUser[]>(INITIAL_USERS);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<RoleType | "All">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isHierarchyModalOpen, setIsHierarchyModalOpen] = useState(false);
  const [showPermissionsMatrix, setShowPermissionsMatrix] = useState(false);
  const [activeRoleDropdownId, setActiveRoleDropdownId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Invite Form State
  const [inviteName, setInviteName] = useState("");
  const [inviteEmailPrefix, setInviteEmailPrefix] = useState("");
  const [inviteRole, setInviteRole] = useState<RoleType>("Project Manager");
  const [inviteDepartment, setInviteDepartment] = useState("Campaign Operations");
  const [inviteError, setInviteError] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole = selectedRoleFilter === "All" || u.role === selectedRoleFilter;
      const query = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !query ||
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.department.toLowerCase().includes(query) ||
        u.assignedCampaigns.some((c) => c.toLowerCase().includes(query));
      return matchesRole && matchesQuery;
    });
  }, [users, selectedRoleFilter, searchQuery]);

  // Counts
  const counts = useMemo(() => {
    return {
      all: users.length,
      admin: users.filter((u) => u.role === "Admin").length,
      pm: users.filter((u) => u.role === "Project Manager").length,
      legal: users.filter((u) => u.role === "Legal").length,
    };
  }, [users]);

  // Role Switch Handler
  const handleRoleChange = (userId: string, newRole: RoleType) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
    setActiveRoleDropdownId(null);
    const targetUser = users.find((u) => u.id === userId);
    showToast(`Updated role for ${targetUser?.name || "User"} to ${newRole}`);
  };

  // Delete/Revoke User Handler
  const handleRevokeUser = (userId: string, userName: string) => {
    if (confirm(`Are you sure you want to revoke access for ${userName}?`)) {
      setUsers((prev) => {
        const next = prev.filter((u) => u.id !== userId);
        if (onUserCountChange) onUserCountChange(next.length);
        return next;
      });
      showToast(`Access revoked for ${userName}`);
    }
  };

  // Handle Invite Form Submission
  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");

    if (!inviteName.trim()) {
      setInviteError("Please enter the user's full name");
      return;
    }

    const cleanPrefix = inviteEmailPrefix.trim().toLowerCase().replace(/@bigcity\.in$/i, "");
    if (!cleanPrefix || !/^[a-z0-9._-]+$/i.test(cleanPrefix)) {
      setInviteError("Please provide a valid BigCity email username (letters, numbers, dot, dash)");
      return;
    }

    const fullEmail = `${cleanPrefix}@bigcity.in`;

    if (users.some((u) => u.email.toLowerCase() === fullEmail.toLowerCase())) {
      setInviteError(`A user with email ${fullEmail} already exists`);
      return;
    }

    const nameParts = inviteName.trim().split(" ");
    const initials =
      nameParts.length > 1
        ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
        : inviteName.slice(0, 2).toUpperCase();

    const colors = [
      "from-indigo-600 to-indigo-800",
      "from-emerald-600 to-teal-700",
      "from-amber-600 to-orange-700",
      "from-purple-600 to-indigo-700",
      "from-cyan-600 to-blue-700",
    ];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    const newUser: BigCityUser = {
      id: `usr-${Date.now()}`,
      name: inviteName.trim(),
      email: fullEmail,
      role: inviteRole,
      department: inviteDepartment.trim() || "General Operations",
      status: "invited",
      assignedCampaigns: ["New BigCity Campaign Assignment"],
      lastActive: "Just invited",
      initials,
      avatarColor,
    };

    setUsers((prev) => {
      const next = [newUser, ...prev];
      if (onUserCountChange) onUserCountChange(next.length);
      return next;
    });

    setIsInviteModalOpen(false);
    setInviteName("");
    setInviteEmailPrefix("");
    setInviteRole("Project Manager");
    setInviteDepartment("Campaign Operations");
    showToast(`Invited ${newUser.name} as ${newUser.role} (@bigcity.in)`);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] overflow-y-auto antialiased">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white shadow-xl text-xs font-semibold border border-slate-800"
          >
            <CheckCircle size={16} weight="fill" className="text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <div className="max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Users & Roles
              </h1>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 border border-slate-300">
                BigCity Domain Only
              </span>
            </div>
            <p className="text-[13px] text-slate-600 mt-1">
              Visual hierarchy and role governance for BigCity Promotions enterprise workspace.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setIsHierarchyModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors border border-slate-200 shadow-2xs text-xs font-semibold cursor-pointer"
            >
              <TreeStructure size={16} weight="bold" className="text-indigo-600" />
              <span>Role Hierarchy Tree</span>
            </button>

            <button
              type="button"
              onClick={() => setIsInviteModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs text-xs font-semibold transition-all cursor-pointer"
            >
              <UserPlus size={16} weight="bold" />
              <span>Invite BigCity User</span>
            </button>
          </div>
        </div>

        {/* 3-Tier Visual Role Hierarchy Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["Admin", "Project Manager", "Legal"] as RoleType[]).map((roleKey) => {
            const config = ROLE_CONFIG[roleKey];
            const Icon = config.icon;
            const isSelected = selectedRoleFilter === roleKey;

            return (
              <motion.div
                key={roleKey}
                whileHover={{ y: -2 }}
                onClick={() =>
                  setSelectedRoleFilter(isSelected ? "All" : roleKey)
                }
                className={`relative p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
                  config.cardBg
                } ${
                  isSelected
                    ? `${config.cardBorder} ring-2 ring-indigo-500/20 shadow-md`
                    : "border-slate-200/90 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-2xs ${config.badgeBg} ${config.badgeBorder} ${config.color}`}
                  >
                    <Icon size={22} weight="duotone" />
                  </div>
                  <span
                    className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border ${config.badgeBg} ${config.badgeBorder} ${config.badgeText}`}
                  >
                    {counts[roleKey === "Admin" ? "admin" : roleKey === "Project Manager" ? "pm" : "legal"]} Members
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-bold text-slate-900">
                      {config.title}
                    </h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 border border-slate-200">
                      L{config.levelNumber}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
                    {config.level}
                  </p>
                  <p className="text-[12px] text-slate-600 mt-2 leading-relaxed">
                    {config.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 space-y-1.5">
                  {config.keyPermissions.slice(0, 2).map((perm, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 text-[11px] text-slate-700"
                    >
                      <CheckCircle
                        size={13}
                        weight="fill"
                        className={config.color}
                      />
                      <span className="truncate">{perm}</span>
                    </div>
                  ))}
                </div>

                {isSelected && (
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-indigo-600">
                    <span>Filtering by {config.title}</span>
                    <span className="text-slate-400 font-normal">(Click to clear)</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Expandable Permissions Matrix Toggle */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <SlidersHorizontal size={17} weight="bold" />
              </div>
              <div>
                <h3 className="text-[13.5px] font-bold text-slate-900">
                  Role Capabilities & Governance Matrix
                </h3>
                <p className="text-[11.5px] text-slate-500">
                  Visual mapping of feature access across Admin, Project Manager, and Legal roles
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPermissionsMatrix(!showPermissionsMatrix)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/70 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <span>{showPermissionsMatrix ? "Hide Matrix" : "View Matrix"}</span>
              <CaretDown
                size={13}
                className={`transition-transform duration-200 ${
                  showPermissionsMatrix ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          <AnimatePresence>
            {showPermissionsMatrix && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-slate-100 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3 rounded-l-lg">BCP Module</th>
                        <th className="py-2.5 px-3">Scope & Capability</th>
                        <th className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 text-indigo-700">
                            <Crown size={12} weight="fill" /> Admin
                          </span>
                        </th>
                        <th className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <Briefcase size={12} weight="fill" /> PM
                          </span>
                        </th>
                        <th className="py-2.5 px-3 text-center rounded-r-lg">
                          <span className="inline-flex items-center gap-1 text-amber-700">
                            <Scales size={12} weight="fill" /> Legal
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {PERMISSION_MATRIX.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {row.module}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{row.capability}</td>
                          <td className="py-2.5 px-3 text-center">
                            {row.admin ? (
                              <CheckCircle
                                size={16}
                                weight="fill"
                                className="text-emerald-600 mx-auto"
                              />
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {row.pm ? (
                              <CheckCircle
                                size={16}
                                weight="fill"
                                className="text-emerald-600 mx-auto"
                              />
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {row.legal ? (
                              <CheckCircle
                                size={16}
                                weight="fill"
                                className="text-emerald-600 mx-auto"
                              />
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Directory Search & Filter Controls */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
              {(["All", "Admin", "Project Manager", "Legal"] as const).map(
                (tab) => {
                  const isSelected = selectedRoleFilter === tab;
                  const count =
                    tab === "All"
                      ? counts.all
                      : tab === "Admin"
                      ? counts.admin
                      : tab === "Project Manager"
                      ? counts.pm
                      : counts.legal;

                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setSelectedRoleFilter(tab)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        isSelected
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span>{tab}</span>
                      <span
                        className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          isSelected
                            ? "bg-slate-900 text-white"
                            : "bg-slate-200/80 text-slate-600"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                }
              )}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:max-w-xs">
              <MagnifyingGlass
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search by name, email, or campaign..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* User Table */}
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10.5px] bg-slate-50/50">
                  <th className="py-3 px-4">BigCity User</th>
                  <th className="py-3 px-3">Role & Hierarchy</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Assigned Scope / Campaigns</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      <Users size={32} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-semibold text-slate-600">No users match the filter</p>
                      <p className="text-xs text-slate-400 mt-0.5">Try searching with a different keyword</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const roleConfig = ROLE_CONFIG[user.role];
                    const RoleIcon = roleConfig.icon;
                    const isDropdownOpen = activeRoleDropdownId === user.id;

                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* User Details */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${user.avatarColor} text-white flex items-center justify-center font-bold text-xs shadow-2xs flex-shrink-0`}
                            >
                              {user.initials}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate">
                                {user.name}
                              </span>
                              <span className="text-slate-500 font-mono text-[11px] block truncate">
                                {user.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Role with Interactive Dropdown */}
                        <td className="py-3 px-3">
                          <div className="relative inline-block">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveRoleDropdownId(
                                  isDropdownOpen ? null : user.id
                                )
                              }
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${roleConfig.badgeBg} ${roleConfig.badgeBorder} ${roleConfig.badgeText} hover:brightness-95`}
                              title="Click to assign a different role"
                            >
                              <RoleIcon size={13} weight="duotone" />
                              <span>{user.role}</span>
                              <CaretDown size={11} className="opacity-60" />
                            </button>

                            {/* Dropdown Menu */}
                            <AnimatePresence>
                              {isDropdownOpen && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                                  transition={{ duration: 0.12 }}
                                  className="absolute left-0 top-full mt-1 w-48 rounded-xl bg-white border border-slate-200 shadow-xl p-1 z-30 space-y-0.5"
                                >
                                  <div className="px-2 py-1 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                                    Assign Role
                                  </div>
                                  {(["Admin", "Project Manager", "Legal"] as RoleType[]).map((r) => {
                                    const optConfig = ROLE_CONFIG[r];
                                    const OptIcon = optConfig.icon;
                                    const isCurrent = user.role === r;

                                    return (
                                      <button
                                        key={r}
                                        type="button"
                                        onClick={() => handleRoleChange(user.id, r)}
                                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                                          isCurrent
                                            ? `${optConfig.badgeBg} ${optConfig.badgeText}`
                                            : "text-slate-700 hover:bg-slate-100"
                                        }`}
                                      >
                                        <div className="flex items-center gap-1.5">
                                          <OptIcon size={14} weight="duotone" className={optConfig.color} />
                                          <span>{r}</span>
                                        </div>
                                        {isCurrent && <Check size={12} weight="bold" />}
                                      </button>
                                    );
                                  })}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="py-3 px-3 font-medium text-slate-700">
                          {user.department}
                        </td>

                        {/* Assigned Scope / Campaigns */}
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {user.assignedCampaigns.map((c, i) => (
                              <span
                                key={i}
                                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 truncate"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3">
                          {user.status === "active_now" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Active now
                            </span>
                          ) : user.status === "active" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                              <Clock size={11} /> {user.lastActive}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <Envelope size={11} /> Invited
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRevokeUser(user.id, user.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Revoke User Access"
                          >
                            <Trash size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Invite BigCity User Modal */}
      <AnimatePresence>
        {isInviteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInviteModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 z-10 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <UserPlus size={20} weight="bold" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Invite BigCity Team Member
                    </h3>
                    <p className="text-xs text-slate-500">
                      Assign role and permissions on the BigCity domain
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleInviteSubmit} className="mt-5 space-y-4">
                {inviteError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                    <Info size={16} weight="bold" className="flex-shrink-0" />
                    <span>{inviteError}</span>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Deepika Sengupta"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
                  />
                </div>

                {/* Email with BigCity domain tag */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    BigCity Email Address
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      required
                      placeholder="deepika.sengupta"
                      value={inviteEmailPrefix}
                      onChange={(e) => setInviteEmailPrefix(e.target.value)}
                      className="w-full pl-3.5 pr-28 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono text-slate-900"
                    />
                    <span className="absolute right-2 px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-[11px] font-semibold">
                      @bigcity.in
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Domain restricted to authorized BigCity Promotions team members.
                  </span>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Department / Business Unit
                  </label>
                  <select
                    value={inviteDepartment}
                    onChange={(e) => setInviteDepartment(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
                  >
                    <option value="Campaign Operations">Campaign Operations</option>
                    <option value="Consumer Electronics">Consumer Electronics</option>
                    <option value="FMCG Brand Campaigns">FMCG Brand Campaigns</option>
                    <option value="Platforms & OTP Gateways">Platforms & OTP Gateways</option>
                    <option value="Legal & Regulatory Affairs">Legal & Regulatory Affairs</option>
                    <option value="Enterprise Architecture & SOW">Enterprise Architecture & SOW</option>
                    <option value="Vendor & Reward Operations">Vendor & Reward Operations</option>
                  </select>
                </div>

                {/* Role Selectable Radio Cards */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Assign Role
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {(["Admin", "Project Manager", "Legal"] as RoleType[]).map((r) => {
                      const cfg = ROLE_CONFIG[r];
                      const Icon = cfg.icon;
                      const isChecked = inviteRole === r;

                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setInviteRole(r)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            isChecked
                              ? `${cfg.cardBg} ${cfg.cardBorder} ring-2 ring-indigo-500/20 shadow-xs`
                              : "bg-slate-50 border-slate-200 hover:bg-slate-100/70"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <Icon
                              size={17}
                              weight="duotone"
                              className={isChecked ? cfg.color : "text-slate-400"}
                            />
                            {isChecked && (
                              <CheckCircle
                                size={14}
                                weight="fill"
                                className="text-indigo-600"
                              />
                            )}
                          </div>
                          <span className="text-xs font-bold text-slate-900 block truncate">
                            {r}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            L{cfg.levelNumber}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Actions */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/70 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    Send Invitation
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Role Hierarchy Visual Tree Modal */}
      <AnimatePresence>
        {isHierarchyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHierarchyModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 z-10 overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <TreeStructure size={20} weight="bold" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      BigCity Governance Hierarchy
                    </h3>
                    <p className="text-xs text-slate-500">
                      Organizational relationship & decision escalation model
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHierarchyModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Hierarchy Tree Visualization */}
              <div className="py-6 space-y-6">
                {/* Level 1: Admin */}
                <div className="flex flex-col items-center">
                  <div className="w-full max-w-sm p-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md border border-indigo-400 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold flex-shrink-0">
                      <Crown size={20} weight="fill" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">Admin (Level 1)</span>
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-white/20">
                          Apex Authority
                        </span>
                      </div>
                      <p className="text-[11px] text-indigo-100">
                        SOW policy overrides, budget expansion, full system governance
                      </p>
                    </div>
                  </div>

                  {/* Branch Line */}
                  <div className="w-0.5 h-6 bg-slate-300"></div>
                  <div className="w-64 h-0.5 bg-slate-300"></div>
                  <div className="flex justify-between w-64">
                    <div className="w-0.5 h-6 bg-slate-300"></div>
                    <div className="w-0.5 h-6 bg-slate-300"></div>
                  </div>
                </div>

                {/* Level 2: PM & Legal */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Project Manager */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-slate-900 shadow-2xs">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                        <Briefcase size={16} weight="fill" />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">
                          Project Manager (L2)
                        </span>
                        <span className="text-[10px] text-emerald-700 font-semibold">
                          Operations & Execution
                        </span>
                      </div>
                    </div>
                    <ul className="text-[11px] text-slate-600 space-y-1 pl-1">
                      <li>• 34 SOP Milestone Task Tracking</li>
                      <li>• Zoho CRM Deals & Milestones</li>
                      <li>• High-Volume OTP Fallbacks</li>
                    </ul>
                  </div>

                  {/* Legal */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-slate-900 shadow-2xs">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center flex-shrink-0">
                        <Scales size={16} weight="fill" />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">
                          Legal Counsel (L2)
                        </span>
                        <span className="text-[10px] text-amber-700 font-semibold">
                          Compliance & Risk
                        </span>
                      </div>
                    </div>
                    <ul className="text-[11px] text-slate-600 space-y-1 pl-1">
                      <li>• SOW Policy Guardrail Review</li>
                      <li>• Prize Pool Indemnity Audit</li>
                      <li>• Mandatory Sign-Off Checkpoints</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsHierarchyModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                >
                  Close Hierarchy
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
