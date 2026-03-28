import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3001);
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

// Allow same-origin (for serving built frontend) and configured origin
app.use(
  cors({
    origin: [frontendOrigin, `http://localhost:${port}`],
    credentials: true,
  })
);
app.use(express.json({ limit: "20mb" }));

// ── Key accessors ─────────────────────────────────────────────────────────────
const openaiKey = () => process.env.OPENAI_API_KEY || "";
const elevenLabsKey = () => process.env.ELEVENLABS_API_KEY || "";

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    services: {
      openaiConfigured: Boolean(openaiKey()),
      elevenLabsConfigured: Boolean(elevenLabsKey()),
      // expose as anthropicConfigured so frontend stays compatible
      anthropicConfigured: Boolean(openaiKey()),
    },
  });
});

// ── Vision / Chat proxy → OpenAI ──────────────────────────────────────────────
// Accepts the same shape the frontend sends (Anthropic-style) and translates it
// to OpenAI chat completions with vision support.
app.post("/api/vision/analyze", async (req, res) => {
  if (!openaiKey()) {
    return res.status(503).json({ error: "Missing OPENAI_API_KEY on backend." });
  }

  try {
    const { messages = [], system = [], max_tokens = 300, stream = true } = req.body;

    // Build OpenAI-compatible messages list
    const systemText = Array.isArray(system)
      ? system.map((b) => (typeof b === "string" ? b : b?.text || "")).join("\n")
      : typeof system === "string"
      ? system
      : "";

    const openaiMessages = [];
    if (systemText) {
      openaiMessages.push({ role: "system", content: systemText });
    }

    // Translate Anthropic content blocks → OpenAI content parts
    for (const msg of messages) {
      if (typeof msg.content === "string") {
        openaiMessages.push({ role: msg.role, content: msg.content });
        continue;
      }
      if (!Array.isArray(msg.content)) {
        openaiMessages.push({ role: msg.role, content: String(msg.content || "") });
        continue;
      }
      const parts = [];
      for (const block of msg.content) {
        if (block.type === "text") {
          parts.push({ type: "text", text: block.text });
        } else if (block.type === "image") {
          const src = block.source;
          if (src?.type === "base64") {
            parts.push({
              type: "image_url",
              image_url: { url: `data:${src.media_type};base64,${src.data}`, detail: "low" },
            });
          } else if (src?.type === "url") {
            parts.push({ type: "image_url", image_url: { url: src.url, detail: "low" } });
          }
        }
      }
      openaiMessages.push({ role: msg.role, content: parts });
    }

    const payload = {
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      max_tokens,
      stream,
      messages: openaiMessages,
    };

    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey()}`,
      },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return res.status(upstream.status).json({ error: errText });
    }

    if (!stream) {
      // Non-streaming: return Anthropic-compatible response shape
      const data = await upstream.json();
      const text = data.choices?.[0]?.message?.content || "";
      return res.json({
        content: [{ type: "text", text }],
        stop_reason: data.choices?.[0]?.finish_reason || "stop",
      });
    }

    // Streaming: translate OpenAI SSE → Anthropic SSE format
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Send Anthropic-compatible stream start event
    res.write(`event: message_start\ndata: {"type":"message_start","message":{"id":"msg_stream","type":"message","role":"assistant","content":[],"model":"gpt-4o-mini","stop_reason":null}}\n\n`);
    res.write(`event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n`);

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (raw === "[DONE]") continue;
        try {
          const chunk = JSON.parse(raw);
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
            res.write(
              `event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":${JSON.stringify(delta)}}}\n\n`
            );
          }
        } catch {
          // skip malformed chunks
        }
      }
    }

    res.write(`event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n`);
    res.write(`event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null}}\n\n`);
    res.write(`event: message_stop\ndata: {"type":"message_stop"}\n\n`);
    res.end();
  } catch (error) {
    console.error("[vision]", error);
    if (!res.headersSent) res.status(500).json({ error: "Vision proxy failed." });
    else res.end();
  }
});

// ── TTS proxy → ElevenLabs ────────────────────────────────────────────────────
app.post("/api/voice/tts", async (req, res) => {
  if (!elevenLabsKey()) {
    return res.status(503).json({ error: "Missing ELEVENLABS_API_KEY on backend." });
  }

  const { text, voiceId } = req.body || {};
  if (!text || !voiceId) {
    return res.status(400).json({ error: "text and voiceId are required." });
  }

  try {
    const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": elevenLabsKey(),
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.35, use_speaker_boost: true },
      }),
    });

    if (!upstream.ok) {
      const errorText = await upstream.text();
      return res.status(upstream.status).send(errorText);
    }

    res.setHeader("Content-Type", upstream.headers.get("content-type") || "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=3600");

    if (!upstream.body) {
      const ab = await upstream.arrayBuffer();
      return res.send(Buffer.from(ab));
    }
    for await (const chunk of upstream.body) res.write(chunk);
    res.end();
  } catch (error) {
    console.error("[tts]", error);
    res.status(500).json({ error: "TTS proxy failed." });
  }
});

// ── Serve built frontend (production) ─────────────────────────────────────────
const frontendDist = path.join(__dirname, "..", "frontend", "dist");
app.use(express.static(frontendDist));
app.get("*", (req, res) => {
  const indexPath = path.join(frontendDist, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) res.status(404).send("Frontend not built yet. Run: npm run build in the frontend folder.");
  });
});

app.listen(port, () => {
  console.log(`\n🍳 Cooking Assistant backend listening on http://localhost:${port}`);
  console.log(`   OpenAI:     ${openaiKey() ? "✅ configured" : "❌ missing OPENAI_API_KEY"}`);
  console.log(`   ElevenLabs: ${elevenLabsKey() ? "✅ configured" : "⚠️  missing (TTS will use browser fallback)"}\n`);
});
