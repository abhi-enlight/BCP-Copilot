import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface AspectTask {
  id: string;
  sopCode: string;
  title: string;
  aspect: "legal" | "compliance" | "accounting" | "implementation";
  assignee: string;
  role: string;
  urgency: "HIGHEST" | "HIGH" | "MEDIUM" | "NORMAL";
  tat: string;
  status: "COMPLETED" | "IN_PROGRESS" | "PENDING_APPROVAL" | "PENDING_INPUT" | "PENDING_SIGN_OFF";
  zohoTaskId?: string;
  zohoTaskStatus?: "Open" | "In Progress" | "Under Review" | "Closed";
  details: string;
  verificationRequirement: string;
  dependencies?: string[];
  mandatoryGate: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  client: string;
  category: "FMCG" | "Beverages" | "Retail" | "Electronics" | "BFSI" | "QSR";
  rewardType: "Cashback" | "EGV" | "Scratch & Win" | "Merchandise";
  budget: string;
  budgetNumeric: number;
  codeVolume: string;
  codeVolumeNumeric: number;
  startDate: string;
  endDate: string;
  status: "Draft" | "Planning" | "In Review" | "Approved" | "Live in Zoho Projects";
  completionRate: number;
  zohoProjectId?: string;
  zohoProjectUrl?: string;
  zohoSyncStatus?: "Synced" | "Pending" | "Writing" | "Failed";
  lastZohoSync?: string;
  brief: string;
  aspectSummary: {
    legal: { total: number; done: number; status: "Approved" | "In Review" | "Pending" };
    compliance: { total: number; done: number; status: "Approved" | "In Review" | "Pending" };
    accounting: { total: number; done: number; status: "Approved" | "In Review" | "Pending" };
    implementation: { total: number; done: number; status: "Approved" | "In Review" | "Pending" };
  };
  tasks: AspectTask[];
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

// Initial robust seed data with realistic BigCity campaigns
export const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: "camp-001",
    name: "Coca-Cola Summer Splash ₹50 Assured Cashback",
    client: "Coca-Cola India Pvt Ltd",
    category: "Beverages",
    rewardType: "Cashback",
    budget: "₹45,00,000",
    budgetNumeric: 4500000,
    codeVolume: "500,000 packs",
    codeVolumeNumeric: 500000,
    startDate: "2026-09-01",
    endDate: "2026-11-30",
    status: "Live in Zoho Projects",
    completionRate: 88,
    zohoProjectId: "ZP-881290",
    zohoProjectUrl: "https://projects.zoho.in/portal/bigcity#project/881290",
    zohoSyncStatus: "Synced",
    lastZohoSync: "2 mins ago",
    brief: "National on-pack promotion across 500ml & 750ml PET bottles offering ₹50 instant UPI cashback upon entering unique code on microsite.",
    aspectSummary: {
      legal: { total: 4, done: 4, status: "Approved" },
      compliance: { total: 4, done: 4, status: "Approved" },
      accounting: { total: 3, done: 3, status: "Approved" },
      implementation: { total: 5, done: 3, status: "In Review" },
    },
    createdAt: "2026-08-15T10:30:00Z",
    approvedAt: "2026-08-18T14:20:00Z",
    approvedBy: "Rohit Sharma (Admin)",
    tasks: [
      {
        id: "task-001-1",
        sopCode: "SOP-LEG-01",
        title: "T&C Drafting & Disclaimer for UPI Instant Cashback",
        aspect: "legal",
        assignee: "Prashant Mittal",
        role: "Legal Head",
        urgency: "HIGHEST",
        tat: "2 Days",
        status: "COMPLETED",
        zohoTaskId: "ZP-T-553011",
        zohoTaskStatus: "Closed",
        details: "Include maximum 1 redemption per mobile number/UPI VPA rule and state jurisdiction clauses.",
        verificationRequirement: "Written legal sign-off on microsite T&C copy.",
        mandatoryGate: true,
      },
      {
        id: "task-001-2",
        sopCode: "SOP-LEG-02",
        title: "NPCI / Payment Aggregator Compliance & Indemnity",
        aspect: "legal",
        assignee: "Aakash Verma",
        role: "Legal Associate",
        urgency: "HIGH",
        tat: "3 Days",
        status: "COMPLETED",
        zohoTaskId: "ZP-T-553012",
        zohoTaskStatus: "Closed",
        details: "Review PayU/Razorpay UPI payout agreement and client indemnification clauses.",
        verificationRequirement: "Partner payment gateway sign-off.",
        mandatoryGate: true,
      },
      {
        id: "task-001-3",
        sopCode: "SOP-CMP-01",
        title: "TRAI / DLT Header & Consent Template Whitelisting",
        aspect: "compliance",
        assignee: "Khaleel Ahmed",
        role: "Compliance SPOC",
        urgency: "HIGHEST",
        tat: "2 Days",
        status: "COMPLETED",
        zohoTaskId: "ZP-T-553013",
        zohoTaskStatus: "Closed",
        details: "Register 'COKEIN' SMS header and OTP verification message body on Airtel/Jio DLT portals.",
        verificationRequirement: "DLT template approval ID screenshot.",
        mandatoryGate: true,
      },
      {
        id: "task-001-4",
        sopCode: "SOP-CMP-02",
        title: "Bot & Velocity Protection (Max 3 attempts/min per IP)",
        aspect: "compliance",
        assignee: "Sachin (Tech Team)",
        role: "Security Lead",
        urgency: "HIGH",
        tat: "1 Day",
        status: "COMPLETED",
        zohoTaskId: "ZP-T-553014",
        zohoTaskStatus: "Closed",
        details: "Configure Cloudflare Turnstile captcha and redis rate-limiting for redemption endpoint.",
        verificationRequirement: "Security penetration & stress test sign-off.",
        mandatoryGate: false,
      },
      {
        id: "task-001-5",
        sopCode: "SOP-ACC-01",
        title: "100% Advance Payment Verification in Zoho Books for UPI Pool",
        aspect: "accounting",
        assignee: "Sneha Nair",
        role: "Finance Lead",
        urgency: "HIGHEST",
        tat: "1 Day",
        status: "COMPLETED",
        zohoTaskId: "ZP-T-553015",
        zohoTaskStatus: "Closed",
        details: "Verify ₹45,00,000 advance escrow deposit credited before funding payout wallet.",
        verificationRequirement: "Zoho Books Receipt voucher #ZB-RC-8819.",
        mandatoryGate: true,
      },
      {
        id: "task-001-6",
        sopCode: "SOP-IMP-01",
        title: "500k Unique Alphanumeric Cryptographic Code Generation",
        aspect: "implementation",
        assignee: "Khaleel Ahmed",
        role: "Ops Lead",
        urgency: "HIGHEST",
        tat: "2 Days",
        status: "COMPLETED",
        zohoTaskId: "ZP-T-553016",
        zohoTaskStatus: "Closed",
        details: "Generate 500k 10-char alphanumeric codes with SHA-256 validation hashes for printer.",
        verificationRequirement: "Ops cryptographic checksum verification.",
        mandatoryGate: true,
      },
      {
        id: "task-001-7",
        sopCode: "SOP-IMP-02",
        title: "Dedicated High-Traffic AWS Server Provisioning",
        aspect: "implementation",
        assignee: "Sachin (Tech Team)",
        role: "Cloud Architect",
        urgency: "HIGH",
        tat: "2 Days",
        status: "IN_PROGRESS",
        zohoTaskId: "ZP-T-553017",
        zohoTaskStatus: "In Progress",
        details: "Provision auto-scaling cluster capable of handling 8,000 concurrent req/sec during IPL TV commercials.",
        verificationRequirement: "Load test report (JMeter / k6).",
        mandatoryGate: true,
      },
    ],
  },
  {
    id: "camp-002",
    name: "Britannia Marie Gold ₹100 Swiggy Voucher Assured Reward",
    client: "Britannia Industries Ltd",
    category: "FMCG",
    rewardType: "EGV",
    budget: "₹30,00,000",
    budgetNumeric: 3000000,
    codeVolume: "300,000 packs",
    codeVolumeNumeric: 300000,
    startDate: "2026-09-15",
    endDate: "2026-12-15",
    status: "Live in Zoho Projects",
    completionRate: 65,
    zohoProjectId: "ZP-881291",
    zohoProjectUrl: "https://projects.zoho.in/portal/bigcity#project/881291",
    zohoSyncStatus: "Synced",
    lastZohoSync: "15 mins ago",
    brief: "Consumer promo offering assured ₹100 Swiggy discount voucher with every 250g family pack of Britannia Marie Gold.",
    aspectSummary: {
      legal: { total: 3, done: 3, status: "Approved" },
      compliance: { total: 3, done: 2, status: "In Review" },
      accounting: { total: 3, done: 3, status: "Approved" },
      implementation: { total: 4, done: 1, status: "In Review" },
    },
    createdAt: "2026-08-20T11:00:00Z",
    approvedAt: "2026-08-22T09:45:00Z",
    approvedBy: "Rohit Sharma (Admin)",
    tasks: [
      {
        id: "task-002-1",
        sopCode: "SOP-LEG-03",
        title: "Swiggy Brand Logo Written Consent & Usage Agreement",
        aspect: "legal",
        assignee: "Prashant Mittal",
        role: "Legal Head",
        urgency: "HIGHEST",
        tat: "3 Days",
        status: "COMPLETED",
        zohoTaskId: "ZP-T-553021",
        zohoTaskStatus: "Closed",
        details: "Obtain formal partner consent email before on-pack sticker printing run. Mandatory compliance gate.",
        verificationRequirement: "Swiggy Brand Marketing SPOC approval email.",
        mandatoryGate: true,
      },
      {
        id: "task-002-2",
        sopCode: "SOP-ACC-01",
        title: "100% Advance Payment Confirmation in Zoho Books for Swiggy EGVs",
        aspect: "accounting",
        assignee: "Sneha Nair",
        role: "Finance Lead",
        urgency: "HIGHEST",
        tat: "1 Day",
        status: "COMPLETED",
        zohoTaskId: "ZP-T-553022",
        zohoTaskStatus: "Closed",
        details: "Confirm advance payment before placing official EGV PO with Swiggy corporate voucher desk.",
        verificationRequirement: "Bank statement reconciliation & Zoho invoice match.",
        mandatoryGate: true,
      },
      {
        id: "task-002-3",
        sopCode: "SOP-IMP-03",
        title: "Microsite Testing - Dual-Gateway Karix / Gupshup Setup",
        aspect: "implementation",
        assignee: "Sachin (Tech Team)",
        role: "Tech Lead",
        urgency: "HIGHEST",
        tat: "2 Days",
        status: "IN_PROGRESS",
        zohoTaskId: "ZP-T-553023",
        zohoTaskStatus: "In Progress",
        details: "Configure primary Karix route with automatic fallback to Gupshup if latency exceeds 400ms.",
        verificationRequirement: "Automated failover drill log.",
        mandatoryGate: true,
      },
    ],
  },
  {
    id: "camp-003",
    name: "ITC Sunfeast Dark Fantasy Scratch & Win Gold Coin",
    client: "ITC Limited",
    category: "FMCG",
    rewardType: "Scratch & Win",
    budget: "₹65,00,000",
    budgetNumeric: 6500000,
    codeVolume: "1,000,000 packs",
    codeVolumeNumeric: 1000000,
    startDate: "2026-10-01",
    endDate: "2026-12-31",
    status: "In Review",
    completionRate: 40,
    zohoProjectId: "ZP-881292",
    zohoProjectUrl: "https://projects.zoho.in/portal/bigcity#project/881292",
    zohoSyncStatus: "Pending",
    lastZohoSync: "1 hour ago",
    brief: "Festive scratch card promotion inside packs: 1,000 1g Gold Coins + 500,000 ₹30 Amazon Pay balance rewards.",
    aspectSummary: {
      legal: { total: 4, done: 2, status: "In Review" },
      compliance: { total: 4, done: 1, status: "In Review" },
      accounting: { total: 3, done: 2, status: "In Review" },
      implementation: { total: 5, done: 1, status: "Pending" },
    },
    createdAt: "2026-08-24T14:15:00Z",
    tasks: [],
  },
  {
    id: "camp-004",
    name: "Nestlé Munch Super League Assured Reward",
    client: "Nestlé India",
    category: "FMCG",
    rewardType: "Merchandise",
    budget: "₹20,00,000",
    budgetNumeric: 2000000,
    codeVolume: "200,000 packs",
    codeVolumeNumeric: 200000,
    startDate: "2026-10-15",
    endDate: "2027-01-15",
    status: "Draft",
    completionRate: 15,
    zohoProjectId: "ZP-881293",
    zohoProjectUrl: "https://projects.zoho.in/portal/bigcity#project/881293",
    zohoSyncStatus: "Pending",
    brief: "Gamified cricket season promo with custom merchandise vouchers and jersey rewards.",
    aspectSummary: {
      legal: { total: 3, done: 0, status: "Pending" },
      compliance: { total: 3, done: 0, status: "Pending" },
      accounting: { total: 3, done: 0, status: "Pending" },
      implementation: { total: 4, done: 0, status: "Pending" },
    },
    createdAt: "2026-08-25T16:00:00Z",
    tasks: [],
  },
];

