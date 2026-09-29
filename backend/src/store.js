// Where the todos live.
//
// The whole list is kept in one array in memory and saved to data/todos.json
// after every change. That is enough for this app and it keeps the code
// readable: one place reads the file, one place writes it.
//
// Swapping this for a real database later means rewriting THIS file only —
// the routes just call getAll / create / update / remove.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// TODO_DATA_FILE lets the tests point at a throwaway file instead of the real
// list. Nothing else sets it, so normal runs use data/todos.json as before.
const DATA_FILE = process.env.TODO_DATA_FILE ?? path.join(here, '..', 'data', 'todos.json');
const DATA_DIR = path.dirname(DATA_FILE);

let todos = null;

// Read the file once, on the first request. If it is missing (fresh clone,
// or a host with no saved data yet) we start with an empty list.
async function load() {
  if (todos !== null) return todos;

  try {
    const text = await readFile(DATA_FILE, 'utf8');
    todos = JSON.parse(text);
  } catch {
    todos = [];
  }

  return todos;
}

async function save() {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(todos, null, 2), 'utf8');
}

export async function getAll() {
  return await load();
}

export async function create({ title, notes, deadline }) {
  const list = await load();

  const todo = {
    id: randomUUID(),
    title,
    notes,
    deadline,
    done: false,
    createdAt: new Date().toISOString(),
  };

  list.push(todo);
  await save();
  return todo;
}

// `fields` only holds the keys the client actually sent, so spreading it over
// the existing todo leaves everything else untouched.
export async function update(id, fields) {
  const list = await load();
  const index = list.findIndex((todo) => todo.id === id);
  if (index === -1) return null;

  const updated = { ...list[index], ...fields };
  list[index] = updated;
  await save();
  return updated;
}

export async function remove(id) {
  const list = await load();
  const index = list.findIndex((todo) => todo.id === id);
  if (index === -1) return false;

  list.splice(index, 1);
  await save();
  return true;
}
