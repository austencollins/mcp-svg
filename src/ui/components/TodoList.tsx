import type { Todo } from "../App";
import { TodoItem } from "./TodoItem";

interface TodoListProps {
  /** Array of todo items to display */
  todos: Todo[];
  /** Called when a todo's completion status is toggled */
  onToggle: (id: string) => void;
  /** Called when a todo is deleted */
  onDelete: (id: string) => void;
}

/**
 * TodoList Component
 *
 * Renders the list of todo items or an empty state.
 */
export const TodoList = ({ todos, onToggle, onDelete }: TodoListProps) => {
  if (todos.length === 0) {
    return (
      <div className="todo-list">
        <div className="empty-state">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          >
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>No todos yet</span>
        </div>
      </div>
    );
  }

  return (
    <div className="todo-list">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

