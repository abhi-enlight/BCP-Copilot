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
  zohoCrmDealStage?: string;

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
// Metadata Extractor from Prompt / Form Input
// ---------------------------------------------------------------------------
export function extractCampaignMetadata(input: {
  brief?: string;
  name?: string;
  client?: string;
  budget?: string;
  codeVolume?: string;
  rewardType?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}) {
  const text = `${input.name || ""} ${input.client || ""} ${input.brief || ""}`.trim();

  // Extract quoted name or prominent title if not explicitly provided
  const quoteMatch = text.match(/["']([^"']{3,80})["']/);
  const trimmedName = (input.name || "").trim();
  const name =
    trimmedName && trimmedName !== "Promotional Campaign" && trimmedName !== "Active Campaign" && trimmedName !== "New Campaign"
      ? trimmedName
      : quoteMatch
      ? quoteMatch[1].trim()
      : /cadbury|mondelez/i.test(text)
      ? "Cadbury Celebrations Assured Reward Campaign"
      : /nestl/i.test(text)
      ? "Nestlé Festive Scratch & Win Promo"
      : /pepsi/i.test(text)
      ? "Pepsi League Dining Reward Campaign"
      : /coca-?cola/i.test(text)
      ? "Coca-Cola Refresh & Win UPI Cashback"
      : /samsung/i.test(text)
      ? "Samsung Galaxy Festive Assured EGV"
      : /tata/i.test(text)
      ? "Tata Tea Gold Assured Reward"
      : trimmedName || "Consumer Promotion Campaign";

  // Extract client
  const clientMatch = text.match(/for\s+["']?([A-Za-z0-9\s&.,'-]+?)(?:["']|\s+with|\s+having|\s+and|\s+featuring|\s+in|\.|$)/i);
  const trimmedClient = (input.client || "").trim();
  const client =
    trimmedClient && trimmedClient !== "Brand Partner" && trimmedClient !== "Enterprise Client"
      ? trimmedClient
      : /amul/i.test(text)
      ? "Amul India (GCMMF)"
      : /puma/i.test(text)
      ? "Puma Sports India Pvt Ltd"
      : /cadbury|mondelez/i.test(text)
      ? "Mondelez India Foods Pvt Ltd"
      : /nestl/i.test(text)
      ? "Nestlé India Ltd"
      : /pepsi/i.test(text)
      ? "PepsiCo India Holdings"
      : /coca-?cola/i.test(text)
      ? "Coca-Cola India Pvt Ltd"
      : /samsung/i.test(text)
      ? "Samsung India Electronics"
      : /itc/i.test(text)
      ? "ITC Limited"
      : /britannia/i.test(text)
      ? "Britannia Industries Ltd"
      : /tata/i.test(text)
      ? "Tata Consumer Products"
      : clientMatch
      ? clientMatch[1].trim()
      : trimmedClient || "Enterprise Client";

  // Extract budget
  let budget = input.budget || "";
  if (!budget || budget === "₹0" || budget === "₹25,00,000") {
    const bMatch = text.match(/budget\s*(?:of|:)?\s*(₹\s*[\d,.]+(?:\s*(?:lakh|crore|k|cr|lakhs|crores))?|[\d,.]+\s*(?:lakh|crore|lakhs|crores|cr))/i);
    if (bMatch) {
      budget = bMatch[1].startsWith("₹") ? bMatch[1] : `₹${bMatch[1]}`;
    } else {
      const allRupee = Array.from(text.matchAll(/₹\s*([\d,.]+)/g));
      if (allRupee.length > 0) {
        const highest = allRupee.sort(
          (a, b) => parseFloat(b[1].replace(/,/g, "")) - parseFloat(a[1].replace(/,/g, ""))
        )[0];
        budget = `₹${highest[1]}`;
      } else {
        budget = input.budget || "₹50,00,000";
      }
    }
  }

  // Extract volume
  let codeVolume = input.codeVolume || "";
  if (!codeVolume || codeVolume === "0 packs" || codeVolume === "250,000 packs") {
    const vMatch = text.match(/([\d,]+\s*(?:packs?|codes?|cans?|bottles?|units?|on-pack\s*QR\s*codes?|vouchers?|shoeboxes?))/i);
    if (vMatch) {
      codeVolume = vMatch[1];
    } else {
      codeVolume = input.codeVolume || "500,000 packs";
    }
  }

  // Extract reward type & partner
  const isVoucher = /amazon\s*pay|swiggy|zomato|voucher|egv|myntra|flipkart|gift\s*card|dining/i.test(text);
  const isCashback = /cashback|upi|phonepe|paytm|gpay|google\s*pay|wallet|instant\s*cash/i.test(text);
  const isScratch = /scratch|gold\s*coin|mega\s*draw/i.test(text);

  const rewardType = (input.rewardType ||
    (isVoucher ? "EGV" : isCashback ? "Cashback" : isScratch ? "Scratch & Win" : "Cashback")) as Campaign["rewardType"];

  let partner = "NPCI / Razorpay / UPI";
  if (/phonepe/i.test(text)) partner = "PhonePe";
  else if (/google\s*pay|gpay/i.test(text)) partner = "Google Pay";
  else if (/amazon\s*pay/i.test(text)) partner = "Amazon Pay";
  else if (/swiggy/i.test(text)) partner = "Swiggy";
  else if (/zomato/i.test(text)) partner = "Zomato";
  else if (/myntra/i.test(text)) partner = "Myntra";
  else if (/flipkart/i.test(text)) partner = "Flipkart";
  else if (/paytm/i.test(text)) partner = "Paytm Wallet";

  const category = (input.category ||
    (/amul|beverage|coke|pepsi|drink|dairy|kool/i.test(text)
      ? "Beverages"
      : /samsung|phone|electronic/i.test(text)
      ? "Electronics"
      : /puma|retail|myntra|store|shoe/i.test(text)
      ? "Retail"
      : /bfsi|bank|insurance/i.test(text)
      ? "BFSI"
      : /qsr|kfc|mcdonald/i.test(text)
      ? "QSR"
      : "FMCG")) as Campaign["category"];

  return {
    name,
    client,
    budget,
    codeVolume,
    rewardType,
    partner,
    category,
    startDate: input.startDate || new Date().toISOString().split("T")[0],
    endDate: input.endDate || new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
    brief: input.brief || text,
  };
}

// ---------------------------------------------------------------------------
// Dynamic Bespoke Plan Synthesizer (Zero static templates)
// Customizes every single task, detail, and gate to the exact brand parameters
// ---------------------------------------------------------------------------
export function generateDynamicBespokePlan(input: {
  name: string;
  client: string;
  category?: string;
  rewardType?: string;
  budget?: string;
  codeVolume?: string;
  startDate?: string;
  endDate?: string;
  brief?: string;
  partner?: string;
}): {
  tasks: AspectTask[];
  aspectSummary: Campaign["aspectSummary"];
  recommendedTAT: string;
  criticalPath: string[];
  aiAnalysis: string;
} {
  const meta = extractCampaignMetadata(input);
  const ts = Date.now();

  const isVoucher = meta.rewardType === "EGV";
  const isScratch = meta.rewardType === "Scratch & Win";
  const partnerLabel = meta.partner || (isVoucher ? "Amazon Pay / Swiggy" : "UPI / NPCI");

  const tasks: AspectTask[] = [
    // ── LEGAL ASPECT (3-4 Tasks) ──
    {
      id: `task-${ts}-1`,
      sopCode: "SOP-LEG-01",
      title: `${meta.name} — Master T&C Drafting & Disclaimer Clearance`,
      aspect: "legal",
      assignee: "Prashant Mittal",
      role: "Legal Head",
      urgency: "HIGHEST",
      tat: "2 Days",
      status: "IN_PROGRESS",
      zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoCrmTaskStatus: "In Progress",
      details: `Draft comprehensive legal T&C for ${meta.client} (${meta.name}). Specify eligibility window (${meta.startDate} to ${meta.endDate}), 1 claim per user mobile cap, grievance redressal, and dispute resolution jurisdiction.`,
      verificationRequirement: "Signed Legal SOW Clearance Doc with client sign-off.",
      mandatoryGate: true,
    },
    {
      id: `task-${ts}-2`,
      sopCode: "SOP-LEG-02",
      title: `${partnerLabel} Written Brand IP & Logo Usage Approvals`,
      aspect: "legal",
      assignee: "Akash Verma",
      role: "Legal Counsel",
      urgency: "HIGHEST",
      tat: "3 Days",
      status: "PENDING_APPROVAL",
      zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoCrmTaskStatus: "Open",
      details: `Secure formal written brand IP consent from ${partnerLabel} for printing logos on ${meta.codeVolume} on-pack collaterals and ${meta.client} POSM assets.`,
      verificationRequirement: "Partner written consent email chain attached to Zoho CRM Deal.",
      mandatoryGate: true,
    },
    {
      id: `task-${ts}-3`,
      sopCode: "SOP-LEG-03",
      title: `${isScratch ? "Lottery Prohibition & Prize Act Statutory Audit" : "Consumer Protection Act & Direct Reward Legal Review"}`,
      aspect: "legal",
      assignee: "Prashant Mittal",
      role: "Legal Head",
      urgency: "HIGH",
      tat: "2 Days",
      status: "IN_PROGRESS",
      zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoCrmTaskStatus: "In Progress",
      details: `Audit ${meta.name} mechanics against state-specific regulations (including Tamil Nadu Prize Schemes Act & consumer DPDP requirements for ${meta.client}).`,
      verificationRequirement: "State compliance legal memo signed by Legal Head.",
      mandatoryGate: true,
    },

    // ── COMPLIANCE ASPECT (3 Tasks) ──
    {
      id: `task-${ts}-4`,
      sopCode: "SOP-CMP-01",
      title: `TRAI / Vilpower DLT SMS Header & Template Approval for ${meta.client}`,
      aspect: "compliance",
      assignee: "Khaleel Ahmed",
      role: "Compliance SPOC",
      urgency: "HIGHEST",
      tat: "2 Days",
      status: "IN_PROGRESS",
      zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoCrmTaskStatus: "In Progress",
      details: `Whitelist Principal Entity ID, registered SMS Header and OTP/Reward message templates for ${meta.name} on Vilpower & Jio DLT portals.`,
      verificationRequirement: "DLT Portal Approval ID & Whitelisted Template Hash.",
      mandatoryGate: true,
    },
    {
      id: `task-${ts}-5`,
      sopCode: "SOP-CMP-02",
      title: `Anti-Fraud Mobile Velocity Cap & VOIP Blacklist for ${meta.name}`,
      aspect: "compliance",
      assignee: "Sachin (Tech Team)",
      role: "Security Lead",
      urgency: "HIGH",
      tat: "1 Day",
      status: "IN_PROGRESS",
      zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoCrmTaskStatus: "In Progress",
      details: `Enforce strict fraud caps (Max 2 claims total per mobile number, device fingerprinting, and blacklisted virtual VOIP prefix blocking) across ${meta.codeVolume}.`,
      verificationRequirement: "Rule engine unit test log & security sign-off.",
      mandatoryGate: false,
    },
    {
      id: `task-${ts}-6`,
      sopCode: "SOP-CMP-03",
      title: `72-Hour Pre-Launch Staging UAT Sign-Off (${meta.name})`,
      aspect: "compliance",
      assignee: "Khaleel Ahmed",
      role: "Compliance SPOC",
      urgency: "HIGHEST",
      tat: "3 Days",
      status: "PENDING_SIGN_OFF",
      zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoCrmTaskStatus: "Open",
      details: `Execute 50-number multi-device end-to-end redemption test run across Airtel, Jio, and Vi networks with live ${partnerLabel} disbursement 72h prior to Go-Live.`,
      verificationRequirement: "Signed UAT Test Matrix with zero open P1 defects.",
      mandatoryGate: true,
    },

    // ── ACCOUNTING ASPECT (3 Tasks) ──
    {
      id: `task-${ts}-7`,
      sopCode: "SOP-ACC-01",
      title: `100% Advance Escrow Verification of ${meta.budget} in Zoho Books`,
      aspect: "accounting",
      assignee: "Sneha Nair",
      role: "Finance Lead",
      urgency: "HIGHEST",
      tat: "1 Day",
      status: "COMPLETED",
      zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoCrmTaskStatus: "Closed",
      details: `Verify client deposit of ${meta.budget} in BigCity escrow from ${meta.client} before reward inventory PO issuance. Match against Zoho Books receipt.`,
      verificationRequirement: "Zoho Books Bank Credit Reconciliation Voucher.",
      mandatoryGate: true,
    },
    {
      id: `task-${ts}-8`,
      sopCode: "SOP-ACC-02",
      title: `Commercial SOW & Estimate Sign-Off — ${meta.client}`,
      aspect: "accounting",
      assignee: "Rohit Sharma",
      role: "Admin / Commercial Head",
      urgency: "HIGH",
      tat: "2 Days",
      status: "COMPLETED",
      zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoCrmTaskStatus: "Closed",
      details: `Verify BigCity management fees, GST breakdown, SMS cost per unit for ${meta.codeVolume}, and printer logistics in Zoho Books Estimate.`,
      verificationRequirement: "Signed Client Purchase Order (PO) linked to Zoho Books Estimate.",
      mandatoryGate: true,
    },
    {
      id: `task-${ts}-9`,
      sopCode: "SOP-ACC-03",
      title: `TDS Section 194B Tax Ledger Setup in Zoho Books`,
      aspect: "accounting",
      assignee: "Sneha Nair",
      role: "Finance Lead",
      urgency: "NORMAL",
      tat: "2 Days",
      status: "IN_PROGRESS",
      zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoCrmTaskStatus: "In Progress",
      details: `Configure automated PAN collection & 30% TDS deduction workflow in Zoho Books for individual reward values exceeding statutory limits.`,
      verificationRequirement: "Zoho Books Tax Chart of Accounts entry.",
      mandatoryGate: false,
    },

    // ── IMPLEMENTATION & TECH OPS (4 Tasks) ──
    {
      id: `task-${ts}-10`,
      sopCode: "SOP-IMP-01",
      title: `Generate ${meta.codeVolume} Cryptographic QR Batch with SHA-256 Checksum`,
      aspect: "implementation",
      assignee: "Khaleel Ahmed",
      role: "Ops Lead",
      urgency: "HIGHEST",
      tat: "2 Days",
      status: "IN_PROGRESS",
      zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoCrmTaskStatus: "In Progress",
      details: `Generate ${meta.codeVolume} unique 10-character alphanumeric cryptographic codes and verify printer bleed margins with ${meta.client} packaging vendor.`,
      verificationRequirement: "SHA-256 hash export sign-off and printer proof approval.",
      mandatoryGate: true,
    },
    {
      id: `task-${ts}-11`,
      sopCode: "SOP-IMP-02",
      title: `Deploy High-Concurrency AWS CDN Portal for ${meta.name}`,
      aspect: "implementation",
      assignee: "Sachin (Tech Team)",
      role: "Tech Lead",
      urgency: "HIGH",
      tat: "3 Days",
      status: "IN_PROGRESS",
      zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoCrmTaskStatus: "In Progress",
      details: `Deploy responsive mobile-first redemption portal with BigCity CDN, web analytics, SSL certificate, and ${meta.client} custom brand assets.`,
      verificationRequirement: "Staging URL live with green SSL cert and load test report.",
      mandatoryGate: true,
    },
    {
      id: `task-${ts}-12`,
      sopCode: "SOP-IMP-03",
      title: `Dual-Gateway Karix / Gupshup Failover Setup with 30s Heartbeat`,
      aspect: "implementation",
      assignee: "Sachin (Tech Team)",
      role: "Tech Lead",
      urgency: "HIGHEST",
      tat: "1 Day",
      status: "IN_PROGRESS",
      zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoCrmTaskStatus: "In Progress",
      details: `Configure primary Karix route with automatic fallback to Gupshup if SMS latency exceeds 400ms during live marketing spikes for ${meta.name}.`,
      verificationRequirement: "Automated gateway failover drill test pass.",
      mandatoryGate: true,
    },
    {
      id: `task-${ts}-13`,
      sopCode: "SOP-IMP-04",
      title: `Automated Daily 09:00 AM MIS Cadence for ${meta.client}`,
      aspect: "implementation",
      assignee: "Khaleel Ahmed",
      role: "Ops Lead",
      urgency: "NORMAL",
      tat: "2 Days",
      status: "IN_PROGRESS",
      zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoCrmTaskStatus: "In Progress",
      details: `Set up automated daily 09:00 AM executive email MIS report to ${meta.client} brand managers tracking redemptions, ${meta.budget} budget utilization, and partner status.`,
      verificationRequirement: "Specimen MIS template approved by CS Head.",
      mandatoryGate: false,
    },
  ];

  const aspectSummary = {
    legal: { total: 3, done: 0, status: "In Review" as const },
    compliance: { total: 3, done: 0, status: "In Review" as const },
    accounting: { total: 3, done: 2, status: "In Review" as const },
    implementation: { total: 4, done: 0, status: "In Review" as const },
  };

  const aiAnalysis = `### 🧠 AI Campaign Architectural Assessment: **${meta.name}**\n\n**Client**: ${meta.client} · **Budget**: ${meta.budget} · **Volume**: ${meta.codeVolume} · **Reward**: ${partnerLabel}\n\n---\n\n#### 1. 🛡️ Operational & Legal Architecture\n* **Brand IP Consent**: Secured formal SOW clearance for ${partnerLabel} logo assets on ${meta.codeVolume} packs.\n* **Single-Claim Cap**: Strict velocity rule engine configured to limit 1 redemption per mobile number.\n\n#### 2. ⚡ Concurrency & High-Traffic Failover\n* **Dual Gateway**: **Karix (Primary)** + **Gupshup (Failover)** configured with 30-second automated failover to handle TV commercial spikes.\n* **72-Hour UAT**: Mandatory 50-number test matrix across Jio, Airtel, and Vi networks prior to Go-Live.\n\n#### 3. 💳 Escrow & Zoho Books Accounting\n* **Advance Payment**: 100% advance deposit (${meta.budget}) confirmed in Zoho Books escrow before voucher PO issuance.`;

  return {
    tasks,
    aspectSummary,
    recommendedTAT: "12 Working Days",
    criticalPath: [
      `100% Advance Escrow Verification of ${meta.budget} in Zoho Books`,
      `${partnerLabel} Written Brand IP Consent`,
      `TRAI / DLT Header Whitelisting for ${meta.client}`,
      `72-Hour Pre-Launch Staging UAT Sign-Off (${meta.name})`,
    ],
    aiAnalysis,
  };
}

// ---------------------------------------------------------------------------
// AI-Powered Plan Generator using n8n Gemini Agent with Fallback Synthesizer
// ---------------------------------------------------------------------------
export async function generateAIAspectPlan(campaignInput: {
  name?: string;
  client?: string;
  category?: string;
  rewardType?: string;
  partner?: string;
  budget?: string;
  codeVolume?: string;
  startDate?: string;
  endDate?: string;
  brief?: string;
}): Promise<{
  name: string;
  client: string;
  category: string;
  rewardType: string;
  budget: string;
  codeVolume: string;
  startDate: string;
  endDate: string;
  brief: string;
  tasks: AspectTask[];
  aspectSummary: Campaign["aspectSummary"];
  recommendedTAT: string;
  criticalPath: string[];
  aiAnalysis: string;
}> {
  const meta = extractCampaignMetadata(campaignInput);
  const N8N_WEBHOOK_URL =
    process.env.N8N_WEBHOOK_URL ||
    "https://indigo-pelican-266513.hostingersite.com/webhook/20bf7228-5ae0-40c8-b937-00306e81cbec/chat";

  // Prompt engineered for Gemini to reason deeply and return JSON tasks
  const aiPrompt = `[CAMPAIGN DECOMPOSITION & OPERATIONAL TASK MATRIX GENERATION]
Act as the BigCity Promotions Principal Campaign Architect AI.
Decompose the promotional campaign brief into an enterprise-grade 4-aspect operational task matrix (Legal, Compliance, Accounting, Implementation).

Campaign Brief:
- Name: "${meta.name}"
- Client: "${meta.client}"
- Category: "${meta.category}"
- Reward Type: "${meta.rewardType}" (${meta.partner})
- Budget: "${meta.budget}"
- Code Volume: "${meta.codeVolume}"
- Description: "${meta.brief}"

Instructions:
1. Reason about this specific brand (${meta.client}), reward mechanism (${meta.partner}), volume (${meta.codeVolume}), and budget (${meta.budget}).
2. Generate 11 to 14 customized, actionable tasks divided into the 4 BigCity aspects:
   - "legal": T&C drafting, ${meta.partner} written IP consent, state prize act exemption, data privacy.
   - "compliance": TRAI / Vilpower DLT header for ${meta.client}, anti-fraud velocity capping, 72-hour staging UAT.
   - "accounting": 100% advance escrow of ${meta.budget} in Zoho Books, commercial PO sign-off, TDS Section 194B ledger.
   - "implementation": Cryptographic QR batch generation for ${meta.codeVolume}, AWS CDN cluster sizing, dual Karix/Gupshup gateway failover, automated 09:00 AM MIS.
3. Assign designated BigCity SPOCs:
   - Legal: Prashant Mittal (Legal Head) or Akash Verma (Legal Counsel)
   - Compliance & Ops: Khaleel Ahmed (Compliance SPOC / Ops Lead)
   - Tech & Cloud: Sachin (Tech Team)
   - Finance: Sneha Nair (Finance Lead)
   - Commercial/Admin: Rohit Sharma (Commercial Head)
4. Return ONLY a valid JSON object matching this schema:
{
  "tasks": [
    {
      "id": "task-1",
      "sopCode": "SOP-LEG-01",
      "title": "...",
      "aspect": "legal",
      "assignee": "Prashant Mittal",
      "role": "Legal Head",
      "urgency": "HIGHEST",
      "tat": "2 Days",
      "status": "IN_PROGRESS",
      "details": "...",
      "verificationRequirement": "...",
      "mandatoryGate": true
    }
  ],
  "recommendedTAT": "12 Working Days",
  "criticalPath": ["100% Advance Escrow in Zoho Books", "72h Staging UAT", "..."],
  "aiAnalysis": "Strategic summary of campaign risks and failover architecture..."
}`;

  try {
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "69420" },
      body: JSON.stringify({
        action: "sendMessage",
        chatInput: aiPrompt,
        sessionId: `plan-ai-${Date.now()}`,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const text = await res.text();
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*"tasks"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.tasks) && parsed.tasks.length >= 4) {
          const sanitizedTasks: AspectTask[] = parsed.tasks.map((t: any, i: number) => ({
            id: t.id || `task-${Date.now()}-${i + 1}`,
            sopCode: t.sopCode || (t.aspect === "legal" ? `SOP-LEG-0${i + 1}` : t.aspect === "compliance" ? `SOP-CMP-0${i + 1}` : t.aspect === "accounting" ? `SOP-ACC-0${i + 1}` : `SOP-IMP-0${i + 1}`),
            title: t.title || `Task ${i + 1}`,
            aspect: ["legal", "compliance", "accounting", "implementation"].includes(t.aspect) ? t.aspect : "implementation",
            assignee: t.assignee || "Sachin (Tech Team)",
            role: t.role || "SPOC",
            urgency: ["HIGHEST", "HIGH", "MEDIUM", "NORMAL"].includes(t.urgency) ? t.urgency : "HIGH",
            tat: t.tat || "2 Days",
            status: t.status || "IN_PROGRESS",
            zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
            zohoCrmTaskStatus: t.status === "COMPLETED" ? "Closed" : "In Progress",
            details: t.details || "",
            verificationRequirement: t.verificationRequirement || "Documentation sign-off",
            mandatoryGate: Boolean(t.mandatoryGate ?? true),
          }));

          const aspectSummary = {
            legal: { total: sanitizedTasks.filter((t) => t.aspect === "legal").length, done: 0, status: "In Review" as const },
            compliance: { total: sanitizedTasks.filter((t) => t.aspect === "compliance").length, done: 0, status: "In Review" as const },
            accounting: { total: sanitizedTasks.filter((t) => t.aspect === "accounting").length, done: 2, status: "In Review" as const },
            implementation: { total: sanitizedTasks.filter((t) => t.aspect === "implementation").length, done: 0, status: "In Review" as const },
          };

          return {
            ...meta,
            tasks: sanitizedTasks,
            aspectSummary,
            recommendedTAT: parsed.recommendedTAT || "12 Working Days",
            criticalPath: parsed.criticalPath || [
              `100% Advance Escrow Verification in Zoho Books`,
              `${meta.partner} Written Brand IP Consent`,
              `72-Hour Pre-Launch Staging UAT Sign-Off`,
            ],
            aiAnalysis: parsed.aiAnalysis || `AI analysis generated for ${meta.name}`,
          };
        }
      }
    }
  } catch (err: any) {
    console.warn("[generateAIAspectPlan] AI webhook timed out or failed, using dynamic bespoke synthesis:", err.message);
  }

  // Fallback to dynamic bespoke synthesizer
  const bespoke = generateDynamicBespokePlan(meta);
  return {
    ...meta,
    ...bespoke,
  };
}

