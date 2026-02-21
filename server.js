// ╔══════════════════════════════════════════════════════════╗
// ║  CONFRACT — server.js                                    ║
// ║  Self-hosted AI, no external API, no user accounts       ║
// ╚══════════════════════════════════════════════════════════╝

import express from 'express';
import cors from 'cors';
import { ConfractEngine } from './engine.js';

const app  = express();
const PORT = process.env.PORT || 3002;  // ← change port here if needed

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static('public'));  // serves index.html, confract.html, style.css, script.js

// Boot AI engine once on startup
const engine = new ConfractEngine();

(async () => {
  console.log('🚀 Confract Server Starting...');
  await engine.init();
  console.log('✅ AI Engine Ready — model: all-MiniLM-L6-v2');
  console.log(`📍 Landing page : http://localhost:${PORT}`);
  console.log(`📍 App          : http://localhost:${PORT}/confract.html`);
})();

// ── POST /api/process ──────────────────────────────────────
// Full pipeline: detect type → classify → deduplicate → structure
app.post('/api/process', async (req, res) => {
  const { input, existingDoc } = req.body;
  if (!input?.trim()) return res.status(400).json({ error: 'No input provided' });

  console.log(`📥 Process: ${input.length} chars`);
  try {
    const result = await engine.process(input.trim(), existingDoc || null);
    res.json(result);
  } catch (e) {
    console.error('❌', e.message);
    res.status(500).json({ error: 'Processing failed: ' + e.message });
  }
});

// ── POST /api/detect ───────────────────────────────────────
// Fast semantic match: does this input belong to an existing doc?
app.post('/api/detect', async (req, res) => {
  const { input, docs } = req.body;
  if (!input || !docs) return res.json({ match_id: null, confidence: 'low', reason: 'Missing data' });

  try {
    const match = await engine.detectMatch(input.slice(0, 600), docs);
    res.json(match);
  } catch (e) {
    res.json({ match_id: null, confidence: 'low', reason: 'Detection failed' });
  }
});

// ── GET /api/health ────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status:  'healthy',
    service: 'Confract',
    version: '1.0.0',
    model:   'all-MiniLM-L6-v2 (local)',
    ready:   engine.ready
  });
});

app.listen(PORT);
