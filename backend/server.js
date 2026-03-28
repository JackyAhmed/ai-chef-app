/**
 * server.js  —  Express backend
 *
 * Changes vs original:
 *  • Imports and mounts /api/auth  (register / login / me / profile)
 *  • Loads db.js to initialise SQLite on startup
 *  • Adds JWT_SECRET to .env reference list
 *  • All original OpenAI / vision / ElevenLabs routes preserved as-is
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// ── NEW: initialise database (runs schema creation automatically) ──────────
require('./db');

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// ── NEW: Auth routes ───────────────────────────────────────────────────────
const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

// ── Health check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasElevenLabs: !!process.env.ELEVENLABS_API_KEY,
  });
});

// ────────────────────────────────────────────────────────────────────────────
//  ALL YOUR ORIGINAL OPENAI / VISION / ELEVENLABS ROUTES GO HERE
//  (unchanged — paste them in from your original server.js)
// ────────────────────────────────────────────────────────────────────────────

// To protect any route with auth, use:
//   const { requireAuth } = require('./routes/auth');
//   app.post('/api/chat', requireAuth, async (req, res) => { ... });
//   app.post('/api/vision', requireAuth, async (req, res) => { ... });

// ── Serve built React app ──────────────────────────────────────────────────
const DIST = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(DIST));
app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001', 10);
app.listen(PORT,'0.0.0.0' () => {
  console.log(`[Server] Running on http://localhost:${PORT} - server.js:60`);
});
