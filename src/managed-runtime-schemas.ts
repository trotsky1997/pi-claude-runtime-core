import { z } from "zod";

export const AGENT_PERMISSION_MODES = [
  "acceptEdits",
  "bypassPermissions",
  "default",
  "dontAsk",
  "plan",
  "bubble",
] as const;

export const AGENT_EFFORT_LEVELS = ["low", "medium", "high", "max"] as const;

export type AgentPermissionMode = (typeof AGENT_PERMISSION_MODES)[number];
export type AgentEffortLevel = (typeof AGENT_EFFORT_LEVELS)[number];
export type AgentEffort = AgentEffortLevel | number;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeOptionalStringList(value: unknown): string[] | undefined {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : undefined;
  if (!rawValues) return undefined;
  const normalized = [...new Set(
    rawValues
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean),
  )];
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeOptionalAgentHooks(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) && Object.keys(value).length > 0 ? value : undefined;
}

function normalizeOptionalMcpServers(
  value: unknown,
): Array<string | Record<string, unknown>> | undefined {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === "string" || isRecord(value)
      ? [value]
      : undefined;
  if (!rawValues) return undefined;

  const normalized: Array<string | Record<string, unknown>> = [];
  for (const entry of rawValues) {
    if (typeof entry === "string") {
      const trimmed = entry.trim();
      if (trimmed) normalized.push(trimmed);
      continue;
    }
    if (isRecord(entry)) {
      normalized.push(entry);
    }
  }

  return normalized.length > 0 ? normalized : undefined;
}

function normalizeOptionalEffort(value: unknown): AgentEffort | undefined {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return undefined;
    if ((AGENT_EFFORT_LEVELS as readonly string[]).includes(normalized)) {
      return normalized as AgentEffortLevel;
    }
    const numeric = Number.parseInt(normalized, 10);
    if (Number.isInteger(numeric) && numeric > 0) {
      return numeric;
    }
  }
  return undefined;
}

const OptionalStringSchema = z.preprocess(
  normalizeOptionalString,
  z.string().min(1).optional(),
);

const OptionalStringListSchema = z.preprocess(
  normalizeOptionalStringList,
  z.array(z.string().min(1)).min(1).optional(),
);

export const AgentPermissionModeSchema = z.enum(AGENT_PERMISSION_MODES);
export const AgentEffortLevelSchema = z.enum(AGENT_EFFORT_LEVELS);
export const AgentEffortSchema = z.preprocess(
  normalizeOptionalEffort,
  z.union([AgentEffortLevelSchema, z.number().int().positive()]).optional(),
);
export const AgentIsolationSchema = z.enum(["worktree", "remote"]);
export const AgentHooksSchema = z.record(z.string(), z.unknown());
export const AgentMcpServerSpecSchema = z.union([
  z.string().min(1),
  z.record(z.string(), z.unknown()),
]);
export const AgentMcpServersSchema = z.preprocess(
  normalizeOptionalMcpServers,
  z.array(AgentMcpServerSpecSchema).min(1).optional(),
);
export const OptionalAgentHooksSchema = z.preprocess(
  normalizeOptionalAgentHooks,
  AgentHooksSchema.optional(),
);

export const NamedAgentStatusSchema = z.enum([
  "idle",
  "running",
  "completed",
  "failed",
  "interrupted",
]);

export const ManagedRuntimeKindSchema = z.enum(["subagent", "teammate"]);

export const ManagedRuntimeRecordSchema = z.object({
  name: z.string().min(1),
  agentType: z.string().min(1),
  cwd: z.string().min(1),
  sessionFile: z.string().min(1),
  kind: ManagedRuntimeKindSchema.optional(),
  teamName: OptionalStringSchema,
  autoClaimTasks: z.boolean().optional(),
  allowedTools: OptionalStringListSchema,
  disallowedTools: OptionalStringListSchema,
  allowedDirectories: OptionalStringListSchema,
  allowedSkills: OptionalStringListSchema,
  disallowedSkills: OptionalStringListSchema,
  permissionMode: AgentPermissionModeSchema.optional(),
  effort: AgentEffortSchema,
  mcpServers: AgentMcpServersSchema,
  requiredMcpServers: OptionalStringListSchema,
  hooks: OptionalAgentHooksSchema,
  isolation: AgentIsolationSchema.optional(),
  model: OptionalStringSchema,
  sessionId: OptionalStringSchema,
  color: OptionalStringSchema,
  status: NamedAgentStatusSchema.default("idle"),
  background: z.boolean().default(false),
  initialPromptApplied: z.boolean().optional(),
  lastDescription: OptionalStringSchema,
  lastStartedAt: OptionalStringSchema,
  lastCompletedAt: OptionalStringSchema,
  lastError: OptionalStringSchema,
  lastResultText: OptionalStringSchema,
});

export const NamedAgentStateSchema = z.object({
  agents: z.record(z.string(), z.unknown()).default({}),
});

