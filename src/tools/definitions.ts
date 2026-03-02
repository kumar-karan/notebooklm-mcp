import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { PromptLibrary } from "../library/prompt-library.js";

/**
 * Build Tool Definitions with PromptLibrary context
 */
export function buildToolDefinitions(library: PromptLibrary): Tool[] {
  return [
    {
      name: "send_prompt",
      description: "Send a prompt to AI Studio. It can continue an existing chat session or start a new one if no chat is specified.",
      inputSchema: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "The prompt to send to AI Studio.",
          },
          chat_id: {
            type: "string",
            description: "Optional. The ID of the existing chat session to continue. If omitted, uses the active chat or creates a new one.",
          },
          preset_id: {
            type: "string",
            description: "Optional. The ID of a Prompt Preset to apply to a new chat session.",
          },
          system_instructions: {
            type: "string",
            description: "Optional. Temporary system instructions for this specific run.",
          },
          model: {
            type: "string",
            description: "Optional. The model to select (e.g., 'gemini-1.5-pro').",
          },
          files: {
            type: "array",
            items: { type: "string" },
            description: "Optional. List of absolute file paths to upload with the prompt.",
          }
        },
        required: ["prompt"],
      },
    },
    {
      name: "create_chat",
      description: "Start a new chat session in AI Studio explicitly.",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "A recognizable name for this chat session.",
          },
          preset_id: {
            type: "string",
            description: "Optional. The ID of the preset to use.",
          }
        },
        required: ["name"],
      },
    },
    {
      name: "list_chats",
      description: "List all tracked AI Studio chat sessions.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "select_chat",
      description: "Set a specific chat session as the active one.",
      inputSchema: {
        type: "object",
        properties: {
          chat_id: { type: "string" }
        },
        required: ["chat_id"],
      },
    },
    {
      name: "remove_chat",
      description: "Stop tracking a chat session locally (does not delete it from Google's servers).",
      inputSchema: {
        type: "object",
        properties: {
          chat_id: { type: "string" }
        },
        required: ["chat_id"],
      },
    },
    {
      name: "add_preset",
      description: "Save a prompt preset (system instructions, preferred model).",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          system_instructions: { type: "string" },
          model: { type: "string" }
        },
        required: ["name", "description"],
      },
    },
    {
      name: "list_presets",
      description: "List all available prompt presets.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "remove_preset",
      description: "Remove a prompt preset.",
      inputSchema: {
        type: "object",
        properties: {
          preset_id: { type: "string" }
        },
        required: ["preset_id"],
      },
    }
  ];
}