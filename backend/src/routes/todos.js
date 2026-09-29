// The five things the API can do with todos.
//
// Each route does the same three steps: check the input, ask the store to do
// the work, answer with JSON. Anything thrown here lands in the error handler
// in app.js, so there is no try/catch noise in the routes themselves.

import { Router } from 'express';
import * as store from '../store.js';
import { parseNewTodo, parseTodoPatch } from '../validate.js';

const router = Router();

// GET /api/todos — the whole list, newest deadline pressure first is the
// frontend's job; the API just returns what it has.
router.get('/', async (req, res) => {
  const todos = await store.getAll();
  res.json(todos);
});

// POST /api/todos — create one.
router.post('/', async (req, res) => {
  const parsed = parseNewTodo(req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  const todo = await store.create(parsed.value);
  res.status(201).json(todo);
});

// PATCH /api/todos/:id — edit the title, notes, deadline, or done flag.
router.patch('/:id', async (req, res) => {
  const parsed = parseTodoPatch(req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  const todo = await store.update(req.params.id, parsed.value);
  if (todo === null) return res.status(404).json({ error: 'todo not found' });

  res.json(todo);
});

// DELETE /api/todos/:id — remove one. 204 means "done, nothing to send back".
router.delete('/:id', async (req, res) => {
  const removed = await store.remove(req.params.id);
  if (!removed) return res.status(404).json({ error: 'todo not found' });

  res.status(204).end();
});

export default router;
