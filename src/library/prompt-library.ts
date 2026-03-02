/**
 * AI Studio Library Manager
 */

import fs from "fs";
import path from "path";
import { CONFIG } from "../config.js";
import { log } from "../utils/logger.js";
import type {
  PromptPreset,
  ChatSessionEntry,
  Library,
  AddPresetInput,
  UpdatePresetInput,
  AddChatInput,
  LibraryStats,
} from "./types.js";

export class PromptLibrary {
  private libraryPath: string;
  private library: Library;

  constructor() {
    this.libraryPath = path.join(CONFIG.dataDir, "library.json");
    this.library = this.loadLibrary();

    log.info("📚 PromptLibrary initialized");
    log.info(`  Library path: ${this.libraryPath}`);
    log.info(`  Presets: ${this.library.presets.length}`);
    log.info(`  Chats: ${this.library.chats.length}`);
    if (this.library.active_chat_id) {
      log.info(`  Active chat: ${this.library.active_chat_id}`);
    }
  }

  private loadLibrary(): Library {
    try {
      if (fs.existsSync(this.libraryPath)) {
        const data = fs.readFileSync(this.libraryPath, "utf-8");
        const library = JSON.parse(data) as Library;
        // Migration from older versions if needed
        if (!library.presets) library.presets = [];
        if (!library.chats) library.chats = [];
        log.success(`  ✅ Loaded library with ${library.presets.length} presets and ${library.chats.length} chats`);
        return library;
      }
    } catch (error) {
      log.warning(`  ⚠️  Failed to load library: ${error}`);
    }

    // Create default library
    log.info("  🆕 Creating new library...");
    const defaultLibrary: Library = {
      presets: [
        {
          id: "default-coding-assistant",
          name: "Default Coding Assistant",
          description: "A standard prompt preset for general coding tasks.",
          system_instructions: "You are an expert software engineer. Provide clear, concise, and optimal code solutions.",
          model: "gemini-1.5-pro",
          added_at: new Date().toISOString(),
          last_used: new Date().toISOString(),
          use_count: 0
        }
      ],
      chats: [],
      active_chat_id: null,
      last_modified: new Date().toISOString(),
      version: "1.0.0",
    };
    this.saveLibrary(defaultLibrary);
    return defaultLibrary;
  }

  private saveLibrary(library: Library): void {
    try {
      library.last_modified = new Date().toISOString();
      const data = JSON.stringify(library, null, 2);
      fs.writeFileSync(this.libraryPath, data, "utf-8");
      this.library = library;
      log.success(`  💾 Library saved (${library.presets.length} presets, ${library.chats.length} chats)`);
    } catch (error) {
      log.error(`  ❌ Failed to save library: ${error}`);
      throw error;
    }
  }

