import { z } from "zod";

export const ParticipantRoleSchema = z.enum(["interviewer", "candidate", "ai_copilot"]);
export type ParticipantRole = z.infer<typeof ParticipantRoleSchema>;
