#!/usr/bin/env node

/**
 * AI Studio MCP Server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

import { AuthManager } from "./auth/auth-manager.js";
import { SessionManager } from "./session/session-manager.js";
import { PromptLibrary } from "./library/prompt-library.js";
import { ToolHandlers } from "./tools/handlers.js";
import { buildToolDefinitions } from "./tools/definitions.js";
import { SettingsManager } from "./utils/settings-manager.js";
import { CliHandler } from "./utils/cli-handler.js";
import { CONFIG } from "./config.js";
import { log } from "./utils/logger.js";

class AIStudioMCPServer {
  private server: Server;
  private authManager: AuthManager;
  private sessionManager: SessionManager;
  private library: PromptLibrary;
  private toolHandlers: ToolHandlers;
  private settingsManager: SettingsManager;
  private toolDefinitions: Tool[];

  constructor() {
    this.server = new Server(
      {
        name: "aistudio-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          resourceTemplates: {},
          prompts: {},
          completions: {},
          logging: {},
        },
      }
    );

    this.authManager = new AuthManager();
    this.sessionManager = new SessionManager(this.authManager);
    this.library = new PromptLibrary();
    this.settingsManager = new SettingsManager();
    
    this.toolHandlers = new ToolHandlers(
      this.sessionManager,
      this.authManager,
      this.library
    );

    const allTools = buildToolDefinitions(this.library);
    this.toolDefinitions = this.settingsManager.filterTools(allTools);

    this.setupHandlers();
    this.setupShutdownHandlers();

    const activeSettings = this.settingsManager.getEffectiveSettings();
    log.info("🚀 AI Studio MCP Server initialized");
    log.info(`  Version: 1.0.0`);
    log.info(`  Node: ${process.version}`);
    log.info(`  Platform: ${process.platform}`);
    log.info(`  Profile: ${activeSettings.profile} (${this.toolDefinitions.length} tools active)`);
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      log.info("📋 [MCP] list_tools request received");
      return { tools: this.toolDefinitions };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const progressToken = (args as any)?._meta?.progressToken;

      log.info(`🔧 [MCP] Tool call: ${name}`);

      const sendProgress = async (message: string, progress?: number, total?: number) => {
        if (progressToken) {
          await this.server.notification({
            method: "notifications/progress",
            params: {
              progressToken,
              message,
              ...(progress !== undefined && { progress }),
              ...(total !== undefined && { total }),
            },
          });
          log.dim(`  📊 Progress: ${message}`);
        }
      };

      try {
        let result;

        switch (name) {
          case "send_prompt":
            result = await this.toolHandlers.handleSendPrompt(args as any, sendProgress);
            break;
          case "create_chat":
            result = await this.toolHandlers.handleCreateChat(args as any);
            break;
          case "list_chats":
            result = await this.toolHandlers.handleListChats();
            break;
          case "select_chat":
            result = await this.toolHandlers.handleSelectChat(args as any);
            break;
          case "remove_chat":
            result = await this.toolHandlers.handleRemoveChat(args as any);
            break;
          case "add_preset":
            result = await this.toolHandlers.handleAddPreset(args as any);
            break;
          case "list_presets":
            result = await this.toolHandlers.handleListPresets();
            break;
          case "remove_preset":
            result = await this.toolHandlers.handleRemovePreset(args as any);
            break;
          default:
            log.error(`❌ [MCP] Unknown tool: ${name}`);
            return {
              content: [{ type: "text", text: JSON.stringify({ success: false, error: `Unknown tool: ${name}` }, null, 2) }],
            };
        }

        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error(`❌ [MCP] Tool execution error: ${errorMessage}`);
        return {
          content: [{ type: "text", text: JSON.stringify({ success: false, error: errorMessage }, null, 2) }],
        };
      }
    });
  }

  private setupShutdownHandlers(): void {
    let shuttingDown = false;

    const shutdown = async (signal: string) => {
      if (shuttingDown) return;
      shuttingDown = true;
      log.info(`\n🛑 Received ${signal}, shutting down gracefully...`);
      try {
        await this.toolHandlers.cleanup();
        await this.server.close();
        log.success("✅ Shutdown complete");
        process.exit(0);
      } catch (error) {
        log.error(`❌ Error during shutdown: ${error}`);
        process.exit(1);
      }
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("uncaughtException", (error) => {
      log.error(`💥 Uncaught exception: ${error}`);
      shutdown("uncaughtException");
    });
    process.on("unhandledRejection", (reason) => {
      log.error(`💥 Unhandled rejection at: ${reason}`);
      shutdown("unhandledRejection");
    });
  }

  async start(): Promise<void> {
    log.info("🎯 Starting AI Studio MCP Server...");
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    log.success("✅ MCP Server connected via stdio");
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 0 && args[0] === "config") {
    const cli = new CliHandler();
    await cli.handleCommand(args);
    process.exit(0);
  }

  console.error("╔══════════════════════════════════════════════════════════╗");
  console.error("║           AI Studio MCP Server v1.0.0                    ║");
  console.error("╚══════════════════════════════════════════════════════════╝");
  console.error("");

  try {
    const server = new AIStudioMCPServer();
    await server.start();
  } catch (error) {
    log.error(`💥 Fatal error starting server: ${error}`);
    process.exit(1);
  }
}

main();
