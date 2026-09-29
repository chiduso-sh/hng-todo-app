// The shapes that travel between the server and this app.
// Everything else in the frontend is inferred from these.

export interface Todo {
  id: string;
  title: string;
  notes: string;
  /** "YYYY-MM-DD", or null when the task has no deadline. */
  deadline: string | null;
  done: boolean;
  /** ISO timestamp set by the server. */
  createdAt: string;
}

/** What POST /api/todos accepts. The server fills in id, done and createdAt. */
export interface NewTodo {
  title: string;
  notes: string;
  deadline: string | null;
}

/**
 * What PATCH /api/todos/:id accepts: any subset of the editable fields.
 * Toggling a checkbox sends { done }, saving an edit sends the other three.
 */
export type TodoPatch = Partial<Pick<Todo, 'title' | 'notes' | 'deadline' | 'done'>>;

/** The three list views the filter bar offers. */
export type Filter = 'all' | 'active' | 'done';
