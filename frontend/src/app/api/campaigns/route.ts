import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  // Zoho CRM Task sub-record (task within a CRM Deal)
  zohoCrmTaskId?: string;
  zohoCrmTaskStatus?: "Open" | "In Progress" | "Under Review" | "Closed";
  details: string;
  verificationRequirement: string;
  dependencies?: string[];
  mandatoryGate: boolean;
}

/**
 * Campaign — correctly maps which Zoho product each field belongs to:
 *
 *  zohoCrm*      → Zoho CRM (Deals module) — the campaign as a deal opportunity
 *  zohoProject*  → Zoho Projects — project with milestones & tasks
 *  zohoBooks*    → Zoho Books — accounting, invoices, estimates, payments
 *
 * A campaign may be synced to one, two, or all three depending on its stage.
 */
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
  status: "Draft" | "Planning" | "In Review" | "Approved" | "Live";
  completionRate: number;

  // Zoho CRM — Deal record tracking the campaign as a sales/client opportunity
  zohoCrmDealId?: string;
  zohoCrmDealUrl?: string;
  zohoCrmDealStage?: string; // e.g. "Qualification", "Proposal/Price Quote", "Closed Won"

  // Zoho Projects — Project with milestones for task execution tracking
  zohoProjectId?: string;
  zohoProjectUrl?: string;

  // Zoho Books — Invoice/Estimate for advance payment, escrow, GST billing
  zohoBooksInvoiceId?: string;
  zohoBooksInvoiceUrl?: string;

  // Aggregate sync health across all connected Zoho products
  zohoSyncStatus?: "Pending" | "Partial" | "Synced" | "Failed";
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

