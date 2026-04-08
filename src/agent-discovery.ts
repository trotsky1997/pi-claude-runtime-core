import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { getAgentDir, parseFrontmatter } from "@mariozechner/pi-coding-agent";
import {
  parseAgentEffort,
  parseAgentHooks,
  parseAgentIsolation,
  parseAgentMcpServers,
  parseAgentPermissionMode,
  parseRequiredMcpServers,
  type AgentEffort,
  type AgentHooks,
  type AgentIsolation,
  type AgentMcpServerSpec,
  type AgentPermissionMode,
} from "./managed-runtime-schemas.js";

export type AgentMemoryScope = "user" | "project" | "local";
export type AgentScope = "user" | "project" | "both";

export interface AgentConfig {
  name: string;
  description: string;
  tools?: string[];
  disallowedTools?: string[];
  allowedDirectories?: string[];
  skills?: string[];
  allowedSkills?: string[];
  disallowedSkills?: string[];
  permissionMode?: AgentPermissionMode;
  effort?: AgentEffort;
  mcpServers?: AgentMcpServerSpec[];
  requiredMcpServers?: string[];
  hooks?: AgentHooks;
  isolation?: AgentIsolation;
  model?: string;
  background?: boolean;
  color?: string;
  initialPrompt?: string;
  maxTurns?: number;
  memory?: AgentMemoryScope;
  systemPrompt: string;
  source: "bundled" | "user" | "project";
  filePath: string;
}

export interface AgentDiscoveryResult {
  agents: AgentConfig[];
  projectAgentsDir: string | null;
}

const baseDir = path.dirname(fileURLToPath(import.meta.url));
const fallbackBundledAgentsDir = path.resolve(baseDir, "..", "agents");
const VALID_MEMORY_SCOPES: AgentMemoryScope[] = ["user", "project", "local"];
const MEMORY_REQUIRED_TOOLS = ["read", "write", "edit"];

function parseStringList(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const normalized = [...new Set(value.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.trim()).filter(Boolean))];
    return normalized.length > 0 ? normalized : undefined;
  }
  if (typeof value === "string") {
    const normalized = [...new Set(value.split(",").map((entry) => entry.trim()).filter(Boolean))];
    return normalized.length > 0 ? normalized : undefined;
  }
  return undefined;
}

function normalizeToolList(values: string[] | undefined): string[] | undefined {
  if (!values || values.length === 0) return undefined;
  const normalized = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  return normalized.length > 0 ? normalized : undefined;
}

function ensureMemoryTools(tools: string[] | undefined, memory: AgentMemoryScope | undefined): string[] | undefined {
  if (!memory || !tools || tools.length === 0) return tools;
  return normalizeToolList([...tools, ...MEMORY_REQUIRED_TOOLS]);
}

function parseOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseBooleanFlag(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return undefined;
}

function parseMaxTurns(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return undefined;
}

function parseMemoryScope(value: unknown): AgentMemoryScope | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim() as AgentMemoryScope;
  return VALID_MEMORY_SCOPES.includes(normalized) ? normalized : undefined;
}

function resolveBundledAgentsDir(bundledAgentsDir?: string): string {
  if (bundledAgentsDir) {
    return bundledAgentsDir;
  }
  return fallbackBundledAgentsDir;
}

