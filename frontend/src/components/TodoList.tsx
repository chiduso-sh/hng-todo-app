// The list itself. It owns no state — it just renders whatever it is given
// and passes the handlers straight down to each row.

import TodoItem from './TodoItem';
import type { Todo, TodoPatch } from '../types';

interface TodoListProps {
  todos: Todo[];
  emptyMessage: string;
  onToggle: (todo: Todo) => void;
  onSave: (id: string, patch: TodoPatch) => Promise<void>;
  onDelete: (id: string) => void;
}

export default function TodoList({
  todos,
  emptyMessage,
  onToggle,
  onSave,
  onDelete,
}: TodoListProps) {
  if (todos.length === 0) {
    return <p className="empty">{emptyMessage}</p>;
  }

  return (
    <ul className="todo-list">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onSave={onSave}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