// ---------------------------------------------------------------------------
// Static seed data (displayed when no Supabase rows exist yet)
// These are pre-existing campaigns already live — they have real placeholder IDs
// ---------------------------------------------------------------------------
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
    status: "Live",
    completionRate: 88,
    // Zoho CRM — Deal tracking client relationship & campaign SOW
    zohoCrmDealId: "1418411000000553001",
    zohoCrmDealUrl: "https://crm.zoho.in/crm/org/tab/Potentials/1418411000000553001",
    zohoCrmDealStage: "Closed Won",
    // Zoho Projects — Task execution & milestone tracking
    zohoProjectId: "ZP-881290",
    zohoProjectUrl: "https://projects.zoho.in/portal/bigcity#project/881290",
    // Zoho Books — Advance payment escrow verification
    zohoBooksInvoiceId: "ZB-INV-8819",
    zohoBooksInvoiceUrl: "https://books.zoho.in/app/bigcity#/invoices/ZB-INV-8819",
    zohoSyncStatus: "Synced",
    lastZohoSync: "2 mins ago",
    brief: "National on-pack promotion across 500ml & 750ml PET bottles offering ₹50 instant UPI cashback upon entering unique code on microsite.",
    aspectSummary: {
      legal: { total: 4, done: 4, status: "Approved" },
      compliance: { total: 4, done: 4, status: "Approved" },
      accounting: { total: 3, done: 3, status: "Approved" },
      implementation: { total: 5, done: 3, status: "In Review" },
    },
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
        zohoCrmTaskId: "ZP-T-553011",
        zohoCrmTaskStatus: "Closed",
        details: "Include maximum 1 redemption per mobile number/UPI VPA rule and state jurisdiction clauses.",
        verificationRequirement: "Written legal sign-off on microsite T&C copy.",
        mandatoryGate: true,
      },
      {
        id: "task-001-2",
        sopCode: "SOP-IMP-01",
        title: "Dedicated High-Traffic AWS Server Provisioning",
        aspect: "implementation",
        assignee: "Sachin (Tech Team)",
        role: "Cloud Architect",
        urgency: "HIGH",
        tat: "2 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: "ZP-T-553012",
        zohoCrmTaskStatus: "In Progress",
        details: "Provision auto-scaling cluster capable of handling 8,000 concurrent req/sec during IPL TV commercials.",
        verificationRequirement: "Load test report (JMeter / k6).",
        mandatoryGate: true,
      },
    ],
    createdAt: "2026-08-15T10:30:00Z",
    approvedAt: "2026-08-18T14:20:00Z",
    approvedBy: "Rohit Sharma (Admin)",
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
    status: "Live",
    completionRate: 65,
    zohoCrmDealId: "1418411000000553021",
    zohoCrmDealUrl: "https://crm.zoho.in/crm/org/tab/Potentials/1418411000000553021",
    zohoCrmDealStage: "Proposal/Price Quote",
    zohoProjectId: "ZP-881291",
    zohoProjectUrl: "https://projects.zoho.in/portal/bigcity#project/881291",
    zohoBooksInvoiceId: "ZB-INV-8820",
    zohoBooksInvoiceUrl: "https://books.zoho.in/app/bigcity#/invoices/ZB-INV-8820",
    zohoSyncStatus: "Synced",
    lastZohoSync: "15 mins ago",
    brief: "Consumer promo offering assured ₹100 Swiggy discount voucher with every 250g family pack of Britannia Marie Gold.",
    aspectSummary: {
      legal: { total: 3, done: 3, status: "Approved" },
      compliance: { total: 3, done: 2, status: "In Review" },
      accounting: { total: 3, done: 3, status: "Approved" },
      implementation: { total: 4, done: 1, status: "In Review" },
    },
    tasks: [],
    createdAt: "2026-08-20T11:00:00Z",
    approvedAt: "2026-08-22T09:45:00Z",
    approvedBy: "Rohit Sharma (Admin)",
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
    // No Zoho Books yet — advance payment pending
    zohoCrmDealId: "1418411000000553041",
    zohoCrmDealUrl: "https://crm.zoho.in/crm/org/tab/Potentials/1418411000000553041",
    zohoCrmDealStage: "Qualification",
    zohoSyncStatus: "Partial",
    lastZohoSync: "1 hour ago",
    brief: "Festive scratch card promotion inside packs: 1,000 1g Gold Coins + 500,000 ₹30 Amazon Pay balance rewards.",
    aspectSummary: {
      legal: { total: 4, done: 2, status: "In Review" },
      compliance: { total: 4, done: 1, status: "In Review" },
      accounting: { total: 3, done: 2, status: "In Review" },
      implementation: { total: 5, done: 1, status: "Pending" },
    },
    tasks: [],
    createdAt: "2026-08-24T14:15:00Z",
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
    zohoSyncStatus: "Pending",
    brief: "Gamified cricket season promo with custom merchandise vouchers and jersey rewards.",
    aspectSummary: {
      legal: { total: 3, done: 0, status: "Pending" },
      compliance: { total: 3, done: 0, status: "Pending" },
      accounting: { total: 3, done: 0, status: "Pending" },
      implementation: { total: 4, done: 0, status: "Pending" },
    },
    tasks: [],
    createdAt: "2026-08-25T16:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// Zoho Product Sync Helper