// Helper to generate full realistic aspect decomposition tasks based on campaign input
export function generateAspectPlan(campaignInput: {
  name: string;
  client: string;
  category: string;
  rewardType: string;
  budget: string;
  codeVolume: string;
  startDate: string;
  endDate: string;
  brief: string;
}): { tasks: AspectTask[]; aspectSummary: Campaign["aspectSummary"] } {
  const isCashback = campaignInput.rewardType === "Cashback";
  const isVoucher = campaignInput.rewardType === "EGV";
  const isScratch = campaignInput.rewardType === "Scratch & Win";

  const partnerName = isVoucher ? "Swiggy / Zomato / Amazon" : "NPCI / Razorpay / UPI";

  const tasks: AspectTask[] = [
    // --- 1. LEGAL ASPECT ---
    {
      id: `task-${Date.now()}-1`,
      sopCode: "SOP-LEG-01",
      title: "Terms & Conditions Drafting & Legal Clearance",
      aspect: "legal",
      assignee: "Prashant Mittal",
      role: "Legal Head",
      urgency: "HIGHEST",
      tat: "2 Days",
      status: "IN_PROGRESS",
      zohoTaskId: `ZP-T-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoTaskStatus: "In Progress",
      details: `Compile full T&C covering eligibility, validity (${campaignInput.startDate} to ${campaignInput.endDate}), 1 claim per user cap, and dispute resolution jurisdiction.`,
      verificationRequirement: "Signed Legal SOW Clearance Doc.",
      mandatoryGate: true,
    },
    {
      id: `task-${Date.now()}-2`,
      sopCode: "SOP-LEG-02",
      title: `${partnerName} Written Logo & Brand IP Approvals`,
      aspect: "legal",
      assignee: "Aakash Verma",
      role: "Legal Counsel",
      urgency: "HIGHEST",
      tat: "3 Days",
      status: "PENDING_APPROVAL",
      zohoTaskId: `ZP-T-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoTaskStatus: "Open",
      details: "Obtain formal partner consent emails before printing brand logos on on-pack packaging or POSM collaterals.",
      verificationRequirement: "Partner written consent email chain attached to Zoho Deal.",
      mandatoryGate: true,
    },
    {
      id: `task-${Date.now()}-3`,
      sopCode: "SOP-LEG-03",
      title: "Consumer Protection Act & Lottery Prohibition Audit",
      aspect: "legal",
      assignee: "Prashant Mittal",
      role: "Legal Head",
      urgency: "HIGH",
      tat: "2 Days",
      status: "IN_PROGRESS",
      zohoTaskId: `ZP-T-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoTaskStatus: "In Progress",
      details: "Verify that mechanics adhere to Tamil Nadu & state-specific prize competition statutory guidelines.",
      verificationRequirement: "State compliance legal memo sign-off.",
      mandatoryGate: true,
    },

    // --- 2. COMPLIANCE ASPECT ---
    {
      id: `task-${Date.now()}-4`,
      sopCode: "SOP-CMP-01",
      title: "TRAI / DLT SMS Header & Template Approval",
      aspect: "compliance",
      assignee: "Khaleel Ahmed",
      role: "Compliance SPOC",
      urgency: "HIGHEST",
      tat: "2 Days",
      status: "IN_PROGRESS",
      zohoTaskId: `ZP-T-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoTaskStatus: "In Progress",
      details: `Whitelist Principal Entity ID, registered SMS Header and OTP/Reward message templates on Vilpower/Jio DLT.`,
      verificationRequirement: "DLT Portal Approval ID.",
      mandatoryGate: true,
    },
    {
      id: `task-${Date.now()}-5`,
      sopCode: "SOP-CMP-02",
      title: "Fraud Prevention & Mobile Velocity Cap Configuration",
      aspect: "compliance",
      assignee: "Sachin (Tech Team)",
      role: "Security Lead",
      urgency: "HIGH",
      tat: "1 Day",
      status: "IN_PROGRESS",
      zohoTaskId: `ZP-T-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoTaskStatus: "In Progress",
      details: "Enforce strict per-mobile limit (Max 2 claims total), device fingerprinting, and blacklisted VOIP prefix filter.",
      verificationRequirement: "Rule engine test log.",
      mandatoryGate: false,
    },
    {
      id: `task-${Date.now()}-6`,
      sopCode: "SOP-CMP-03",
      title: "72-Hour Pre-Launch Staging UAT Sign-Off",
      aspect: "compliance",
      assignee: "Khaleel Ahmed",
      role: "Compliance SPOC",
      urgency: "HIGHEST",
      tat: "3 Days",
      status: "PENDING_SIGN_OFF",
      zohoTaskId: `ZP-T-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoTaskStatus: "Open",
      details: "Execute 50-number multi-device end-to-end redemption test run across Airtel, Jio, and Vi networks 72h prior to Go-Live.",
      verificationRequirement: "Signed UAT Test Matrix.",
      mandatoryGate: true,
    },

    // --- 3. ACCOUNTING ASPECT ---
    {
      id: `task-${Date.now()}-7`,
      sopCode: "SOP-ACC-01",
      title: "100% Advance Payment Verification in Zoho Books",
      aspect: "accounting",
      assignee: "Sneha Nair",
      role: "Finance Lead",
      urgency: "HIGHEST",
      tat: "1 Day",
      status: "COMPLETED",
      zohoTaskId: `ZP-T-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoTaskStatus: "Closed",
      details: `Verify client deposit of ${campaignInput.budget} in BigCity escrow before PO issuance to voucher/UPI inventory desk.`,
      verificationRequirement: "Zoho Books Bank Credit Reconciliation Voucher.",
      mandatoryGate: true,
    },
    {
      id: `task-${Date.now()}-8`,
      sopCode: "SOP-ACC-02",
      title: "Estimate & SOW Commercial Sign-Off with Client",
      aspect: "accounting",
      assignee: "Rohit Sharma",
      role: "Admin / Commercial Head",
      urgency: "HIGH",
      tat: "2 Days",
      status: "COMPLETED",
      zohoTaskId: `ZP-T-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoTaskStatus: "Closed",
      details: "Check management fees, GST breakdown, SMS cost per unit, and printer logistics in Zoho CRM Estimate.",
      verificationRequirement: "Signed Client Purchase Order (PO).",
      mandatoryGate: true,
    },
    {
      id: `task-${Date.now()}-9`,
      sopCode: "SOP-ACC-03",
      title: "TDS / Section 194B Tax Ledger Setup",
      aspect: "accounting",
      assignee: "Sneha Nair",
      role: "Finance Lead",
      urgency: "NORMAL",
      tat: "2 Days",
      status: "IN_PROGRESS",
      zohoTaskId: `ZP-T-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoTaskStatus: "In Progress",
      details: "Configure automated PAN verification & 30% TDS deduction workflow for any individual reward values above ₹10,000.",
      verificationRequirement: "Zoho Books Tax Chart of Accounts entry.",
      mandatoryGate: false,
    },

    // --- 4. IMPLEMENTATION ASPECT ---
    {
      id: `task-${Date.now()}-10`,
      sopCode: "SOP-IMP-01",
      title: "Cryptographic Unique Code Batch Generation & Checksum",
      aspect: "implementation",
      assignee: "Khaleel Ahmed",
      role: "Ops Lead",
      urgency: "HIGHEST",
      tat: "2 Days",
      status: "IN_PROGRESS",
      zohoTaskId: `ZP-T-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoTaskStatus: "In Progress",
      details: `Generate ${campaignInput.codeVolume} unique 10-character alphanumeric cryptographic codes and verify printer bleed margins.`,
      verificationRequirement: "SHA-256 hash export sign-off.",
      mandatoryGate: true,
    },
    {
      id: `task-${Date.now()}-11`,
      sopCode: "SOP-IMP-02",
      title: "Microsite Deployment, Custom Domain & SSL Provisioning",
      aspect: "implementation",
      assignee: "Sachin (Tech Team)",
      role: "Tech Lead",
      urgency: "HIGH",
      tat: "3 Days",
      status: "IN_PROGRESS",
      zohoTaskId: `ZP-T-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoTaskStatus: "In Progress",
      details: "Deploy responsive mobile-first redemption portal with BigCity CDN, web analytics, and client brand assets.",
      verificationRequirement: "Staging URL live with green SSL cert.",
      mandatoryGate: true,
    },
    {
      id: `task-${Date.now()}-12`,
      sopCode: "SOP-IMP-03",
      title: "Dual-Gateway Karix / Gupshup Failover Setup",
      aspect: "implementation",
      assignee: "Sachin (Tech Team)",
      role: "Tech Lead",
      urgency: "HIGHEST",
      tat: "1 Day",
      status: "IN_PROGRESS",
      zohoTaskId: `ZP-T-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoTaskStatus: "In Progress",
      details: "Configure primary Karix route with automatic fallback to Gupshup if SMS latency exceeds 400ms.",
      verificationRequirement: "Automated gateway failover drill test pass.",
      mandatoryGate: true,
    },
    {
      id: `task-${Date.now()}-13`,
      sopCode: "SOP-IMP-04",
      title: "Automated MIS Cadence & Zoho Projects Query Tracker",
      aspect: "implementation",
      assignee: "Khaleel Ahmed",
      role: "Ops Lead",
      urgency: "NORMAL",
      tat: "2 Days",
      status: "IN_PROGRESS",
      zohoTaskId: `ZP-T-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoTaskStatus: "In Progress",
      details: "Set up daily 09:00 AM automated email MIS to client brand manager and configure support ticketing pipeline.",
      verificationRequirement: "Specimen MIS template approved by CS Head.",
      mandatoryGate: false,
    },
  ];

  return {
    tasks,
    aspectSummary: {
      legal: { total: 3, done: 0, status: "In Review" },
      compliance: { total: 3, done: 0, status: "In Review" },
      accounting: { total: 3, done: 2, status: "In Review" },
      implementation: { total: 4, done: 0, status: "In Review" },
    },
  };
}

// In-memory store initialized with INITIAL_CAMPAIGNS
let campaignsDatabase = [...INITIAL_CAMPAIGNS];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const id = searchParams.get("id");

  // Read single campaign details or all campaigns
  if (action === "get_campaign" && id) {
    const campaign = campaignsDatabase.find((c) => c.id === id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    return NextResponse.json({ campaign });
  }

  // Zoho Projects Read Demo: Read tasks directly from Zoho Projects representation
  if (action === "read_zoho_tasks" && id) {
    const campaign = campaignsDatabase.find((c) => c.id === id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({
      zohoProjectId: campaign.zohoProjectId || "ZP-881295",
      portal: "BigCity Promotions (Portal #81293)",
      syncTimestamp: new Date().toISOString(),
      tasks: campaign.tasks,
      metrics: {
        totalTasks: campaign.tasks.length,
        closedTasks: campaign.tasks.filter((t) => t.status === "COMPLETED").length,
        inProgressTasks: campaign.tasks.filter((t) => t.status === "IN_PROGRESS").length,
        pendingApproval: campaign.tasks.filter((t) => t.status.includes("PENDING")).length,
        readLatencyMs: Math.floor(28 + Math.random() * 25),
      },
    });
  }

  return NextResponse.json({ campaigns: campaignsDatabase });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Action 1: AI Aspect Decomposition & Project Plan Generation
    if (action === "generate_plan") {
      const { campaignInput } = body;
      if (!campaignInput || !campaignInput.name) {
        return NextResponse.json({ error: "Campaign data is required" }, { status: 400 });
      }

      const { tasks, aspectSummary } = generateAspectPlan(campaignInput);

      return NextResponse.json({
        success: true,
        plan: {
          tasks,
          aspectSummary,
          recommendedTAT: "12 Working Days",
          criticalPath: [
            "100% Advance Payment Verification in Zoho Books",
            "Third-Party Brand Logo Written Approval",
            "TRAI / DLT Header Whitelisting",
            "72-Hour Pre-Launch Staging UAT Sign-Off",
          ],
          totalEstimatedTasks: tasks.length,
        },
      });
    }

    // Action 2: Approve & Push to Zoho Projects (Write Operation)
    if (action === "approve_and_push_zoho") {
      const { campaignData, tasks } = body;

      const zohoIdNum = Math.floor(881295 + Math.random() * 1000);
      const zohoProjectId = `ZP-${zohoIdNum}`;
      const zohoProjectUrl = `https://projects.zoho.in/portal/bigcity#project/${zohoIdNum}`;

      const newCampaign: Campaign = {
        id: `camp-${Date.now()}`,
        name: campaignData.name,
        client: campaignData.client,
        category: (campaignData.category as any) || "FMCG",
        rewardType: (campaignData.rewardType as any) || "Cashback",
        budget: campaignData.budget || "₹25,00,000",
        budgetNumeric: parseFloat(String(campaignData.budget).replace(/[^0-9.]/g, "")) || 2500000,
        codeVolume: campaignData.codeVolume || "250,000 packs",
        codeVolumeNumeric: parseFloat(String(campaignData.codeVolume).replace(/[^0-9.]/g, "")) || 250000,
        startDate: campaignData.startDate || new Date().toISOString().split("T")[0],
        endDate: campaignData.endDate || new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
        status: "Live in Zoho Projects",
        completionRate: 20,
        zohoProjectId,
        zohoProjectUrl,
        zohoSyncStatus: "Synced",
        lastZohoSync: "Just now",
        brief: campaignData.brief || "AI-generated campaign project plan.",
        aspectSummary: {
          legal: { total: 3, done: 0, status: "In Review" },
          compliance: { total: 3, done: 0, status: "In Review" },
          accounting: { total: 3, done: 1, status: "In Review" },
          implementation: { total: 4, done: 0, status: "In Review" },
        },
        tasks: tasks || generateAspectPlan(campaignData).tasks,
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        approvedBy: "Rohit Sharma (Admin)",
      };

      // Add to database
      campaignsDatabase = [newCampaign, ...campaignsDatabase];

      return NextResponse.json({
        success: true,
        campaign: newCampaign,
        zohoWriteResult: {
          projectId: zohoProjectId,
          projectUrl: zohoProjectUrl,
          portalName: "BigCity Promotions Org (#81293)",
          milestonesCreated: 4,
          tasksCreated: newCampaign.tasks.length,
          apiDurationMs: 412,
          writeStatus: "SUCCESS_201_CREATED",
        },
      });
    }

    // Action 3: Zoho Projects Write Task Update (e.g. toggle status)
    if (action === "update_zoho_task") {
      const { campaignId, taskId, newStatus } = body;
      const campaign = campaignsDatabase.find((c) => c.id === campaignId);
      if (!campaign) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }

      const task = campaign.tasks.find((t) => t.id === taskId);
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      task.status = newStatus;
      if (newStatus === "COMPLETED") {
        task.zohoTaskStatus = "Closed";
      } else if (newStatus === "IN_PROGRESS") {
        task.zohoTaskStatus = "In Progress";
      }

      // Recompute completion rate
      const completed = campaign.tasks.filter((t) => t.status === "COMPLETED").length;
      campaign.completionRate = Math.round((completed / campaign.tasks.length) * 100);
      campaign.lastZohoSync = "Just now";

      return NextResponse.json({
        success: true,
        campaign,
        task,
        zohoUpdateResult: {
          taskId: task.zohoTaskId || "ZP-T-553099",
          zohoStatus: task.zohoTaskStatus,
          timestamp: new Date().toISOString(),
          status: "UPDATED",
        },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Campaign API error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
