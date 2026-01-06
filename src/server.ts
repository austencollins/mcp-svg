#!/usr/bin/env npx tsx

/**
 * MCP Template Server - Todo List Example
 *
 * A simple MCP server demonstrating the MCP Apps specification.
 * Features:
 * - Todo list management tools (add, list, toggle, remove)
 * - UI Resource for panel display
 * - Both agent and app can interact with todos
 *
 * This serves as a starting point for building your own MCP servers.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getIconDataUri, ICON_ALT } from "./icon.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Todo item structure.
 */
interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

/**
 * In-memory todo storage.
 * In a real application, you might persist this to a file or database.
 */
const todos: Map<string, Todo> = new Map();

/**
 * Generate a unique ID for a todo item.
 */
const generateId = (): string => {
  return `todo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
};

/**
 * MCP logging level mapping.
 * Maps our internal levels to MCP protocol LoggingLevel.
 */
const MCP_LEVEL_MAP = {
  INFO: "info" as const,
  DEBUG: "debug" as const,
  ERROR: "error" as const,
};

/**
 * Reference to the MCP server for logging.
 * Set after server creation to enable MCP protocol logging.
 */
let mcpServerRef: McpServer | null = null;

/**
 * Logging helper that uses MCP protocol notifications when available.
 *
 * When the MCP server is connected, logs are sent via the MCP protocol's
 * notifications/message notification. This is the spec-compliant way
 * for MCP servers to send logs to the Host.
 *
 * Falls back to console.error for logs before server connection.
 */
const log = ({
  level,
  message,
  data,
}: {
  level: "INFO" | "DEBUG" | "ERROR";
  message: string;
  data?: unknown;
}) => {
  const mcpLevel = MCP_LEVEL_MAP[level] || "info";
  const logData = data !== undefined ? { message, ...(data as object) } : message;

  // Use MCP protocol logging if server is available
  if (mcpServerRef) {
    mcpServerRef.sendLoggingMessage({
      level: mcpLevel,
      logger: "mcp-template",
      data: logData,
    }).catch(() => {
      // Fallback to console.error if MCP logging fails
      console.error(`[${level}] [mcp-template] ${message}`, data !== undefined ? JSON.stringify(data) : "");
    });
  } else {
    // Fallback to console.error before server is connected
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}] [mcp-template]`;
    if (data !== undefined) {
      console.error(`${prefix} ${message}`, JSON.stringify(data, null, 2));
    } else {
      console.error(`${prefix} ${message}`);
    }
  }
};

// UI Resource URI constants
const TODO_LIST_RESOURCE_URI = "ui://svg/todos";
const TODO_CONFIRMATION_RESOURCE_URI = "ui://svg/confirmation";

/**
 * Get the Todo List UI HTML content from the built dist folder.
 * Run `npm run build` to build the UI before running the server.
 */
const getTodoListHtml = (): string => {
  const projectRoot = path.resolve(__dirname, "..");
  const htmlPath = path.join(projectRoot, "dist", "ui", "index.html");

  if (!fs.existsSync(htmlPath)) {
    log({
      level: "ERROR",
      message: `UI HTML not found at ${htmlPath}. Run 'npm run build' first.`,
    });
    return `<!DOCTYPE html>
<html><body><h1>Error: UI not built</h1><p>Run 'npm run build' to build the UI.</p></body></html>`;
  }

  return fs.readFileSync(htmlPath, "utf-8");
};

/**
 * Get the Confirmation UI HTML content.
 * This is a simple static HTML file for inline confirmations.
 */
const getConfirmationHtml = (): string => {
  // In development, read from src. In production, read from dist.
  const srcPath = path.join(__dirname, "ui", "confirmation.html");
  const distPath = path.resolve(__dirname, "..", "dist", "ui", "confirmation.html");
  
  // Try dist first (production), then src (development)
  const htmlPath = fs.existsSync(distPath) ? distPath : srcPath;

  if (!fs.existsSync(htmlPath)) {
    log({
      level: "ERROR",
      message: `Confirmation HTML not found at ${htmlPath}.`,
    });
    return `<!DOCTYPE html>
<html><body><h1>Error: Confirmation UI not found</h1></body></html>`;
  }

  return fs.readFileSync(htmlPath, "utf-8");
};

