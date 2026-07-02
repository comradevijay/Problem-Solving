require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── MongoDB Connection ─────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => { console.error('❌ MongoDB error:', err.message); process.exit(1); });

// ── Problem Schema ─────────────────────────────────────────────────────────────
const problemSchema = new mongoose.Schema({
  uid:        { type: String, required: true, unique: true },
  id:         String,
  name:       { type: String, required: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
  topic:      { type: String, default: 'Uncategorized' },
  link:       String,
  solutions:  [{
    lang: { type: String, required: true },
    code: { type: String, default: '' }
  }],
  notes:      String,
  notesImage: { type: String, default: '' }, // base64 data URL
  // Cached AI-generated step-by-step execution traces, keyed by language.
  // e.g. { python: { example: {...}, steps: [...] }, javascript: {...} }
  traces:     { type: mongoose.Schema.Types.Mixed, default: {} },
  addedAt:    { type: Number, default: () => Date.now() }
});

const Problem = mongoose.model('Problem', problemSchema);

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));

// In production the client is pre-built by Vite (client/dist) and served
// from here. In development the client runs on its own Vite dev server
// (port 5173) and proxies /api requests to this server instead.
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientDist));
}

app.set('trust proxy', 1);

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  // Sessions stored in MongoDB — survive server restarts/redeploys
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    maxAge: 8 * 60 * 60 * 1000 // 8 hours
  }
}));

// ── Auth middleware ────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session && req.session.isOwner) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

// ── Auth routes ────────────────────────────────────────────────────────────────
app.get('/api/auth/status', (req, res) => {
  res.json({ authenticated: !!req.session.isOwner });
});

app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.OWNER_PASSWORD) {
    req.session.isOwner = true;
    return res.json({ success: true });
  }
  setTimeout(() => res.status(401).json({ error: 'Wrong password' }), 500);
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// ── Comment Schema ─────────────────────────────────────────────────────────────
const commentSchema = new mongoose.Schema({
  problemUid: { type: String, required: true, index: true },
  author:     { type: String, default: 'Anonymous' },
  text:       { type: String, required: true },
  createdAt:  { type: Date, default: Date.now }
});
const Comment = mongoose.model('Comment', commentSchema);

// ── Problem routes ─────────────────────────────────────────────────────────────

