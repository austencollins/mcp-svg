import { useCallback } from "react";
import type { Todo } from "../App";

interface TodoItemProps {
  /** The todo item to display */
  todo: Todo;
  /** Called when the completion status is toggled */
  onToggle: (id: string) => void;
  /** Called when the delete button is clicked */
  onDelete: (id: string) => void;
}

/**
 * TodoItem Component
 *
 * Renders a single todo item with checkbox and delete button.
 */
export const TodoItem = ({ todo, onToggle, onDelete }: TodoItemProps) => {
  const handleToggle = useCallback(() => {
    onToggle(todo.id);
  }, [todo.id, onToggle]);

  const handleDelete = useCallback(() => {
    onDelete(todo.id);
  }, [todo.id, onDelete]);

  return (
    <div className={`todo-item ${todo.completed ? "completed" : ""}`}>
      <div className="todo-checkbox" onClick={handleToggle}>
        <svg viewBox="0 0 24 24">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <span className="todo-text">{todo.text}</span>
      <button
        className="todo-delete"
        onClick={handleDelete}
        title="Delete"
        type="button"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
};