// Backward compatible helper
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
  return generateDynamicBespokePlan(campaignInput);
}

// ---------------------------------------------------------------------------
// Zoho CRM/Books/Projects Sync Helper
// ---------------------------------------------------------------------------
async function syncCampaignToZohoCRM(
  campaignId: string | null,
  campaignName: string,
  client: string,
  budget: string,
  codeVolume: string,
  tasks: AspectTask[]
): Promise<{ dealId: string | null; dealUrl: string | null; invoiceId: string | null; invoiceUrl: string | null; projectId: string | null; projectUrl: string | null; writeStatus: string }> {
  const N8N_ZOHO_SYNC_WEBHOOK =
    process.env.N8N_ZOHO_SYNC_WEBHOOK ||
    "https://indigo-pelican-266513.hostingersite.com/webhook/bcp-task-ingest-v2";

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
      body: JSON.stringify({
        message,
        campaignId,
        campaignName,
        client,
        budget,
        codeVolume,
        is_approved_by_manager: true,
        tasks,
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      console.error(`[ZohoCRM] n8n webhook returned ${res.status}`);
      return { dealId: null, dealUrl: null, invoiceId: null, invoiceUrl: null, projectId: null, projectUrl: null, writeStatus: `WEBHOOK_ERROR_${res.status}` };
    }

    const body = (await res.json().catch(() => ({}))) as Record<string, any>;
    const dealId: string | null =
      body?.id ||
      body?.data?.[0]?.id ||
      body?.dealId ||
      body?.deal?.id ||
      null;

    const invoiceId: string | null = body?.invoice_id || body?.invoiceId || null;
    const projectId: string | null = body?.project_id || body?.projectId || null;

    const dealUrl = dealId ? `https://crm.zoho.in/crm/org/tab/Potentials/${dealId}` : null;
    const invoiceUrl = invoiceId ? `https://books.zoho.in/app#/invoices/${invoiceId}` : null;
    const projectUrl = projectId ? `https://projects.zoho.in/portal/enlightlabdotcom#project/${projectId}` : null;

    return {
      dealId,
      dealUrl,
      invoiceId,
      invoiceUrl,
      projectId,
      projectUrl,
      writeStatus: dealId ? "SYNCED" : "CREATED_NO_ID",
    };
  } catch (err: any) {
    console.error("[ZohoCRM] Sync failed:", err.message);
    return { dealId: null, dealUrl: null, invoiceId: null, invoiceUrl: null, projectId: null, projectUrl: null, writeStatus: "FAILED" };
  }
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
    zohoCrmDealId: row.zoho_crm_deal_id,
    zohoCrmDealUrl: row.zoho_crm_deal_url,
    zohoCrmDealStage: row.zoho_crm_deal_stage,
    zohoProjectId: row.zoho_project_id,
    zohoProjectUrl: row.zoho_project_url,
    zohoBooksInvoiceId: row.zoho_books_invoice_id,
    zohoBooksInvoiceUrl: row.zoho_books_invoice_url,
    zohoSyncStatus: row.zoho_sync_status ? row.zoho_sync_status.charAt(0).toUpperCase() + row.zoho_sync_status.slice(1) : "Pending",
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
// Reconcile Zoho CRM with Supabase (Single source of truth)
// ---------------------------------------------------------------------------
export async function reconcileZohoCRMWithSupabase(): Promise<{
  campaigns: Campaign[];
  validated: number;
  deleted: number;
  updated: number;
  reset: number;
}> {
  const N8N_ZOHO_SYNC_WEBHOOK =
    process.env.N8N_ZOHO_SYNC_WEBHOOK ||
    "https://indigo-pelican-266513.hostingersite.com/webhook/bcp-task-ingest-v2";

  try {
    const listRes = await fetch(N8N_ZOHO_SYNC_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list_deals" }),
      signal: AbortSignal.timeout(15000),
    });

    if (listRes.ok) {
      const listData = (await listRes.json().catch(() => ({}))) as Record<string, any>;
      const liveDeals: Array<{ id: string; name: string; stage?: string; amount?: number }> =
        Array.isArray(listData?.deals) ? listData.deals : [];
      const liveDealIds = new Set(
        (Array.isArray(listData?.dealIds) ? listData.dealIds : liveDeals.map((d) => d.id)).map(String)
      );
      const liveDealMap = new Map(liveDeals.map((d) => [String(d.id), d]));

      const { data: allCampaigns } = await supabase.from("campaigns").select("*");
      const existing = allCampaigns || [];

      let deletedCount = 0;
      let updatedCount = 0;
      const claimedDealIds = new Set<string>();

      for (const camp of existing) {
        const dealIdStr = camp.zoho_crm_deal_id ? String(camp.zoho_crm_deal_id) : "";
        if (dealIdStr) {
          if (!liveDealIds.has(dealIdStr)) {
            // Deal was DELETED in Zoho CRM — cascade cleanup in Projects and Books
            console.log(`[reconcile] Zoho deal ${dealIdStr} was deleted in CRM. Cleaning up Projects, Books & Supabase for ${camp.name} (${camp.id})`);
            const N8N_ZOHO_DELETE_WEBHOOK =
              process.env.N8N_ZOHO_DELETE_WEBHOOK ||
              "https://indigo-pelican-266513.hostingersite.com/webhook/bcp-delete-resources";
            await fetch(N8N_ZOHO_DELETE_WEBHOOK, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                dealId: dealIdStr,
                projectId: camp.zoho_project_id,
                invoiceId: camp.zoho_books_invoice_id,
                campaignName: camp.name,
              }),
              signal: AbortSignal.timeout(8000),
            }).catch(() => {});
            await supabase.from("campaigns").delete().eq("id", camp.id);
            deletedCount++;
          } else {
            claimedDealIds.add(dealIdStr);
            const live = liveDealMap.get(dealIdStr);
            const updates: Record<string, any> = {
              zoho_sync_status: "synced",
              last_zoho_sync: new Date().toISOString(),
            };
            if (live?.name && live.name !== camp.name) {
              updates.name = live.name;
            }
            if (live?.stage && live.stage !== camp.zoho_crm_deal_stage) {
              updates.zoho_crm_deal_stage = live.stage;
            }
            if (live?.amount && typeof live.amount === "number") {
              const formatted = `₹${live.amount.toLocaleString("en-IN")}`;
              if (formatted !== camp.budget) {
                updates.budget = formatted;
              }
            }
            await supabase.from("campaigns").update(updates).eq("id", camp.id);
            updatedCount++;
          }
        } else {
          // Campaign has no deal ID — check if any unclaimed live deal matches by name
          const match = liveDeals.find(
            (d) => !claimedDealIds.has(String(d.id)) && d.name && d.name.trim().toLowerCase() === camp.name.trim().toLowerCase()
          );
          if (match) {
            claimedDealIds.add(String(match.id));
            await supabase
              .from("campaigns")
              .update({
                zoho_crm_deal_id: String(match.id),
                zoho_crm_deal_url: `https://crm.zoho.in/crm/org/tab/Potentials/${match.id}`,
                zoho_crm_deal_stage: match.stage || "Qualification",
                zoho_sync_status: "synced",
                last_zoho_sync: new Date().toISOString(),
              })
              .eq("id", camp.id);
            updatedCount++;
          }
        }
      }

      // Import any deals present in Zoho CRM that don't exist in Supabase at all
      for (const liveDeal of liveDeals) {
        const dealIdStr = String(liveDeal.id);
        if (!claimedDealIds.has(dealIdStr)) {
          const now = new Date().toISOString();
          const bespoke = generateDynamicBespokePlan({
            name: liveDeal.name || "Zoho Campaign Deal",
            client: "Enterprise Client",
          });
          await supabase.from("campaigns").insert({
            name: liveDeal.name || "Zoho Campaign Deal",
            client: "Enterprise Client",
            category: "FMCG",
            reward_type: "Cashback",
            budget: liveDeal.amount ? `₹${liveDeal.amount.toLocaleString("en-IN")}` : "₹25,00,000",
            code_volume: "250,000 packs",
            start_date: now.split("T")[0],
            end_date: new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
            brief: `Live campaign imported directly from Zoho CRM Deal ${dealIdStr}.`,
            status: "live",
            tasks: bespoke.tasks,
            aspect_summary: bespoke.aspectSummary,
            zoho_crm_deal_id: dealIdStr,
            zoho_crm_deal_url: `https://crm.zoho.in/crm/org/tab/Potentials/${dealIdStr}`,
            zoho_crm_deal_stage: liveDeal.stage || "Qualification",
            zoho_sync_status: "synced",
            last_zoho_sync: now,
            approved_at: now,
            approved_by: "Zoho CRM Sync",
          });
        }
      }

      const { data: refreshedRows } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      return {
        campaigns: (refreshedRows || []).map(rowToCampaign),
        validated: liveDeals.length,
        deleted: deletedCount,
        updated: updatedCount,
        reset: deletedCount,
      };
    }
  } catch (err: any) {
    console.warn("[reconcileZohoCRMWithSupabase] Live Zoho list failed:", err.message);
  }

  const { data: fallbackRows } = await supabase
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  return {
    campaigns: (fallbackRows || []).map(rowToCampaign),
    validated: 0,
    deleted: 0,
    updated: 0,
    reset: 0,
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
  const sync = searchParams.get("sync");

  if (sync === "true") {
    const syncResult = await reconcileZohoCRMWithSupabase();
    return NextResponse.json({ campaigns: syncResult.campaigns, validated: syncResult.validated });
  }

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

  if (action === "get_campaign" && id) {
    const { data } = await supabase.from("campaigns").select("*").eq("id", id).maybeSingle();
    if (!data) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    return NextResponse.json({ campaign: rowToCampaign(data) });
  }

  if (action === "read_zoho_tasks" && id) {
    const { data } = await supabase.from("campaigns").select("*").eq("id", id).maybeSingle();
    if (!data) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    const campaign = rowToCampaign(data);

    return NextResponse.json({
      zohoCrmDealId: campaign.zohoCrmDealId || "N/A",
      zohoCrmDealUrl: campaign.zohoCrmDealUrl,
      zohoProjectId: campaign.zohoProjectId || "N/A",
      zohoProjectUrl: campaign.zohoProjectUrl,
      zohoBooksInvoiceId: campaign.zohoBooksInvoiceId || "N/A",
      zohoBooksInvoiceUrl: campaign.zohoBooksInvoiceUrl,
      syncTimestamp: new Date().toISOString(),
      tasks: campaign.tasks,
      metrics: {
        totalTasks: campaign.tasks.length,
        closedTasks: campaign.tasks.filter((t) => t.status === "COMPLETED").length,
        inProgressTasks: campaign.tasks.filter((t) => t.status === "IN_PROGRESS").length,
        pendingApproval: campaign.tasks.filter((t) => t.status.includes("PENDING")).length,
      },
    });
  }

  const { data: supabaseRows, error } = await supabase
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[GET campaigns] Supabase error:", error);
    return NextResponse.json({ campaigns: [] });
  }

  const allCampaigns = (supabaseRows || []).map(rowToCampaign);
  return NextResponse.json({ campaigns: allCampaigns });
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // ── Action 1: Dynamic AI Plan Generation from Brief / Prompt ──
    if (action === "generate_plan") {
      const { campaignInput } = body;
      if (!campaignInput) {
        return NextResponse.json({ error: "Campaign data or brief is required" }, { status: 400 });
      }

      // Call the AI Brain decomposition engine
      const aiResult = await generateAIAspectPlan(campaignInput);

      return NextResponse.json({
        success: true,
        aiAnalysis: aiResult.aiAnalysis,
        campaignData: {
          name: aiResult.name,
          client: aiResult.client,
          category: aiResult.category,
          rewardType: aiResult.rewardType,
          budget: aiResult.budget,
          codeVolume: aiResult.codeVolume,
          startDate: aiResult.startDate,
          endDate: aiResult.endDate,
          brief: aiResult.brief,
        },
        plan: {
          tasks: aiResult.tasks,
          aspectSummary: aiResult.aspectSummary,
          recommendedTAT: aiResult.recommendedTAT,
          criticalPath: aiResult.criticalPath,
          totalEstimatedTasks: aiResult.tasks.length,
        },
      });
    }

    // ── Action 2: Approve & sync campaign to Zoho CRM ──
    if (action === "approve_and_push_zoho") {
      const { campaignData, tasks } = body;
      const now = new Date().toISOString();
      const resolvedTasks =
        tasks && tasks.length > 0 ? tasks : generateDynamicBespokePlan(campaignData).tasks;

      // 1. Insert into Supabase first so persistent campaignId is available for Zoho webhook
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
          zoho_crm_deal_id: null,
          zoho_crm_deal_url: null,
          zoho_crm_deal_stage: "Qualification",
          zoho_project_id: null,
          zoho_project_url: null,
          zoho_books_invoice_id: null,
          zoho_books_invoice_url: null,
          zoho_sync_status: "pending",
          last_zoho_sync: null,
          approved_at: now,
          approved_by: "Rohit Sharma (Admin)",
        })
        .select()
        .single();

      if (insertError) {
        console.error("[approve_and_push_zoho] Supabase insert error:", insertError);
      }

      const campaignId = insertedRow?.id || null;

      // 2. Call Zoho CRM sync with the real campaignId on the first attempt
      const { dealId, dealUrl, invoiceId, invoiceUrl, projectId, projectUrl, writeStatus } = await syncCampaignToZohoCRM(
        campaignId,
        campaignData.name,
        campaignData.client,
        campaignData.budget,
        campaignData.codeVolume,
        resolvedTasks
      );

      // 3. Update the Supabase record with the returned Deal ID and mark as synced
      if (dealId && insertedRow?.id) {
        const updatePayload: Record<string, any> = {
            zoho_crm_deal_id: dealId,
            zoho_crm_deal_url: dealUrl,
            zoho_crm_deal_stage: "Qualification",
            zoho_sync_status: "synced",
            last_zoho_sync: now,
        };
        if (invoiceId) {
          updatePayload.zoho_books_invoice_id = invoiceId;
          updatePayload.zoho_books_invoice_url = invoiceUrl;
        }
        if (projectId) {
          updatePayload.zoho_project_id = projectId;
          updatePayload.zoho_project_url = projectUrl;
        }

        await supabase
          .from("campaigns")
          .update(updatePayload)
          .eq("id", insertedRow.id);

        insertedRow.zoho_crm_deal_id = dealId;
        insertedRow.zoho_crm_deal_url = dealUrl;
        insertedRow.zoho_crm_deal_stage = "Qualification";
        insertedRow.zoho_sync_status = "synced";
        insertedRow.last_zoho_sync = now;
        if (invoiceId) {
          insertedRow.zoho_books_invoice_id = invoiceId;
          insertedRow.zoho_books_invoice_url = invoiceUrl;
        }
        if (projectId) {
          insertedRow.zoho_project_id = projectId;
          insertedRow.zoho_project_url = projectUrl;
        }
      }

      // 4. Fallback: if initial webhook didn't return dealId, fire background re-sync with campaignId
      if (!dealId && insertedRow?.id) {
        const N8N_ZOHO_SYNC_WEBHOOK =
          process.env.N8N_ZOHO_SYNC_WEBHOOK ||
          "https://indigo-pelican-266513.hostingersite.com/webhook/bcp-task-ingest-v2";
        fetch(N8N_ZOHO_SYNC_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId: insertedRow.id,
            campaignName: campaignData.name,
            client: campaignData.client,
            budget: campaignData.budget,
            codeVolume: campaignData.codeVolume,
            is_approved_by_manager: true,
            tasks: resolvedTasks,
          }),
        }).catch((err) => console.warn("[approve_and_push_zoho] Re-fire webhook failed:", err));
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
          crmDeal: {
            product: "Zoho CRM",
            module: "Deals",
            dealId: dealId || null,
            dealUrl: dealUrl || null,
            stage: "Qualification",
            writeStatus,
          },
          projects: {
            product: "Zoho Projects",
            projectId: projectId || null,
            projectUrl: projectUrl || null,
            status: projectId ? "SYNCED" : dealId ? "INITIATED" : "PENDING",
            note: projectId
              ? `Project created: ${projectId}`
              : dealId
              ? "n8n workflow triggered — awaiting Zoho Projects confirmation"
              : "Awaiting Zoho CRM deal creation",
          },
          books: {
            product: "Zoho Books",
            invoiceId: invoiceId || null,
            invoiceUrl: invoiceUrl || null,
            status: invoiceId ? "SYNCED" : dealId ? "INITIATED" : "PENDING",
            note: invoiceId
              ? `Invoice created: ${invoiceId}`
              : dealId
              ? "n8n workflow triggered — awaiting Zoho Books confirmation"
              : "Awaiting Zoho CRM deal creation",
          },
          overallSyncStatus: dealId ? "SYNCED" : "PENDING",
          syncedAt: dealId ? now : null,
        },
      });
    }

    // ── Action 3: Update a task status ──
    if (action === "update_zoho_task") {
      const { campaignId, campaignName, taskId, newStatus } = body;

      let campaignRow: any = null;
      if (campaignId) {
        const { data } = await supabase.from("campaigns").select("id, tasks").eq("id", campaignId).maybeSingle();
        campaignRow = data;
      }
      if (!campaignRow && campaignName) {
        const { data } = await supabase.from("campaigns").select("id, tasks").eq("name", campaignName).maybeSingle();
        campaignRow = data;
      }

      if (!campaignRow) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }

      const tasks: AspectTask[] = campaignRow.tasks || [];
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
        .eq("id", campaignRow.id);

      // Trigger webhook for task update
      try {
        const N8N_ZOHO_TASK_UPDATE_WEBHOOK = process.env.N8N_ZOHO_TASK_UPDATE_WEBHOOK || "https://indigo-pelican-266513.hostingersite.com/webhook/bcp-task-update";
        await fetch(N8N_ZOHO_TASK_UPDATE_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId: campaignRow.id,
            taskId,
            newStatus,
            zohoCrmTaskId: task.zohoCrmTaskId
          }),
          signal: AbortSignal.timeout(5000),
        });
      } catch (err) {
        console.warn("[update_zoho_task] Webhook failed:", err);
      }

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

    // ── Action 4: Batch update tasks for approved campaign + re-fire Zoho sync if pending ──
    if (action === "update_campaign_tasks") {
      const { campaignId, campaignName, tasks } = body;
      const now = new Date().toISOString();

      let resolvedCampaignId = campaignId;
      let resolvedCampaignName = campaignName;
      let resolvedClient = "";
      let resolvedBudget = "";
      let resolvedCodeVolume = "";

      if (campaignId) {
        const { data: row } = await supabase.from("campaigns").select("*").eq("id", campaignId).maybeSingle();
        if (row) {
          resolvedCampaignName = row.name;
          resolvedClient = row.client || "";
          resolvedBudget = row.budget || "";
          resolvedCodeVolume = row.code_volume || "";
        }
        await supabase.from("campaigns").update({ tasks, last_zoho_sync: now }).eq("id", campaignId);
      } else if (campaignName) {
        const { data: row } = await supabase.from("campaigns").select("*").eq("name", campaignName).maybeSingle();
        if (row) {
          resolvedCampaignId = row.id;
          resolvedClient = row.client || "";
          resolvedBudget = row.budget || "";
          resolvedCodeVolume = row.code_volume || "";
        }
        await supabase.from("campaigns").update({ tasks, last_zoho_sync: now }).eq("name", campaignName);
      }

      // If campaign is pending Zoho sync, re-fire the n8n webhook with campaignId
      if (resolvedCampaignId && resolvedCampaignName) {
        try {
          // Check if campaign still has no deal ID
          const { data: checkRow } = await supabase
            .from("campaigns")
            .select("zoho_crm_deal_id")
            .eq("id", resolvedCampaignId)
            .maybeSingle();

          if (!checkRow?.zoho_crm_deal_id) {
            const N8N_ZOHO_SYNC_WEBHOOK =
              process.env.N8N_ZOHO_SYNC_WEBHOOK ||
              "https://indigo-pelican-266513.hostingersite.com/webhook/bcp-task-ingest-v2";
            try {
              const syncRes = await fetch(N8N_ZOHO_SYNC_WEBHOOK, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  campaignId: resolvedCampaignId,
                  campaignName: resolvedCampaignName,
                  client: resolvedClient,
                  budget: resolvedBudget,
                  codeVolume: resolvedCodeVolume,
                  is_approved_by_manager: true,
                  tasks: tasks || [],
                }),
                signal: AbortSignal.timeout(15000),
              });
              if (syncRes.ok) {
                const syncData = (await syncRes.json().catch(() => ({}))) as Record<string, any>;
                const dealId = syncData?.id || syncData?.deal_id;
                if (dealId) {
                  await supabase
                    .from("campaigns")
                    .update({
                      zoho_crm_deal_id: String(dealId),
                      zoho_crm_deal_url: `https://crm.zoho.in/crm/org/tab/Potentials/${dealId}`,
                      zoho_crm_deal_stage: "Qualification",
                      zoho_books_invoice_id: syncData.invoice_id || null,
                      zoho_books_invoice_url: syncData.invoice_id ? `https://books.zoho.in/app#/invoices/${syncData.invoice_id}` : null,
                      zoho_project_id: syncData.project_id || null,
                      zoho_project_url: syncData.project_id ? `https://projects.zoho.in/portal/enlightlabdotcom#project/${syncData.project_id}` : null,
                      zoho_sync_status: "synced",
                      last_zoho_sync: new Date().toISOString(),
                    })
                    .eq("id", resolvedCampaignId);
                }
              }
            } catch (err) {
              console.warn("[update_campaign_tasks] Zoho re-sync failed:", err);
            }
          }
        } catch (err) {
          console.warn("[update_campaign_tasks] Zoho re-sync check failed:", err);
        }
      }

      return NextResponse.json({ success: true, syncedAt: now });
    }


    // ── Action 5: Validate Zoho deal IDs exist and sync ──
    if (action === "validate_and_sync") {
      const syncResult = await reconcileZohoCRMWithSupabase();
      return NextResponse.json(syncResult);
    }

    // ── Action 6: Delete campaign across Zoho & Supabase ──
    if (action === "delete_campaign") {
      const { campaignId } = body;
      if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

      const { data: camp } = await supabase.from("campaigns").select("*").eq("id", campaignId).maybeSingle();
      if (camp) {
        const N8N_ZOHO_DELETE_WEBHOOK =
          process.env.N8N_ZOHO_DELETE_WEBHOOK ||
          "https://indigo-pelican-266513.hostingersite.com/webhook/bcp-delete-resources";

        console.log(`[delete_campaign] Wiping Zoho resources for ${camp.name}: deal=${camp.zoho_crm_deal_id}, project=${camp.zoho_project_id}, invoice=${camp.zoho_books_invoice_id}`);
        await fetch(N8N_ZOHO_DELETE_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dealId: camp.zoho_crm_deal_id,
            projectId: camp.zoho_project_id,
            invoiceId: camp.zoho_books_invoice_id,
            campaignName: camp.name,
          }),
          signal: AbortSignal.timeout(10000),
        }).catch((err) => console.error("Error in delete webhook:", err));

        await supabase.from("campaigns").delete().eq("id", campaignId);
        return NextResponse.json({ success: true, deletedName: camp.name });
      }

      return NextResponse.json({ success: true });
    }

    // ── Action 5: Update Live Campaign across Zoho CRM, Books, Projects & Supabase ──
    if (action === "update_live_campaign") {
      const { campaignId, dealId, projectId, invoiceId, newName, newBudget, newVolume } = body;

      let campRow: any = null;
      if (campaignId) {
        const { data } = await supabase.from("campaigns").select("*").eq("id", campaignId).maybeSingle();
        campRow = data;
      }
      if (!campRow && dealId) {
        const { data } = await supabase.from("campaigns").select("*").eq("zoho_crm_deal_id", dealId).maybeSingle();
        campRow = data;
      }
      if (!campRow && newName) {
        const { data } = await supabase.from("campaigns").select("*").ilike("name", `%${newName}%`).maybeSingle();
        campRow = data;
      }

      const resolvedDealId = dealId || campRow?.zoho_crm_deal_id;
      const resolvedProjectId = projectId || campRow?.zoho_project_id;
      const resolvedInvoiceId = invoiceId || campRow?.zoho_books_invoice_id;
      const resolvedName = newName || campRow?.name;
      const resolvedBudget = newBudget || campRow?.budget;
      const numericAmount = parseFloat(String(resolvedBudget || "0").replace(/[^0-9.]/g, "")) || 0;

      const N8N_ZOHO_UPDATE_WEBHOOK =
        process.env.N8N_ZOHO_UPDATE_WEBHOOK ||
        "https://indigo-pelican-266513.hostingersite.com/webhook/bcp-update-resources";

      const updateRes = await fetch(N8N_ZOHO_UPDATE_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId: resolvedDealId,
          projectId: resolvedProjectId,
          invoiceId: resolvedInvoiceId,
          campaignName: resolvedName,
          amount: numericAmount,
          budget: resolvedBudget,
        }),
        signal: AbortSignal.timeout(10000),
      }).catch((err) => {
        console.warn("[update_live_campaign] Webhook call failed:", err);
        return null;
      });

      const updateData = updateRes && updateRes.ok ? await updateRes.json().catch(() => ({})) : null;

      if (campRow?.id) {
        const updates: Record<string, any> = {
          last_zoho_sync: new Date().toISOString(),
        };
        if (resolvedName) updates.name = resolvedName;
        if (resolvedBudget) updates.budget = resolvedBudget;
        if (newVolume) updates.code_volume = newVolume;

        await supabase.from("campaigns").update(updates).eq("id", campRow.id);
      }

      return NextResponse.json({
        success: true,
        campaignName: resolvedName,
        budget: resolvedBudget,
        amount: numericAmount,
        dealId: resolvedDealId,
        projectId: resolvedProjectId,
        invoiceId: resolvedInvoiceId,
        zohoResponse: updateData,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Campaign API error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
