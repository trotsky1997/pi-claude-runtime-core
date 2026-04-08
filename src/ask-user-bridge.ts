import type { ExtensionContext } from "@mariozechner/pi-coding-agent";

export interface SharedAskUserOption {
  label: string;
  description: string;
  preview?: string;
}

export interface SharedAskUserQuestion {
  question: string;
  header: string;
  options: SharedAskUserOption[];
  multiSelect?: boolean;
}

export interface SharedAskUserAnnotation {
  preview?: string;
  notes?: string;
}

export interface SharedAskUserMetadata {
  source?: string;
}

export interface SharedAskUserParams {
  questions: SharedAskUserQuestion[];
  answers?: Record<string, string>;
  annotations?: Record<string, SharedAskUserAnnotation>;
  metadata?: SharedAskUserMetadata;
}

export type SharedAskUserAction =
  | "answered"
  | "clarify_with_user"
  | "finish_plan_interview"
  | "cancelled";

export interface SharedAskUserOutcome {
  action: SharedAskUserAction;
  answers: Record<string, string>;
  annotations?: Record<string, SharedAskUserAnnotation>;
}

export interface AskUserQuestionBridgeLike {
  ask(ctx: ExtensionContext, params: SharedAskUserParams): Promise<SharedAskUserOutcome>;
}
