import * as fs from "node:fs";
import * as path from "node:path";
import {
  parseTeamRecord,
  sanitizeActiveTeamState,
  type ActiveTeamState,
  type TeamMemberRecord,
  type TeamRecord,
} from "./managed-runtime-schemas.js";

export function sanitizeTeamName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

export function getClaudeSubagentStateDir(cwd: string): string {
  return path.resolve(cwd, ".pi", "claude-subagent");
}

export function getTeamsDir(cwd: string): string {
  return path.join(getClaudeSubagentStateDir(cwd), "teams");
}

export function getTeamFilePath(cwd: string, teamName: string): string {
  return path.join(getTeamsDir(cwd), `${sanitizeTeamName(teamName)}.json`);
}

export function getActiveTeamFilePath(cwd: string): string {
  return path.join(getClaudeSubagentStateDir(cwd), "active-team.json");
}

export async function loadTeamRecord(cwd: string, teamName: string): Promise<TeamRecord | null> {
  try {
    const raw = await fs.promises.readFile(getTeamFilePath(cwd, teamName), "utf-8");
    return parseTeamRecord(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function saveTeamRecord(cwd: string, team: TeamRecord): Promise<void> {
  const filePath = getTeamFilePath(cwd, team.name);
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, JSON.stringify(team, null, 2), "utf-8");
}

export async function deleteTeamRecord(cwd: string, teamName: string): Promise<void> {
  try {
    await fs.promises.rm(getTeamFilePath(cwd, teamName), { force: true });
  } catch {
    // Ignore delete races during team cleanup.
  }
}

export function createTeamRecord(options: {
  name: string;
  cwd: string;
  leadName: string;
  description?: string;
  leadAgentType?: string;
}): TeamRecord {
  return {
    name: options.name,
    cwd: options.cwd,
    leadName: options.leadName,
    createdAt: new Date().toISOString(),
    ...(options.description ? { description: options.description } : {}),
    ...(options.leadAgentType ? { leadAgentType: options.leadAgentType } : {}),
    members: {},
  };
}

export function upsertTeamMember(team: TeamRecord, member: TeamMemberRecord): TeamRecord {
  return {
    ...team,
    members: {
      ...team.members,
      [member.name]: member,
    },
  };
}

export function removeTeamMember(team: TeamRecord, memberName: string): TeamRecord {
  const members = { ...team.members };
  delete members[memberName];
  return { ...team, members };
}

export async function loadActiveTeamState(cwd: string): Promise<ActiveTeamState> {
  try {
    const raw = await fs.promises.readFile(getActiveTeamFilePath(cwd), "utf-8");
    return sanitizeActiveTeamState(JSON.parse(raw));
  } catch {
    return {};
  }
}

export async function saveActiveTeamState(cwd: string, state: ActiveTeamState): Promise<void> {
  const filePath = getActiveTeamFilePath(cwd);
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, JSON.stringify(sanitizeActiveTeamState(state), null, 2), "utf-8");
}
