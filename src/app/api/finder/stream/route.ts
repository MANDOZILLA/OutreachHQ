import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const LOG_PATH = path.join(process.cwd(), "data", "system.log");

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let lastSize = 0;
      let closed = false;

      function safeEnqueue(data: Uint8Array) {
        if (closed) return;
        try { controller.enqueue(data); } catch { closed = true; }
      }

      function cleanup() {
        closed = true;
        clearInterval(interval);
        clearTimeout(timeout);
        try { controller.close(); } catch {}
      }

      if (fs.existsSync(LOG_PATH)) {
        const stat = fs.statSync(LOG_PATH);
        lastSize = stat.size;
        const content = fs.readFileSync(LOG_PATH, "utf-8");
        const lines = content.split("\n").filter(Boolean).slice(-20);
        for (const line of lines) {
          safeEnqueue(encoder.encode(`data: ${JSON.stringify({ line })}\n\n`));
        }
      }

      const interval = setInterval(() => {
        if (closed) return;
        try {
          if (!fs.existsSync(LOG_PATH)) return;
          const stat = fs.statSync(LOG_PATH);
          if (stat.size > lastSize) {
            const fd = fs.openSync(LOG_PATH, "r");
            const buf = Buffer.alloc(stat.size - lastSize);
            fs.readSync(fd, buf, 0, buf.length, lastSize);
            fs.closeSync(fd);
            lastSize = stat.size;
            const newLines = buf.toString("utf-8").split("\n").filter(Boolean);
            for (const line of newLines) {
              safeEnqueue(encoder.encode(`data: ${JSON.stringify({ line })}\n\n`));
            }
          }
        } catch {
          // file may not exist yet
        }
      }, 1000);

      const timeout = setTimeout(cleanup, 300000);
    },
    cancel() {
      // Client disconnected
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
