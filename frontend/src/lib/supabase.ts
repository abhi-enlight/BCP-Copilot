import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Shared server-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Represents a fully persisted campaign row in Supabase.
 * Zoho fields are separated by product:
 *   - zoho_crm_*     → Zoho CRM (Deals module)
 *   - zoho_project_* → Zoho Projects
 *   - zoho_books_*   → Zoho Books (Invoices / Estimates)
 */
export interface CampaignRow {
  id: string;
  name: string;
  client: string;
  category: string;
  reward_type: string;
  budget: string;
  code_volume: string;
  start_date: string;
  end_date: string;
  brief: string;
  status: "draft" | "live";
  tasks: any[];
  aspect_summary: any;

  // Zoho CRM — Deals module (campaign as an opportunity/deal record)
  zoho_crm_deal_id: string | null;
  zoho_crm_deal_url: string | null;
  zoho_crm_deal_stage: string | null; // e.g. "Qualification", "Proposal/Price Quote"

  // Zoho Projects — Project management (tasks, milestones)
  zoho_project_id: string | null;
  zoho_project_url: string | null;

  // Zoho Books — Accounting (invoices, estimates, payments)
  zoho_books_invoice_id: string | null;
  zoho_books_invoice_url: string | null;

  // Aggregate sync status across all connected Zoho products
  zoho_sync_status: "pending" | "partial" | "synced" | "failed";
  last_zoho_sync: string | null;

  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
}
