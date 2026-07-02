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

// ── Comment routes ─────────────────────────────────────────────────────────────

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