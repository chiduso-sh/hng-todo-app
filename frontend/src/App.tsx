// The one place that owns the todo list and talks to the API.
// Everything below it (the form, the list, each row) is handed data and
// callbacks as props.

import { useEffect, useState } from 'react';
import TodoForm from './components/TodoForm';
import TodoList from './components/TodoList';
import * as api from './api';
import type { Filter, NewTodo, Todo, TodoPatch } from './types';

/**
 * Unfinished tasks first, then by deadline (soonest first), and tasks with no
 * deadline after the ones that have one. `sort` mutates, so we copy first.
 */
function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;

    if (a.deadline === null && b.deadline === null) return a.createdAt < b.createdAt ? -1 : 1;
    if (a.deadline === null) return 1;
    if (b.deadline === null) return -1;

    if (a.deadline === b.deadline) return a.createdAt < b.createdAt ? -1 : 1;
    return a.deadline < b.deadline ? -1 : 1;
  });
}

function filterTodos(todos: Todo[], filter: Filter): Todo[] {
  if (filter === 'active') return todos.filter((todo) => !todo.done);
  if (filter === 'done') return todos.filter((todo) => todo.done);
  return todos;
}

const EMPTY_MESSAGE: Record<Filter, string> = {
  all: 'Nothing here yet. Add your first task above.',
  active: 'No open tasks. Everything is done.',
  done: 'Nothing finished yet.',
};

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slowToLoad, setSlowToLoad] = useState(false);

  // Load the list once, when the app first appears on screen.
  useEffect(() => {
    // The API sleeps when nobody has used it for a while, and waking it can
    // take the best part of a minute. After a few seconds of silence, say so —
    // otherwise a first-time visitor assumes the app is broken.
    const timer = setTimeout(() => setSlowToLoad(true), 4000);

    api
      .fetchTodos()
      .then((loaded) => setTodos(loaded))
      .catch((err: unknown) => setError(describeError(err)))
      .finally(() => setLoading(false));

    // Returning a function is how an effect cleans up after itself. If this
    // component ever goes away mid-load, the pending timer goes with it.
    return () => clearTimeout(timer);
  }, []);

  /**
   * Runs one API call, putting any failure on screen and passing it on so the
   * component that started it knows not to treat the action as successful.
   */
  async function run<T>(action: () => Promise<T>): Promise<T> {
    setError(null);
    try {
      return await action();
    } catch (err: unknown) {
      setError(describeError(err));
      throw err;
    }
  }

  async function addTodo(todo: NewTodo): Promise<void> {
    // The server assigns the id and createdAt, so we add what IT sends back,
    // not the object we sent.
    const created = await run(() => api.createTodo(todo));
    setTodos((current) => [...current, created]);
  }

  async function saveTodo(id: string, patch: TodoPatch): Promise<void> {
    const updated = await run(() => api.updateTodo(id, patch));
    setTodos((current) => current.map((todo) => (todo.id === id ? updated : todo)));
  }

  function toggleTodo(todo: Todo): void {
    // If it fails, `run` has already shown the message — nothing else to do.
    void saveTodo(todo.id, { done: !todo.done }).catch(() => {});
  }

  function removeTodo(id: string): void {
    void run(() => api.deleteTodo(id))
      .then(() => setTodos((current) => current.filter((todo) => todo.id !== id)))
      .catch(() => {});
  }

  const visible = sortTodos(filterTodos(todos, filter));
  const openCount = todos.filter((todo) => !todo.done).length;

  return (
    <main className="page">
      <header className="header">
        <h1>Todo</h1>
        <p className="subtitle">
          {loading
            ? 'Loading…'
            : `${openCount} open ${openCount === 1 ? 'task' : 'tasks'} of ${todos.length}`}
        </p>
      </header>

      {error !== null && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <TodoForm onAdd={addTodo} />

      <nav className="filters">
        {(['all', 'active', 'done'] as const).map((option) => (
          <button
            key={option}
            type="button"
            className={filter === option ? 'filter filter-active' : 'filter'}
            onClick={() => setFilter(option)}
          >
            {option}
          </button>
        ))}
      </nav>

      {loading ? (
        <p className="empty">
          Loading your tasks…
          {slowToLoad && (
            <span className="empty-note">
              The API is hosted on a free plan that sleeps when idle, so this
              first load can take up to a minute. Later ones are quick.
            </span>
          )}
        </p>
      ) : (
        <TodoList
          todos={visible}
          emptyMessage={EMPTY_MESSAGE[filter]}
          onToggle={toggleTodo}
          onSave={saveTodo}
          onDelete={removeTodo}
        />
      )}
    </main>
  );
}

/** Anything can be thrown in JavaScript, so check before reading `.message`. */
function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Something went wrong. Is the API running?';
}
