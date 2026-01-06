# MCP Template - Todo List Example

A starter template for building MCP servers with UI Resources (MCP Apps).

## Overview

This template demonstrates:

- **MCP Server** with tools that can be called by both the AI agent and the UI
- **React UI** that displays in Panel mode
- **MCP Apps Protocol** for Host-UI communication via the `useMcpHost` hook
- **Theme Support** via host context

## Quick Start

```bash
# Install dependencies
npm install

# Build (compiles TypeScript and bundles React UI)
npm run build

# Start the server
npm start
```

## Development

For active development with auto-rebuild:

```bash
# Watch mode - auto-rebuilds on file changes
npm run dev
```

When files change, the build updates automatically. To see the changes in the app:
1. Click the ↻ refresh button on the panel title bar, OR
2. Click the ↻ restart button in MCP Settings

The refresh button only reloads the UI content (faster), while restart reloads the entire MCP server.

## Project Structure

```
├── src/
│   ├── server.ts           # MCP server with todo tools
│   └── ui/
│       ├── index.html      # Vite entry HTML
│       ├── main.tsx        # React entry point
│       ├── App.tsx         # Main App component
│       ├── App.css         # Styles
│       ├── hooks/
│       │   └── useMcpHost.ts   # MCP communication hook
│       └── components/
│           ├── TodoList.tsx    # Todo list component
│           ├── TodoItem.tsx    # Single todo item
│           └── AddTodoForm.tsx # Add todo form
├── dist/                   # Built output
├── vite.config.ts          # Vite configuration
└── package.json
```

## Tools

| Tool | Description | Visibility |
|------|-------------|------------|
| `todo_add` | Add a new todo item | model, app |
| `todo_list` | List all todos | model, app |
| `todo_toggle` | Toggle todo completion | model, app |
| `todo_remove` | Delete a todo | model, app |

## Customizing

### Adding New Tools

1. Edit `src/server.ts`
2. Use `server.registerTool()` to add your tool
3. Include `_meta.ui.resourceUri` to link to a UI resource
4. Include `title` in `structuredContent` for dynamic panel titles

```typescript
server.registerTool(
  "my_tool",
  {
    description: "Does something useful",
    inputSchema: {
      param: z.string().describe("A parameter"),
    },
    _meta: {
      ui: {
        resourceUri: "ui://my-mcp/my-ui",
        visibility: ["model", "app"],
      },
    },
  },
  async ({ param }) => {
    return {
      content: [{ type: "text", text: "Result for agent" }],
      structuredContent: { 
        data: "Result for UI",
        title: "My Dynamic Title",  // Updates the panel title bar
      },
    };
  }
);
```

### Dynamic Panel Titles

Include a `title` field in `structuredContent` to update the panel's title bar:

```typescript
structuredContent: {
  todos: allTodos,
  title: `Todos (${allTodos.length})`,  // Panel shows "Todos (3)"
}
```

This helps users identify what's in each panel at a glance.

### Modifying the UI

1. Edit components in `src/ui/components/`
2. Edit styles in `src/ui/App.css`
3. Use the `useMcpHost` hook for MCP communication
4. Run `npm run build` to rebuild after changes
5. Use the refresh button in MCP Settings to reload the server

### Using the useMcpHost Hook

The `useMcpHost` hook handles all MCP Apps protocol communication:

```typescript
import { useMcpHost } from "./hooks/useMcpHost";

const MyComponent = () => {
  const { callTool, isReady } = useMcpHost({
    name: "My App",
    version: "1.0.0",
    onToolResult: (result) => {
      // Handle tool results from server
      console.log(result.structuredContent);
    },
    onThemeChange: (theme) => {
      // Handle theme changes from host
      console.log(`Theme: ${theme}`);
    },
  });

  // Call a tool on the MCP server
  const handleClick = async () => {
    const result = await callTool("my_tool", { param: "value" });
  };

  return <button onClick={handleClick}>Call Tool</button>;
};
```

### MCP Apps Protocol

The UI communicates with the Host via JSON-RPC over `postMessage`. The `useMcpHost` hook abstracts this, but here's what happens under the hood:

1. **Initialize**: Host sends `ui/initialize`, UI responds with capabilities
2. **Ready**: UI sends `ui/notifications/initialized`
3. **Tool Input**: Host sends `ui/notifications/tool-input` with arguments
4. **Tool Result**: Host sends `ui/notifications/tool-result` with data
5. **Tool Calls**: UI sends `tools/call` requests, Host forwards to server
6. **Theme Changes**: Host sends `ui/notifications/host-context-changed`

### Panel Reuse (Single-Session Default)

This template is a **single-session** MCP—the default and most common pattern:

- All tools share the same `resourceUri`
- Creature automatically reuses the existing panel
- When you call `todo_add` multiple times, they all update the same panel

**No special configuration is needed for single-session MCPs.** This is the recommended pattern for most apps.

For **multi-session** MCPs (like terminals where each session is independent), additional configuration is required. See [Building MCP Apps - Multi-Session MCPs](../../../docs/building-mcp-apps.md#multi-session-mcps) for the requirements.

## Publishing Your MCP

To make your MCP installable via `npx` (from npm or GitHub), ensure your `package.json` is properly configured:

### Required package.json fields

```json
{
  "name": "your-mcp-name",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/server.js",
  "bin": {
    "your-mcp-name": "dist/server.js"
  },
  "files": [
    "dist"
  ]
}
```

- **`bin`**: Required for `npx` to know which file to execute
- **`files`**: Specifies which files to include when publishing (keeps package small)
- **Shebang**: Your server entry file (`src/server.ts`) must start with `#!/usr/bin/env node`

### Publishing to npm

```bash
# Build first
npm run build

# Publish (requires npm account)
npm publish
```

Users can then install via:
```bash
npx your-mcp-name
```

### Publishing to GitHub

1. Push your code to GitHub
2. Ensure the `dist/` folder is committed (or use a build step)
3. Users can install via:
```bash
npx github:username/repo-name
```

### Publishing to Creature Registry

In the Creature app:
1. Open MCP Settings
2. Click the publish icon next to your MCP
3. Fill in the package details and install source (npm package name or GitHub URL)
4. Click Publish

## Resources

- [MCP Apps Specification](https://spec.modelcontextprotocol.io/extensions/ui)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
