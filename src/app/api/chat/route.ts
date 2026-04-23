import { env } from "@/lib/env";
import { convertToModelMessages } from "ai";

// Constants
const TIMEOUT_MS = 120_000; // 2 minutes
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-dmc-id, x-session-id",
};

// Helper functions
function extractPromptFromMessages(messages: any[]): string {
  const lastMessage = convertToModelMessages(messages).at(-1);
  const content = lastMessage?.content?.[0];

  if (typeof content === "string") return content;
  if (content && "text" in content) return content.text;
  return "";
}

function createSSEEvent(type: string, data: any): string {
  return `data: ${JSON.stringify({ type, ...data })}\n\n`;
}

function createStreamingHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
    ...CORS_HEADERS,
  };
}

function createErrorResponse(message: string, status = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

export async function POST(req: Request): Promise<Response> {
  let timeoutId: NodeJS.Timeout | null = null;
  let controller: AbortController | null = null;

  try {
    const [body, dmcId, sessionId, version] = await Promise.all([
      req.json(),
      req.headers.get("x-dmc-id"),
      req.headers.get("x-session-id"),
      req.headers.get("x-version"),
    ]);

    const prompt = extractPromptFromMessages(body.messages);
    if (!prompt) {
      return createErrorResponse("No message content found", 400);
    }

    // Check if the message contains [MODE: QUOTE] and extract the actual message
    let actualPrompt = prompt;

    if (/^\[MODE:\s*QUOTE\]/.test(prompt)) {
      // Extract the actual message after [MODE: QUOTE] prefix (tolerate spacing)
      actualPrompt = prompt.replace(/^\[MODE:\s*QUOTE\]\s*/, "");
    }

    const webhookUrl = env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      return createErrorResponse("N8N_WEBHOOK_URL is not configured");
    }

    // Forward request to n8n webhook with timeout
    controller = new AbortController();

    // Set up timeout with proper cleanup
    timeoutId = setTimeout(() => {
      if (controller) {
        controller.abort();
        console.log("Request aborted due to timeout");
      }
    }, TIMEOUT_MS);

    const response = await fetch(`${webhookUrl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream, application/json, text/plain",
      },
      body: JSON.stringify({
        dmc_id: dmcId,
        prompt: actualPrompt,
        session_id: sessionId,
        version,
      }),
      signal: controller.signal,
    });

    // Clear timeout once we get a response
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (!response.ok) {
      throw new Error(
        `n8n API error: ${response.status} ${response.statusText}`
      );
    }

    const contentType = response.headers.get("content-type") || "";
    const isStreaming =
      !!response.body ||
      contentType.includes("text/event-stream") ||
      contentType.includes("application/x-ndjson") ||
      contentType.includes("text/plain");

    return isStreaming
      ? createStreamingResponse(response)
      : createNonStreamingResponse(response);
  } catch (error) {
    // Clean up timeout if it exists
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    console.error("Error in chat API proxy:", error);

    // Handle different types of errors
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return createErrorResponse("Request timeout - please try again", 408);
      }
      return createErrorResponse(error.message);
    }

    return createErrorResponse("Internal server error");
  }
}

async function createStreamingResponse(response: Response): Promise<Response> {
  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body?.getReader();
      if (!reader) {
        // Send error event and close properly
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode(
            createSSEEvent("error", { message: "No response body" })
          )
        );
        controller.close();
        return;
      }

      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      const messageId = `msg_${Date.now()}`;

      let buffer = "";
      let hasStarted = false;
      let hasContent = false;

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            // Process any remaining buffer content
            if (buffer.trim()) {
              try {
                const jsonString = buffer.trim().startsWith("data:")
                  ? buffer.trim().slice(5).trim()
                  : buffer.trim();
                const data = JSON.parse(jsonString);

                if (data.type === "item" && data.content) {
                  if (!hasStarted) {
                    controller.enqueue(
                      encoder.encode(
                        createSSEEvent("text-start", { id: messageId })
                      )
                    );
                    hasStarted = true;
                  }

                  controller.enqueue(
                    encoder.encode(
                      createSSEEvent("text-delta", {
                        id: messageId,
                        delta: data.content,
                      })
                    )
                  );
                  hasContent = true;
                }
              } catch (parseError) {
                console.error(
                  "Error parsing final buffer:",
                  parseError,
                  buffer
                );
              }
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const jsonString = line.trim().startsWith("data:")
                ? line.trim().slice(5).trim()
                : line.trim();

              if (jsonString === "[DONE]") {
                // Skip n8n's [DONE] marker, we'll send our own
                continue;
              }

              const data = JSON.parse(jsonString);

              if (data.type === "item" && data.content) {
                // Send text-start event only once
                if (!hasStarted) {
                  controller.enqueue(
                    encoder.encode(
                      createSSEEvent("text-start", { id: messageId })
                    )
                  );
                  hasStarted = true;
                }

                controller.enqueue(
                  encoder.encode(
                    createSSEEvent("text-delta", {
                      id: messageId,
                      delta: data.content,
                    })
                  )
                );
                hasContent = true;
              }
              // Ignore other event types from n8n during streaming
            } catch (parseError) {
              console.error("Error parsing n8n chunk:", parseError, line);
              // Continue processing other lines instead of breaking
            }
          }
        }

        // Send completion events only if we had content
        if (hasContent) {
          controller.enqueue(
            encoder.encode(createSSEEvent("text-end", { id: messageId }))
          );
          controller.enqueue(encoder.encode(createSSEEvent("finish-step", {})));
          controller.enqueue(encoder.encode(createSSEEvent("finish", {})));
        } else {
          // If no content was received, send an error
          controller.enqueue(
            encoder.encode(
              createSSEEvent("error", { message: "No content received" })
            )
          );
        }

        // Send final [DONE] marker
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (error) {
        console.error("Error streaming from n8n:", error);

        // Send error event before closing
        try {
          controller.enqueue(
            encoder.encode(
              createSSEEvent("error", {
                message:
                  error instanceof Error ? error.message : "Streaming error",
              })
            )
          );
        } catch (enqueuError) {
          console.error("Error sending error event:", enqueuError);
        }
      } finally {
        // Ensure reader is properly closed
        try {
          await reader.cancel();
        } catch (cancelError) {
          console.error("Error canceling reader:", cancelError);
        }

        // Close the controller
        try {
          controller.close();
        } catch (closeError) {
          console.error("Error closing controller:", closeError);
        }
      }
    },

    // Add cancel handler for client disconnections
    cancel() {
      console.log("Stream was cancelled by client");
    },
  });

  return new Response(stream, { headers: createStreamingHeaders() });
}

async function createNonStreamingResponse(
  response: Response
): Promise<Response> {
  const data = await response.text();
  return new Response(data, {
    headers: {
      "Content-Type":
        response.headers.get("content-type") || "application/json",
      ...CORS_HEADERS,
    },
  });
}

// Handle CORS preflight requests
export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}
