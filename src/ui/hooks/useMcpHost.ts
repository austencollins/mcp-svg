import { useEffect, useRef, useCallback, useState } from "react";

/**
 * Configuration for the useMcpHost hook.
 */
interface UseMcpHostConfig {
  /** Name of the UI client (for protocol handshake) */
  name: string;
  /** Version of the UI client */
  version: string;
  /** Called when tool input is received (before execution) */
  onToolInput?: (args: Record<string, unknown>) => void;
  /** Called when tool result is received */
  onToolResult?: (result: {
    content?: Array<{ type: string; text: string }>;
    structuredContent?: Record<string, unknown>;
    isError?: boolean;
  }) => void;
  /** Called when theme changes */
  onThemeChange?: (theme: "light" | "dark") => void;
  /**
   * Called when the host requests resource teardown (per MCP Apps spec SEP-1865).
   * The host sends ui/resource-teardown before closing the panel.
   * Implement this to clean up resources (e.g., close connections, cancel subscriptions).
   * Return a promise that resolves when cleanup is complete.
   */
  onTeardown?: () => Promise<void>;
  /**
   * Called with appState from hostContext during ui/initialize.
   * Enables session restoration after popout/popin - the host passes
   * sessionId so the UI can reconnect to an existing session.
   */
  onAppState?: (appState: { sessionId?: string }) => void;
}

/**
 * Tool call result from MCP server.
 */
interface ToolResult {
  content?: Array<{ type: string; text: string }>;
  structuredContent?: Record<string, unknown>;
}

/**
 * useMcpHost Hook
 *
 * Handles all communication with the MCP Apps host via postMessage.
 * Implements the MCP Apps protocol:
 *
 * 1. Host sends ui/initialize → we respond with capabilities
 * 2. We send ui/notifications/initialized → Host knows we're ready
 * 3. Host sends ui/notifications/tool-input → we receive tool args
 * 4. Host sends ui/notifications/tool-result → we get data and update UI
 * 5. User interacts → we call tools/call → Host forwards to MCP server
 * 6. Host sends ui/notifications/host-context-changed → we update theme
 * 7. Host sends ui/resource-teardown → we cleanup and respond before panel closes
 */
