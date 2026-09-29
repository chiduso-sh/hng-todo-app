# Todo

A todo list app with notes, deadlines, editing and deleting.

- **Frontend** — React + TypeScript, built with Vite
- **Backend** — Node.js + Express, plain JavaScript
- **Storage** — a JSON file on the server

## Features

- Add a task with a title, optional notes and an optional deadline
- Edit any task in place — title, notes and deadline
- Delete a task (two clicks, so a stray click cannot destroy anything)
- Tick a task off; finished tasks drop to the bottom of the list
- Deadline badges that read in plain English: *Overdue by 2 days*, *Due today*,
  *Due in 6 days*
- Filter the list by All / Active / Done
- The list sorts itself: unfinished first, soonest deadline first, tasks with
  no deadline last

## Running it locally

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
npm run install:all
```

Then start the two servers in **two separate terminals**:

```bash
npm run dev:api
```

```bash
npm run dev:web
```

Open http://localhost:5173.

The API runs on port 4000. In development the frontend calls `/api/...` on its
own address and Vite forwards those calls to the API, so there is no URL to
configure and no CORS to fight.

## Project layout

```
backend/
  server.js              starts the server
  src/app.js             Express app: middleware, routes, error handling
  src/routes/todos.js    the five todo endpoints
  src/store.js           reads and writes data/todos.json
  src/validate.js        checks incoming request bodies
  data/todos.json        your saved tasks (created on first write, git-ignored)

frontend/
  src/App.tsx            owns the list and talks to the API
  src/api.ts             every fetch call lives here
  src/types.ts           the shared shapes: Todo, NewTodo, TodoPatch, Filter
  src/deadline.ts        works out "Due today" / "Overdue by 2 days"
  src/components/        TodoForm, TodoList, TodoItem
  src/styles.css         all the styling
```

## The API

| Method | Path | What it does |
|---|---|---|
| GET | `/api/health` | Confirms the server is up |
| GET | `/api/todos` | Returns every task |
| POST | `/api/todos` | Creates one — `{title, notes?, deadline?}` |
| PATCH | `/api/todos/:id` | Edits one — send only the fields that changed |
| DELETE | `/api/todos/:id` | Removes one |

A task looks like this:

```json
{
  "id": "e4a1…-uuid",
  "title": "Ship the task",
  "notes": "Deploy, then submit the URL",
  "deadline": "2026-10-01",
  "done": false,
  "createdAt": "2026-09-29T15:39:20.296Z"
}
```

`deadline` is either a `"YYYY-MM-DD"` string or `null`. The server rejects a
date that does not exist, so `2026-02-31` comes back as a 400 rather than
being stored.

## Checking your work

```bash
npm test            # 44 tests across both halves
npm run typecheck   # TypeScript, strict mode
npm run build       # typechecks, then produces frontend/dist
```

The tests use Node's own built-in runner, so there is nothing extra to install
and no server to start first — the API tests spin the app up themselves on a
spare port and write to a temporary file, never to your real `data/todos.json`.

They cover the validation rules, all five endpoints, and the date maths behind
the deadline badges. `npm run build` fails if the types are wrong, so a broken
build never gets deployed.

## Deploying

The two halves deploy separately.

**Backend** — any Node host (Render, Railway, Fly). Build command
`npm install`, start command `npm start`, root directory `backend`. Note that
free tiers usually wipe the filesystem on redeploy, so `data/todos.json` will
reset; swapping `src/store.js` for a real database fixes that when you need it.

**Frontend** — Vercel or Netlify. Root directory `frontend`, build command
`npm run build`, output directory `dist`. Set one environment variable:

```
VITE_API_URL=https://your-api-host.example.com
```

No trailing slash. Without it the deployed site will try to call itself for
`/api` and every request will fail.

## Notes for AI agents

See [AGENTS.md](AGENTS.md) — it holds the conventions, the API contract, and
the rules for changing this codebase.
