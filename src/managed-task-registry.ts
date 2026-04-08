import * as fs from "node:fs";
import * as path from "node:path";
import {
  createEmptyManagedTaskRegistryState,
  sanitizeManagedTaskRegistryState,
  type ManagedTaskEntry,
  type ManagedTaskRegistryState,
  type ManagedRuntimeKind,
  type ManagedRuntimeStatus,
} from "./managed-task-schemas.js";

export interface ManagedTaskRecordSource {
  name: string;
  agentType: string;
  cwd: string;
  sessionFile?: string;
  kind?: ManagedRuntimeKind;
  teamName?: string;
  model?: string;
  detached?: boolean;
  processId?: number;
  sessionId?: string;
  status?: ManagedRuntimeStatus;
  background?: boolean;
  lastDescription?: string;
  lastStartedAt?: string;
  lastCompletedAt?: string;
  lastError?: string;
  lastResultText?: string;
}

export interface ManagedTaskTerminalEvent {
  record: ManagedTaskRecordSource;
  result: { exitCode: number };
  wasBackground: boolean;
}

function getTaskIdForRecord(record: Pick<ManagedTaskRecordSource, "name" | "kind" | "teamName">): string {
  if (record.kind === "teammate") {
    return `teammate:${record.teamName ?? "unknown"}:${record.name}`;
  }
  return `subagent:${record.name}`;
}

function getRuntimeKeyForRecord(record: Pick<ManagedTaskRecordSource, "name" | "kind" | "teamName">): string {
  return getTaskIdForRecord(record);
}

export function getManagedTaskRegistryPath(cwd: string): string {
  return path.resolve(cwd, ".pi", "claude-subagent", "managed-tasks.json");
}

export class ManagedTaskRegistry {
  private state: ManagedTaskRegistryState = createEmptyManagedTaskRegistryState();

  constructor(private readonly cwd: string) {}

  getSnapshot(): ManagedTaskRegistryState {
    return {
      tasks: { ...this.state.tasks },
    };
  }

  list(): ManagedTaskEntry[] {
    return Object.values(this.state.tasks).sort((left, right) => left.taskId.localeCompare(right.taskId));
  }

  get(taskId: string): ManagedTaskEntry | undefined {
    const found = this.state.tasks[taskId];
    return found ? { ...found } : undefined;
  }

  async load(): Promise<void> {
    try {
      const raw = await fs.promises.readFile(getManagedTaskRegistryPath(this.cwd), "utf-8");
      this.state = sanitizeManagedTaskRegistryState(JSON.parse(raw));
    } catch {
      this.state = createEmptyManagedTaskRegistryState();
    }
  }

  async save(): Promise<void> {
    const filePath = getManagedTaskRegistryPath(this.cwd);
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, JSON.stringify(this.state, null, 2), "utf-8");
  }

  async markRunningTasksInterrupted(reason: string, options?: { keepRunning?: (task: ManagedTaskEntry) => boolean }): Promise<void> {
    let changed = false;
    const now = new Date().toISOString();
    const nextTasks: ManagedTaskRegistryState["tasks"] = {};

    for (const [taskId, task] of Object.entries(this.state.tasks)) {
      if (options?.keepRunning?.(task)) {
        nextTasks[taskId] = task;
        continue;
      }
      if (task.status === "running") {
        changed = true;
        nextTasks[taskId] = {
          ...task,
          status: "interrupted",
          background: false,
          completedAt: task.completedAt ?? now,
          updatedAt: now,
          error: task.error ?? reason,
        };
      } else {
        nextTasks[taskId] = task;
      }
    }

    if (!changed) return;
    this.state = { tasks: nextTasks };
    await this.save();
  }

  async upsertFromRecord(record: ManagedTaskRecordSource): Promise<ManagedTaskEntry> {
    const taskId = getTaskIdForRecord(record);
    const previous = this.state.tasks[taskId];
    const entry: ManagedTaskEntry = {
      taskId,
      runtimeKey: getRuntimeKeyForRecord(record),
      runtimeName: record.name,
      runtimeKind: record.kind ?? "subagent",
      ...(record.teamName ? { teamName: record.teamName } : {}),
      agentType: record.agentType,
      cwd: record.cwd,
      ...(record.sessionFile ? { sessionFile: record.sessionFile } : {}),
      ...(record.sessionId ? { sessionId: record.sessionId } : {}),
      ...(record.model ? { model: record.model } : {}),
      detached: record.detached ?? previous?.detached ?? false,
      ...(record.processId ? { processId: record.processId } : {}),
      ...(record.lastDescription ? { description: record.lastDescription } : previous?.description ? { description: previous.description } : {}),
      status: record.status ?? previous?.status ?? "idle",
      background: record.background ?? previous?.background ?? false,
      ...(record.lastStartedAt ?? previous?.startedAt ? { startedAt: record.lastStartedAt ?? previous?.startedAt } : {}),
      ...(record.lastCompletedAt ?? previous?.completedAt ? { completedAt: record.lastCompletedAt ?? previous?.completedAt } : {}),
      updatedAt: new Date().toISOString(),
      ...(record.lastResultText ? { resultText: record.lastResultText } : previous?.resultText ? { resultText: previous.resultText } : {}),
      ...(record.lastError ? { error: record.lastError } : previous?.error ? { error: previous.error } : {}),
    };
    this.state.tasks[taskId] = entry;
    await this.save();
    return { ...entry };
  }

  async noteTerminal(event: ManagedTaskTerminalEvent): Promise<ManagedTaskEntry> {
    const taskId = getTaskIdForRecord(event.record);
    const previous = this.state.tasks[taskId];
    const entry: ManagedTaskEntry = {
      taskId,
      runtimeKey: getRuntimeKeyForRecord(event.record),
      runtimeName: event.record.name,
      runtimeKind: event.record.kind ?? "subagent",
      ...(event.record.teamName ? { teamName: event.record.teamName } : {}),
      agentType: event.record.agentType,
      cwd: event.record.cwd,
      ...(event.record.sessionFile ? { sessionFile: event.record.sessionFile } : {}),
      ...(event.record.sessionId ? { sessionId: event.record.sessionId } : {}),
      ...(event.record.model ? { model: event.record.model } : {}),
      detached: event.record.detached ?? previous?.detached ?? false,
      ...(event.record.processId ? { processId: event.record.processId } : previous?.processId ? { processId: previous.processId } : {}),
      ...(event.record.lastDescription ? { description: event.record.lastDescription } : previous?.description ? { description: previous.description } : {}),
      status: event.record.status ?? previous?.status ?? (event.result.exitCode === 0 ? "completed" : "failed"),
      background: false,
      ...(event.record.lastStartedAt ?? previous?.startedAt ? { startedAt: event.record.lastStartedAt ?? previous?.startedAt } : {}),
      ...(event.record.lastCompletedAt ?? previous?.completedAt ? { completedAt: event.record.lastCompletedAt ?? previous?.completedAt } : {}),
      updatedAt: new Date().toISOString(),
      ...(event.record.lastResultText ? { resultText: event.record.lastResultText } : previous?.resultText ? { resultText: previous.resultText } : {}),
      ...(event.record.lastError ? { error: event.record.lastError } : previous?.error ? { error: previous.error } : {}),
    };
    this.state.tasks[taskId] = entry;
    await this.save();
    return { ...entry };
  }
}
