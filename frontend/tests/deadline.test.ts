// Tests for src/deadline.ts — the date maths behind the badge on each task.
//
// Node 24 runs TypeScript directly (it strips the types and runs the
// JavaScript underneath), so these need no test framework and no extra
// dependency: `node --test`.
//
// Every date here is built relative to today rather than hardcoded, so these
// tests still pass next month.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { describeDeadline, todayAsISODate } from '../src/deadline.ts';

/** "YYYY-MM-DD" for a day `offset` days from today, in the local timezone. */
function daysFromToday(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

describe('todayAsISODate', () => {
  test('returns the LOCAL date, not the UTC one', () => {
    // sv-SE formats as YYYY-MM-DD, which makes this an independent check:
    // if the function used toISOString() directly it would be a day out for
    // anyone west of UTC late in the evening.
    const expected = new Date().toLocaleDateString('sv-SE');
    assert.equal(todayAsISODate(), expected);
  });

  test('has the shape an <input type="date"> expects', () => {
    assert.match(todayAsISODate(), /^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('describeDeadline, for an unfinished task', () => {
  test('returns null when there is no deadline', () => {
    // null, not an empty label — the caller decides to render nothing at all.
    assert.equal(describeDeadline(null, false), null);
  });

  test('today reads as "Due today"', () => {
    const info = describeDeadline(daysFromToday(0), false);

    assert.deepEqual(info, { label: 'Due today', tone: 'today' });
  });

  test('tomorrow reads as "Due tomorrow"', () => {
    const info = describeDeadline(daysFromToday(1), false);

    assert.deepEqual(info, { label: 'Due tomorrow', tone: 'soon' });
  });

  test('a few days out counts the days', () => {
    assert.deepEqual(describeDeadline(daysFromToday(3), false), {
      label: 'Due in 3 days',
      tone: 'soon',
    });
    assert.deepEqual(describeDeadline(daysFromToday(7), false), {
      label: 'Due in 7 days',
      tone: 'soon',
    });
  });

  test('more than a week out shows the date instead of a countdown', () => {
    const info = describeDeadline(daysFromToday(8), false);

    assert.equal(info?.tone, 'later');
    assert.match(info!.label, /^Due \d/);
  });

  test('yesterday is overdue, and says "day" not "days"', () => {
    const info = describeDeadline(daysFromToday(-1), false);

    assert.deepEqual(info, { label: 'Overdue by 1 day', tone: 'overdue' });
  });

  test('further in the past counts the days correctly', () => {
    assert.deepEqual(describeDeadline(daysFromToday(-2), false), {
      label: 'Overdue by 2 days',
      tone: 'overdue',
    });
    assert.deepEqual(describeDeadline(daysFromToday(-30), false), {
      label: 'Overdue by 30 days',
      tone: 'overdue',
    });
  });
});

describe('describeDeadline, for a finished task', () => {
  test('is never overdue, however late the deadline was', () => {
    const info = describeDeadline(daysFromToday(-10), true);

    assert.equal(info?.tone, 'later');
    assert.doesNotMatch(info!.label, /Overdue/);
  });

  test('shows the date it was due rather than a countdown', () => {
    const info = describeDeadline(daysFromToday(2), true);

    assert.equal(info?.tone, 'later');
    assert.match(info!.label, /^Due \d/);
    assert.notEqual(info!.label, 'Due in 2 days');
  });

  test('still returns null when there was no deadline', () => {
    assert.equal(describeDeadline(null, true), null);
  });
});
