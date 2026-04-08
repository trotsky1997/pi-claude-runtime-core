import { z } from "zod";

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

const OptionalStringSchema = z.preprocess(
  normalizeOptionalString,
  z.string().min(1).optional(),
);

export const ManagedRuntimeKindSchema = z.enum(["subagent", "teammate"]);
export const ManagedRuntimeStatusSchema = z.enum(["idle", "running", "completed", "failed", "interrupted"]);

export const ManagedTaskEntrySchema = z.object({
  taskId: z.string().min(1),
  runtimeKey: z.string().min(1),
  runtimeName: z.string().min(1),
  runtimeKind: ManagedRuntimeKindSchema,
  teamName: OptionalStringSchema,
  agentType: z.string().min(1),
  cwd: z.string().min(1),
  sessionFile: OptionalStringSchema,
  sessionId: OptionalStringSchema,
  model: OptionalStringSchema,
  description: OptionalStringSchema,
  status: ManagedRuntimeStatusSchema,
  detached: z.boolean().default(false),
  processId: z.number().int().positive().optional(),
  background: z.boolean().default(false),
  startedAt: OptionalStringSchema,
  completedAt: OptionalStringSchema,
  updatedAt: z.string().min(1),
  resultText: OptionalStringSchema,
  error: OptionalStringSchema,
});

export const ManagedTaskRegistryStateSchema = z.object({
  tasks: z.record(z.string(), ManagedTaskEntrySchema).default({}),
});

export type ManagedRuntimeKind = z.infer<typeof ManagedRuntimeKindSchema>;
export type ManagedRuntimeStatus = z.infer<typeof ManagedRuntimeStatusSchema>;
export type ManagedTaskEntry = z.infer<typeof ManagedTaskEntrySchema>;
export type ManagedTaskRegistryState = z.infer<typeof ManagedTaskRegistryStateSchema>;

export function createEmptyManagedTaskRegistryState(): ManagedTaskRegistryState {
  return { tasks: {} };
}

export function sanitizeManagedTaskRegistryState(value: unknown): ManagedTaskRegistryState {
  const parsed = ManagedTaskRegistryStateSchema.safeParse(value);
  if (!parsed.success) return createEmptyManagedTaskRegistryState();
  return parsed.data;
}
