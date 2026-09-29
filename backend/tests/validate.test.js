// Tests for src/validate.js.
//
// These are the easiest tests in the project to write, because validate.js is
// pure functions: give it a value, check what comes back. No server, no
// network, no files, nothing to clean up afterwards.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseNewTodo, parseTodoPatch } from '../src/validate.js';

describe('parseNewTodo', () => {
  test('accepts a complete todo', () => {
    const result = parseNewTodo({
      title: 'Ship the task',
      notes: 'Deploy first',
      deadline: '2026-10-01',
    });

    assert.deepEqual(result, {
      ok: true,
      value: { title: 'Ship the task', notes: 'Deploy first', deadline: '2026-10-01' },
    });
  });

  test('fills in the optional fields when they are missing', () => {
    const result = parseNewTodo({ title: 'Just a title' });

    assert.equal(result.ok, true);
    assert.equal(result.value.notes, '');
    assert.equal(result.value.deadline, null);
  });

  test('trims whitespace off the title and notes', () => {
    const result = parseNewTodo({ title: '  padded  ', notes: '  also padded  ' });

    assert.equal(result.value.title, 'padded');
    assert.equal(result.value.notes, 'also padded');
  });

  test('rejects a title that is missing, empty, or only whitespace', () => {
    for (const title of [undefined, '', '   ', null, 42]) {
      const result = parseNewTodo({ title });
      assert.equal(result.ok, false, `expected ${JSON.stringify(title)} to be rejected`);
    }
  });

  test('rejects a title longer than 200 characters', () => {
    assert.equal(parseNewTodo({ title: 'a'.repeat(200) }).ok, true);
    assert.equal(parseNewTodo({ title: 'a'.repeat(201) }).ok, false);
  });

  test('rejects notes longer than 2000 characters', () => {
    assert.equal(parseNewTodo({ title: 'x', notes: 'n'.repeat(2000) }).ok, true);
    assert.equal(parseNewTodo({ title: 'x', notes: 'n'.repeat(2001) }).ok, false);
  });

  test('treats an empty deadline as no deadline', () => {
    // An untouched <input type="date"> sends "", which must become null.
    for (const deadline of ['', null, undefined]) {
      const result = parseNewTodo({ title: 'x', deadline });
      assert.equal(result.value.deadline, null);
    }
  });

  test('rejects a deadline in the wrong shape', () => {
    for (const deadline of ['01/10/2026', '2026-10', 'tomorrow', '2026-10-01T00:00:00Z', 20261001]) {
      const result = parseNewTodo({ title: 'x', deadline });
      assert.equal(result.ok, false, `expected ${JSON.stringify(deadline)} to be rejected`);
    }
  });

  test('rejects a date that has the right shape but does not exist', () => {
    // This is the one a regex alone would let through.
    assert.equal(parseNewTodo({ title: 'x', deadline: '2026-02-31' }).ok, false);
    assert.equal(parseNewTodo({ title: 'x', deadline: '2026-13-01' }).ok, false);
    assert.equal(parseNewTodo({ title: 'x', deadline: '2025-02-29' }).ok, false);
  });

  test('accepts 29 February in a leap year', () => {
    assert.equal(parseNewTodo({ title: 'x', deadline: '2028-02-29' }).ok, true);
  });

  test('rejects a body that is not an object', () => {
    for (const body of [null, undefined, 'a string', 7]) {
      assert.equal(parseNewTodo(body).ok, false);
    }
  });
});

describe('parseTodoPatch', () => {
  test('keeps only the fields that were sent', () => {
    const result = parseTodoPatch({ done: true });

    assert.equal(result.ok, true);
    assert.deepEqual(result.value, { done: true });
    assert.equal('title' in result.value, false);
  });

  test('accepts every editable field at once', () => {
    const result = parseTodoPatch({
      title: 'new title',
      notes: 'new notes',
      deadline: '2026-12-25',
      done: false,
    });

    assert.deepEqual(result.value, {
      title: 'new title',
      notes: 'new notes',
      deadline: '2026-12-25',
      done: false,
    });
  });

  test('allows clearing a deadline by sending null', () => {
    const result = parseTodoPatch({ deadline: null });

    assert.equal(result.ok, true);
    assert.equal(result.value.deadline, null);
  });

  test('rejects an empty patch', () => {
    // Nothing to change is a mistake worth reporting, not a silent no-op.
    assert.equal(parseTodoPatch({}).ok, false);
  });

  test('rejects a done value that is not a boolean', () => {
    for (const done of ['true', 1, null]) {
      assert.equal(parseTodoPatch({ done }).ok, false, `expected ${JSON.stringify(done)} to fail`);
    }
  });

  test('applies the same title rules as creating', () => {
    assert.equal(parseTodoPatch({ title: '   ' }).ok, false);
    assert.equal(parseTodoPatch({ title: 'a'.repeat(201) }).ok, false);
    assert.equal(parseTodoPatch({ title: '  fine  ' }).value.title, 'fine');
  });

  test('every rejection comes with a message', () => {
    const result = parseTodoPatch({ title: '' });

    assert.equal(result.ok, false);
    assert.equal(typeof result.error, 'string');
    assert.ok(result.error.length > 0);
  });
});
