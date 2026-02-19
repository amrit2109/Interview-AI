/**
 * Shared AI output metadata for auditability.
 * Required on all AI-generated responses.
 */

import { z } from "zod";

export const aiMetadataSchema = z.object({
  model_name: z.string().min(1),
  model_version: z.string().optional(),
  prompt_version: z.string().optional(),
  generated_at: z.string().datetime(),
  confidence_score: z.number().min(0).max(1).optional(),
});

export type AiMetadata = z.infer<typeof aiMetadataSchema>;

export function createAiMetadata(overrides?: Partial<AiMetadata>): AiMetadata {
  return aiMetadataSchema.parse({
    model_name: "gemini-2.5-flash",
    model_version: "1",
    prompt_version: "1",
    generated_at: new Date().toISOString(),
    confidence_score: 1,
    ...overrides,
  });
}