function loadAgentsFromDir(dir: string, source: "bundled" | "user" | "project"): AgentConfig[] {
  const agents: AgentConfig[] = [];

  if (!fs.existsSync(dir)) {
    return agents;
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return agents;
  }

  for (const entry of entries) {
    if (!entry.name.endsWith(".md")) continue;
    if (!entry.isFile() && !entry.isSymbolicLink()) continue;

    const filePath = path.join(dir, entry.name);
    let content: string;
    try {
      content = fs.readFileSync(filePath, "utf-8");
    } catch {
      continue;
    }

    const { frontmatter, body } = parseFrontmatter<Record<string, unknown>>(content);

    if (!frontmatter.name || !frontmatter.description) {
      continue;
    }

    const memory = parseMemoryScope(frontmatter.memory);
    const tools = ensureMemoryTools(parseStringList(frontmatter.tools), memory);
    const disallowedTools = parseStringList(frontmatter.disallowed_tools);
    const allowedDirectories = parseStringList(frontmatter.allowed_directories);
    const skills = parseStringList(frontmatter.skills);
    const allowedSkills = parseStringList(frontmatter.allowed_skills);
    const disallowedSkills = parseStringList(frontmatter.disallowed_skills);
    const permissionMode = parseAgentPermissionMode(frontmatter.permissionMode);
    const effort = parseAgentEffort(frontmatter.effort);
    const mcpServers = parseAgentMcpServers(frontmatter.mcpServers);
    const requiredMcpServers = parseRequiredMcpServers(frontmatter.requiredMcpServers);
    const hooks = parseAgentHooks(frontmatter.hooks);
    const isolation = parseAgentIsolation(frontmatter.isolation);
    const background = parseBooleanFlag(frontmatter.background);
    const color = parseOptionalString(frontmatter.color);
    const model = parseOptionalString(frontmatter.model);
    const initialPrompt = parseOptionalString(frontmatter.initialPrompt);
    const maxTurns = parseMaxTurns(frontmatter.maxTurns);

    agents.push({
      name: frontmatter.name as string,
      description: frontmatter.description as string,
      ...(tools && tools.length > 0 ? { tools } : {}),
      ...(disallowedTools ? { disallowedTools } : {}),
      ...(allowedDirectories ? { allowedDirectories } : {}),
      ...(skills ? { skills } : {}),
      ...(allowedSkills ? { allowedSkills } : {}),
      ...(disallowedSkills ? { disallowedSkills } : {}),
      ...(permissionMode ? { permissionMode } : {}),
      ...(effort !== undefined ? { effort } : {}),
      ...(mcpServers ? { mcpServers } : {}),
      ...(requiredMcpServers ? { requiredMcpServers } : {}),
      ...(hooks ? { hooks } : {}),
      ...(isolation ? { isolation } : {}),
      ...(model ? { model } : {}),
      ...(background !== undefined ? { background } : {}),
      ...(color ? { color } : {}),
      ...(initialPrompt ? { initialPrompt } : {}),
      ...(maxTurns ? { maxTurns } : {}),
      ...(memory ? { memory } : {}),
      systemPrompt: body,
      source,
      filePath,
    });
  }

  return agents;
}

function isDirectory(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function findNearestProjectAgentsDir(cwd: string): string | null {
  let currentDir = cwd;
  while (true) {
    const candidate = path.join(currentDir, ".pi", "agents");
    if (isDirectory(candidate)) return candidate;

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) return null;
    currentDir = parentDir;
  }
}

export function discoverAgents(cwd: string, scope: AgentScope, options?: { bundledAgentsDir?: string }): AgentDiscoveryResult {
  const userDir = path.join(getAgentDir(), "agents");
  const projectAgentsDir = findNearestProjectAgentsDir(cwd);
  const bundledAgentsDir = resolveBundledAgentsDir(options?.bundledAgentsDir);

  const bundledAgents = loadAgentsFromDir(bundledAgentsDir, "bundled");
  const userAgents = scope === "project" ? [] : loadAgentsFromDir(userDir, "user");
  const projectAgents = scope === "user" || !projectAgentsDir ? [] : loadAgentsFromDir(projectAgentsDir, "project");

  const agentMap = new Map<string, AgentConfig>();

  for (const agent of bundledAgents) agentMap.set(agent.name, agent);

  if (scope === "both") {
    for (const agent of userAgents) agentMap.set(agent.name, agent);
    for (const agent of projectAgents) agentMap.set(agent.name, agent);
  } else if (scope === "user") {
    for (const agent of userAgents) agentMap.set(agent.name, agent);
  } else {
    for (const agent of projectAgents) agentMap.set(agent.name, agent);
  }

  return { agents: Array.from(agentMap.values()), projectAgentsDir };
}

export function formatAgentList(agents: AgentConfig[], maxItems: number): { text: string; remaining: number } {
  if (agents.length === 0) return { text: "none", remaining: 0 };
  const listed = agents.slice(0, maxItems);
  const remaining = agents.length - listed.length;
  return {
    text: listed.map((a) => `${a.name} (${a.source}): ${a.description}`).join("; "),
    remaining,
  };
}
