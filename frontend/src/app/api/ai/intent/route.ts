import { NextRequest, NextResponse } from "next/server";
import { generateAIAspectPlan, generateDynamicBespokePlan, type AspectTask, type Campaign } from "@/app/api/campaigns/route";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL ||
  "https://indigo-pelican-266513.hostingersite.com/webhook/20bf7228-5ae0-40c8-b937-00306e81cbec/chat";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, activePlan, sessionId } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const contextStr = activePlan
      ? `Active Campaign in Studio: "${activePlan.campaignData?.name || "Active Campaign"}" (Client: ${activePlan.campaignData?.client || "Unknown"}, Status: ${activePlan.status}, Tasks: ${activePlan.tasks?.length || 0})`
      : "No active campaign plan currently open.";

    const prompt = `[AI INTENT & NATURAL LANGUAGE UNDERSTANDING ENGINE]
You are the BigCity Promotions Campaign Architect & Copilot Orchestrator AI.
Analyze the user's natural language message in the context of the active workspace.

Current Context:
${contextStr}

User Message:
"${message}"

Instructions:
1. Understand the semantic intent of the user. Classify intent as ONE of:
   - "PLAN_CREATE": User wants to create, plan, draft, set up, or launch a promotional campaign or brief (e.g. mentions brand, cashback, rewards, vouchers, budget, volume, mechanics, or asks to plan/draft a campaign).
   - "PLAN_MODIFY": User is asking to modify, update, reassign, adjust, add tasks, or change parameters of the active campaign plan.
   - "PLAN_APPROVE": User explicitly confirms, approves, or wants to push/sync the active plan to Zoho (e.g. "looks good", "approve", "push to zoho", "go live", "yes proceed").
   - "CHAT": User is asking a question, seeking knowledge, querying status/invoices, or having a general conversation.

2. If intent is "PLAN_CREATE", extract all parameters you can find from the user's brief:
   - name: Campaign title or descriptive name
   - client: Brand/Client name (e.g. Amul, Puma, Coca-Cola, Nestlé, etc.)
   - category: One of FMCG, Beverages, Retail, Electronics, BFSI, QSR
   - rewardType: One of Cashback, EGV, Scratch & Win, Merchandise
   - partner: Reward partner (e.g. PhonePe, Google Pay, Amazon Pay, Swiggy, Zomato, Myntra, UPI)
   - budget: Total budget (e.g. ₹35,00,000)
   - codeVolume: Pack/code volume (e.g. 400,000 PET bottles)
   - brief: Clean summary of the campaign requirement

3. Return ONLY a valid JSON object matching this schema (no markdown fences, pure JSON):
{
  "intent": "PLAN_CREATE" | "PLAN_MODIFY" | "PLAN_APPROVE" | "CHAT",
  "reasoning": "Short 1-sentence explanation of why this intent was recognized",
  "campaignData": {
    "name": "...",
    "client": "...",
    "category": "...",
    "rewardType": "...",
    "partner": "...",
    "budget": "...",
    "codeVolume": "...",
    "brief": "..."
  },
  "modification": {
    "action": "reassign" | "add_task" | "update_param" | "general_edit",
    "details": "..."
  }
}`;

    let aiIntent = "CHAT";
    let extractedData: any = null;

    try {
      const res = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "69420" },
        body: JSON.stringify({
          action: "sendMessage",
          chatInput: prompt,
          sessionId: sessionId || `intent-${Date.now()}`,
        }),
        signal: AbortSignal.timeout(9000),
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

        const jsonMatch = assembled.match(/\{[\s\S]*"intent"[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          aiIntent = parsed.intent || "CHAT";
          extractedData = parsed;
        }
      }
    } catch (e: any) {
      console.warn("[AI Intent] Webhook evaluation timeout/fallback:", e.message);
    }

    // If AI identified PLAN_CREATE, synthesize the complete 4-aspect operational task plan
    if (aiIntent === "PLAN_CREATE" && extractedData?.campaignData) {
      const cData = extractedData.campaignData;
      const fullPlan = await generateAIAspectPlan({
        name: cData.name || "Consumer Promotion Campaign",
        client: cData.client || "Enterprise Client",
        category: cData.category || "FMCG",
        rewardType: cData.rewardType || "Cashback",
        partner: cData.partner,
        budget: cData.budget || "₹25,00,000",
        codeVolume: cData.codeVolume || "250,000 packs",
        brief: cData.brief || message,
      });

      return NextResponse.json({
        success: true,
        intent: "PLAN_CREATE",
        reasoning: extractedData.reasoning || "AI detected campaign brief and created 4-aspect operational matrix.",
        campaignData: {
          name: fullPlan.name,
          client: fullPlan.client,
          category: fullPlan.category,
          rewardType: fullPlan.rewardType,
          budget: fullPlan.budget,
          codeVolume: fullPlan.codeVolume,
          startDate: fullPlan.startDate,
          endDate: fullPlan.endDate,
          brief: fullPlan.brief,
        },
        plan: {
          tasks: fullPlan.tasks,
          aspectSummary: fullPlan.aspectSummary,
          recommendedTAT: fullPlan.recommendedTAT,
          criticalPath: fullPlan.criticalPath,
          aiAnalysis: fullPlan.aiAnalysis,
        },
      });
    }

    // Fallback if AI couldn't parse or if it's a direct brief without n8n JSON
    return NextResponse.json({
      success: true,
      intent: aiIntent,
      reasoning: extractedData?.reasoning || "Direct conversational response",
      extractedData,
    });
  } catch (error: any) {
    console.error("[/api/ai/intent] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
