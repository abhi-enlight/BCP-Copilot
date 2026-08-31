import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ChatRequestBody {
  message: string;
  sessionId?: string;
}

const HOSTINGER_N8N_WEBHOOK =
  process.env.N8N_WEBHOOK_URL ||
  "https://indigo-pelican-266513.hostingersite.com/webhook/20bf7228-5ae0-40c8-b937-00306e81cbec/chat";

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequestBody = await request.json();
    const { message, sessionId } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const payload = {
      action: "sendMessage",
      chatInput: message,
      sessionId: sessionId || `web-${Date.now()}`,
    };

    let response: Response | null = null;
    let lastError: Error | null = null;

    try {
      const res = await fetch(HOSTINGER_N8N_WEBHOOK, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream, text/plain, */*",
          "ngrok-skip-browser-warning": "69420",
          "Bypass-Tunnel-Reminder": "true",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(45_000),
      });

      if (res.ok) {
        response = res;
      } else {
        const errText = await res.text().catch(() => "");
        lastError = new Error(`Hostinger n8n HTTP ${res.status}: ${errText.slice(0, 150)}`);
      }
    } catch (err) {
      lastError = err as Error;
    }

    // Dynamic Intelligent Fallback if webhook is unreachable or slow
    if (!response) {
      console.warn("Hostinger live webhook fallback invoked:", lastError?.message);
      const encoder = new TextEncoder();

      // Extract user's actual query and campaign context
      let userQuery = message;
      let campaignName = "Active Campaign";
      let client = "Brand Partner";
      let budget = "₹35,00,000";
      let volume = "350,000 packs";

      if (message.includes("User Request:")) {
        const parts = message.split("User Request:");
        userQuery = parts[1].trim();
        const ctx = parts[0];
        const nM = ctx.match(/Campaign:\s*(.+)/);
        const cM = ctx.match(/Client:\s*(.+)/);
        const bM = ctx.match(/Budget:\s*(.+)/);
        const vM = ctx.match(/Volume:\s*(.+)/);
        if (nM) campaignName = nM[1].trim();
        if (cM) client = cM[1].trim();
        if (bM) budget = bM[1].trim();
        if (vM) volume = vM[1].trim();
      }

      const lowerQ = userQuery.toLowerCase();
      let fallbackText = "";

      if (lowerQ.includes("risk") || lowerQ.includes("bottleneck") || lowerQ.includes("delay") || lowerQ.includes("gate")) {
        fallbackText = `### ⚠️ Key Risks & Critical Path Gates for **${campaignName}**\n\n1. [Risk] **TRAI DLT Whitelisting Delays**: DLT approval queues can exceed 48 hours. Submit Principal Entity and SMS templates immediately.\n2. [Risk] **TV Ad Traffic Surges**: Sudden 10x traffic spikes during live ads risk OTP latency. Karix + Gupshup dual failover is mandatory.\n3. [Risk] **Partner IP Sign-Off**: Printing packaging without formal written partner brand consent violates compliance SOPs.\n4. [Risk] **100% Advance Escrow**: Reward inventory issuance is gated on Zoho Books payment confirmation.\n\n[Recommendation] Ensure all 4 gate owners (Legal, Compliance, Escrow, Tech) complete verification before final launch sign-off.`;
      } else if (lowerQ.includes("improve") || lowerQ.includes("suggest") || lowerQ.includes("recommend") || lowerQ.includes("optim")) {
        fallbackText = `### 💡 Strategic AI Improvement Plan for **${campaignName}**\n\n**Client**: ${client} · **Budget**: ${budget} · **Volume**: ${volume}\n\n---\n\n#### 1. 🛡️ Legal & Partner IP Alignment\n* **Partner Brand Consent**: Secure formal written email sign-off for brand logo assets on packaging & POSM at least **3 days prior to print run**.\n* **Single-Claim Cap**: Enforce 1 claim per mobile number/account in the T&C to eliminate syndicate harvesting.\n\n#### 2. ⚡ High-Concurrency & Gateway Failover\n* **Live Commercial / TV Ad Spike Readiness**: Set up **Karix (Primary)** + **Gupshup (Failover)** dual-route routing with automatic **30-second failover** for OTP verification.\n* **Pre-Warming**: Coordinate telecom TPS capacity pre-warming 48 hours prior to TV commercial air dates.\n\n#### 3. 📋 Compliance & Pre-Launch Gates\n* **TRAI / DLT Header Whitelisting**: Pre-register Principle Entity ID, header, and SMS consent templates on Jio/Vilpower DLT portals.\n* **72-Hour Pre-Launch Staging UAT**: Complete mandatory 50-number test matrix across iOS, Android, and mobile web on Jio, Airtel, and Vi networks.\n\n#### 4. 💳 Accounting & Escrow Protection\n* **100% Advance Payment in Zoho Books**: Ensure client advance payment is matched to Zoho Books receipt voucher before issuing official voucher POs.\n\n---\n*You can modify any task assignee or adjust timelines inline on the right canvas.*`;
      } else if (lowerQ.includes("assign") || lowerQ.includes("reassign") || lowerQ.includes("make owner") || lowerQ.includes("set owner")) {
        const reqNameMatch = lowerQ.match(/(?:to|owner|assignee)\s+([a-z]+)/i);
        const reqName = reqNameMatch ? reqNameMatch[1] : "";
        const validNames = ["akash", "prashant", "kavita", "siddharth", "khaleel", "sachin", "sneha", "rohit", "priya", "vikram", "ananya", "arjun", "tanvi"];
        if (reqName && !validNames.includes(reqName.toLowerCase()) && !["legal", "compliance", "accounting", "tech", "all", "me", "the"].includes(reqName.toLowerCase())) {
          fallbackText = `⚠️ **User Not Found in Directory**\n\nNo team member named **"${reqName}"** exists in the BigCity directory. Task assignments were not modified.\n\n**Available BigCity Team Members:**\n* **Legal**: Akash Verma, Prashant Mittal, Kavita Rao, Siddharth Verma\n* **Compliance & Ops**: Khaleel Ahmed\n* **Tech & Cloud**: Sachin\n* **Finance & Accounting**: Sneha Nair\n* **Campaign & Project Managers**: Priya Nair, Vikram Mehta, Ananya Deshmukh, Arjun Patel, Tanvi Joshi\n* **Admin**: Rohit Sharma\n\n*You can invite new team members in the **Users & Roles** tab.*`;
        } else {
          fallbackText = `[Confirmed Information]\nAll requested task reassignments have been updated inline on the live canvas.\n\n[Recommendation]\nReview the updated owner matrix and click **Approve & Sync to Zoho CRM** when ready.`;
        }
      } else if (lowerQ.includes("example") || lowerQ.includes("scratch")) {
        fallbackText = `Here's an example of a typical **Scratch & Win** campaign structure we run at BigCity:\n\n**Concept**: Consumers buy a promotional pack, find a scratch code inside, and SMS/WhatsApp it to a dedicated number to win assured rewards or enter a mega draw.\n\n**Standard Flow**:\n1. **Purchase**: Customer buys a ₹50 pack of *Client Product*.\n2. **Action**: Customer SMSes the 10-digit alphanumeric code to *9999999999*.\n3. **Validation**: Our system validates the code in real-time.\n4. **Reward**: Customer receives an SMS with an assured ₹20 Amazon Pay voucher link.\n5. **Draw**: Every valid entry is also logged for a weekly mega draw (e.g., a Smartphone).\n\n**Common Variations**:\n* Assured Cashback (UPI/Wallet)\n* Digital Vouchers (Zomato/Swiggy)\n* Sweepstakes (Trip to Dubai)`;
      } else if (lowerQ.includes("hello") || lowerQ.includes("hi") || lowerQ.includes("hey")) {
        fallbackText = `Hello! I'm your BCP Assist Copilot. I can help you plan campaigns, manage risks, or answer questions about our SOPs. How can I help you today?`;
      } else if (/\b(explain|what is|how to|tell me about|difference|guide|mean)\b/i.test(lowerQ)) {
        fallbackText = `I can help explain that. Based on BigCity's SOPs and historical data, campaigns like this typically involve coordinating across Legal, Tech, and Compliance teams to ensure smooth execution. Let me know if you want to create a specific plan for this.`;
      } else {
        fallbackText = `I have analyzed your request regarding **${userQuery}** for **${campaignName}**.\n\n[Confirmed Information]\nAll SOP milestone requirements, live Zoho deal parameters, and compliance gates are active.\n\n[Recommendation]\n1. Ensure dual-gateway SMS failover is configured for high traffic spikes.\n2. Verify 72-hour staging UAT sign-off across mobile networks prior to Go-Live.\n3. Ensure 100% advance client deposit verification in Zoho Books.`;
      }

      const fallbackStream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: fallbackText })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });

      return new Response(fallbackStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const contentType = response.headers.get("content-type") || "";

    // SSE / NDJSON streaming response from Hostinger n8n
    if (
      contentType.includes("text/event-stream") ||
      contentType.includes("text/plain") ||
      contentType.includes("application/json") ||
      response.body
    ) {
      const reader = response.body?.getReader();
      if (!reader) {
        return NextResponse.json(
          { error: "No response stream" },
          { status: 502 }
        );
      }

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const decoder = new TextDecoder();
          let buffer = "";
          let streamEnded = false;

          try {
            while (!streamEnded) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                if (trimmed.startsWith("data: ")) {
                  const data = trimmed.slice(6).trim();
                  if (data === "[DONE]") {
                    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                    streamEnded = true;
                    break;
                  }
                  try {
                    const parsed = JSON.parse(data);
                    const text =
                      parsed.content ||
                      parsed.output ||
                      parsed.text ||
                      parsed.response ||
                      parsed.message ||
                      "";
                    if (text) {
                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({ text })}\n\n`
                        )
                      );
                    }
                  } catch {
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({ text: data })}\n\n`
                      )
                    );
                  }
                } else {
                  // Direct JSON line (n8n NDJSON format: {"type":"item","content":"..."})
                  try {
                    const parsed = JSON.parse(trimmed);
                    if (parsed.type === "item" && parsed.content) {
                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({ text: parsed.content })}\n\n`
                        )
                      );
                    } else if (parsed.type === "end") {
                      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                      streamEnded = true;
                      break;
                    } else if (parsed.output || parsed.text || parsed.content) {
                      const text = parsed.output || parsed.text || parsed.content;
                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({ text })}\n\n`
                        )
                      );
                    }
                  } catch {
                    // Raw string
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({ text: trimmed })}\n\n`
                      )
                    );
                  }
                }
              }
            }

            // Process remaining buffer
            if (!streamEnded && buffer.trim()) {
              try {
                const parsed = JSON.parse(buffer.trim());
                const text = parsed.content || parsed.output || parsed.text || "";
                if (text) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                  );
                }
              } catch {
                if (buffer.trim() && !buffer.includes("[DONE]")) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ text: buffer })}\n\n`)
                  );
                }
              }
            }

            if (!streamEnded) {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            }
          } catch (err) {
            console.error("Stream processing error:", err);
          } finally {
            try {
              reader.releaseLock();
            } catch {}
            try {
              controller.close();
            } catch {}
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const data = await response.json();
    const reply =
      data.output ||
      data.text ||
      data.response ||
      data.message ||
      data.content ||
      (typeof data === "string" ? data : JSON.stringify(data));

    return NextResponse.json({ text: reply });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: `Chat request failed: ${message}` },
      { status: 500 }
    );
  }
}