export const useMcpHost = ({
  name,
  version,
  onToolInput,
  onToolResult,
  onThemeChange,
  onTeardown,
  onAppState,
}: UseMcpHostConfig) => {
  const [isReady, setIsReady] = useState(false);
  const requestIdRef = useRef(1);
  const pendingRequestsRef = useRef<
    Map<number, { resolve: (result: unknown) => void; reject: (error: Error) => void }>
  >(new Map());

  /**
   * Track if the message listener has been set up.
   * Prevents duplicate setup logs in React Strict Mode.
   */
  const hasSetupListenerRef = useRef(false);

  /**
   * Send a JSON-RPC message to the host.
   */
  const sendMessage = useCallback((message: object) => {
    window.parent.postMessage(message, "*");
  }, []);

  /**
   * Send a JSON-RPC request and wait for response.
   */
  const sendRequest = useCallback(
    (method: string, params: unknown): Promise<unknown> => {
      return new Promise((resolve, reject) => {
        const id = requestIdRef.current++;
        pendingRequestsRef.current.set(id, { resolve, reject });
        sendMessage({ jsonrpc: "2.0", id, method, params });

        // Timeout after 30 seconds
        setTimeout(() => {
          if (pendingRequestsRef.current.has(id)) {
            pendingRequestsRef.current.delete(id);
            reject(new Error("Request timeout"));
          }
        }, 30000);
      });
    },
    [sendMessage]
  );

  /**
   * Send a JSON-RPC notification (no response expected).
   */
  const sendNotification = useCallback(
    (method: string, params: unknown) => {
      sendMessage({ jsonrpc: "2.0", method, params });
    },
    [sendMessage]
  );

  /**
   * Apply theme from host context.
   */
  const applyTheme = useCallback(
    (theme: string) => {
      document.documentElement.setAttribute(
        "data-theme",
        theme === "light" ? "light" : "dark"
      );
      onThemeChange?.(theme === "light" ? "light" : "dark");
    },
    [onThemeChange]
  );

  /**
   * Apply style variables from host context.
   */
  const applyStyleVariables = useCallback(
    (variables: Record<string, string>) => {
      const root = document.documentElement;
      for (const [key, value] of Object.entries(variables)) {
        if (value) {
          root.style.setProperty(key, value);
        }
      }
    },
    []
  );

  /**
   * Call a tool on the MCP server via the host.
   */
  const callTool = useCallback(
    async (
      toolName: string,
      args: Record<string, unknown>
    ): Promise<ToolResult> => {
      const result = (await sendRequest("tools/call", {
        name: toolName,
        arguments: args,
      })) as ToolResult;

      // Trigger onToolResult for consistency
      if (onToolResult) {
        onToolResult(result);
      }

      return result;
    },
    [sendRequest, onToolResult]
  );

  /**
   * Handle incoming messages from the host.
   *
   * Uses hasSetupListenerRef to prevent duplicate setup logs in React Strict Mode.
   * The listener is still properly added/removed, but we only log once.
   */
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;

      // Handle JSON-RPC response (for our tools/call requests)
      if (
        data.id !== undefined &&
        (data.result !== undefined || data.error !== undefined)
      ) {
        const pending = pendingRequestsRef.current.get(data.id);
        if (pending) {
          pendingRequestsRef.current.delete(data.id);
          if (data.error) {
            console.error("Error response from host:", data);
            pending.reject(new Error(data.error.message || "Unknown error"));
          } else {
            pending.resolve(data.result);
          }
        }
        return;
      }

      // Handle ui/initialize request from host
      if (data.method === "ui/initialize") {
        console.log("Initializing:", data);
        // Extract host context if available
        const hostContext = data.params?.hostContext;
        if (hostContext?.theme) {
          applyTheme(hostContext.theme);
        }
        if (hostContext?.styles?.variables) {
          applyStyleVariables(hostContext.styles.variables);
        }

        // Pass appState to callback for session restoration.
        // The host includes sessionId so the UI can reconnect after popout/popin.
        if (hostContext?.appState && onAppState) {
          onAppState(hostContext.appState);
        }

        // Respond with our capabilities
        window.parent.postMessage(
          {
            jsonrpc: "2.0",
            id: data.id,
            result: {
              protocolVersion: "2025-06-18",
              capabilities: {},
              clientInfo: { name, version },
            },
          },
          "*"
        );

        // Send initialized notification
        sendNotification("ui/notifications/initialized", {});
        setIsReady(true);
        return;
      }

      // Handle tool input notification
      if (data.method === "ui/notifications/tool-input") {
        onToolInput?.(data.params?.arguments || {});
        return;
      }

      // Handle tool result notification
      if (data.method === "ui/notifications/tool-result") {
        onToolResult?.(data.params || {});
        return;
      }

      // Handle host context changed notification
      if (data.method === "ui/notifications/host-context-changed") {
        console.log("Host context changed:", data);
        if (data.params?.theme) {
          applyTheme(data.params.theme);
        }
        if (data.params?.styles?.variables) {
          applyStyleVariables(data.params.styles.variables);
        }
        return;
      }

      // Handle ui/resource-teardown request (per MCP Apps spec SEP-1865)
      // Host sends this before closing the panel - we must cleanup and respond
      if (data.method === "ui/resource-teardown" && data.id !== undefined) {
        console.log("Resource teardown requested:", data);

        const handleTeardown = async () => {
          try {
            // Call the cleanup callback if provided
            if (onTeardown) {
              await onTeardown();
            }

            // Respond to confirm teardown complete
            window.parent.postMessage(
              {
                jsonrpc: "2.0",
                id: data.id,
                result: {},
              },
              "*"
            );
            console.log("Teardown complete, response sent");
          } catch (error) {
            console.error("Teardown error:", error);
            // Still respond to unblock the host
            window.parent.postMessage(
              {
                jsonrpc: "2.0",
                id: data.id,
                result: {},
              },
              "*"
            );
          }
        };

        handleTeardown();
        return;
      }

      // Log any unhandled messages (helps debug protocol issues)
      if (data.method && !data.method.includes("tool")) {
        console.log("Unhandled message:", data);
      }
    };

    window.addEventListener("message", handleMessage);

    // Only log once per component lifecycle (prevents Strict Mode duplicate logs)
    if (!hasSetupListenerRef.current) {
      hasSetupListenerRef.current = true;
      console.log("Listening for host messages");
    }

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [
    name,
    version,
    onToolInput,
    onToolResult,
    onTeardown,
    onAppState,
    applyTheme,
    applyStyleVariables,
    sendNotification,
  ]);

  return {
    isReady,
    callTool,
    sendNotification,
  };
};

