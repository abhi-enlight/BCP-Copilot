import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HOSTINGER_N8N_WEBHOOK =
  process.env.N8N_WEBHOOK_URL ||
  "https://indigo-pelican-266513.hostingersite.com/webhook/20bf7228-5ae0-40c8-b937-00306e81cbec/chat";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

interface ChatRequestBody {
  message: string;
  sessionId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat — Health check
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  const start = Date.now();
  try {
    const res = await fetch(HOSTINGER_N8N_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "sendMessage",
        chatInput: "__ping__",
        sessionId: "health-check",
      }),
      signal: AbortSignal.timeout(8_000),
    });
    const latency = Date.now() - start;
    return NextResponse.json({
      status: res.ok ? (latency > 5000 ? "slow" : "connected") : "error",
      latencyMs: latency,
      source: "n8n",
    });
  } catch {
    const latency = Date.now() - start;
    return NextResponse.json({
      status: "offline",
      latencyMs: latency,
      source: "none",
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chat — Pure 100% live n8n stream proxy (No cache, no fallback)
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequestBody = await request.json();
    const { message, sessionId } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendSSE = (payload: object | string) => {
          try {
            if (typeof payload === "string") {
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            } else {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            }
          } catch {
            // Client closed connection
          }
        };

        try {
          // Send initial tool indicator for the UI loader
          sendSSE({ toolCall: "BCP Assist AI Agent" });

          const n8nRes = await fetch(HOSTINGER_N8N_WEBHOOK, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json, text/event-stream, text/plain, */*",
              "ngrok-skip-browser-warning": "69420",
              "Bypass-Tunnel-Reminder": "true",
            },
            body: JSON.stringify({
              action: "sendMessage",
              chatInput: message,
              sessionId: sessionId || `web-${Date.now()}`,
            }),
            signal: AbortSignal.timeout(60_000),
          });

          if (!n8nRes.ok || !n8nRes.body) {
            const errText = await n8nRes.text().catch(() => "");
            sendSSE({
              text: `⚠️ **Backend Connection Error** (HTTP ${n8nRes.status}): ${errText || "Unable to reach n8n workflow."}`,
            });
            sendSSE("[DONE]");
            controller.close();
            return;
          }

          const reader = n8nRes.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;

              // SSE format: data: ...
              if (trimmed.startsWith("data: ")) {
                const data = trimmed.slice(6).trim();
                if (data === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(data);
                  const text = parsed.content || parsed.output || parsed.text || "";
                  if (text) sendSSE({ text });
                } catch {
                  if (data) sendSSE({ text: data });
                }
              } else {
                // Direct NDJSON format from n8n
                try {
                  const parsed = JSON.parse(trimmed);
                  if (parsed.type === "begin") {
                    const nodeName: string = parsed.metadata?.nodeName ?? "AI Agent";
                    sendSSE({ toolCall: nodeName });
                  } else if (parsed.type === "item" && parsed.content) {
                    sendSSE({ text: parsed.content });
                  } else if (parsed.type === "end") {
                    // Tool finished; main agent continues streaming
                  } else if (parsed.output || parsed.text || parsed.content) {
                    const t = parsed.output || parsed.text || parsed.content;
                    if (t) sendSSE({ text: t });
                  }
                } catch {
                  if (trimmed && !trimmed.startsWith("{")) {
                    sendSSE({ text: trimmed });
                  }
                }
              }
            }
          }

          // Flush remaining buffer
          if (buffer.trim()) {
            try {
              const parsed = JSON.parse(buffer.trim());
              const text = parsed.content || parsed.output || parsed.text || "";
              if (text) sendSSE({ text });
            } catch {
              if (buffer.trim() && !buffer.includes("[DONE]")) {
                sendSSE({ text: buffer.trim() });
              }
            }
          }

          sendSSE("[DONE]");
          controller.close();
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "Unknown error";
          sendSSE({
            text: `⚠️ **Backend Execution Error**: ${errMsg}`,
          });
          sendSSE("[DONE]");
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: SSE_HEADERS });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Chat request failed: ${message}` },
      { status: 500 }
    );
  }
}
