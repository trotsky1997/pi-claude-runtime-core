import type { Model } from "@mariozechner/pi-ai";
import type { ExtensionContext, ModelRegistry, ToolDefinition } from "@mariozechner/pi-coding-agent";
import type { ManagedTaskEntry } from "./managed-task-schemas.js";
import type { AskUserQuestionBridgeLike, SharedAskUserParams, SharedAskUserOutcome } from "./ask-user-bridge.js";

export type ManagedRuntimeKind = "subagent" | "teammate";
export type ManagedRuntimeStatus = "idle" | "running" | "completed" | "failed" | "interrupted";

export interface ManagedRuntimeRecordLike {
  name: string;
  agentType: string;
  cwd: string;
  sessionFile: string;
  kind?: ManagedRuntimeKind;
  teamName?: string;
  autoClaimTasks?: boolean;
  model?: string;
  sessionId?: string;
  color?: string;
  status?: ManagedRuntimeStatus;
  background?: boolean;
  initialPromptApplied?: boolean;
  lastDescription?: string;
  lastStartedAt?: string;
  lastCompletedAt?: string;
  lastError?: string;
  lastResultText?: string;
}

export interface AgentRuntimeManagerLike {
  get(name: string, options?: { kind?: ManagedRuntimeKind; teamName?: string }): ManagedRuntimeRecordLike | undefined;
  list(): ManagedRuntimeRecordLike[];
  abort(name: string, options?: { kind?: ManagedRuntimeKind; teamName?: string }): Promise<boolean>;
  sendMessage(input: any): Promise<any>;
  launchBackground(input: any): Promise<ManagedRuntimeRecordLike>;
}

export interface ManagedRuntimeCoordinatorLike extends AgentRuntimeManagerLike {}

export interface ManagedTaskRegistryLike {
  list(): ManagedTaskEntry[];
  get(taskId: string): ManagedTaskEntry | undefined;
}

export interface ClaudeTodoTaskLike {
  id: string;
  subject: string;
  description: string;
  activeForm?: string;
  owner?: string;
  status: string;
  blocks: string[];
  blockedBy: string[];
  metadata?: Record<string, unknown>;
}

export interface ClaudeTodoClaimTaskResultLike {
  success: boolean;
  reason?: string;
  task?: ClaudeTodoTaskLike;
  busyWithTasks?: string[];
  blockedByTasks?: string[];
}

export interface ClaudeTodoBridgeLike {
  ensureTaskListDir(cwd: string, taskListId: string): Promise<void>;
  getTaskListDir(cwd: string, taskListId: string): string;
  resetTaskList(cwd: string, taskListId: string): Promise<void>;
  unassignOwnerTasks(cwd: string, taskListId: string, ownerName: string): Promise<Array<{ id: string; subject: string }>>;
  listTasks(cwd: string, taskListId: string): Promise<ClaudeTodoTaskLike[]>;
  claimTask(cwd: string, taskListId: string, taskId: string, claimant: string, options?: { checkAgentBusy?: boolean }): Promise<ClaudeTodoClaimTaskResultLike>;
  markTaskInProgress(cwd: string, taskListId: string, taskId: string, owner?: string): Promise<ClaudeTodoTaskLike | null>;
  filterExternalTasks(tasks: ClaudeTodoTaskLike[]): ClaudeTodoTaskLike[];
  findAvailableTask(tasks: ClaudeTodoTaskLike[]): ClaudeTodoTaskLike | undefined;
  formatTaskForPrompt(task: ClaudeTodoTaskLike): string;
  getWorkerSystemPrompt(workerName: string, taskListId: string): string;
  buildClaudeTodoCustomTools(options: {
    cwd: string;
    taskListId: string;
    actingAgentName: string;
    runtimeContext: {
      modelRegistry: ModelRegistry;
      currentModel: Model<any> | undefined;
    };
  }): ToolDefinition[];
}

export interface SharedAskUserBridgeLike extends AskUserQuestionBridgeLike {
  ask(ctx: ExtensionContext, params: SharedAskUserParams): Promise<SharedAskUserOutcome>;
}

export type ChildRuntimeToolContext = {
  cwd: string;
  senderName: string;
  senderKind: ManagedRuntimeKind;
  teamName?: string;
  runtimeContext: {
    modelRegistry: ModelRegistry;
    currentModel: Model<any> | undefined;
  };
};

export type ChildRuntimeToolBuilder = (context: ChildRuntimeToolContext) => ToolDefinition[];

type SharedBridge = {
  runtimeManager: AgentRuntimeManagerLike | null;
  managedRuntimeCoordinator: ManagedRuntimeCoordinatorLike | null;
  managedTaskRegistry: ManagedTaskRegistryLike | null;
  claudeTodoBridge: ClaudeTodoBridgeLike | null;
  askUserBridge: SharedAskUserBridgeLike | null;
  childRuntimeToolBuilder: ChildRuntimeToolBuilder | null;
};

const GLOBAL_KEY = "__pi_claude_runtime_core_bridge__";
const bridge = ((globalThis as Record<string, unknown>)[GLOBAL_KEY] as SharedBridge | undefined) ?? {
  runtimeManager: null,
  managedRuntimeCoordinator: null,
  managedTaskRegistry: null,
  claudeTodoBridge: null,
  askUserBridge: null,
  childRuntimeToolBuilder: null,
};
(globalThis as Record<string, unknown>)[GLOBAL_KEY] = bridge;

export function setSharedAgentRuntimeManager(manager: AgentRuntimeManagerLike | null): void {
  bridge.runtimeManager = manager;
}

export function getSharedAgentRuntimeManager(): AgentRuntimeManagerLike | null {
  return bridge.runtimeManager;
}

export function setSharedManagedRuntimeCoordinator(coordinator: ManagedRuntimeCoordinatorLike | null): void {
  bridge.managedRuntimeCoordinator = coordinator;
}

export function getSharedManagedRuntimeCoordinator(): ManagedRuntimeCoordinatorLike | null {
  return bridge.managedRuntimeCoordinator;
}

export function setSharedManagedTaskRegistry(registry: ManagedTaskRegistryLike | null): void {
  bridge.managedTaskRegistry = registry;
}

export function getSharedManagedTaskRegistry(): ManagedTaskRegistryLike | null {
  return bridge.managedTaskRegistry;
}

export function setSharedClaudeTodoBridge(bridgeImpl: ClaudeTodoBridgeLike | null): void {
  bridge.claudeTodoBridge = bridgeImpl;
}

export function getSharedClaudeTodoBridge(): ClaudeTodoBridgeLike | null {
  return bridge.claudeTodoBridge;
}

export function setSharedAskUserQuestionBridge(bridgeImpl: SharedAskUserBridgeLike | null): void {
  bridge.askUserBridge = bridgeImpl;
}

export function getSharedAskUserQuestionBridge(): SharedAskUserBridgeLike | null {
  return bridge.askUserBridge;
}

export function setSharedChildRuntimeToolBuilder(builder: ChildRuntimeToolBuilder | null): void {
  bridge.childRuntimeToolBuilder = builder;
}

export function getSharedChildRuntimeToolBuilder(): ChildRuntimeToolBuilder | null {
  return bridge.childRuntimeToolBuilder;
}
