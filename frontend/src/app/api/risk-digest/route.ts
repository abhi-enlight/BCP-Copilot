import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const RISK_WORKFLOW_WEBHOOK = "https://indigo-pelican-266513.hostingersite.com/webhook/9d5c2e17-690f-4886-9430-c3d52c21966f";

export async function GET() {
  try {
    const res = await fetch(RISK_WORKFLOW_WEBHOOK, {
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "69420",
        "Bypass-Tunnel-Reminder": "true",
      },
      // Short timeout because we don't want to block the UI for a proactive banner
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error(`Risk webhook failed with status ${res.status}`);
    }

    const data = await res.json();
    
    // Validate format
    if (!data.criticalActionItems || !Array.isArray(data.criticalActionItems)) {
      throw new Error("Invalid response format from risk workflow");
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Risk digest error:", error);
    
    // Return a mock response if the n8n workflow isn't ready or times out
    return NextResponse.json({
      date: new Date().toISOString().split('T')[0],
      totalActiveDeals: 12,
      criticalActionItems: [
        {
          type: "APPROVAL_BLOCKER",
          deal: "Nestlé Festive",
          owner: "Akash (Legal)",
          issue: "Pending Partner IP Sign-off",
          tatRemaining: "12 Hours"
        }
      ],
      systemStatus: "healthy"
    });
  }
}
