import { NextRequest, NextResponse } from "next/server";

const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL || "http://localhost:5678/webhook/53c0c104-aa50-47b4-ad2a-7a98f069dc4a/chat";

interface ChatRequestBody {
  message: string;
  sessionId?: string;
}

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

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream, text/plain, */*",
        "ngrok-skip-browser-warning": "69420",
        "Bypass-Tunnel-Reminder": "true",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120_000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(`n8n webhook error (${response.status}):`, errorText);
      return NextResponse.json(
        {
          error: `n8n returned ${response.status}`,
          detail: errorText,
        },
        { status: 502 }
      );
    }

    const contentType = response.headers.get("content-type") || "";

    // SSE / NDJSON streaming response from n8n
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

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });

              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                if (trimmed.startsWith("data: ")) {
                  const data = trimmed.slice(6);
                  if (data === "[DONE]") {
                    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                    continue;
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
            if (buffer.trim()) {
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
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          } catch (err) {
            console.error("Stream processing error:", err);
          } finally {
            controller.close();
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

    if (error instanceof DOMException && error.name === "TimeoutError") {
      return NextResponse.json(
        { error: "Request timed out. n8n may be processing a complex query." },
        { status: 504 }
      );
    }

    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: `Failed to reach n8n: ${message}` },
      { status: 500 }
    );
  }
}
