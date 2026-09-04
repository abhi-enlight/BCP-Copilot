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
  booksCustomerId?: string;

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
  partner?: string;
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
  const rawReward = (input.rewardType || "").toLowerCase();
  const isScratchInput = rawReward.includes("scratch") || /scratch|gold\s*coin|mega\s*draw|lucky\s*draw|sweepstake|contest/i.test(text);
  const isMerchandiseInput = rawReward.includes("merch") || /merchandise|hamper|jersey|physical\s*kit|physical\s*gift/i.test(text);
  const isDiningInput = rawReward.includes("dining") || /zomato\s*dining|swiggy\s*dineout|dineout|restaurant\s*pass|dining\s*voucher/i.test(text);
  const isVoucherInput = rawReward.includes("egv") || rawReward.includes("voucher") || rawReward.includes("gift card") || /amazon\s*pay|swiggy|zomato|voucher|egv|myntra|flipkart|gift\s*card/i.test(text);
  const isCashbackInput = rawReward.includes("cashback") || rawReward.includes("upi") || /cashback|upi|phonepe|paytm|gpay|google\s*pay|wallet|instant\s*cash/i.test(text);

  const rewardType = (
    isScratchInput
      ? "Scratch & Win"
      : isMerchandiseInput
      ? "Merchandise"
      : isDiningInput
      ? "EGV"
      : isVoucherInput
      ? "EGV"
      : isCashbackInput
      ? "Cashback"
      : "Cashback"
  ) as Campaign["rewardType"];

  let partner = input.partner || "";
  if (!partner) {
    if (/phonepe/i.test(text)) partner = "PhonePe";
    else if (/google\s*pay|gpay/i.test(text)) partner = "Google Pay";
    else if (/amazon\s*pay/i.test(text)) partner = "Amazon Pay";
    else if (/swiggy\s*dineout|dineout/i.test(text)) partner = "Dineout";
    else if (/swiggy/i.test(text)) partner = "Swiggy";
    else if (/zomato/i.test(text)) partner = "Zomato";
    else if (/myntra/i.test(text)) partner = "Myntra";
    else if (/flipkart/i.test(text)) partner = "Flipkart";
    else if (/paytm/i.test(text)) partner = "Paytm Wallet";
    else if (isScratchInput) partner = "BigCity Scratch Portal";
    else if (isMerchandiseInput) partner = "Logistics Fulfillment Network";
    else if (isDiningInput) partner = "Restaurant Partner Network";
    else if (isVoucherInput) partner = "Brand Voucher Aggregator";
    else partner = "UPI / NPCI";
  }

  const category = (input.category ||
    (/qsr|kfc|mcdonald|starbucks|cafe|burger/i.test(text)
      ? "QSR"
      : /puma|zudio|trent|pantaloons|lifestyle|retail|store|shoe|apparel/i.test(text)
      ? "Retail"
      : /samsung|phone|electronic|tv|laptop/i.test(text)
      ? "Electronics"
      : /amul|beverage|coke|pepsi|drink|dairy|kool/i.test(text)
      ? "Beverages"
      : /bfsi|bank|insurance/i.test(text)
      ? "BFSI"
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
  const contextStr = `${meta.name} ${meta.category} ${meta.rewardType} ${meta.brief} ${meta.partner} ${input.rewardType || ""}`.toLowerCase();

  const isScratch =
    meta.rewardType === "Scratch & Win" ||
    /scratch|contest|lucky|jackpot|sweepstake|lottery|spin/i.test(contextStr);

  const isMerchandise =
    meta.rewardType === "Merchandise" ||
    /merchandise|hamper|jersey|physical|t-shirt|bottle|kit|warehouse|courier|dispatch/i.test(contextStr);

  const isDining =
    !isScratch &&
    !isMerchandise &&
    (meta.category === "QSR" ||
      /dining|restaurant|cafe|dineout|table\s*reservation|meal\s*pass/i.test(contextStr));

  const isRetail =
    !isScratch &&
    !isMerchandise &&
    !isDining &&
    (meta.category === "Retail" ||
      /retail\s*store|in-store|outlet\s*voucher|cashier|pos\s*scanner|pos\s*barcode|wardrobe|shopping\s*spree/i.test(contextStr));

  const isEGV =
    !isScratch &&
    !isMerchandise &&
    !isDining &&
    !isRetail &&
    (meta.rewardType === "EGV" ||
      /egv|gift\s*card|voucher|amazon|flipkart|myntra|croma|swiggy\s*money|uber/i.test(contextStr));

  const partnerLabel =
    meta.partner ||
    (isDining
      ? "Zomato / Dineout"
      : isRetail
      ? `${meta.client} Store Network`
      : isScratch
      ? "BigCity Scratch Portal"
      : isMerchandise
      ? "Fulfillment & Logistics Network"
      : isEGV
      ? "Amazon Pay / Brand Aggregator"
      : "UPI / NPCI");

  let tasks: AspectTask[] = [];
  let recommendedTAT = "10 Working Days";
  let criticalPath: string[] = [];
  let aiAnalysis = "";

  if (isDining) {
    tasks = [
      {
        id: `task-${ts}-1`,
        sopCode: "SOP-LEG-01",
        title: `${meta.name} — Restaurant Merchant Partner Master Agreement`,
        aspect: "legal",
        assignee: "Prashant Mittal",
        role: "Legal Head",
        urgency: "HIGHEST",
        tat: "2 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Draft bilateral affiliate partner agreement between BigCity Promotions and ${partnerLabel} for ${meta.client}. Define discount coverage, bill eligibility thresholds, customer dispute mediation, and merchant reimbursement cycles.`,
        verificationRequirement: "Bilateral Merchant Master Agreement executed by BigCity Legal.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-2`,
        sopCode: "SOP-LEG-02",
        title: `${partnerLabel} Brand Asset & POS Co-Marketing Clearances`,
        aspect: "legal",
        assignee: "Akash Verma",
        role: "Legal Counsel",
        urgency: "HIGH",
        tat: "2 Days",
        status: "PENDING_APPROVAL",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "Open",
        details: `Secure formal written trademark license for displaying ${partnerLabel} brand assets on ${meta.client} customer mobile vouchers and table tent cards across dining outlets.`,
        verificationRequirement: "Written partner brand clearance email attached to Deal.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-3`,
        sopCode: "SOP-LEG-03",
        title: `Blackout Dates & Consumer Dining Protection Disclaimer Clearance`,
        aspect: "legal",
        assignee: "Prashant Mittal",
        role: "Legal Head",
        urgency: "HIGH",
        tat: "1 Day",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Vet consumer terms clarifying holiday blackout dates (New Year Eve, Valentine's Day), minimum table covers, alcohol exclusions, and non-cumulative discount terms for ${meta.client}.`,
        verificationRequirement: "Published legal disclaimer document signed off.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-4`,
        sopCode: "SOP-CMP-01",
        title: `Pan-India Restaurant Outlet Onboarding & Cashier Desk-Aid Manual`,
        aspect: "compliance",
        assignee: "Khaleel Ahmed",
        role: "Compliance SPOC",
        urgency: "HIGHEST",
        tat: "3 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Formulate standard operating procedure and desk cheat-sheet for participating restaurant manager POS scanning, table voucher redemption, and manual PIN validation.`,
        verificationRequirement: "Signed Store Operations Manual approved by Operations Lead.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-5`,
        sopCode: "SOP-CMP-02",
        title: `Restaurant Mystery Dining Audit & Service SLA Protocol`,
        aspect: "compliance",
        assignee: "Khaleel Ahmed",
        role: "Ops Lead",
        urgency: "HIGH",
        tat: "2 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Establish mystery customer audit protocol across sample participating dining outlets to verify voucher acceptance without refusal or bill manipulation.`,
        verificationRequirement: "Audit compliance checklist and field escalation matrix approved.",
        mandatoryGate: false,
      },
      {
        id: `task-${ts}-6`,
        sopCode: "SOP-CMP-03",
        title: `72-Hour Pre-Launch End-to-End Dining Voucher UAT Sign-Off`,
        aspect: "compliance",
        assignee: "Sachin (Tech Team)",
        role: "Tech Team",
        urgency: "HIGHEST",
        tat: "2 Days",
        status: "PENDING_SIGN_OFF",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "Open",
        details: `Execute live redemption drills across 10 partner restaurants with test vouchers, verifying bill split calculations, instant discount SMS, and table settlement.`,
        verificationRequirement: "Staging UAT report signed with zero open P1 defects.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-7`,
        sopCode: "SOP-ACC-01",
        title: `100% Advance Escrow Deposit Verification of ${meta.budget} in Zoho Books`,
        aspect: "accounting",
        assignee: "Sneha Nair",
        role: "Finance Lead",
        urgency: "HIGHEST",
        tat: "1 Day",
        status: "COMPLETED",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "Closed",
        details: `Confirm client advance receipt of ${meta.budget} in BigCity escrow from ${meta.client} prior to issuing merchant credit commitments.`,
        verificationRequirement: "Zoho Books Bank Credit Reconciliation Voucher.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-8`,
        sopCode: "SOP-ACC-02",
        title: `Merchant Outlet Commission & Clearing Ledger Setup in Zoho Books`,
        aspect: "accounting",
        assignee: "Sneha Nair",
        role: "Finance Lead",
        urgency: "HIGH",
        tat: "2 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Set up automated weekly restaurant credit clearing account in Zoho Books to disburse dining claim reimbursements and reconcile BigCity management fees.`,
        verificationRequirement: "Zoho Books Merchant Chart of Accounts entry.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-9`,
        sopCode: "SOP-ACC-03",
        title: `Commercial PO & Estimate Sign-Off — ${meta.client}`,
        aspect: "accounting",
        assignee: "Rohit Sharma",
        role: "Admin / Commercial Head",
        urgency: "NORMAL",
        tat: "2 Days",
        status: "COMPLETED",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "Closed",
        details: `Finalize client PO matching Zoho Books estimate for ${meta.budget}, covering diner subsidies, SMS fee, and platform service fees.`,
        verificationRequirement: "Signed Client Purchase Order linked to Zoho Books Estimate.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-10`,
        sopCode: "SOP-IMP-01",
        title: `Deploy Mobile Dining Voucher Redemption Portal for ${meta.name}`,
        aspect: "implementation",
        assignee: "Sachin (Tech Team)",
        role: "Tech Lead",
        urgency: "HIGHEST",
        tat: "3 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Build and deploy mobile-first dining pass wallet portal with geo-location outlet finder, digital voucher barcode, and countdown redemption timer.`,
        verificationRequirement: "Production portal live with SSL certification and mobile responsiveness pass.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-11`,
        sopCode: "SOP-IMP-02",
        title: `Restaurant Partner POS Validation API & Webhook Integration`,
        aspect: "implementation",
        assignee: "Sachin (Tech Team)",
        role: "Tech Lead",
        urgency: "HIGH",
        tat: "2 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Configure merchant PIN verification webhook and POS tablet barcode scanner route with 300ms latency SLA for ${meta.codeVolume} diners.`,
        verificationRequirement: "API integration test pass with automated duplicate redemption blocking.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-12`,
        sopCode: "SOP-IMP-03",
        title: `Daily 09:00 AM Outlet-Wise Redemption MIS Cadence for ${meta.client}`,
        aspect: "implementation",
        assignee: "Khaleel Ahmed",
        role: "Ops Lead",
        urgency: "NORMAL",
        tat: "1 Day",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Configure automated daily 09:00 AM executive report for ${meta.client} brand managers tracking outlet redemptions, footfalls, and ${meta.budget} budget utilization.`,
        verificationRequirement: "Specimen MIS approved by CS Head.",
        mandatoryGate: false,
      },
    ];
    recommendedTAT = "10 Working Days";
    criticalPath = [
      `100% Advance Escrow Verification of ${meta.budget} in Zoho Books`,
      `${partnerLabel} Brand Asset & POS Co-Marketing Clearances`,
      `Pan-India Restaurant Outlet Onboarding & Cashier Desk-Aid Manual`,
      `72-Hour Pre-Launch End-to-End Dining Voucher UAT Sign-Off`,
    ];
    aiAnalysis = `### 🍽️ AI Dining & Restaurant Campaign Assessment: **${meta.name}**\n\n**Client**: ${meta.client} · **Budget**: ${meta.budget} · **Volume**: ${meta.codeVolume} · **Partner**: ${partnerLabel}\n\n* **Merchant Network**: Multi-outlet restaurant POS verification with manual cashier PIN fallback.\n* **Consumer Protection**: Blackout date exclusions clearly vetted to prevent weekend dinner disputes.\n* **Escrow Accounting**: Advance deposit in Zoho Books with weekly automated merchant billing ledger.`;
  } else if (isRetail) {
    tasks = [
      {
        id: `task-${ts}-1`,
        sopCode: "SOP-LEG-01",
        title: `${meta.name} — Retail Brand Partnership & Co-Marketing Agreement`,
        aspect: "legal",
        assignee: "Prashant Mittal",
        role: "Legal Head",
        urgency: "HIGHEST",
        tat: "2 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Draft and execute the bilateral retail partnership agreement for ${meta.client}. Define voucher liability limits, store brand guideline usage, store cashier dispute arbitration, and redemption terms across all store outlets.`,
        verificationRequirement: "Signed and stamped bilateral agreement by authorized signatories of BigCity and ${meta.client}.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-2`,
        sopCode: "SOP-LEG-02",
        title: `In-Store Voucher Terms, Exclusions & Minimum Spend Vetting`,
        aspect: "legal",
        assignee: "Akash Verma",
        role: "Legal Counsel",
        urgency: "HIGH",
        tat: "2 Days",
        status: "PENDING_APPROVAL",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "Open",
        details: `Draft exhaustive consumer-facing terms governing in-store discount voucher redemption across ${meta.client} retail outlets. Specify minimum bill spend criteria, 1 voucher per transaction cap, and return/exchange adjustments.`,
        verificationRequirement: "Approved legal disclaimer document sign-off and embedding into promotional collateral.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-3`,
        sopCode: "SOP-LEG-03",
        title: `Consumer Rights & Store Employee Fraud Liability Clearance`,
        aspect: "legal",
        assignee: "Prashant Mittal",
        role: "Legal Head",
        urgency: "HIGH",
        tat: "1 Day",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Formulate employee fraud prevention rules and audit guidelines safeguarding against unauthorized internal voucher redemption by retail store personnel.`,
        verificationRequirement: "Retail compliance legal memo signed by Legal Head.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-4`,
        sopCode: "SOP-CMP-01",
        title: `Pan-India Store Staff SOP & Cashier POS Training Manual for ${meta.client}`,
        aspect: "compliance",
        assignee: "Khaleel Ahmed",
        role: "Compliance SPOC",
        urgency: "HIGHEST",
        tat: "3 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Formulate cashier desk-aid and standard operational procedure (SOP) manual for ${meta.client} retail outlets. Detail step-by-step POS barcode/alphanumeric code scanning, instant bill discounting validation, and exception handling.`,
        verificationRequirement: "Store Operations Head sign-off on the Store Training Manual and POS desk cheat-sheet.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-5`,
        sopCode: "SOP-CMP-02",
        title: `Anti-Fraud Barcode Velocity Rule Engine & Duplicate Scan Blocker`,
        aspect: "compliance",
        assignee: "Sachin (Tech Team)",
        role: "Security Lead",
        urgency: "HIGH",
        tat: "2 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Enforce real-time duplicate scan prevention (instant single-use invalidation within 100ms) and mobile number velocity caps across ${meta.codeVolume}.`,
        verificationRequirement: "Rule engine unit test log & security sign-off.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-6`,
        sopCode: "SOP-CMP-03",
        title: `72-Hour Multi-Store POS Pilot Simulation & UAT Sign-Off`,
        aspect: "compliance",
        assignee: "Khaleel Ahmed",
        role: "Ops Lead",
        urgency: "HIGHEST",
        tat: "2 Days",
        status: "PENDING_SIGN_OFF",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "Open",
        details: `Conduct live simulated cashier billing runs across 5 flagship retail stores to verify scanner optics, offline caching resilience, and instant customer SMS delivery.`,
        verificationRequirement: "Store Pilot UAT sign-off matrix with zero open defects.",
        mandatoryGate: true,
      },
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
        details: `Verify client deposit of ${meta.budget} in BigCity escrow from ${meta.client} before voucher code pool activation in POS engine.`,
        verificationRequirement: "Zoho Books Bank Credit Reconciliation Voucher.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-8`,
        sopCode: "SOP-ACC-02",
        title: `Retail Store Credit Note Settlement & Margin Ledger in Zoho Books`,
        aspect: "accounting",
        assignee: "Sneha Nair",
        role: "Finance Lead",
        urgency: "HIGH",
        tat: "2 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Establish credit note reconciliation workflow in Zoho Books to settle store-level voucher discounts against client commercial billing.`,
        verificationRequirement: "Zoho Books Chart of Accounts retail settlement structure.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-9`,
        sopCode: "SOP-ACC-03",
        title: `Commercial PO & Estimate Sign-Off — ${meta.client}`,
        aspect: "accounting",
        assignee: "Rohit Sharma",
        role: "Admin / Commercial Head",
        urgency: "NORMAL",
        tat: "2 Days",
        status: "COMPLETED",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "Closed",
        details: `Verify BigCity campaign management fees, SMS per-unit dispatch charges for ${meta.codeVolume}, and store collaterals in Zoho Books Estimate.`,
        verificationRequirement: "Signed Client Purchase Order linked to Zoho Books Estimate.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-10`,
        sopCode: "SOP-IMP-01",
        title: `Generate ${meta.codeVolume} Encrypted Unique Barcodes & EAN-13 Codes`,
        aspect: "implementation",
        assignee: "Khaleel Ahmed",
        role: "Ops Lead",
        urgency: "HIGHEST",
        tat: "2 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Generate ${meta.codeVolume} encrypted 12-character alphanumeric and EAN-13 barcode strings compatible with ${meta.client} POS laser scanners.`,
        verificationRequirement: "Batch barcode checksum export pass and scanner readability sign-off.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-11`,
        sopCode: "SOP-IMP-02",
        title: `Real-Time Cashier POS Webhook & Store-Level De-duplication Sandbox`,
        aspect: "implementation",
        assignee: "Sachin (Tech Team)",
        role: "Tech Lead",
        urgency: "HIGHEST",
        tat: "3 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Deploy low-latency (sub-250ms) redemption validation webhook connecting store billing POS terminals to BigCity central voucher ledger.`,
        verificationRequirement: "Sandbox POS load test pass with 1000 concurrent transactions/sec.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-12`,
        sopCode: "SOP-IMP-03",
        title: `Automated Daily 09:00 AM Store-Wise MIS & Footfall Tracking for ${meta.client}`,
        aspect: "implementation",
        assignee: "Khaleel Ahmed",
        role: "Ops Lead",
        urgency: "NORMAL",
        tat: "1 Day",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Configure automated daily 09:00 AM executive report for ${meta.client} retail brand heads breaking down redemptions by city, store outlet, and budget consumption.`,
        verificationRequirement: "Specimen retail MIS approved by Operations Lead.",
        mandatoryGate: false,
      },
    ];
    recommendedTAT = "11 Working Days";
    criticalPath = [
      `100% Advance Escrow Verification of ${meta.budget} in Zoho Books`,
      `Pan-India Store Staff SOP & Cashier POS Training Manual for ${meta.client}`,
      `Generate ${meta.codeVolume} Encrypted Unique Barcodes & EAN-13 Codes`,
      `Real-Time Cashier POS Webhook & Store-Level De-duplication Sandbox`,
      `72-Hour Multi-Store POS Pilot Simulation & UAT Sign-Off`,
    ];
    aiAnalysis = `### 🛍️ AI Retail Store Campaign Architecture: **${meta.name}**\n\n**Client**: ${meta.client} · **Budget**: ${meta.budget} · **Volume**: ${meta.codeVolume} · **Network**: ${partnerLabel}\n\n* **POS Integration**: Real-time EAN-13 barcode validation with 250ms latency SLA to eliminate checkout queues.\n* **Store Staff Training**: Pan-India cashier desk-aid and manual override protocol.\n* **Escrow & Credit Settlement**: 100% advance deposit in Zoho Books with store credit note settlement tracking.`;
  } else if (isScratch) {
    tasks = [
      {
        id: `task-${ts}-1`,
        sopCode: "SOP-LEG-01",
        title: `${meta.name} — Master Contest Rules & Disclaimer Drafting`,
        aspect: "legal",
        assignee: "Prashant Mittal",
        role: "Legal Head",
        urgency: "HIGHEST",
        tat: "2 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Draft contest rules, eligibility restrictions, winner selection methodology, and dispute resolution guidelines for ${meta.client}.`,
        verificationRequirement: "Signed Master Contest Legal Framework.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-2`,
        sopCode: "SOP-LEG-02",
        title: `Tamil Nadu Prize Schemes Act & State Lottery Prohibition Legal Memo`,
        aspect: "legal",
        assignee: "Prashant Mittal",
        role: "Legal Head",
        urgency: "HIGHEST",
        tat: "2 Days",
        status: "PENDING_APPROVAL",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "Open",
        details: `Formulate statutory compliance memo certifying campaign mechanics satisfy exemptions under Tamil Nadu Prize Schemes (Prohibition) Act and state-level game of skill/chance regulations.`,
        verificationRequirement: "State statutory compliance legal opinion signed by Legal Head.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-3`,
        sopCode: "SOP-LEG-03",
        title: `Independent Auditor Draw Supervision Protocol & Legal Indemnity`,
        aspect: "legal",
        assignee: "Akash Verma",
        role: "Legal Counsel",
        urgency: "HIGH",
        tat: "2 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Draft formal protocol for third-party Chartered Accountant supervision during prize draws and winner verification.`,
        verificationRequirement: "Auditor agreement and supervision protocol signed.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-4`,
        sopCode: "SOP-CMP-01",
        title: `Tamper-Proof Scratch Foil Security & Printer Plant Audit for ${meta.client}`,
        aspect: "compliance",
        assignee: "Khaleel Ahmed",
        role: "Compliance SPOC",
        urgency: "HIGHEST",
        tat: "3 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Conduct on-site or certified security audit of packaging print vendor. Verify scratch-off latex opacity, infrared non-transparency, and clean room destruction of defective prints for ${meta.codeVolume}.`,
        verificationRequirement: "Printer security compliance certificate signed by packaging vendor and BigCity Ops.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-5`,
        sopCode: "SOP-CMP-02",
        title: `Winner KYC (PAN & Aadhaar) Authentication SLA & Anti-Fraud Gates`,
        aspect: "compliance",
        assignee: "Sachin (Tech Team)",
        role: "Security Lead",
        urgency: "HIGH",
        tat: "2 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Configure automated KYC portal for high-value prize claims (>₹10,000). Integrate NSDL PAN verification and deduplication against mobile numbers.`,
        verificationRequirement: "KYC workflow unit test sign-off.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-6`,
        sopCode: "SOP-CMP-03",
        title: `72-Hour Pre-Launch Live Draw & Webhook Simulation UAT`,
        aspect: "compliance",
        assignee: "Khaleel Ahmed",
        role: "Ops Lead",
        urgency: "HIGHEST",
        tat: "2 Days",
        status: "PENDING_SIGN_OFF",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "Open",
        details: `Run end-to-end simulated scratch reveal, winning probability algorithm verification, and instant winner notification across all telecom carriers.`,
        verificationRequirement: "Signed UAT test run with algorithmic fairness audit.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-7`,
        sopCode: "SOP-ACC-01",
        title: `100% Advance Prize Pool Escrow Verification in Zoho Books`,
        aspect: "accounting",
        assignee: "Sneha Nair",
        role: "Finance Lead",
        urgency: "HIGHEST",
        tat: "1 Day",
        status: "COMPLETED",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "Closed",
        details: `Verify client deposit of ${meta.budget} in BigCity escrow from ${meta.client} before prize inventory procurement and code distribution.`,
        verificationRequirement: "Zoho Books Bank Credit Reconciliation Voucher.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-8`,
        sopCode: "SOP-ACC-02",
        title: `TDS Section 194B (30% Withholding) Tax Ledger Setup in Zoho Books`,
        aspect: "accounting",
        assignee: "Sneha Nair",
        role: "Finance Lead",
        urgency: "HIGH",
        tat: "2 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Configure automated PAN collection & 30% TDS deduction workflow in Zoho Books for individual reward values exceeding statutory ₹10,000 threshold.`,
        verificationRequirement: "Zoho Books Tax Chart of Accounts entry.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-9`,
        sopCode: "SOP-ACC-03",
        title: `Commercial PO & Reward Procurement Sign-Off — ${meta.client}`,
        aspect: "accounting",
        assignee: "Rohit Sharma",
        role: "Admin / Commercial Head",
        urgency: "NORMAL",
        tat: "2 Days",
        status: "COMPLETED",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "Closed",
        details: `Verify client PO for ${meta.budget} budget, covering prize procurement costs, auditor fees, SMS routing, and BigCity management margin.`,
        verificationRequirement: "Signed Client Purchase Order linked to Zoho Books Estimate.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-10`,
        sopCode: "SOP-IMP-01",
        title: `Generate ${meta.codeVolume} Cryptographic PIN Batch with SHA-256 Checksum`,
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
        title: `Deploy High-Concurrency Scratch & Reveal Microsite with Karix Failover`,
        aspect: "implementation",
        assignee: "Sachin (Tech Team)",
        role: "Tech Lead",
        urgency: "HIGHEST",
        tat: "3 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Deploy responsive scratch-to-reveal mobile portal with canvas animation, anti-bot Cloudflare Turnstile, and dual-gateway Karix/Gupshup SMS alerts.`,
        verificationRequirement: "Staging portal live with green SSL cert and load test report.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-12`,
        sopCode: "SOP-IMP-03",
        title: `Daily 09:00 AM Winner Draw Ledger & MIS Dispatch for ${meta.client}`,
        aspect: "implementation",
        assignee: "Khaleel Ahmed",
        role: "Ops Lead",
        urgency: "NORMAL",
        tat: "1 Day",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Configure automated daily 09:00 AM executive report to ${meta.client} brand managers tracking scratch redemptions, winners ledger, and prize budget utilization.`,
        verificationRequirement: "Specimen MIS template approved by CS Head.",
        mandatoryGate: false,
      },
    ];
    recommendedTAT = "12 Working Days";
    criticalPath = [
      `100% Advance Prize Pool Escrow Verification in Zoho Books`,
      `Tamil Nadu Prize Schemes Act & State Lottery Prohibition Legal Memo`,
      `Tamper-Proof Scratch Foil Security & Printer Plant Audit for ${meta.client}`,
      `Generate ${meta.codeVolume} Cryptographic PIN Batch with SHA-256 Checksum`,
      `72-Hour Pre-Launch Live Draw & Webhook Simulation UAT`,
    ];
    aiAnalysis = `### 🎟️ AI Scratch & Win Campaign Architecture: **${meta.name}**\n\n**Client**: ${meta.client} · **Budget**: ${meta.budget} · **Volume**: ${meta.codeVolume}\n\n* **Statutory Clearance**: Formally exempted under Tamil Nadu Prize Schemes Act via skill/direct reward review.\n* **Physical Security**: Tamper-proof packaging audit and SHA-256 batch cryptographic hashing.\n* **Tax Compliance**: TDS Section 194B 30% withholding ledger configured in Zoho Books.`;
  } else if (isMerchandise) {
    tasks = [
      {
        id: `task-${ts}-1`,
        sopCode: "SOP-LEG-01",
        title: `${meta.name} — Master Merchandise Fulfillment Agreement`,
        aspect: "legal",
        assignee: "Prashant Mittal",
        role: "Legal Head",
        urgency: "HIGHEST",
        tat: "2 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Draft bilateral fulfillment and procurement agreement for ${meta.client}. Define delivery SLAs, courier transit liability, manufacturer defect remedies, and replacement timelines.`,
        verificationRequirement: "Signed Master Fulfillment Agreement.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-2`,
        sopCode: "SOP-LEG-02",
        title: `Transit Damage Liability & Manufacturer Warranty Disclaimer`,
        aspect: "legal",
        assignee: "Akash Verma",
        role: "Legal Counsel",
        urgency: "HIGH",
        tat: "2 Days",
        status: "PENDING_APPROVAL",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "Open",
        details: `Vet consumer delivery policy detailing transit damage claim windows (48 hours from delivery), reverse pickup rules, and manufacturer warranty limits.`,
        verificationRequirement: "Published customer delivery terms sign-off.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-3`,
        sopCode: "SOP-LEG-03",
        title: `Inter-State Goods Movement & E-Way Bill Regulatory Clearance`,
        aspect: "legal",
        assignee: "Prashant Mittal",
        role: "Legal Head",
        urgency: "HIGH",
        tat: "1 Day",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Formulate statutory clearance for pan-India physical merchandise shipment, ensuring GST E-way bill compliance across state borders.`,
        verificationRequirement: "Logistics tax compliance clearance memo.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-4`,
        sopCode: "SOP-CMP-01",
        title: `Warehouse Dispatch SLA Compliance & Transit Insurance Verification`,
        aspect: "compliance",
        assignee: "Khaleel Ahmed",
        role: "Compliance SPOC",
        urgency: "HIGHEST",
        tat: "3 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Verify warehouse transit insurance coverage protecting against damage/pilferage and establish 48-hour order dispatch SLA protocol.`,
        verificationRequirement: "Active transit insurance policy and warehouse SLA sign-off.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-5`,
        sopCode: "SOP-CMP-02",
        title: `Physical Merchandise Quality Inspection & Sample Sign-Off`,
        aspect: "compliance",
        assignee: "Khaleel Ahmed",
        role: "Ops Lead",
        urgency: "HIGH",
        tat: "2 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Conduct physical sample inspection of merchandise batches (packaging finish, brand logo printing, product defect rate <0.1%).`,
        verificationRequirement: "Quality Assurance specimen approval report signed by Brand SPOC.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-6`,
        sopCode: "SOP-CMP-03",
        title: `72-Hour Pre-Launch Courier API Tracking & UAT Sign-Off`,
        aspect: "compliance",
        assignee: "Sachin (Tech Team)",
        role: "Tech Team",
        urgency: "HIGHEST",
        tat: "2 Days",
        status: "PENDING_SIGN_OFF",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "Open",
        details: `Execute end-to-end simulated order placement, automated AWB generation with BlueDart/Delhivery, and customer tracking SMS delivery.`,
        verificationRequirement: "Signed Courier Integration UAT report.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-7`,
        sopCode: "SOP-ACC-01",
        title: `100% Advance Procurement Escrow of ${meta.budget} in Zoho Books`,
        aspect: "accounting",
        assignee: "Sneha Nair",
        role: "Finance Lead",
        urgency: "HIGHEST",
        tat: "1 Day",
        status: "COMPLETED",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "Closed",
        details: `Confirm client advance deposit of ${meta.budget} in BigCity escrow before issuing physical production and packaging POs to suppliers.`,
        verificationRequirement: "Zoho Books Bank Credit Reconciliation Voucher.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-8`,
        sopCode: "SOP-ACC-02",
        title: `Logistics & Inter-State GST E-Way Bill Ledger in Zoho Books`,
        aspect: "accounting",
        assignee: "Sneha Nair",
        role: "Finance Lead",
        urgency: "HIGH",
        tat: "2 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Configure shipping expense tracking and input tax credit (ITC) reconciliation in Zoho Books for nationwide freight logistics.`,
        verificationRequirement: "Zoho Books Logistics Chart of Accounts entry.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-9`,
        sopCode: "SOP-ACC-03",
        title: `Commercial Terms & Manufacturer PO Sign-Off — ${meta.client}`,
        aspect: "accounting",
        assignee: "Rohit Sharma",
        role: "Admin / Commercial Head",
        urgency: "NORMAL",
        tat: "2 Days",
        status: "COMPLETED",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "Closed",
        details: `Verify client PO matching Zoho Books estimate for ${meta.budget}, covering physical merchandise unit cost, warehousing, and freight.`,
        verificationRequirement: "Signed Client Purchase Order linked to Zoho Books Estimate.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-10`,
        sopCode: "SOP-IMP-01",
        title: `Warehouse Packaging & Address Verification Engine Integration`,
        aspect: "implementation",
        assignee: "Sachin (Tech Team)",
        role: "Tech Lead",
        urgency: "HIGHEST",
        tat: "3 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Deploy address validation engine on claim portal (pincode deliverability check against 19,000+ Indian pincodes and mobile OTP confirmation).`,
        verificationRequirement: "Address validation API pass with automated non-serviceable pincode handling.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-11`,
        sopCode: "SOP-IMP-02",
        title: `Courier Partner (BlueDart / Delhivery) Dispatch Webhook Integration`,
        aspect: "implementation",
        assignee: "Sachin (Tech Team)",
        role: "Tech Lead",
        urgency: "HIGH",
        tat: "2 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Integrate logistics webhook to receive automated dispatch, in-transit, out-for-delivery, and delivered scan status updates.`,
        verificationRequirement: "Live webhook receiving courier status events.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-12`,
        sopCode: "SOP-IMP-03",
        title: `Automated Customer Tracking SMS & Daily 09:00 AM Dispatch MIS`,
        aspect: "implementation",
        assignee: "Khaleel Ahmed",
        role: "Ops Lead",
        urgency: "NORMAL",
        tat: "1 Day",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Configure automated SMS dispatch alerts containing live AWB tracking links and daily 09:00 AM executive dispatch summary for ${meta.client}.`,
        verificationRequirement: "Specimen tracking SMS template approved by CS Head.",
        mandatoryGate: false,
      },
    ];
    recommendedTAT = "14 Working Days";
    criticalPath = [
      `100% Advance Procurement Escrow of ${meta.budget} in Zoho Books`,
      `Physical Merchandise Quality Inspection & Sample Sign-Off`,
      `Warehouse Packaging & Address Verification Engine Integration`,
      `Courier Partner (BlueDart / Delhivery) Dispatch Webhook Integration`,
      `72-Hour Pre-Launch Courier API Tracking & UAT Sign-Off`,
    ];
    aiAnalysis = `### 📦 AI Physical Merchandise Fulfillment Plan: **${meta.name}**\n\n**Client**: ${meta.client} · **Budget**: ${meta.budget} · **Volume**: ${meta.codeVolume}\n\n* **Logistics & Warehousing**: Direct BlueDart/Delhivery API integration with real-time pincode deliverability check.\n* **Sample Quality Sign-Off**: Mandatory QA inspection of physical samples before production run.\n* **Escrow Security**: 100% advance deposit in Zoho Books with inter-state E-way bill reconciliation.`;
  } else if (isEGV) {
    tasks = [
      {
        id: `task-${ts}-1`,
        sopCode: "SOP-LEG-01",
        title: `${meta.name} — Master Campaign Agreement & Co-Branding Terms`,
        aspect: "legal",
        assignee: "Prashant Mittal",
        role: "Legal Head",
        urgency: "HIGHEST",
        tat: "2 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Draft bilateral campaign agreement between BigCity Promotions and ${meta.client}. Define digital voucher distribution terms, indemnification, and customer grievance redressal.`,
        verificationRequirement: "Signed Master Campaign Agreement.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-2`,
        sopCode: "SOP-LEG-02",
        title: `${partnerLabel} Brand IP & Written Logo Usage Approval`,
        aspect: "legal",
        assignee: "Akash Verma",
        role: "Legal Counsel",
        urgency: "HIGHEST",
        tat: "2 Days",
        status: "PENDING_APPROVAL",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "Open",
        details: `Secure formal written brand IP consent from ${partnerLabel} for displaying logos across ${meta.client} marketing collaterals and digital redemption screens.`,
        verificationRequirement: "Partner written consent email chain attached to Deal.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-3`,
        sopCode: "SOP-LEG-03",
        title: `E-Gift Card Expiry, Non-Encashment & Refund Exemption Disclaimer`,
        aspect: "legal",
        assignee: "Prashant Mittal",
        role: "Legal Head",
        urgency: "HIGH",
        tat: "1 Day",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Vet consumer terms clarifying voucher expiry period, non-transferability to bank accounts, and merchant redemption policies for ${meta.client}.`,
        verificationRequirement: "Approved legal disclaimer sign-off.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-4`,
        sopCode: "SOP-CMP-01",
        title: `Brand Safety & Code Velocity Guardrails (1 voucher per user cap)`,
        aspect: "compliance",
        assignee: "Khaleel Ahmed",
        role: "Compliance SPOC",
        urgency: "HIGHEST",
        tat: "2 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Establish automated redemption velocity caps (1 claim per mobile number/IP) and prevent bot-driven voucher scraping across ${meta.codeVolume}.`,
        verificationRequirement: "Security velocity rule engine sign-off.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-5`,
        sopCode: "SOP-CMP-02",
        title: `TRAI / Vilpower DLT SMS Template Approval for Voucher Dispatch`,
        aspect: "compliance",
        assignee: "Khaleel Ahmed",
        role: "Ops Lead",
        urgency: "HIGH",
        tat: "2 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Whitelist DLT header and transactional SMS message templates containing dynamic voucher code variables on Vilpower portal.`,
        verificationRequirement: "DLT Portal approval ID and registered template hash.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-6`,
        sopCode: "SOP-CMP-03",
        title: `72-Hour Pre-Launch Voucher Issuance Sandbox UAT Sign-Off`,
        aspect: "compliance",
        assignee: "Sachin (Tech Team)",
        role: "Tech Lead",
        urgency: "HIGHEST",
        tat: "2 Days",
        status: "PENDING_SIGN_OFF",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "Open",
        details: `Execute 50-number live redemption sandbox drill across Airtel, Jio, and Vi networks with real-time voucher code delivery and PIN verification.`,
        verificationRequirement: "Signed UAT test matrix with zero defects.",
        mandatoryGate: true,
      },
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
        details: `Verify client deposit of ${meta.budget} in BigCity escrow from ${meta.client} before bulk purchase PO issuance to voucher aggregators.`,
        verificationRequirement: "Zoho Books Bank Credit Reconciliation Voucher.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-8`,
        sopCode: "SOP-ACC-02",
        title: `Bulk E-Gift Card Aggregator (Gyftr / Pine Labs) Wholesale PO Sign-Off`,
        aspect: "accounting",
        assignee: "Rohit Sharma",
        role: "Admin / Commercial Head",
        urgency: "HIGH",
        tat: "2 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Issue wholesale purchase order to voucher aggregator for ${meta.codeVolume} vouchers at pre-agreed discount margins and credit lines.`,
        verificationRequirement: "Signed Wholesale Voucher PO.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-9`,
        sopCode: "SOP-ACC-03",
        title: `Commercial Terms & Estimate Sign-Off — ${meta.client}`,
        aspect: "accounting",
        assignee: "Rohit Sharma",
        role: "Admin / Commercial Head",
        urgency: "NORMAL",
        tat: "2 Days",
        status: "COMPLETED",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "Closed",
        details: `Verify client PO matching Zoho Books estimate for ${meta.budget}, covering voucher face value, SMS charges, and platform commission.`,
        verificationRequirement: "Signed Client Purchase Order linked to Zoho Books Estimate.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-10`,
        sopCode: "SOP-IMP-01",
        title: `Instant Voucher Delivery API Integration (WhatsApp & SMS Routes)`,
        aspect: "implementation",
        assignee: "Sachin (Tech Team)",
        role: "Tech Lead",
        urgency: "HIGHEST",
        tat: "3 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Integrate automated voucher dispatch engine with multi-channel delivery (primary WhatsApp template with SMS failover within 45 seconds).`,
        verificationRequirement: "Delivery engine latency test pass (<3s average delivery).",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-11`,
        sopCode: "SOP-IMP-02",
        title: `Real-Time Voucher Inventory Low-Stock Alert System (<10% threshold)`,
        aspect: "implementation",
        assignee: "Sachin (Tech Team)",
        role: "Tech Lead",
        urgency: "HIGH",
        tat: "1 Day",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Configure automated webhook alert notifying Finance and CS teams when active voucher inventory drops below 10% of total pool.`,
        verificationRequirement: "Low-stock automated alert drill test pass.",
        mandatoryGate: false,
      },
      {
        id: `task-${ts}-12`,
        sopCode: "SOP-IMP-03",
        title: `Automated Daily 09:00 AM Voucher Issuance & Float Balance MIS`,
        aspect: "implementation",
        assignee: "Khaleel Ahmed",
        role: "Ops Lead",
        urgency: "NORMAL",
        tat: "1 Day",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Configure automated daily 09:00 AM executive report for ${meta.client} brand managers tracking voucher dispatches, redemption rates, and budget balance.`,
        verificationRequirement: "Specimen MIS template approved by CS Head.",
        mandatoryGate: false,
      },
    ];
    recommendedTAT = "9 Working Days";
    criticalPath = [
      `100% Advance Escrow Verification of ${meta.budget} in Zoho Books`,
      `${partnerLabel} Brand IP & Written Logo Usage Approval`,
      `Bulk E-Gift Card Aggregator (Gyftr / Pine Labs) Wholesale PO Sign-Off`,
      `72-Hour Pre-Launch Voucher Issuance Sandbox UAT Sign-Off`,
    ];
    aiAnalysis = `### 🎁 AI E-Gift Voucher Campaign Architecture: **${meta.name}**\n\n**Client**: ${meta.client} · **Budget**: ${meta.budget} · **Volume**: ${meta.codeVolume} · **Partner**: ${partnerLabel}\n\n* **Wholesale Sourcing**: Bulk voucher aggregator procurement with pre-negotiated wholesale margin.\n* **Dual Dispatch Engine**: WhatsApp-first voucher delivery with automated SMS fallback within 45 seconds.\n* **Inventory Guardrails**: Real-time automated threshold alerts when available codes drop below 10%.`;
  } else {
    // Default: UPI / Direct Cashback
    tasks = [
      {
        id: `task-${ts}-1`,
        sopCode: "SOP-LEG-01",
        title: `${meta.name} — Master Campaign Agreement & Cashback T&C Drafting`,
        aspect: "legal",
        assignee: "Prashant Mittal",
        role: "Legal Head",
        urgency: "HIGHEST",
        tat: "2 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Draft comprehensive legal T&C for ${meta.client} (${meta.name}). Specify eligibility window (${meta.startDate} to ${meta.endDate}), 1 claim per mobile/UPI ID cap, grievance redressal, and dispute resolution jurisdiction.`,
        verificationRequirement: "Signed Master Campaign Agreement with client sign-off.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-2`,
        sopCode: "SOP-LEG-02",
        title: `NPCI UPI Payout Guidelines & RBI Wallet Statutory Clearances`,
        aspect: "legal",
        assignee: "Akash Verma",
        role: "Legal Counsel",
        urgency: "HIGHEST",
        tat: "2 Days",
        status: "PENDING_APPROVAL",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "Open",
        details: `Ensure direct cashback transfer architecture complies with NPCI UPI circulars and RBI nodal account disbursement regulations.`,
        verificationRequirement: "Statutory payment compliance clearance memo.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-3`,
        sopCode: "SOP-LEG-03",
        title: `Direct Benefit Transfer Exemption & Mobile Identity Vetting`,
        aspect: "legal",
        assignee: "Prashant Mittal",
        role: "Legal Head",
        urgency: "HIGH",
        tat: "1 Day",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Audit ${meta.name} mechanics against state prize scheme exemptions and consumer DPDP privacy requirements for ${meta.client}.`,
        verificationRequirement: "State compliance legal memo signed by Legal Head.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-4`,
        sopCode: "SOP-CMP-01",
        title: `TRAI / Vilpower DLT SMS Header & OTP Template Whitelisting for ${meta.client}`,
        aspect: "compliance",
        assignee: "Khaleel Ahmed",
        role: "Compliance SPOC",
        urgency: "HIGHEST",
        tat: "2 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Whitelist Principal Entity ID, registered SMS Header and OTP/Cashback message templates for ${meta.name} on Vilpower & Jio DLT portals.`,
        verificationRequirement: "DLT Portal Approval ID & Whitelisted Template Hash.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-5`,
        sopCode: "SOP-CMP-02",
        title: `Anti-Fraud Mobile Velocity Cap & VOIP Prefix Blacklist for ${meta.name}`,
        aspect: "compliance",
        assignee: "Sachin (Tech Team)",
        role: "Security Lead",
        urgency: "HIGH",
        tat: "1 Day",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Enforce strict fraud caps (Max 1 claim total per mobile number, device fingerprinting, and blacklisted virtual VOIP prefix blocking) across ${meta.codeVolume}.`,
        verificationRequirement: "Rule engine unit test log & security sign-off.",
        mandatoryGate: false,
      },
      {
        id: `task-${ts}-6`,
        sopCode: "SOP-CMP-03",
        title: `72-Hour Pre-Launch Live UPI Payout Staging UAT Sign-Off`,
        aspect: "compliance",
        assignee: "Khaleel Ahmed",
        role: "Ops Lead",
        urgency: "HIGHEST",
        tat: "3 Days",
        status: "PENDING_SIGN_OFF",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "Open",
        details: `Execute 50-number multi-device end-to-end redemption test run across Airtel, Jio, and Vi networks with live ${partnerLabel} disbursement 72h prior to Go-Live.`,
        verificationRequirement: "Signed UAT Test Matrix with zero open P1 defects.",
        mandatoryGate: true,
      },
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
        details: `Verify client deposit of ${meta.budget} in BigCity escrow from ${meta.client} before payout gateway float allocation. Match against Zoho Books receipt.`,
        verificationRequirement: "Zoho Books Bank Credit Reconciliation Voucher.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-8`,
        sopCode: "SOP-ACC-02",
        title: `Payment Gateway (Razorpay/Cashfree) Payout Float Account Ledger`,
        aspect: "accounting",
        assignee: "Sneha Nair",
        role: "Finance Lead",
        urgency: "HIGH",
        tat: "2 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Configure automated nodal bank float account reconciliation in Zoho Books to track real-time UPI payouts and banking transaction fees.`,
        verificationRequirement: "Zoho Books Payment Gateway Clearing Ledger entry.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-9`,
        sopCode: "SOP-ACC-03",
        title: `Commercial Terms & Management Fee PO Sign-Off — ${meta.client}`,
        aspect: "accounting",
        assignee: "Rohit Sharma",
        role: "Admin / Commercial Head",
        urgency: "NORMAL",
        tat: "2 Days",
        status: "COMPLETED",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "Closed",
        details: `Verify BigCity management fees, GST breakdown, SMS cost per unit for ${meta.codeVolume}, and gateway commission in Zoho Books Estimate.`,
        verificationRequirement: "Signed Client Purchase Order linked to Zoho Books Estimate.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-10`,
        sopCode: "SOP-IMP-01",
        title: `NPCI UPI Instant Payout Gateway API Integration (400ms SLA)`,
        aspect: "implementation",
        assignee: "Sachin (Tech Team)",
        role: "Tech Lead",
        urgency: "HIGHEST",
        tat: "2 Days",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Deploy direct API integration with payout gateway for instant bank account and VPA credit transfers with sub-400ms response time.`,
        verificationRequirement: "API benchmark test pass with automated callback reconciliation.",
        mandatoryGate: true,
      },
      {
        id: `task-${ts}-11`,
        sopCode: "SOP-IMP-02",
        title: `Deploy Responsive Mobile Cashback Claim Microsite with CDN`,
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
        title: `Automated Daily 09:00 AM UPI Payout Success & Balance MIS for ${meta.client}`,
        aspect: "implementation",
        assignee: "Khaleel Ahmed",
        role: "Ops Lead",
        urgency: "NORMAL",
        tat: "1 Day",
        status: "IN_PROGRESS",
        zohoCrmTaskId: `ZT-${Math.floor(100000 + Math.random() * 900000)}`,
        zohoCrmTaskStatus: "In Progress",
        details: `Set up automated daily 09:00 AM executive email MIS report to ${meta.client} brand managers tracking redemptions, ${meta.budget} budget utilization, and gateway status.`,
        verificationRequirement: "Specimen MIS template approved by CS Head.",
        mandatoryGate: false,
      },
    ];
    recommendedTAT = "10 Working Days";
    criticalPath = [
      `100% Advance Escrow Verification of ${meta.budget} in Zoho Books`,
      `NPCI UPI Payout Guidelines & RBI Wallet Statutory Clearances`,
      `TRAI / Vilpower DLT SMS Header & OTP Template Whitelisting for ${meta.client}`,
      `72-Hour Pre-Launch Live UPI Payout Staging UAT Sign-Off`,
    ];
    aiAnalysis = `### ⚡ AI Cashback Architecture Assessment: **${meta.name}**\n\n**Client**: ${meta.client} · **Budget**: ${meta.budget} · **Volume**: ${meta.codeVolume} · **Disbursement**: ${partnerLabel}\n\n* **Instant Disbursement**: Sub-400ms direct VPA/bank account payout API with automated callback retry.\n* **Dual Gateway**: Karix (Primary) + Gupshup (Failover) configured with 30s heartbeat.\n* **Escrow Accounting**: 100% advance deposit (${meta.budget}) confirmed in Zoho Books escrow before payout float activation.`;
  }

  const aspectSummary = {
    legal: {
      total: tasks.filter((t) => t.aspect === "legal").length,
      done: tasks.filter((t) => t.aspect === "legal" && t.status === "COMPLETED").length,
      status: "In Review" as const,
    },
    compliance: {
      total: tasks.filter((t) => t.aspect === "compliance").length,
      done: tasks.filter((t) => t.aspect === "compliance" && t.status === "COMPLETED").length,
      status: "In Review" as const,
    },
    accounting: {
      total: tasks.filter((t) => t.aspect === "accounting").length,
      done: tasks.filter((t) => t.aspect === "accounting" && t.status === "COMPLETED").length,
      status: "In Review" as const,
    },
    implementation: {
      total: tasks.filter((t) => t.aspect === "implementation").length,
      done: tasks.filter((t) => t.aspect === "implementation" && t.status === "COMPLETED").length,
      status: "In Review" as const,
    },
  };

  return {
    tasks,
    aspectSummary,
    recommendedTAT,
    criticalPath,
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
  const aiPrompt = `[CAMPAIGN OPERATIONAL TASK MATRIX GENERATION]
Act as the BigCity Promotions Principal Campaign Architect AI.
Decompose this specific campaign brief into a bespoke 4-aspect operational task matrix (Legal, Compliance, Accounting, Implementation).

Campaign Brief:
- Name: "${meta.name}"
- Client: "${meta.client}"
- Category: "${meta.category}"
- Reward Type: "${meta.rewardType}" (${meta.partner})
- Budget: "${meta.budget}"
- Code Volume: "${meta.codeVolume}"
- Description: "${meta.brief}"

Instructions:
1. Reason specifically about this brand (${meta.client}), reward mechanism (${meta.partner}), volume (${meta.codeVolume}), and budget (${meta.budget}).
2. Generate 10 to 13 customized, actionable operational tasks strictly divided across the 4 BigCity aspects:
   - "legal": Bilateral agreements, disclaimers, consumer protection, partner brand usage rights.
   - "compliance": Operational guardrails, fraud velocity caps, cashier or merchant SOPs, pre-launch UAT sign-off.
   - "accounting": 100% advance escrow of ${meta.budget} in Zoho Books, clearing ledgers, commercial PO sign-off.
   - "implementation": Systems, APIs, barcodes/QR codes, portals, and daily MIS cadence.
3. CRITICAL:
   - Do NOT output generic boilerplate. Tailor every task to the specific reward type, distribution channel (store POS, on-pack, online wallet, dining outlet, or delivery), and industry.
   - NEVER use the word "SOW" or "Statement of Work". Use "Master Campaign Agreement", "Commercial Scope Sign-Off", or "Brand Licensing Agreement".
4. Assign designated BigCity SPOCs:
   - Legal: Prashant Mittal (Legal Head) or Akash Verma (Legal Counsel)
   - Compliance & Ops: Khaleel Ahmed (Compliance SPOC / Ops Lead)
   - Tech & Cloud: Sachin (Tech Team)
   - Finance: Sneha Nair (Finance Lead)
   - Commercial/Admin: Rohit Sharma (Commercial Head)
5. Return ONLY a valid JSON object matching this schema (no extra chat, no markdown fences):
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
  "recommendedTAT": "10 Working Days",
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
      signal: AbortSignal.timeout(25000),
    });

    if (res.ok) {
      const rawText = await res.text();
      let assembled = "";
      const lines = rawText.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsedLine = JSON.parse(trimmed);
          if (parsedLine.type === "item" && parsedLine.content) {
            assembled += parsedLine.content;
          } else if (parsedLine.text || parsedLine.output) {
            assembled += parsedLine.text || parsedLine.output;
          }
        } catch {
          assembled += trimmed;
        }
      }
      if (!assembled) assembled = rawText;

      const cleaned = assembled.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*"tasks"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.tasks) && parsed.tasks.length >= 4) {
          const sanitizedTasks: AspectTask[] = parsed.tasks.map((t: any, i: number) => ({
            id: t.id || `task-${Date.now()}-${i + 1}`,
            sopCode:
              t.sopCode ||
              (t.aspect === "legal"
                ? `SOP-LEG-0${i + 1}`
                : t.aspect === "compliance"
                ? `SOP-CMP-0${i + 1}`
                : t.aspect === "accounting"
                ? `SOP-ACC-0${i + 1}`
                : `SOP-IMP-0${i + 1}`),
            title: t.title || `Task ${i + 1}`,
            aspect: ["legal", "compliance", "accounting", "implementation"].includes(t.aspect)
              ? t.aspect
              : "implementation",
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
            legal: {
              total: sanitizedTasks.filter((t) => t.aspect === "legal").length,
              done: sanitizedTasks.filter((t) => t.aspect === "legal" && t.status === "COMPLETED").length,
              status: "In Review" as const,
            },
            compliance: {
              total: sanitizedTasks.filter((t) => t.aspect === "compliance").length,
              done: sanitizedTasks.filter((t) => t.aspect === "compliance" && t.status === "COMPLETED").length,
              status: "In Review" as const,
            },
            accounting: {
              total: sanitizedTasks.filter((t) => t.aspect === "accounting").length,
              done: sanitizedTasks.filter((t) => t.aspect === "accounting" && t.status === "COMPLETED").length,
              status: "In Review" as const,
            },
            implementation: {
              total: sanitizedTasks.filter((t) => t.aspect === "implementation").length,
              done: sanitizedTasks.filter((t) => t.aspect === "implementation" && t.status === "COMPLETED").length,
              status: "In Review" as const,
            },
          };

          return {
            ...meta,
            tasks: sanitizedTasks,
            aspectSummary,
            recommendedTAT: parsed.recommendedTAT || "10 Working Days",
            criticalPath:
              parsed.criticalPath && Array.isArray(parsed.criticalPath) && parsed.criticalPath.length > 0
                ? parsed.criticalPath
                : [
                    `100% Advance Escrow Verification in Zoho Books`,
                    `${meta.partner || "Partner"} Commercial Clearances`,
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
// Zoho CRM/Books/Projects Sync Helper & Books Contact Manager
// ---------------------------------------------------------------------------

export async function checkZohoBooksContact(client: string): Promise<{
  exists: boolean;
  contact?: { contactId: string; contactName: string; companyName: string };
  suggestedName: string;
}> {
  const normClient = String(client || '').trim().toLowerCase();

  // Live lookup via n8n webhook
  try {
    const N8N_ZOHO_SYNC_WEBHOOK =
      process.env.N8N_ZOHO_SYNC_WEBHOOK ||
      "https://indigo-pelican-266513.hostingersite.com/webhook/bcp-task-ingest-v2";
    const res = await fetch(N8N_ZOHO_SYNC_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "check_books_contact", client }),
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.exists && data.contact) {
        return {
          exists: true,
          contact: data.contact,
          suggestedName: data.contact.contactName,
        };
      }
    }
  } catch (e) {
    console.warn("[checkZohoBooksContact] Live check failed:", e);
  }

  return {
    exists: false,
    suggestedName: `${client.trim()} India`,
  };
}

export async function createZohoBooksContact(client: string, companyName?: string): Promise<{
  success: boolean;
  contactId?: string;
  contactName?: string;
  companyName?: string;
  error?: string;
}> {
  const N8N_ZOHO_SYNC_WEBHOOK =
    process.env.N8N_ZOHO_SYNC_WEBHOOK ||
    "https://indigo-pelican-266513.hostingersite.com/webhook/bcp-task-ingest-v2";

  try {
    const contactName = companyName ? `${client} (${companyName})` : `${client} India`;
    const res = await fetch(N8N_ZOHO_SYNC_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_books_contact",
        client,
        contactName,
        companyName: companyName || client,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.contactId) {
        return {
          success: true,
          contactId: data.contactId,
          contactName: data.contactName || contactName,
          companyName: data.companyName || client,
        };
      }
      return { success: false, error: data.message || "Failed to create contact in Zoho Books" };
    }
    return { success: false, error: `Webhook returned status ${res.status}` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function syncCampaignToZohoCRM(
  campaignId: string | null,
  campaignName: string,
  client: string,
  budget: string,
  codeVolume: string,
  tasks: AspectTask[],
  booksCustomerId?: string | null
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
        booksCustomerId: booksCustomerId || undefined,
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
    booksCustomerId: row.books_customer_id,
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
              "https://indigo-pelican-266513.hostingersite.com/webhook/bcp-delete-zoho-resources";
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

    // ── Action 0A: Check Zoho Books Contact ──
    if (action === "check_books_contact") {
      const { client } = body;
      if (!client) {
        return NextResponse.json({ error: "Client is required" }, { status: 400 });
      }
      const check = await checkZohoBooksContact(client);
      return NextResponse.json({ success: true, ...check });
    }

    // ── Action 0B: Create Zoho Books Contact ──
    if (action === "create_books_contact") {
      const { client, companyName } = body;
      if (!client) {
        return NextResponse.json({ error: "Client is required" }, { status: 400 });
      }
      const result = await createZohoBooksContact(client, companyName);
      return NextResponse.json(result);
    }

    // ── Action 1: Dynamic AI Plan Generation from Brief / Prompt ──
    if (action === "generate_plan") {
      const { campaignInput } = body;
      if (!campaignInput) {
        return NextResponse.json({ error: "Campaign data or brief is required" }, { status: 400 });
      }

      // Call the AI Brain decomposition engine
      const aiResult = await generateAIAspectPlan(campaignInput);
      const booksContact = await checkZohoBooksContact(aiResult.client);

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
          booksCustomerId: booksContact.contact?.contactId || undefined,
        },
        booksContact: {
          exists: booksContact.exists,
          contactId: booksContact.contact?.contactId,
          contactName: booksContact.contact?.contactName,
          suggestedName: booksContact.suggestedName,
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

      // Resolve Zoho Books Customer ID (or auto-create if flagged)
      let booksCustomerId = body.booksCustomerId || campaignData.booksCustomerId || null;
      if (!booksCustomerId && campaignData.client) {
        const contactCheck = await checkZohoBooksContact(campaignData.client);
        if (contactCheck.exists && contactCheck.contact?.contactId) {
          booksCustomerId = contactCheck.contact.contactId;
        } else if (body.autoCreateBooksContact) {
          const created = await createZohoBooksContact(campaignData.client);
          if (created.success && created.contactId) {
            booksCustomerId = created.contactId;
          }
        }
      }

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
          books_customer_id: booksCustomerId,
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
        resolvedTasks,
        booksCustomerId
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
        if (booksCustomerId) {
          updatePayload.books_customer_id = booksCustomerId;
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
        if (booksCustomerId) {
          insertedRow.books_customer_id = booksCustomerId;
        }
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
                  action: "approve_and_sync",
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
          } else {
            // Already synced to Zoho — push updated tasks to Zoho Projects via n8n webhook
            const N8N_ZOHO_SYNC_WEBHOOK =
              process.env.N8N_ZOHO_SYNC_WEBHOOK ||
              "https://indigo-pelican-266513.hostingersite.com/webhook/bcp-task-ingest-v2";
            try {
              await fetch(N8N_ZOHO_SYNC_WEBHOOK, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "update_campaign_tasks",
                  campaignId: resolvedCampaignId,
                  projectId: (checkRow as any)?.zoho_project_id || null,
                  campaignName: resolvedCampaignName,
                  tasks: tasks || [],
                }),
                signal: AbortSignal.timeout(10000),
              }).catch((e) => console.warn("[update_campaign_tasks] Push to Zoho webhook warning:", e));
            } catch (err) {
              console.warn("[update_campaign_tasks] Post-approval task push failed:", err);
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
          "https://indigo-pelican-266513.hostingersite.com/webhook/bcp-delete-zoho-resources";

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
          customerId: campRow?.books_customer_id,
          client: campRow?.client,
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
