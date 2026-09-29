// Checking what the client sent, in one place.
//
// Every function returns either { ok: true, value } or { ok: false, error }.
// The routes read `ok` and either use the clean value or answer 400 with the
// message. Nothing downstream has to wonder whether a field is trustworthy.

const MAX_TITLE = 200;
const MAX_NOTES = 2000;

function fail(error) {
  return { ok: false, error };
}

function checkTitle(raw) {
  if (typeof raw !== 'string') return fail('title must be text');

  const title = raw.trim();
  if (title === '') return fail('title cannot be empty');
  if (title.length > MAX_TITLE) return fail(`title cannot be longer than ${MAX_TITLE} characters`);

  return { ok: true, value: title };
}

function checkNotes(raw) {
  if (raw === undefined || raw === null) return { ok: true, value: '' };
  if (typeof raw !== 'string') return fail('notes must be text');

  const notes = raw.trim();
  if (notes.length > MAX_NOTES) return fail(`notes cannot be longer than ${MAX_NOTES} characters`);

  return { ok: true, value: notes };
}

// A deadline is either a "YYYY-MM-DD" string or null (no deadline set).
// The regex checks the shape; Date checks that it is a day that exists —
// "2026-02-31" has the right shape but is not a real date.
function checkDeadline(raw) {
  if (raw === undefined || raw === null || raw === '') return { ok: true, value: null };
  if (typeof raw !== 'string') return fail('deadline must be a YYYY-MM-DD date');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return fail('deadline must look like YYYY-MM-DD');

  const asDate = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(asDate.getTime())) return fail('deadline is not a real date');
  if (asDate.toISOString().slice(0, 10) !== raw) return fail('deadline is not a real date');

  return { ok: true, value: raw };
}

function checkDone(raw) {
  if (typeof raw !== 'boolean') return fail('done must be true or false');
  return { ok: true, value: raw };
}

// POST /api/todos — title is required, the rest have sensible defaults.
export function parseNewTodo(body) {
  if (body === null || typeof body !== 'object') return fail('expected a JSON object');

  const title = checkTitle(body.title);
  if (!title.ok) return title;

  const notes = checkNotes(body.notes);
  if (!notes.ok) return notes;

  const deadline = checkDeadline(body.deadline);
  if (!deadline.ok) return deadline;

  return {
    ok: true,
    value: { title: title.value, notes: notes.value, deadline: deadline.value },
  };
}

// PATCH /api/todos/:id — every field is optional, but at least one must be
// present, and only the keys that were sent end up in the result.
export function parseTodoPatch(body) {
  if (body === null || typeof body !== 'object') return fail('expected a JSON object');

  const fields = {};

  if ('title' in body) {
    const title = checkTitle(body.title);
    if (!title.ok) return title;
    fields.title = title.value;
  }

  if ('notes' in body) {
    const notes = checkNotes(body.notes);
    if (!notes.ok) return notes;
    fields.notes = notes.value;
  }

  if ('deadline' in body) {
    const deadline = checkDeadline(body.deadline);
    if (!deadline.ok) return deadline;
    fields.deadline = deadline.value;
  }

  if ('done' in body) {
    const done = checkDone(body.done);
    if (!done.ok) return done;
    fields.done = done.value;
  }

  if (Object.keys(fields).length === 0) return fail('nothing to update');

  return { ok: true, value: fields };
}
