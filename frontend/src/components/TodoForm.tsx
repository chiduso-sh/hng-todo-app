// The "add a task" form at the top of the page.

import { useState } from 'react';
import type { FormEvent } from 'react';
import type { NewTodo } from '../types';
import { todayAsISODate } from '../deadline';

interface TodoFormProps {
  /** Resolves once the server has stored the new todo. */
  onAdd: (todo: NewTodo) => Promise<void>;
}

export default function TodoForm({ onAdd }: TodoFormProps) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);

  const canSubmit = title.trim() !== '' && !saving;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    try {
      // An empty date input gives "" — the API wants null for "no deadline".
      await onAdd({
        title: title.trim(),
        notes: notes.trim(),
        deadline: deadline === '' ? null : deadline,
      });

      // Only clear the form once the save actually succeeded.
      setTitle('');
      setNotes('');
      setDeadline('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card form" onSubmit={handleSubmit}>
      <input
        className="input input-title"
        type="text"
        placeholder="What needs doing?"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        maxLength={200}
      />

      <textarea
        className="input input-notes"
        placeholder="Notes (optional)"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        rows={2}
        maxLength={2000}
      />

      <div className="form-footer">
        <label className="field">
          <span className="field-label">Deadline</span>
          <input
            className="input"
            type="date"
            value={deadline}
            min={todayAsISODate()}
            onChange={(event) => setDeadline(event.target.value)}
          />
        </label>

        <button className="button button-primary" type="submit" disabled={!canSubmit}>
          {saving ? 'Adding…' : 'Add task'}
        </button>
      </div>
    </form>
  );
}