export const TeamMemberRecordSchema = z.object({
  name: z.string().min(1),
  agentType: z.string().min(1),
  cwd: z.string().min(1),
  joinedAt: z.string().min(1),
  autoClaimTasks: z.boolean().optional(),
  allowedTools: OptionalStringListSchema,
  disallowedTools: OptionalStringListSchema,
  allowedDirectories: OptionalStringListSchema,
  allowedSkills: OptionalStringListSchema,
  disallowedSkills: OptionalStringListSchema,
  permissionMode: AgentPermissionModeSchema.optional(),
  effort: AgentEffortSchema,
  mcpServers: AgentMcpServersSchema,
  requiredMcpServers: OptionalStringListSchema,
  hooks: OptionalAgentHooksSchema,
  isolation: AgentIsolationSchema.optional(),
  model: OptionalStringSchema,
  sessionFile: OptionalStringSchema,
  sessionId: OptionalStringSchema,
  color: OptionalStringSchema,
  status: NamedAgentStatusSchema.optional(),
  initialPromptApplied: z.boolean().optional(),
  lastResultText: OptionalStringSchema,
  lastError: OptionalStringSchema,
});

export const TeamRecordSchema = z.object({
  name: z.string().min(1),
  description: OptionalStringSchema,
  createdAt: z.string().min(1),
  cwd: z.string().min(1),
  leadName: z.string().min(1),
  leadAgentType: OptionalStringSchema,
  members: z.record(z.string(), z.unknown()).default({}),
});

export const ActiveTeamStateSchema = z.object({
  teamName: OptionalStringSchema,
});

export const BackgroundAgentNotificationSchema = z.object({
  name: z.string().min(1),
  agentType: z.string().min(1),
  cwd: z.string().min(1),
  kind: ManagedRuntimeKindSchema.optional(),
  teamName: OptionalStringSchema,
  model: OptionalStringSchema,
  description: OptionalStringSchema,
  status: z.enum(["launched", "completed", "failed", "interrupted"]),
  sessionFile: OptionalStringSchema,
  startedAt: OptionalStringSchema,
  completedAt: OptionalStringSchema,
  resultText: OptionalStringSchema,
  error: OptionalStringSchema,
});

export type AgentIsolation = z.infer<typeof AgentIsolationSchema>;
export type AgentHooks = z.infer<typeof AgentHooksSchema>;
export type AgentMcpServerSpec = z.infer<typeof AgentMcpServerSpecSchema>;
export type NamedAgentStatus = z.infer<typeof NamedAgentStatusSchema>;
export type ManagedRuntimeKind = z.infer<typeof ManagedRuntimeKindSchema>;
export type ManagedRuntimeRecord = z.infer<typeof ManagedRuntimeRecordSchema>;
export type NamedAgentRecord = ManagedRuntimeRecord;
export type NamedAgentState = { agents: Record<string, ManagedRuntimeRecord> };
export type TeamMemberRecord = z.infer<typeof TeamMemberRecordSchema>;
export type TeamRecord = Omit<z.infer<typeof TeamRecordSchema>, "members"> & {
  members: Record<string, TeamMemberRecord>;
};
export type ActiveTeamState = z.infer<typeof ActiveTeamStateSchema>;
export type BackgroundAgentNotification = z.infer<typeof BackgroundAgentNotificationSchema>;

export function parseAgentPermissionMode(value: unknown): AgentPermissionMode | undefined {
  const parsed = AgentPermissionModeSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function parseAgentEffort(value: unknown): AgentEffort | undefined {
  const parsed = AgentEffortSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function parseAgentHooks(value: unknown): AgentHooks | undefined {
  const parsed = OptionalAgentHooksSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function parseAgentMcpServers(value: unknown): AgentMcpServerSpec[] | undefined {
  const parsed = AgentMcpServersSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function parseAgentIsolation(value: unknown): AgentIsolation | undefined {
  const parsed = AgentIsolationSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function parseRequiredMcpServers(value: unknown): string[] | undefined {
  const parsed = OptionalStringListSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function parseManagedRuntimeRecord(
  value: unknown,
  expectedName?: string,
): ManagedRuntimeRecord | null {
  const parsed = ManagedRuntimeRecordSchema.safeParse(value);
  if (!parsed.success) return null;
  if (expectedName && parsed.data.name !== expectedName) return null;
  return parsed.data;
}

export function sanitizeNamedAgentState(value: unknown): NamedAgentState {
  const parsed = NamedAgentStateSchema.safeParse(value);
  if (!parsed.success) {
    return { agents: {} };
  }

  const agents: Record<string, ManagedRuntimeRecord> = {};
  for (const [name, record] of Object.entries(parsed.data.agents)) {
    const normalized = parseManagedRuntimeRecord(record, name);
    if (normalized) {
      agents[name] = normalized;
    }
  }
  return { agents };
}

export function parseTeamMemberRecord(
  value: unknown,
  expectedName?: string,
): TeamMemberRecord | null {
  const parsed = TeamMemberRecordSchema.safeParse(value);
  if (!parsed.success) return null;
  if (expectedName && parsed.data.name !== expectedName) return null;
  return parsed.data;
}

export function parseTeamRecord(value: unknown): TeamRecord | null {
  const parsed = TeamRecordSchema.safeParse(value);
  if (!parsed.success) return null;

  const members: Record<string, TeamMemberRecord> = {};
  for (const [name, member] of Object.entries(parsed.data.members)) {
    const normalized = parseTeamMemberRecord(member, name);
    if (normalized) {
      members[name] = normalized;
    }
  }

  return {
    ...parsed.data,
    members,
  };
}

export function sanitizeActiveTeamState(value: unknown): ActiveTeamState {
  const parsed = ActiveTeamStateSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}
