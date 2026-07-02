# ⚡ DSA Tracker — MERN + Vite

Same app, same look, same features — rebuilt as a proper MERN stack project:

- **M**ongoDB + Mongoose — same schema as before (`server/server.js`)
- **E**xpress — same REST API, same routes, same auth/session logic
- **R**eact — the old vanilla `app.js` DOM code ported to React components
- **N**ode.js — runs the Express server
- **Vite** — bundles/serves the React client in dev, builds it for production

Nothing about the UI, styling, or behavior changed — `client/src/styles.css` is
the original `styles.css` untouched, and every button/modal/flow works exactly
as it did before (login, add/edit/delete problems, multi-language solutions,
notes images, discussion/comments, theme toggle, search & filters).

## Project structure

```
dsa-tracker-mern/
├── server/                 ← Express + Mongoose API (was server.js + public/)
│   ├── server.js
│   ├── package.json
│   └── .env                ← your secrets (never committed)
├── client/                 ← React + Vite frontend (was public/)
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── utils.js
│   │   ├── styles.css      ← original styles.css, unchanged
│   │   └── components/
│   │       ├── Header.jsx
│   │       ├── Controls.jsx
│   │       ├── TopicCard.jsx
│   │       ├── ProblemModal.jsx
│   │       ├── SolutionModal.jsx
│   │       ├── LoginModal.jsx
│   │       ├── DiscussionModal.jsx
│   │       └── Toast.jsx
│   ├── vite.config.js      ← proxies /api → http://localhost:3000 in dev
│   └── package.json
└── package.json            ← root scripts to run both together
```

## Local setup

```bash
npm run install:all      # installs deps in server/ and client/
```

Fill in `server/.env` (same variables as before):

```env
OWNER_PASSWORD=your_strong_password
SESSION_SECRET=any_long_random_string_at_least_32_chars
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dsa-tracker?retryWrites=true&w=majority
PORT=3000
```

Run both client and server together:

```bash
npm run dev
```

- Backend API: `http://localhost:3000`
- Frontend (open this in your browser): `http://localhost:5173`

The Vite dev server proxies all `/api/*` requests to the backend, so it
behaves as one app (cookies/sessions work exactly like before) even though
two processes are running.

## Production build

```bash
npm run build      # builds client/dist
npm start           # builds client, then starts Express which serves client/dist
```

In production, Express serves the built React app directly (`server/server.js`
serves `client/dist` and falls back to `index.html` for client-side routes),
so you deploy it as a single web service — same as the original Render setup.

## How auth works (unchanged)

- Password lives only in the server's environment variables.
- Never sent to or stored in the browser.
- Login checked server-side; session stored in MongoDB via `connect-mongo`.
- `httpOnly` session cookie — JavaScript cannot read or steal it.

## A note on your `.env`

The `.env` file from your original project (with your Mongo URI, session
secret, and owner password) was carried over as-is into `server/.env` so
nothing breaks. Since those credentials were sitting in a zip file, it's
good practice to rotate the MongoDB password and pick a fresh
`SESSION_SECRET`/`OWNER_PASSWORD` at some point, especially if that zip was
ever shared or stored anywhere outside your own machine.