// Create MCP server
const server = new McpServer({
  name: "svg",
  version: "0.0.1",
});

// Access the underlying Server instance to enable logging capability.
// The McpServer wrapper doesn't expose capabilities in its constructor,
// so we set it directly on the underlying server's _capabilities object.
const underlyingServer = (server as unknown as { server: { _capabilities: Record<string, unknown> } }).server;
if (underlyingServer?._capabilities) {
  underlyingServer._capabilities.logging = {};
}

// Set server reference for logging
mcpServerRef = server;

/**
 * Register the Todo List UI resource (for pip display mode).
 * Returns HTML content with MCP Apps metadata for panel display.
 * Includes a custom icon for the sidebar tab (defined in icon.ts).
 */
server.registerResource(
  "Todo List",
  TODO_LIST_RESOURCE_URI,
  {
    mimeType: "text/html;profile=mcp-app",
    description: "Interactive todo list panel",
  },
  async () => {
    const html = getTodoListHtml();
    return {
      contents: [
        {
          uri: TODO_LIST_RESOURCE_URI,
          mimeType: "text/html;profile=mcp-app",
          text: html,
          _meta: {
            ui: {
              displayModes: ["pip"],
              icon: {
                data: getIconDataUri(),
                alt: ICON_ALT,
              },
            },
          },
        },
      ],
    };
  }
);

/**
 * Register the Todo Confirmation UI resource (for inline display mode).
 * A simple confirmation display for action feedback in chat.
 */
server.registerResource(
  "Todo Confirmation",
  TODO_CONFIRMATION_RESOURCE_URI,
  {
    mimeType: "text/html;profile=mcp-app",
    description: "Todo action confirmation",
  },
  async () => {
    const html = getConfirmationHtml();
    return {
      contents: [
        {
          uri: TODO_CONFIRMATION_RESOURCE_URI,
          mimeType: "text/html;profile=mcp-app",
          text: html,
          _meta: {
            ui: {
              displayModes: ["inline"],
            },
          },
        },
      ],
    };
  }
);

/**
 * todo_add - Add a new todo item.
 * Both the agent and the UI can call this tool.
 * Displays inline confirmation in chat, pip panel updates via broadcast.
 */
server.registerTool(
  "todo_add",
  {
    description: "Add a new todo item to the list. Shows inline confirmation.",
    inputSchema: {
      text: z.string().describe("The todo item text"),
    },
    _meta: {
      ui: {
        resourceUri: TODO_CONFIRMATION_RESOURCE_URI,
        visibility: ["model", "app"],
        displayModes: ["inline"],
        defaultDisplayMode: "inline",
      },
    },
  },
  async ({ text }) => {
    const todo: Todo = {
      id: generateId(),
      text,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    todos.set(todo.id, todo);

    const allTodos = Array.from(todos.values());

    const openCount = allTodos.filter((t) => !t.completed).length;

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ success: true, todo, totalCount: allTodos.length }),
        },
      ],
      structuredContent: {
        success: true,
        action: "added",
        todo,
        todos: allTodos,
        title: `Todos ${openCount}`,
        inlineTitle: "Added todo",
      },
    };
  }
);

/**
 * todo_list - List all todo items.
 * Returns the current state of all todos.
 * Opens the full interactive todo list panel.
 */
