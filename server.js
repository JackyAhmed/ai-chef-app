require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const https   = require('https');

require('./db');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// ── Auth ───────────────────────────────────────────────────────────────────
const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

// ── Health ─────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasElevenLabs: !!process.env.ELEVENLABS_API_KEY,
  });
});

// ── OpenAI helper ──────────────────────────────────────────────────────────
const openAIChat = (messages, maxTokens = 600) => new Promise((resolve, reject) => {
  const body = JSON.stringify({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    max_tokens: maxTokens,
    messages,
  });
  const req = https.request({
    hostname: 'api.openai.com',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Length': Buffer.byteLength(body),
    },
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch { reject(new Error('Invalid JSON from OpenAI')); }
    });
  });
  req.on('error', reject);
  req.write(body);
  req.end();
});

// ── Object Detection ───────────────────────────────────────────────────────
app.post('/api/detect', async (req, res) => {
  const { mode, image } = req.body;
  if (!image) return res.status(400).json({ error: 'No image provided' });

  const prompts = {
    ingredients: `Look at this image and identify ALL food ingredients, produce, and cooking items you can see.
Respond ONLY in this exact JSON format (no markdown, no extra text):
{"items":["item1","item2"],"recipes":["Recipe 1","Recipe 2","Recipe 3"],"tip":"One short cooking tip"}`,
    identify: `Identify every object visible in this image including food, tools, appliances, and any other items.
Respond ONLY in this exact JSON format (no markdown, no extra text):
{"items":[{"name":"item name","detail":"brief description"}],"tip":"Any relevant cooking or safety tip"}`,
    track: `List every ingredient or food item visible in this image.
Respond ONLY in this exact JSON format (no markdown, no extra text):
{"items":["ingredient1","ingredient2"],"used":["items that look partially used or prepared"],"tip":"Brief note on readiness"}`,
  };

  try {
    const data = await openAIChat([{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}`, detail: 'low' } },
        { type: 'text', text: prompts[mode] || prompts.identify },
      ],
    }], 600);

    const raw = (data.choices?.[0]?.message?.content || '').replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(raw);
    res.json({ ...parsed, mode });
  } catch (err) {
    console.error('[Detect]', err.message);
    res.status(500).json({ error: 'Detection failed' });
  }
});

// ── Voice Command Intent ───────────────────────────────────────────────────
app.post('/api/intent', async (req, res) => {
  const { transcript, context } = req.body;
  if (!transcript) return res.json({ intent: 'UNKNOWN' });

  try {
    const data = await openAIChat([
      {
        role: 'system',
        content: `You are a voice command interpreter for a cooking assistant app.
The user is cooking and spoke a command. Decide what action to take.
${context || ''}
Available actions — respond with ONLY the action name, nothing else:
NEXT_STEP, PREVIOUS_STEP, REPEAT_STEP, START_TIMER, ANALYZE, START_CAMERA, STOP_CAMERA, CURRENT_STEP, INGREDIENTS, HOW_LONG, GO_HOME, HELP, UNKNOWN`,
      },
      { role: 'user', content: transcript },
    ], 20);

    const intent = (data.choices?.[0]?.message?.content || 'UNKNOWN')
      .trim().toUpperCase().replace(/[^A-Z_]/g, '');
    res.json({ intent });
  } catch (err) {
    console.error('[Intent]', err.message);
    res.json({ intent: 'UNKNOWN' });
  }
});

// ── ElevenLabs TTS ─────────────────────────────────────────────────────────
app.post('/api/voice/tts', async (req, res) => {
  const { text, voiceId } = req.body;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey || !voiceId) return res.status(400).json({ error: 'Missing config' });

  const body = JSON.stringify({
    text,
    model_id: process.env.ELEVENLABS_MODEL || 'eleven_v3',
    voice_settings: { stability: 0.5, similarity_boost: 0.75 },
  });

  const ttsReq = https.request({
    hostname: 'api.elevenlabs.io',
    path: `/v1/text-to-speech/${voiceId}`,
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
      'Content-Length': Buffer.byteLength(body),
    },
  }, (ttsRes) => {
    res.setHeader('Content-Type', 'audio/mpeg');
    ttsRes.pipe(res);
  });
  ttsReq.on('error', (err) => {
    console.error('[TTS]', err.message);
    res.status(500).json({ error: 'TTS failed' });
  });
  ttsReq.write(body);
  ttsReq.end();
});

// ── Serve React app ────────────────────────────────────────────────────────
const DIST = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(DIST));
app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🍳 Cooking Assistant backend listening on http://localhost:${PORT}`);
  console.log(`   OpenAI:     ${process.env.OPENAI_API_KEY ? '✅ configured' : '❌ missing'}`);
  console.log(`   ElevenLabs: ${process.env.ELEVENLABS_API_KEY ? '✅ configured' : '⚠️  missing (TTS will use browser fallback)'}`);
});
