import { z } from "zod";

export const CopilotSuggestionSchema = z.object({ id: z.string(), text: z.string(), createdAt: z.string().datetime() });
export type CopilotSuggestion = z.infer<typeof CopilotSuggestionSchema>;
