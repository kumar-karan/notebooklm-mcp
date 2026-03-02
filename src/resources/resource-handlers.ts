import { PromptLibrary } from "../library/prompt-library.js";

// Dummy handler, since resources aren't the primary functionality required for aistudio
export class ResourceHandlers {
    constructor(private library: PromptLibrary) {}
    registerHandlers(server: any) {}
}