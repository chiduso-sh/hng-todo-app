// One row in the list. It has two looks: reading and editing.
//
// The draft values live here rather than in App, so typing in an edit box
// only re-renders this row, and hitting Cancel throws the draft away without
// the rest of the app ever seeing it.

import { useState } from 'react';
import type { Todo, TodoPatch } from '../types';
import { describeDeadline } from '../deadline';

interface TodoItemProps {
  todo: Todo;
  onToggle: (todo: Todo) => void;
  onSave: (id: string, patch: TodoPatch) => Promise<void>;
  onDelete: (id: string) => void;
}

export default function TodoItem({ todo, onToggle, onSave, onDelete }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(todo.title);
  const [notes, setNotes] = useState(todo.notes);
  const [deadline, setDeadline] = useState(todo.deadline ?? '');
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const deadlineInfo = describeDeadline(todo.deadline, todo.done);

  function startEditing() {
    // Refill the draft from the todo, in case a previous edit was cancelled.
    setTitle(todo.title);
    setNotes(todo.notes);
    setDeadline(todo.deadline ?? '');
    setIsEditing(true);
  }

  async function handleSave() {
    if (title.trim() === '') return;

    setSaving(true);
    try {
      await onSave(todo.id, {
        title: title.trim(),
        notes: notes.trim(),
        deadline: deadline === '' ? null : deadline,
      });
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (isEditing) {
    return (
      <li className="card todo todo-editing">
        <input
          className="input input-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
          autoFocus
        />

        <textarea
          className="input input-notes"
          placeholder="Notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          maxLength={2000}
        />

        <div className="form-footer">
          <label className="field">
            <span className="field-label">Deadline</span>
            <input
              className="input"
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
            />
          </label>

          <div className="actions">
            <button className="button" type="button" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
            <button
              className="button button-primary"
              type="button"
              onClick={handleSave}
              disabled={title.trim() === '' || saving}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className={todo.done ? 'card todo todo-done' : 'card todo'}>
      <div className="todo-main">
        <input
          className="checkbox"
          type="checkbox"
          checked={todo.done}
          onChange={() => onToggle(todo)}
          aria-label={todo.done ? `Mark "${todo.title}" as not done` : `Mark "${todo.title}" as done`}
        />

        <div className="todo-text">
          <p className="todo-title">{todo.title}</p>
          {todo.notes !== '' && <p className="todo-notes">{todo.notes}</p>}
          {deadlineInfo !== null && (
            <span className={`badge badge-${deadlineInfo.tone}`}>{deadlineInfo.label}</span>
          )}
        </div>
      </div>

      {/* Deleting takes two clicks instead of a browser popup: the first click
          swaps the button for a confirmation, the second actually deletes. */}
      <div className="actions">
        {confirmingDelete ? (
          <>
            <button className="button" type="button" onClick={() => setConfirmingDelete(false)}>
              Keep
            </button>
            <button
              className="button button-danger"
              type="button"
              onClick={() => onDelete(todo.id)}
            >
              Delete for good
            </button>
          </>
        ) : (
          <>
            <button className="button" type="button" onClick={startEditing}>
              Edit
            </button>
            <button
              className="button button-danger"
              type="button"
              onClick={() => setConfirmingDelete(true)}
            >
              Delete
            </button>
          </>
        )}
      </div>
    </li>
  );
}