  private generateId(name: string, collection: { id: string }[]): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 30);

    let id = base;
    let counter = 1;
    while (collection.some((item) => item.id === id)) {
      id = `${base}-${counter}`;
      counter++;
    }

    return id;
  }

  // --- Presets Management ---

  addPreset(input: AddPresetInput): PromptPreset {
    log.info(`📝 Adding preset: ${input.name}`);
    const id = this.generateId(input.name, this.library.presets);

    const preset: PromptPreset = {
      id,
      name: input.name,
      description: input.description,
      system_instructions: input.system_instructions,
      model: input.model,
      temperature: input.temperature,
      added_at: new Date().toISOString(),
      last_used: new Date().toISOString(),
      use_count: 0,
    };

    const updated = { ...this.library };
    updated.presets.push(preset);
    this.saveLibrary(updated);
    log.success(`✅ Preset added: ${id}`);
    return preset;
  }

  listPresets(): PromptPreset[] {
    return this.library.presets;
  }

  getPreset(id: string): PromptPreset | null {
    return this.library.presets.find((p) => p.id === id) || null;
  }

  updatePreset(input: UpdatePresetInput): PromptPreset {
    const presetIndex = this.library.presets.findIndex((p) => p.id === input.id);
    if (presetIndex === -1) {
      throw new Error(`Preset not found: ${input.id}`);
    }

    log.info(`📝 Updating preset: ${input.id}`);
    const updated = { ...this.library };

    updated.presets[presetIndex] = {
      ...updated.presets[presetIndex],
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.system_instructions !== undefined && { system_instructions: input.system_instructions }),
      ...(input.model !== undefined && { model: input.model }),
      ...(input.temperature !== undefined && { temperature: input.temperature }),
    };

    this.saveLibrary(updated);
    log.success(`✅ Preset updated: ${input.id}`);
    return updated.presets[presetIndex];
  }

  removePreset(id: string): boolean {
    const presetExists = this.library.presets.some((p) => p.id === id);
    if (!presetExists) return false;

    log.info(`🗑️  Removing preset: ${id}`);
    const updated = { ...this.library };
    updated.presets = updated.presets.filter((p) => p.id !== id);
    this.saveLibrary(updated);
    log.success(`✅ Preset removed: ${id}`);
    return true;
  }

  // --- Chats Management ---

  addChat(input: AddChatInput): ChatSessionEntry {
    log.info(`📝 Adding chat session: ${input.name}`);
    const id = this.generateId(input.name, this.library.chats);

    const chat: ChatSessionEntry = {
      id,
      url: input.url,
      name: input.name,
      preset_id: input.preset_id,
      added_at: new Date().toISOString(),
      last_used: new Date().toISOString(),
      use_count: 0,
    };

    const updated = { ...this.library };
    updated.chats.push(chat);

    // Automatically set as active if no active chat
    if (!updated.active_chat_id) {
      updated.active_chat_id = id;
    }

    this.saveLibrary(updated);
    log.success(`✅ Chat added: ${id}`);
    return chat;
  }

  listChats(): ChatSessionEntry[] {
    return this.library.chats;
  }

  getChat(id: string): ChatSessionEntry | null {
    return this.library.chats.find((c) => c.id === id) || null;
  }

  getActiveChat(): ChatSessionEntry | null {
    if (!this.library.active_chat_id) return null;
    return this.getChat(this.library.active_chat_id);
  }

  selectChat(id: string): ChatSessionEntry {
    const chatIndex = this.library.chats.findIndex((c) => c.id === id);
    if (chatIndex === -1) {
      throw new Error(`Chat not found: ${id}`);
    }

    log.info(`🎯 Selecting chat: ${id}`);
    const updated = { ...this.library };
    updated.active_chat_id = id;

    updated.chats[chatIndex] = {
      ...updated.chats[chatIndex],
      last_used: new Date().toISOString(),
    };

    this.saveLibrary(updated);
    log.success(`✅ Active chat: ${id}`);
    return updated.chats[chatIndex];
  }

  removeChat(id: string): boolean {
    const chatExists = this.library.chats.some((c) => c.id === id);
    if (!chatExists) return false;

    log.info(`🗑️  Removing chat: ${id}`);
    const updated = { ...this.library };
    updated.chats = updated.chats.filter((c) => c.id !== id);

    if (updated.active_chat_id === id) {
      updated.active_chat_id = updated.chats.length > 0 ? updated.chats[0].id : null;
    }

    this.saveLibrary(updated);
    log.success(`✅ Chat removed: ${id}`);
    return true;
  }

  incrementChatUseCount(id: string): ChatSessionEntry | null {
    const chatIndex = this.library.chats.findIndex((c) => c.id === id);
    if (chatIndex === -1) return null;

    const updated = { ...this.library };
    updated.chats[chatIndex] = {
      ...updated.chats[chatIndex],
      use_count: updated.chats[chatIndex].use_count + 1,
      last_used: new Date().toISOString(),
    };

    this.saveLibrary(updated);
    return updated.chats[chatIndex];
  }

  getStats(): LibraryStats {
    return {
      total_presets: this.library.presets.length,
      total_chats: this.library.chats.length,
      active_chat: this.library.active_chat_id,
      last_modified: this.library.last_modified,
    };
  }

  searchChats(query: string): ChatSessionEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.library.chats.filter(
      (n) =>
        n.name.toLowerCase().includes(lowerQuery)
    );
  }
}