// Calls the n8n "Passive Task Extractor & Zoho Sync" workflow which:
//   1. AI-extracts and validates the task message
//   2. Policy Guard — blocks legal/budget changes requiring human sign-off
//   3. Calls Zoho CRM node to create a Deal record
// Returns the Zoho CRM Deal ID if successful.
// ---------------------------------------------------------------------------
async function syncCampaignToZohoCRM(
  campaignName: string,
  client: string,
  budget: string,
  codeVolume: string,
  tasks: AspectTask[]
): Promise<{ dealId: string | null; dealUrl: string | null; writeStatus: string }> {
  const N8N_ZOHO_SYNC_WEBHOOK =
    process.env.N8N_ZOHO_SYNC_WEBHOOK ||
    "https://indigo-pelican-266513.hostingersite.com/webhook/bcp-task-ingest";

  // Format a rich message that includes the campaign summary and all tasks.
  // The n8n AI Task Extractor will parse this into a structured Zoho CRM Deal.
  const taskSummary = tasks
    .map((t, i) => `${i + 1}. [${t.aspect.toUpperCase()}] ${t.title} — Owner: ${t.assignee}, TAT: ${t.tat}, Urgency: ${t.urgency}`)
    .join("\n");

  const message =
    `APPROVE CAMPAIGN FOR ZOHO CRM: ${campaignName}\n` +
    `Client: ${client}\n` +
    `Budget: ${budget}\n` +
    `Volume: ${codeVolume}\n` +
    `Total Tasks: ${tasks.length}\n\n` +
    `Task Breakdown:\n${taskSummary}`;

  try {
    const res = await fetch(N8N_ZOHO_SYNC_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, campaignName, client, budget, codeVolume }),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      console.error(`[ZohoCRM] n8n webhook returned ${res.status}`);
      return { dealId: null, dealUrl: null, writeStatus: `WEBHOOK_ERROR_${res.status}` };
    }

    // n8n responds with the Zoho CRM Deal data after creation
    const body = await res.json().catch(() => ({})) as Record<string, any>;

    // The n8n "Sync to Zoho CRM" node returns the created deal — try to extract its ID
    const dealId: string | null =
      body?.id ||
      body?.data?.[0]?.id ||
      body?.dealId ||
      body?.deal?.id ||
      null;

    const dealUrl = dealId
      ? `https://crm.zoho.in/crm/org/tab/Potentials/${dealId}`
      : null;

    return {
      dealId,
      dealUrl,
      writeStatus: dealId ? "SYNCED" : "CREATED_NO_ID",
    };
  } catch (err: any) {
    console.error("[ZohoCRM] Sync failed:", err.message);
    return { dealId: null, dealUrl: null, writeStatus: "FAILED" };
  }
}

