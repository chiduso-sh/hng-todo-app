// Tests for the HTTP API.
//
// These start the real Express app on a spare port and talk to it with fetch,
// so they exercise routing, JSON parsing, status codes and the store together
// — the things unit tests on validate.js cannot see.
//
// TODO_DATA_FILE is set to a temporary file BEFORE app.js is imported, because
// store.js reads that setting once when it loads. That is why the import below
// is a dynamic `await import` rather than a normal one at the top.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import path from 'node:path';

const tempDir = await mkdtemp(path.join(tmpdir(), 'todo-tests-'));
process.env.TODO_DATA_FILE = path.join(tempDir, 'todos.json');

const { default: app } = await import('../src/app.js');

let server;
let baseUrl;

/** Small wrapper so each test reads as one line instead of five. */
async function call(method, path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // 204 has no body to parse.
  const data = res.status === 204 ? null : await res.json();
  return { status: res.status, data };
}

before(async () => {
  // Port 0 means "any free port", so the tests never clash with a dev server.
  server = app.listen(0);
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.close();
  await once(server, 'close');
  await rm(tempDir, { recursive: true, force: true });
});

describe('the API', () => {
  let created;

  test('GET /api/health says the server is up', async () => {
    const { status, data } = await call('GET', '/api/health');

    assert.equal(status, 200);
    assert.deepEqual(data, { status: 'ok' });
  });

  test('GET /api/todos starts empty', async () => {
    const { status, data } = await call('GET', '/api/todos');

    assert.equal(status, 200);
    assert.deepEqual(data, []);
  });

  test('POST /api/todos creates a todo and fills in the server-owned fields', async () => {
    const { status, data } = await call('POST', '/api/todos', {
      title: 'Ship the task',
      notes: 'Deploy first',
      deadline: '2026-10-01',
    });

    assert.equal(status, 201);
    assert.equal(data.title, 'Ship the task');
    assert.equal(data.notes, 'Deploy first');
    assert.equal(data.deadline, '2026-10-01');

    // The client never sends these three — the server decides them.
    assert.equal(data.done, false);
    assert.equal(typeof data.id, 'string');
    assert.ok(!Number.isNaN(Date.parse(data.createdAt)));

    created = data;
  });

  test('POST /api/todos refuses a bad body with 400 and a reason', async () => {
    const empty = await call('POST', '/api/todos', { title: '   ' });
    assert.equal(empty.status, 400);
    assert.equal(typeof empty.data.error, 'string');

    const badDate = await call('POST', '/api/todos', { title: 'x', deadline: '2026-02-31' });
    assert.equal(badDate.status, 400);
  });

  test('a refused POST does not add anything to the list', async () => {
    const { data } = await call('GET', '/api/todos');
    assert.equal(data.length, 1);
  });

  test('GET /api/todos returns what was created', async () => {
    const { data } = await call('GET', '/api/todos');

    assert.equal(data.length, 1);
    assert.deepEqual(data[0], created);
  });

  test('PATCH /api/todos/:id changes only the fields it was sent', async () => {
    const { status, data } = await call('PATCH', `/api/todos/${created.id}`, { done: true });

    assert.equal(status, 200);
    assert.equal(data.done, true);

    // Everything else survived untouched.
    assert.equal(data.title, created.title);
    assert.equal(data.notes, created.notes);
    assert.equal(data.deadline, created.deadline);
    assert.equal(data.id, created.id);
    assert.equal(data.createdAt, created.createdAt);
  });

  test('PATCH can edit the title, notes and deadline together', async () => {
    const { status, data } = await call('PATCH', `/api/todos/${created.id}`, {
      title: 'Ship the task (edited)',
      notes: '',
      deadline: null,
    });

    assert.equal(status, 200);
    assert.equal(data.title, 'Ship the task (edited)');
    assert.equal(data.notes, '');
    assert.equal(data.deadline, null);
  });

  test('PATCH refuses an empty body', async () => {
    const { status } = await call('PATCH', `/api/todos/${created.id}`, {});
    assert.equal(status, 400);
  });

  test('PATCH on an unknown id is a 404', async () => {
    const { status, data } = await call('PATCH', '/api/todos/does-not-exist', { done: true });

    assert.equal(status, 404);
    assert.equal(data.error, 'todo not found');
  });

  test('DELETE /api/todos/:id removes it and answers 204 with no body', async () => {
    const { status, data } = await call('DELETE', `/api/todos/${created.id}`);

    assert.equal(status, 204);
    assert.equal(data, null);

    const after = await call('GET', '/api/todos');
    assert.deepEqual(after.data, []);
  });

  test('DELETE on an id that is already gone is a 404', async () => {
    const { status } = await call('DELETE', `/api/todos/${created.id}`);
    assert.equal(status, 404);
  });

  test('an unknown route is a 404 that names the method and path', async () => {
    const { status, data } = await call('GET', '/api/nope');

    assert.equal(status, 404);
    assert.match(data.error, /GET/);
    assert.match(data.error, /\/nope/);
  });

  test('changes survive being written to disk and read back', async () => {
    // Create one, then ask the store to forget its in-memory copy by reading
    // the file the same way a freshly started server would.
    const { data: madeTodo } = await call('POST', '/api/todos', { title: 'persisted' });

    const { readFile } = await import('node:fs/promises');
    const onDisk = JSON.parse(await readFile(process.env.TODO_DATA_FILE, 'utf8'));

    assert.equal(onDisk.length, 1);
    assert.equal(onDisk[0].id, madeTodo.id);
    assert.equal(onDisk[0].title, 'persisted');
  });
});
