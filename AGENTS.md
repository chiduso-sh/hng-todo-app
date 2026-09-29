# AGENTS.md

Instructions for any AI coding agent working in this repository. Read this
before making changes; it is the shortest path to a change that fits.

---

## 1. What this project is

A todo list app. A task has a **title**, free-text **notes**, an optional
**deadline**, and a **done** flag. Tasks can be created, edited, ticked off and
deleted.

It is deliberately small. It exists to be read and understood, not to
demonstrate architecture. Prefer the obvious solution over the clever one.

## 2. Stack — and what must not change

| Part | Technology | Non-negotiable |
|---|---|---|
| Frontend | React 18 + **TypeScript** (Vite) | Yes — the frontend is TypeScript |
| Backend | **Node.js + Express**, plain **JavaScript** | Yes — the backend is JavaScript |
| Storage | One JSON file (`backend/data/todos.json`) | No — swappable |
| Styling | One hand-written CSS file | No, but do not add a UI framework unasked |

Do **not** add TypeScript to the backend, and do **not** rewrite the frontend
in plain JavaScript. Do not introduce Redux, React Query, Tailwind, an ORM or a
database unless the user asks for it by name.

## 3. Layout

```
backend/
  server.js              starts the HTTP server; nothing else
  src/app.js             Express app: middleware, routes, 404, error handler
  src/routes/todos.js    the five todo endpoints
  src/store.js           the ONLY file that touches stored data
  src/validate.js        the ONLY file that decides if input is acceptable
  data/todos.json        the saved list (git-ignored, created on first write)

frontend/
  src/main.tsx           mounts React
  src/App.tsx            owns the todo list and every API call
  src/api.ts             the ONLY file that calls fetch
  src/types.ts           the shared shapes (Todo, NewTodo, TodoPatch, Filter)
  src/deadline.ts        date maths and the badge wording
  src/components/        TodoForm, TodoList, TodoItem
  src/styles.css         all styling
```

**The "only file" lines above are the main rule of this codebase.** If a change
needs a new API call, it goes in `api.ts`. If it needs new validation, it goes
in `validate.js`. Do not scatter fetch calls or ad-hoc input checks through
components and routes.

## 4. Commands

```bash
npm run install:all      # install both sides (from the repo root)
npm run dev:api          # backend on http://localhost:4000
npm run dev:web          # frontend on http://localhost:5173
npm run typecheck        # tsc --noEmit on the frontend
npm run build            # typecheck, then production build
```

Both dev servers must be running at once, in separate terminals. Vite proxies
`/api` to port 4000, so the frontend never hardcodes a backend URL.

The backend only reloads on save when started with `npm run dev:api`, which
uses `node --watch`. If a newly added route returns 404, check whether the
server was actually restarted.

## 5. Rules for changing code

1. **Run `npm run typecheck` before calling a frontend change done.** It is the
   only automated check in this repo. A change that does not typecheck is not
   finished.
2. **`strict` mode stays on.** Never silence a type error with `any`, a double
   cast, or `@ts-ignore`. If the type is fighting you, the runtime shape is
   probably wrong — fix that instead.
3. **Annotate the boundaries, let inference do the middle.** Props interfaces,
   function signatures and API responses get explicit types. `useState('')`
   does not need one.
4. **Handle `null` rather than assuming it away.** `deadline` is
   `string | null` on purpose. An empty date input gives `""` and the API
   expects `null` — convert at the edge, once.
5. **The server owns the record.** After a create or an edit, put the object
   the server *returned* into state, not the object that was sent. Only the
   server knows the `id` and `createdAt`.
6. **Validate every request body** in `validate.js` and answer a bad one with
   `400` and `{ error: "plain english reason" }`. Never trust `req.body`.
7. **Keep state as local as it can be.** Draft text while editing a row lives
   in that row's component. Only the saved list lives in `App`.
8. **Comments explain why, not what.** Do not narrate the code.
9. **No new dependency without being asked.** The backend has exactly two
   (`express`, `cors`); the frontend has React plus build tools.

## 6. The API contract

Base path `/api`. All bodies are JSON.

| Method | Path | Body | Success | Failure |
|---|---|---|---|---|
| GET | `/api/health` | — | `200 {status}` | — |
| GET | `/api/todos` | — | `200 Todo[]` | — |
| POST | `/api/todos` | `{title, notes?, deadline?}` | `201 Todo` | `400 {error}` |
| PATCH | `/api/todos/:id` | any of `{title, notes, deadline, done}` | `200 Todo` | `400`, `404` |
| DELETE | `/api/todos/:id` | — | `204`, no body | `404` |

A Todo looks like this:

```json
{
  "id": "e4a1…-uuid",
  "title": "Ship the task",
  "notes": "",
  "deadline": "2026-10-01",
  "done": false,
  "createdAt": "2026-09-29T15:39:20.296Z"
}
```

- `title` — required, trimmed, 1 to 200 characters.
- `notes` — optional, trimmed, up to 2000 characters, `""` when unset.
- `deadline` — `"YYYY-MM-DD"` or `null`. Checked for shape *and* for being a
  real calendar day, so `"2026-02-31"` is rejected.

PATCH is a partial update: send only what changed. Ticking a checkbox sends
`{ "done": true }` and nothing else.

If you change this contract, update **this table, `types.ts` and `validate.js`
in the same change**. They are three views of one agreement and they drift the
moment you touch only one.

## 7. How to verify a change

There is no test suite yet. Until there is, verify by hand and report what you
actually checked.

```bash
curl http://localhost:4000/api/todos
curl -X POST http://localhost:4000/api/todos -H "Content-Type: application/json" -d "{\"title\":\"test\",\"deadline\":\"2026-10-01\"}"
```

Then in the browser: add a task, edit it, tick it, delete it, and reload the
page to confirm it persisted. Check the deadline badge against a date in the
past, today, and next week.

Do not report a change as working on the strength of the code alone.

## 8. Known gaps — deliberate, not oversights

Do not "fix" these unless asked:

- **No authentication.** Every visitor sees the same list.
- **No database.** The JSON file is rewritten in full on every change. Fine at
  this size; replace `store.js` when it stops being fine.
- **No tests.** The obvious first one is `node --test` over `validate.js`,
  which is pure functions and needs no server.
- **Last write wins.** Two browsers editing at once will clobber each other.
- **`data/` is not persistent on most free hosts.** A free Render or Railway
  instance wipes it on redeploy. Expected until a real database lands.

## 9. Ideas worth building next

Roughly in order of value for effort:

1. Tests for `validate.js` with `node --test` — pure functions, no setup.
2. Search across titles and notes.
3. A priority or tag field — the same edit-and-validate path as `notes`.
4. Deadline reminders, or a "due this week" view.
5. Swap the JSON file for SQLite or Postgres; only `store.js` changes.
6. Accounts, once there is a database to hang them off.

## 10. Working with the user

The user is learning, and is building this to understand it — not only to ship
it. When you make a change:

- Say **which files** changed and **why**, in plain language.
- Name the concept when one shows up ("this is a partial update, which is what
  PATCH means"), but do not lecture.
- Skip jargon that has not earned its place. If a term is unavoidable, define
  it once in a clause.
- When something was a judgement call, say what the alternative was and why
  this one won.
- If a request looks wrong or risky, say so plainly before doing it.

## 11. Keeping this file honest

Update AGENTS.md in the same change that makes it stale — a new endpoint, a new
top-level file, a new rule, a new command. A file describing last week's code
is worse than no file at all.
