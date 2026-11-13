import { z } from "zod";

export const SessionStatusSchema = z.enum(["scheduled", "lobby", "active", "ended"]);
export const SessionSchema = z.object({ id: z.string(), roomName: z.string(), status: SessionStatusSchema });
export type Session = z.infer<typeof SessionSchema>;
