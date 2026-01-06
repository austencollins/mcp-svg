import { useState, useCallback, useEffect, useRef } from "react";
import { useMcpHost } from "./hooks/useMcpHost";
import { TodoList } from "./components/TodoList";
import { AddTodoForm } from "./components/AddTodoForm";

/**
 * Todo item structure (matches server).
 */
export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

/**
 * App Component
 *
 * Main component for the Todo List MCP App.
 * Uses useMcpHost hook to communicate with the MCP host.
 */
export const App = () => {
  const [todos, setTodos] = useState<Todo[]>([]);

  /**
   * Track whether initial sync has been performed.
   *
   * When the panel is refreshed (e.g., after rebuilding the UI during development),
   * the UI reloads with an empty state while the MCP server still has the data.
   * We need to fetch the current todos from the server on initialization to
   * restore the UI state. This flag prevents multiple fetches.
   */
  const hasFetchedInitialTodos = useRef(false);

  /**
   * Handle tool results from the MCP server.
   * Updates local state when todos change.
   */
  const handleToolResult = useCallback(
    (result: { structuredContent?: { todos?: Todo[] } }) => {
      if (result.structuredContent?.todos) {
        setTodos(result.structuredContent.todos);
      }
    },
    []
  );

  /**
   * Connect to the MCP host and set up communication.
   */
  const { isReady, callTool } = useMcpHost({
    name: "Todo List",
    version: "1.0.0",
    onToolResult: handleToolResult,
  });

  /**
   * Fetch initial todos when the host connection is ready.
   *
   * This is essential for maintaining state consistency across panel refreshes.
   * The MCP server holds the authoritative state in memory, so whenever the UI
   * loads (or reloads after a refresh), it must sync with the server to display
   * the current data. Without this, users would lose visibility of their todos
   * after every panel refresh, even though the data still exists on the server.
   */
  useEffect(() => {
    if (isReady && !hasFetchedInitialTodos.current) {
      hasFetchedInitialTodos.current = true;
      callTool("todo_list", {});
    }
  }, [isReady, callTool]);

  /**
   * Add a new todo item.
   */
  const handleAddTodo = useCallback(
    async (text: string) => {
      await callTool("todo_add", { text });
    },
    [callTool]
  );

  /**
   * Toggle a todo item's completion status.
   */
  const handleToggleTodo = useCallback(
    async (id: string) => {
      await callTool("todo_toggle", { id });
    },
    [callTool]
  );

  /**
   * Delete a todo item.
   */
  const handleDeleteTodo = useCallback(
    async (id: string) => {
      await callTool("todo_remove", { id });
    },
    [callTool]
  );

  const completedCount = todos.filter((t) => t.completed).length;

  return (
    <div className="container">
      <header className="header">
        <h1>Todo List</h1>
        <span className="count">
          {todos.length === 0
            ? "No items"
            : `${completedCount}/${todos.length} done`}
        </span>
      </header>

      <AddTodoForm onAdd={handleAddTodo} />

      <TodoList
        todos={todos}
        onToggle={handleToggleTodo}
        onDelete={handleDeleteTodo}
      />
    </div>
  );
};