// GET all — public
app.get('/api/problems', async (req, res) => {
  try {
    const problems = await Problem.find().sort({ addedAt: 1 }).lean();
    res.json(problems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST — owner only
app.post('/api/problems', requireAuth, async (req, res) => {
  try {
    const uid = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const problem = await Problem.create({ uid, ...req.body });
    res.status(201).json(problem);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT — owner only
app.put('/api/problems/:uid', requireAuth, async (req, res) => {
  try {
    const problem = await Problem.findOneAndUpdate(
      { uid: req.params.uid },
      req.body,
      { new: true }
    );
    if (!problem) return res.status(404).json({ error: 'Not found' });
    res.json(problem);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE — owner only
app.delete('/api/problems/:uid', requireAuth, async (req, res) => {
  try {
    const result = await Problem.findOneAndDelete({ uid: req.params.uid });
    if (!result) return res.status(404).json({ error: 'Not found' });
    // cascade delete comments
    await Comment.deleteMany({ problemUid: req.params.uid });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Live Preview traces (AI-generated step-by-step execution) ────────────────────
//
// Uses Groq's free-tier OpenAI-compatible API to simulate the solution code
// on a small example and produce a JSON trace the frontend can animate,
// similar to a debugger stepping through the code line by line.

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const TRACE_SYSTEM_PROMPT = `You are a precise code execution tracer used to power a "live preview" visualizer for a DSA (data structures & algorithms) learning app.

Given a problem description and a solution's source code (with 1-indexed line numbers prefixed), mentally execute the code on ONE small, concrete example you choose (short strings/arrays, ideally length 4-10) and emit a step-by-step trace as STRICT JSON — no markdown fences, no prose, no comments.

Rules:
- Pick an example that actually exercises the interesting logic (not a trivial edge case like empty input), and that matches the problem's stated behavior.
- Emit one step per meaningful line of execution (skip pure syntax lines like standalone closing braces). Loop iterations should each produce their own step(s).
- Cap the total number of steps at 18. If the real run is longer, pick a representative subset (start, a few interesting middle iterations, and the conclusion) while keeping "line" accurate for each included step.
- "line" must be the 1-indexed line number from the given numbered source that this step corresponds to.
- "description" is a short (<=14 words) plain-English explanation of what happens at this step.
- "arrays" lists every string/array worth visualizing at this point (e.g. the input, a rotated/sliced copy, a window, a stack). Each entry: "label" (short name), "values" (the array/string as a list of single elements/characters), "highlight" (0-indexed positions currently being acted on/compared), and optionally "matched" (0-indexed positions already confirmed/settled, shown differently from "highlight").
- "vars" is an object of other scalar variables relevant at this point (e.g. {"i": 3, "found": false}).
- The final step's description should state the overall result (e.g. "Returns true — s2 is a rotation of s1").

Return ONLY a JSON object of this exact shape:
{
  "example": { "<input name>": "<value>", ... },
  "steps": [
    {
      "line": 3,
      "description": "...",
      "arrays": [ { "label": "s1", "values": ["a","b","c"], "highlight": [0], "matched": [] } ],
      "vars": { "i": 0 }
    }
  ]
}`;

function buildNumberedCode(code) {
  return code.split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n');
}

async function generateTraceWithGroq({ name, difficulty, topic, notes, code, lang }) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured on the server');
  }

  const userPrompt = `Problem: ${name} (${difficulty}${topic ? `, topic: ${topic}` : ''})
${notes ? `Notes: ${notes}\n` : ''}
Language: ${lang}
Source code (1-indexed lines):
${buildNumberedCode(code)}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: TRACE_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `Groq request failed (${res.status})`);
  }

  const raw = data.choices?.[0]?.message?.content;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Groq returned invalid JSON for the trace');
  }
  if (!parsed || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    throw new Error('Groq returned an empty or malformed trace');
  }
  return parsed;
}

// GET cached trace for a problem+language — public (viewing is public, like solutions)
app.get('/api/problems/:uid/trace/:lang', async (req, res) => {
  try {
    const problem = await Problem.findOne({ uid: req.params.uid }).lean();
    if (!problem) return res.status(404).json({ error: 'Not found' });
    const trace = problem.traces && problem.traces[req.params.lang];
    if (!trace) return res.status(404).json({ error: 'No live preview generated yet' });
    res.json(trace);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST generate (and cache) a trace — owner only, to protect the API key/quota
app.post('/api/problems/:uid/trace', requireAuth, async (req, res) => {
  try {
    const { lang } = req.body;
    if (!lang) return res.status(400).json({ error: 'lang is required' });

    const problem = await Problem.findOne({ uid: req.params.uid });
    if (!problem) return res.status(404).json({ error: 'Not found' });

    const solution = (problem.solutions || []).find(s => s.lang === lang);
    if (!solution || !solution.code.trim()) {
      return res.status(400).json({ error: `No ${lang} solution saved for this problem yet` });
    }

    const trace = await generateTraceWithGroq({
      name: problem.name,
      difficulty: problem.difficulty,
      topic: problem.topic,
      notes: problem.notes,
      code: solution.code,
      lang
    });

    problem.traces = { ...(problem.traces || {}), [lang]: trace };
    problem.markModified('traces');
    await problem.save();

    res.json(trace);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// GET comments for a problem — public
app.get('/api/comments/:uid', async (req, res) => {
  try {
    const comments = await Comment.find({ problemUid: req.params.uid }).sort({ createdAt: 1 }).lean();
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a comment — public (anyone)
app.post('/api/comments/:uid', async (req, res) => {
  try {
    const { author, text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Comment text required' });
    const comment = await Comment.create({
      problemUid: req.params.uid,
      author: (author || 'Anonymous').trim().slice(0, 60),
      text: text.trim().slice(0, 2000)
    });
    res.status(201).json(comment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE a comment — owner only
app.delete('/api/comments/:id', requireAuth, async (req, res) => {
  try {
    const result = await Comment.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SPA fallback (production only) ───────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n⚡ DSA Tracker running at http://localhost:${PORT}`);
  console.log(`   Password loaded from .env — never sent to browser\n`);
});