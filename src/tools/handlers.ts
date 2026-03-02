/**
 * MCP Tool Handlers
 */

import { SessionManager } from "../session/session-manager.js";
import { AuthManager } from "../auth/auth-manager.js";
import { PromptLibrary } from "../library/prompt-library.js";
import { CONFIG, applyBrowserOptions, type BrowserOptions } from "../config.js";
import { log } from "../utils/logger.js";
import type { ToolResult, ProgressCallback } from "../types.js";

const FOLLOW_UP_REMINDER = "\n\nEXTREMELY IMPORTANT: Is that ALL you need to know? You can always ask another question using the same session ID! Think about it carefully: before you reply to the user, review their original request and this answer. If anything is still unclear or missing, ask me another question first.";

export class ToolHandlers {
  private sessionManager: SessionManager;
  private authManager: AuthManager;
  private library: PromptLibrary;

  constructor(sessionManager: SessionManager, authManager: AuthManager, library: PromptLibrary) {
    this.sessionManager = sessionManager;
    this.authManager = authManager;
    this.library = library;
  }

  async handleSendPrompt(
    args: {
      prompt: string;
      chat_id?: string;
      preset_id?: string;
      system_instructions?: string;
      model?: string;
      files?: string[];
    },
    sendProgress?: ProgressCallback
  ): Promise<ToolResult<any>> {
    const { prompt, chat_id, preset_id, system_instructions, model, files } = args;

    log.info(`🔧 [TOOL] send_prompt called`);

    try {
      let resolvedChatUrl = "https://aistudio.google.com/prompts/new_chat";
      let resolvedPreset = null;
      let activeChatId = chat_id;

      if (preset_id) {
        resolvedPreset = this.library.getPreset(preset_id);
        if (!resolvedPreset) {
          throw new Error(`Preset not found in library: ${preset_id}`);
        }
      }

      if (!activeChatId) {
        const activeChat = this.library.getActiveChat();
        if (activeChat) activeChatId = activeChat.id;
      }

      if (activeChatId) {
        const chatEntry = this.library.getChat(activeChatId);
        if (chatEntry) {
          resolvedChatUrl = chatEntry.url;
          this.library.incrementChatUseCount(activeChatId);
        }
      }

      await sendProgress?.("Getting or creating browser session...", 1, 5);

      const session = await this.sessionManager.getOrCreateSession(
        activeChatId || "default",
        resolvedChatUrl,
        CONFIG.headless
      );

      const finalSysInstr = system_instructions || resolvedPreset?.system_instructions;
      const finalModel = model || resolvedPreset?.model;

      await sendProgress?.("Sending prompt to AI Studio...", 2, 5);

      const answer = await session.ask(prompt, sendProgress, {
        systemInstructions: finalSysInstr,
        model: finalModel,
        files: files
      });

      if (!activeChatId) {
        const currentUrl = session.chatUrl;
        if (currentUrl && currentUrl !== "https://aistudio.google.com/prompts/new_chat") {
          const newChat = this.library.addChat({
            name: `Chat created at ${new Date().toLocaleTimeString()}`,
            url: currentUrl,
            preset_id: preset_id
          });
          activeChatId = newChat.id;
        }
      }

      const result = {
        status: "success",
        prompt,
        answer: `${answer.trimEnd()}${FOLLOW_UP_REMINDER}`,
        chat_id: activeChatId,
        chat_url: session.chatUrl,
      };

      await sendProgress?.("Prompt answered successfully!", 5, 5);
      return { success: true, data: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  async handleCreateChat(args: { name: string; preset_id?: string }): Promise<ToolResult<any>> {
    log.info(`🔧 [TOOL] create_chat called`);
    try {
      const chat = this.library.addChat({
        name: args.name,
        url: "https://aistudio.google.com/prompts/new_chat",
        preset_id: args.preset_id
      });
      return { success: true, data: { chat } };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  async handleListChats(): Promise<ToolResult<any>> {
    log.info(`🔧 [TOOL] list_chats called`);
    try {
      const chats = this.library.listChats();
      return { success: true, data: { chats } };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  async handleSelectChat(args: { chat_id: string }): Promise<ToolResult<any>> {
    log.info(`🔧 [TOOL] select_chat called`);
    try {
      const chat = this.library.selectChat(args.chat_id);
      return { success: true, data: { chat } };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  async handleRemoveChat(args: { chat_id: string }): Promise<ToolResult<any>> {
    log.info(`🔧 [TOOL] remove_chat called`);
    try {
      const removed = this.library.removeChat(args.chat_id);
      return { success: true, data: { removed } };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  async handleAddPreset(args: any): Promise<ToolResult<any>> {
    log.info(`🔧 [TOOL] add_preset called`);
    try {
      const preset = this.library.addPreset(args);
      return { success: true, data: { preset } };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  async handleListPresets(): Promise<ToolResult<any>> {
    log.info(`🔧 [TOOL] list_presets called`);
    try {
      const presets = this.library.listPresets();
      return { success: true, data: { presets } };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  async handleRemovePreset(args: { preset_id: string }): Promise<ToolResult<any>> {
    log.info(`🔧 [TOOL] remove_preset called`);
    try {
      const removed = this.library.removePreset(args.preset_id);
      return { success: true, data: { removed } };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  async cleanup(): Promise<void> {
    await this.sessionManager.closeAllSessions();
  }
}