server.registerTool(
  "todo_list",
  {
    description: "List all todo items. Opens the todo list panel.",
    inputSchema: {},
    _meta: {
      ui: {
        resourceUri: TODO_LIST_RESOURCE_URI,
        visibility: ["model", "app"],
        displayModes: ["pip"],
        defaultDisplayMode: "pip",
      },
    },
  },
  async () => {
    const allTodos = Array.from(todos.values());
    const openCount = allTodos.filter((t) => !t.completed).length;

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            count: allTodos.length,
            todos: allTodos,
          }),
        },
      ],
      structuredContent: {
        success: true,
        todos: allTodos,
        title: `Todos ${openCount}`,
      },
    };
  }
);

/**
 * todo_toggle - Toggle a todo item's completed status.
 * Displays inline confirmation in chat, pip panel updates via broadcast.
 */
server.registerTool(
  "todo_toggle",
  {
    description: "Toggle a todo item's completed status. Shows inline confirmation.",
    inputSchema: {
      id: z.string().describe("The todo item ID"),
    },
    _meta: {
      ui: {
        resourceUri: TODO_CONFIRMATION_RESOURCE_URI,
        visibility: ["model", "app"],
        displayModes: ["inline"],
        defaultDisplayMode: "inline",
      },
    },
  },
  async ({ id }) => {
    const todo = todos.get(id);
    if (!todo) {
      const allTodos = Array.from(todos.values());
      const openCount = allTodos.filter((t) => !t.completed).length;
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ success: false, error: "Todo not found" }),
          },
        ],
        structuredContent: {
          success: false,
          error: "Todo not found",
          todos: allTodos,
          title: `Todos ${openCount}`,
          inlineTitle: "Todo not found",
        },
      };
    }

    todo.completed = !todo.completed;
    todos.set(id, todo);

    const allTodos = Array.from(todos.values());
    const openCount = allTodos.filter((t) => !t.completed).length;

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ success: true, todo }),
        },
      ],
      structuredContent: {
        success: true,
        action: "toggled",
        todo,
        todos: allTodos,
        title: `Todos ${openCount}`,
        inlineTitle: todo.completed ? "Completed todo" : "Uncompleted todo",
      },
    };
  }
);

/**
 * todo_remove - Remove a todo item.
 * Displays inline confirmation in chat, pip panel updates via broadcast.
 */
server.registerTool(
  "todo_remove",
  {
    description: "Remove a todo item from the list. Shows inline confirmation.",
    inputSchema: {
      id: z.string().describe("The todo item ID"),
    },
    _meta: {
      ui: {
        resourceUri: TODO_CONFIRMATION_RESOURCE_URI,
        visibility: ["model", "app"],
        displayModes: ["inline"],
        defaultDisplayMode: "inline",
      },
    },
  },
  async ({ id }) => {
    const todo = todos.get(id);
    if (!todo) {
      const allTodos = Array.from(todos.values());
      const openCount = allTodos.filter((t) => !t.completed).length;
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ success: false, error: "Todo not found" }),
          },
        ],
        structuredContent: {
          success: false,
          error: "Todo not found",
          todos: allTodos,
          title: `Todos ${openCount}`,
          inlineTitle: "Todo not found",
        },
      };
    }

    todos.delete(id);

    const allTodos = Array.from(todos.values());
    const openCount = allTodos.filter((t) => !t.completed).length;

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ success: true, removedId: id }),
        },
      ],
      structuredContent: {
        success: true,
        action: "removed",
        removedId: id,
        todos: allTodos,
        title: `Todos ${openCount}`,
        inlineTitle: "Removed todo",
      },
    };
  }
);

/**
 * Start the MCP server with stdio transport.
 */
const main = async () => {
  log({ level: "INFO", message: "Starting MCP server with stdio transport" });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log({
    level: "INFO",
    message: "MCP server connected and ready",
    data: {
      tools: ["todo_add", "todo_list", "todo_toggle", "todo_remove"],
      resources: [TODO_LIST_RESOURCE_URI, TODO_CONFIRMATION_RESOURCE_URI],
    },
  });
};

main().catch((error) => {
  log({
    level: "ERROR",
    message: "Failed to start server",
    data: {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    },
  });
  process.exit(1);
});