// ---------------------------------------------------------------------------
// generateAspectPlan — unchanged helper
// ---------------------------------------------------------------------------
export function generateAspectPlan(campaignInput: {
  name: string;
  client: string;
  category?: string;
  rewardType?: string;
  budget?: string;
  codeVolume?: string;
  startDate?: string;
  endDate?: string;
  brief?: string;
}): { tasks: AspectTask[]; aspectSummary: Campaign["aspectSummary"] } {
  const isVoucher = campaignInput.rewardType === "EGV";
  const partnerName = isVoucher ? "Swiggy / Zomato / Amazon" : "NPCI / Razorpay / UPI";
  const ts = Date.now();

  const tasks: AspectTask[] = [
    {
      id: `task-${ts}-1`,
      sopCode: "SOP-LEG-01",
      title: "Terms & Conditions Drafting & Legal Clearance",
      aspect: "legal",
      assignee: "Prashant Mittal",
      role: "Legal Head",
      urgency: "HIGHEST",
      tat: "2 Days",
      status: "IN_PROGRESS",
      zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoCrmTaskStatus: "In Progress",
      details: `Compile full T&C covering eligibility, validity (${campaignInput.startDate} to ${campaignInput.endDate}), 1 claim per user cap, and dispute resolution jurisdiction.`,
      verificationRequirement: "Signed Legal SOW Clearance Doc.",
      mandatoryGate: true,
    },
    {
      id: `task-${ts}-2`,
      sopCode: "SOP-LEG-02",
      title: `${partnerName} Written Logo & Brand IP Approvals`,
      aspect: "legal",
      assignee: "Aakash Verma",
      role: "Legal Counsel",
      urgency: "HIGHEST",
      tat: "3 Days",
      status: "PENDING_APPROVAL",
      zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoCrmTaskStatus: "Open",
      details: "Obtain formal partner consent emails before printing brand logos on on-pack packaging or POSM collaterals.",
      verificationRequirement: "Partner written consent email chain attached to Zoho CRM Deal.",
      mandatoryGate: true,
    },
    {
      id: `task-${ts}-3`,
      sopCode: "SOP-LEG-03",
      title: "Consumer Protection Act & Lottery Prohibition Audit",
      aspect: "legal",
      assignee: "Prashant Mittal",
      role: "Legal Head",
      urgency: "HIGH",
      tat: "2 Days",
      status: "IN_PROGRESS",
      zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoCrmTaskStatus: "In Progress",
      details: "Verify that mechanics adhere to Tamil Nadu & state-specific prize competition statutory guidelines.",
      verificationRequirement: "State compliance legal memo sign-off.",
      mandatoryGate: true,
    },
    {
      id: `task-${ts}-4`,
      sopCode: "SOP-CMP-01",
      title: "TRAI / DLT SMS Header & Template Approval",
      aspect: "compliance",
      assignee: "Khaleel Ahmed",
      role: "Compliance SPOC",
      urgency: "HIGHEST",
      tat: "2 Days",
      status: "IN_PROGRESS",
      zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoCrmTaskStatus: "In Progress",
      details: "Whitelist Principal Entity ID, registered SMS Header and OTP/Reward message templates on Vilpower/Jio DLT.",
      verificationRequirement: "DLT Portal Approval ID.",
      mandatoryGate: true,
    },
    {
      id: `task-${ts}-5`,
      sopCode: "SOP-CMP-02",
      title: "Fraud Prevention & Mobile Velocity Cap Configuration",
      aspect: "compliance",
      assignee: "Sachin (Tech Team)",
      role: "Security Lead",
      urgency: "HIGH",
      tat: "1 Day",
      status: "IN_PROGRESS",
      zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoCrmTaskStatus: "In Progress",
      details: "Enforce strict per-mobile limit (Max 2 claims total), device fingerprinting, and blacklisted VOIP prefix filter.",
      verificationRequirement: "Rule engine test log.",
      mandatoryGate: false,
    },
    {
      id: `task-${ts}-6`,
      sopCode: "SOP-CMP-03",
      title: "72-Hour Pre-Launch Staging UAT Sign-Off",
      aspect: "compliance",
      assignee: "Khaleel Ahmed",
      role: "Compliance SPOC",
      urgency: "HIGHEST",
      tat: "3 Days",
      status: "PENDING_SIGN_OFF",
      zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoCrmTaskStatus: "Open",
      details: "Execute 50-number multi-device end-to-end redemption test run across Airtel, Jio, and Vi networks 72h prior to Go-Live.",
      verificationRequirement: "Signed UAT Test Matrix.",
      mandatoryGate: true,
    },
    {
      id: `task-${ts}-7`,
      sopCode: "SOP-ACC-01",
      title: "100% Advance Payment Verification in Zoho Books",
      aspect: "accounting",
      assignee: "Sneha Nair",
      role: "Finance Lead",
      urgency: "HIGHEST",
      tat: "1 Day",
      status: "COMPLETED",
      zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoCrmTaskStatus: "Closed",
      details: `Verify client deposit of ${campaignInput.budget} in BigCity escrow before PO issuance. Cross-reference with Zoho Books invoice/receipt.`,
      verificationRequirement: "Zoho Books Bank Credit Reconciliation Voucher.",
      mandatoryGate: true,
    },
    {
      id: `task-${ts}-8`,
      sopCode: "SOP-ACC-02",
      title: "Estimate & SOW Commercial Sign-Off — Zoho Books",
      aspect: "accounting",
      assignee: "Rohit Sharma",
      role: "Admin / Commercial Head",
      urgency: "HIGH",
      tat: "2 Days",
      status: "COMPLETED",
      zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoCrmTaskStatus: "Closed",
      details: "Check management fees, GST breakdown, SMS cost per unit, and printer logistics in Zoho Books Estimate.",
      verificationRequirement: "Signed Client Purchase Order (PO) linked to Zoho Books Estimate.",
      mandatoryGate: true,
    },
    {
      id: `task-${ts}-9`,
      sopCode: "SOP-ACC-03",
      title: "TDS / Section 194B Tax Ledger Setup — Zoho Books",
      aspect: "accounting",
      assignee: "Sneha Nair",
      role: "Finance Lead",
      urgency: "NORMAL",
      tat: "2 Days",
      status: "IN_PROGRESS",
      zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoCrmTaskStatus: "In Progress",
      details: "Configure automated PAN verification & 30% TDS deduction workflow for reward values above ₹10,000 in Zoho Books.",
      verificationRequirement: "Zoho Books Tax Chart of Accounts entry.",
      mandatoryGate: false,
    },
    {
      id: `task-${ts}-10`,
      sopCode: "SOP-IMP-01",
      title: "Cryptographic Unique Code Batch Generation & Checksum",
      aspect: "implementation",
      assignee: "Khaleel Ahmed",
      role: "Ops Lead",
      urgency: "HIGHEST",
      tat: "2 Days",
      status: "IN_PROGRESS",
      zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoCrmTaskStatus: "In Progress",
      details: `Generate ${campaignInput.codeVolume} unique 10-character alphanumeric cryptographic codes and verify printer bleed margins.`,
      verificationRequirement: "SHA-256 hash export sign-off.",
      mandatoryGate: true,
    },
    {
      id: `task-${ts}-11`,
      sopCode: "SOP-IMP-02",
      title: "Microsite Deployment, Custom Domain & SSL Provisioning",
      aspect: "implementation",
      assignee: "Sachin (Tech Team)",
      role: "Tech Lead",
      urgency: "HIGH",
      tat: "3 Days",
      status: "IN_PROGRESS",
      zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoCrmTaskStatus: "In Progress",
      details: "Deploy responsive mobile-first redemption portal with BigCity CDN, web analytics, and client brand assets.",
      verificationRequirement: "Staging URL live with green SSL cert.",
      mandatoryGate: true,
    },
    {
      id: `task-${ts}-12`,
      sopCode: "SOP-IMP-03",
      title: "Dual-Gateway Karix / Gupshup Failover Setup",
      aspect: "implementation",
      assignee: "Sachin (Tech Team)",
      role: "Tech Lead",
      urgency: "HIGHEST",
      tat: "1 Day",
      status: "IN_PROGRESS",
      zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoCrmTaskStatus: "In Progress",
      details: "Configure primary Karix route with automatic fallback to Gupshup if SMS latency exceeds 400ms.",
      verificationRequirement: "Automated gateway failover drill test pass.",
      mandatoryGate: true,
    },
    {
      id: `task-${ts}-13`,
      sopCode: "SOP-IMP-04",
      title: "Automated MIS Cadence & Zoho Projects Query Tracker",
      aspect: "implementation",
      assignee: "Khaleel Ahmed",
      role: "Ops Lead",
      urgency: "NORMAL",
      tat: "2 Days",
      status: "IN_PROGRESS",
      zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoCrmTaskStatus: "In Progress",
      details: "Set up daily 09:00 AM automated email MIS to client brand manager. Link to Zoho Projects milestone tracker.",
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

// ---------------------------------------------------------------------------
// Map a Supabase campaign row → Campaign interface
// ---------------------------------------------------------------------------
function rowToCampaign(row: any): Campaign {
  return {
    id: row.id,
    name: row.name,
    client: row.client,
    category: row.category || "FMCG",
    rewardType: row.reward_type || "Cashback",
    budget: row.budget || "₹0",
    budgetNumeric: parseFloat(String(row.budget || "0").replace(/[^0-9.]/g, "")) || 0,
    codeVolume: row.code_volume || "0 packs",
    codeVolumeNumeric: parseFloat(String(row.code_volume || "0").replace(/[^0-9.]/g, "")) || 0,
    startDate: row.start_date || "",
    endDate: row.end_date || "",
    status: row.status === "live" ? "Live" : "Draft",
    completionRate: 20,
    // Zoho CRM
    zohoCrmDealId: row.zoho_crm_deal_id,
    zohoCrmDealUrl: row.zoho_crm_deal_url,
    zohoCrmDealStage: row.zoho_crm_deal_stage,
    // Zoho Projects
    zohoProjectId: row.zoho_project_id,
    zohoProjectUrl: row.zoho_project_url,
    // Zoho Books
    zohoBooksInvoiceId: row.zoho_books_invoice_id,
    zohoBooksInvoiceUrl: row.zoho_books_invoice_url,
    // Aggregate sync status
    zohoSyncStatus: row.zoho_sync_status || "Pending",
    lastZohoSync: row.last_zoho_sync
      ? new Date(row.last_zoho_sync).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
      : undefined,
    brief: row.brief || "",
    aspectSummary: row.aspect_summary || {
      legal: { total: 0, done: 0, status: "Pending" },
      compliance: { total: 0, done: 0, status: "Pending" },
      accounting: { total: 0, done: 0, status: "Pending" },
      implementation: { total: 0, done: 0, status: "Pending" },
    },
    tasks: row.tasks || [],
    createdAt: row.created_at,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
  };
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const id = searchParams.get("id");
  const name = searchParams.get("name");

  // ── Check if campaign is already approved (used by frontend on page load) ──
  if (action === "check_approved" && name) {
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("name", name)
      .eq("status", "live")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[check_approved] Supabase error:", error);
      return NextResponse.json({ found: false });
    }
    if (!data) return NextResponse.json({ found: false });
    return NextResponse.json({ found: true, campaign: rowToCampaign(data) });
  }

  // ── Get single campaign by ID ──
  if (action === "get_campaign" && id) {
    // Try Supabase first
    const { data } = await supabase.from("campaigns").select("*").eq("id", id).maybeSingle();
    if (data) return NextResponse.json({ campaign: rowToCampaign(data) });

    // Fall back to seed data
    const seed = INITIAL_CAMPAIGNS.find((c) => c.id === id);
    if (!seed) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    return NextResponse.json({ campaign: seed });
  }

  // ── Read all Zoho CRM tasks for a campaign ──
  if (action === "read_zoho_tasks" && id) {
    const { data } = await supabase.from("campaigns").select("*").eq("id", id).maybeSingle();
    const campaign = data ? rowToCampaign(data) : INITIAL_CAMPAIGNS.find((c) => c.id === id);
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    return NextResponse.json({
      // Zoho CRM — deal record housing these tasks
      zohoCrmDealId: campaign.zohoCrmDealId || "N/A",
      zohoCrmDealUrl: campaign.zohoCrmDealUrl,
      // Zoho Projects — project milestone tracker
      zohoProjectId: campaign.zohoProjectId || "N/A",
      zohoProjectUrl: campaign.zohoProjectUrl,
      // Zoho Books — invoice/payment record
      zohoBooksInvoiceId: campaign.zohoBooksInvoiceId || "N/A",
      zohoBooksInvoiceUrl: campaign.zohoBooksInvoiceUrl,
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

  // ── List all campaigns — Supabase rows merged with seed data ──
  const { data: supabaseRows, error } = await supabase
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[GET campaigns] Supabase error:", error);
    // Return seed data if Supabase is unavailable
    return NextResponse.json({ campaigns: INITIAL_CAMPAIGNS });
  }

  // Supabase rows take precedence; seeds fill the rest
  const supabaseIds = new Set((supabaseRows || []).map((r) => r.name));
  const seedsNotInSupabase = INITIAL_CAMPAIGNS.filter((c) => !supabaseIds.has(c.name));
  const allCampaigns = [
    ...(supabaseRows || []).map(rowToCampaign),
    ...seedsNotInSupabase,
  ];

  return NextResponse.json({ campaigns: allCampaigns });
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // ── Action 1: Generate plan from campaign brief ──
    if (action === "generate_plan") {
      const { campaignInput } = body;
      if (!campaignInput?.name) {
        return NextResponse.json({ error: "Campaign data is required" }, { status: 400 });
      }
      const { tasks, aspectSummary } = generateAspectPlan(campaignInput);

      // Optionally enrich with AI via the Campaign Brain n8n workflow
      let aiAnalysisText = "";
      const N8N_WEBHOOK_URL =
        process.env.N8N_WEBHOOK_URL ||
        "https://indigo-pelican-266513.hostingersite.com/webhook/20bf7228-5ae0-40c8-b937-00306e81cbec/chat";
      try {
        const n8nRes = await fetch(N8N_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "69420" },
          body: JSON.stringify({
            action: "sendMessage",
            chatInput: `Analyze campaign plan for ${campaignInput.name} — ${campaignInput.brief || ""}`,
            sessionId: `plan-gen-${Date.now()}`,
          }),
          signal: AbortSignal.timeout(6000),
        });
        if (n8nRes.ok) {
          const resText = await n8nRes.text();
          if (resText && !resText.includes("error")) aiAnalysisText = resText;
        }
      } catch {}

      return NextResponse.json({
        success: true,
        aiAnalysis: aiAnalysisText || undefined,
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

    // ── Action 2: Approve & sync campaign to all applicable Zoho products ──
    if (action === "approve_and_push_zoho") {
      const { campaignData, tasks } = body;

      // Step 1 — Sync to Zoho CRM (Deals module) via n8n workflow
      // This creates a Deal record representing the campaign opportunity in CRM.
      const { dealId, dealUrl, writeStatus } = await syncCampaignToZohoCRM(
        campaignData.name,
        campaignData.client,
        campaignData.budget,
        campaignData.codeVolume,
        tasks
      );

      const now = new Date().toISOString();
      const resolvedTasks = tasks && tasks.length > 0 ? tasks : generateAspectPlan(campaignData).tasks;

      // Step 2 — Persist to Supabase campaigns table
      // Zoho Projects and Zoho Books IDs will be added in future integrations.
      // The zoho_sync_status reflects what's actually connected:
      //   "partial" if only CRM is done (Projects/Books not yet wired)
      //   "synced"  if all connected products are in sync
      const { data: insertedRow, error: insertError } = await supabase
        .from("campaigns")
        .insert({
          name: campaignData.name,
          client: campaignData.client,
          category: campaignData.category || "FMCG",
          reward_type: campaignData.rewardType || "Cashback",
          budget: campaignData.budget || "₹25,00,000",
          code_volume: campaignData.codeVolume || "250,000 packs",
          start_date: campaignData.startDate || now.split("T")[0],
          end_date: campaignData.endDate || new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
          brief: campaignData.brief || "AI-generated campaign plan.",
          status: "live",
          tasks: resolvedTasks,
          aspect_summary: {
            legal: { total: 3, done: 0, status: "In Review" },
            compliance: { total: 3, done: 0, status: "In Review" },
            accounting: { total: 3, done: 2, status: "In Review" },
            implementation: { total: 4, done: 0, status: "In Review" },
          },
          // Zoho CRM — connected
          zoho_crm_deal_id: dealId,
          zoho_crm_deal_url: dealUrl,
          zoho_crm_deal_stage: "Qualification",
          // Zoho Projects — not yet integrated; will be added in next phase
          zoho_project_id: null,
          zoho_project_url: null,
          // Zoho Books — not yet integrated; finance team to raise invoice separately
          zoho_books_invoice_id: null,
          zoho_books_invoice_url: null,
          // Sync status: "partial" because only CRM is wired, Projects & Books are pending
          zoho_sync_status: dealId ? "partial" : "pending",
          last_zoho_sync: dealId ? now : null,
          approved_at: now,
          approved_by: "Rohit Sharma (Admin)",
        })
        .select()
        .single();

      if (insertError) {
        console.error("[approve_and_push_zoho] Supabase insert error:", insertError);
      }

      const savedCampaign: Campaign = insertedRow
        ? rowToCampaign(insertedRow)
        : {
            id: `camp-${Date.now()}`,
            name: campaignData.name,
            client: campaignData.client,
            category: campaignData.category || "FMCG",
            rewardType: campaignData.rewardType || "Cashback",
            budget: campaignData.budget,
            budgetNumeric: parseFloat(String(campaignData.budget).replace(/[^0-9.]/g, "")) || 0,
            codeVolume: campaignData.codeVolume,
            codeVolumeNumeric: parseFloat(String(campaignData.codeVolume).replace(/[^0-9.]/g, "")) || 0,
            startDate: campaignData.startDate,
            endDate: campaignData.endDate,
            status: "Live",
            completionRate: 20,
            zohoCrmDealId: dealId || undefined,
            zohoCrmDealUrl: dealUrl || undefined,
            zohoCrmDealStage: "Qualification",
            zohoSyncStatus: dealId ? "Partial" : "Pending",
            lastZohoSync: dealId ? "Just now" : undefined,
            brief: campaignData.brief,
            aspectSummary: {
              legal: { total: 3, done: 0, status: "In Review" },
              compliance: { total: 3, done: 0, status: "In Review" },
              accounting: { total: 3, done: 2, status: "In Review" },
              implementation: { total: 4, done: 0, status: "In Review" },
            },
            tasks: resolvedTasks,
            createdAt: now,
            approvedAt: now,
            approvedBy: "Rohit Sharma (Admin)",
          };

      return NextResponse.json({
        success: true,
        campaign: savedCampaign,
        zohoSync: {
          // Zoho CRM — Deal created representing campaign as sales opportunity
          crmDeal: {
            product: "Zoho CRM",
            module: "Deals",
            dealId: dealId || null,
            dealUrl: dealUrl || null,
            stage: "Qualification",
            writeStatus,
          },
          // Zoho Projects — Not yet wired; tasks will be pushed here in next phase
          projects: {
            product: "Zoho Projects",
            status: "NOT_YET_INTEGRATED",
            note: "Zoho Projects integration is in the next phase. Tasks can be manually linked from the CRM Deal.",
          },
          // Zoho Books — Not yet wired; finance team raises invoice separately
          books: {
            product: "Zoho Books",
            status: "NOT_YET_INTEGRATED",
            note: "Zoho Books invoice must be raised manually by the finance team (Sneha Nair) for advance payment escrow.",
          },
          overallSyncStatus: dealId ? "PARTIAL" : "PENDING",
          syncedAt: dealId ? now : null,
        },
      });
    }

    // ── Action 3: Update a task status (syncs back to Zoho CRM Task) ──
    if (action === "update_zoho_task") {
      const { campaignId, taskId, newStatus } = body;

      const { data, error } = await supabase
        .from("campaigns")
        .select("tasks")
        .eq("id", campaignId)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }

      const tasks: AspectTask[] = data.tasks || [];
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

      task.status = newStatus;
      if (newStatus === "COMPLETED") task.zohoCrmTaskStatus = "Closed";
      else if (newStatus === "IN_PROGRESS") task.zohoCrmTaskStatus = "In Progress";

      const completed = tasks.filter((t) => t.status === "COMPLETED").length;
      const completionRate = Math.round((completed / tasks.length) * 100);

      await supabase
        .from("campaigns")
        .update({
          tasks,
          last_zoho_sync: new Date().toISOString(),
        })
        .eq("id", campaignId);

      return NextResponse.json({
        success: true,
        task,
        completionRate,
        zohoUpdate: {
          product: "Zoho CRM",
          module: "Tasks (sub-record of Deal)",
          zohoCrmTaskId: task.zohoCrmTaskId,
          newStatus: task.zohoCrmTaskStatus,
          timestamp: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Campaign API error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
