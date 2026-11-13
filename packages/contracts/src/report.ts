import { z } from "zod";

export const EvidenceSchema = z.object({ quote: z.string(), timestampMs: z.number().nonnegative(), competency: z.string() });
export type Evidence = z.infer<typeof EvidenceSchema>;
