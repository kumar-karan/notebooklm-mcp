/**
 * AI Studio Library Types
 */

export interface PromptPreset {
  id: string; // Unique identifier (slug format, e.g., "coding-assistant")
  name: string; // Display name
  description: string; // What this preset is used for
  system_instructions?: string; // System instructions for the model
  model?: string; // Preferred model (e.g., "gemini-1.5-pro")
  temperature?: number; // Optional temperature
  added_at: string;
  last_used: string;
  use_count: number;
}

export interface ChatSessionEntry {
  id: string; // Unique identifier
  url: string; // AI Studio Chat URL
  name: string; // Display name
  preset_id?: string; // Preset used to create this chat
  added_at: string;
  last_used: string;
  use_count: number;
}

export interface Library {
  presets: PromptPreset[];
  chats: ChatSessionEntry[];
  active_chat_id: string | null;
  last_modified: string;
  version: string;
}

export interface AddPresetInput {
  name: string;
  description: string;
  system_instructions?: string;
  model?: string;
  temperature?: number;
}

export interface UpdatePresetInput {
  id: string;
  name?: string;
  description?: string;
  system_instructions?: string;
  model?: string;
  temperature?: number;
}

export interface AddChatInput {
  url: string;
  name: string;
  preset_id?: string;
}

export interface LibraryStats {
  total_presets: number;
  total_chats: number;
  active_chat: string | null;
  last_modified: string;
}
