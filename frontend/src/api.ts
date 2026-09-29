// Every call to the backend goes through here, so the URL, the headers and
// the error handling are written once.

import type { NewTodo, Todo, TodoPatch } from './types';

// Empty in development: Vite proxies /api to the Express server (vite.config.ts).
// In production set VITE_API_URL to the deployed API origin.
const API_URL: string = import.meta.env.VITE_API_URL ?? '';

/**
 * One fetch, done properly.
 *
 * `fetch` hands back a Response — the envelope, not the data. `res.ok` tells
 * us whether the status was 2xx; `await res.json()` opens the envelope and
 * gives us the body. Those are two separate steps and both need awaiting.
 *
 * The <T> is the caller saying what the body will be: `request<Todo[]>(...)`
 * returns a Promise<Todo[]>, so the rest of the app gets real types back.
 */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    // The API sends { error: "..." } on a failure. If it sent something else
    // (or nothing), fall back to the status code.
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed with status ${res.status}`);
  }

  // 204 No Content has an empty body, so there is nothing to parse.
  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
}

export function fetchTodos(): Promise<Todo[]> {
  return request<Todo[]>('/todos');
}

export function createTodo(todo: NewTodo): Promise<Todo> {
  return request<Todo>('/todos', {
    method: 'POST',
    body: JSON.stringify(todo),
  });
}

export function updateTodo(id: string, patch: TodoPatch): Promise<Todo> {
  return request<Todo>(`/todos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function deleteTodo(id: string): Promise<void> {
  return request<void>(`/todos/${id}`, { method: 'DELETE' });
}
