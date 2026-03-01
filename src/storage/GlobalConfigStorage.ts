import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  chmodSync,
} from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { GlobalConfig, ProjectEntry } from '../types/index.js';

const TASK_DIR = join(homedir(), '.task');
const CONFIG_PATH = join(TASK_DIR, 'config.json');

export class GlobalConfigStorage {
  private readonly configPath: string;
  private readonly taskDir: string;

  constructor(taskDir: string = TASK_DIR) {
    this.taskDir = taskDir;
    this.configPath = join(taskDir, 'config.json');
  }

  ensureDirectory(): void {
    if (!existsSync(this.taskDir)) {
      mkdirSync(this.taskDir, { recursive: true });
      chmodSync(this.taskDir, 0o700);
    }
  }

  load(): GlobalConfig {
    this.ensureDirectory();
    if (!existsSync(this.configPath)) {
      return { activeProject: null, projects: [], lastProjectId: 0 };
    }
    try {
      const raw = readFileSync(this.configPath, 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;

      let projects: ProjectEntry[];
      let lastProjectId: number;

      if (
        Array.isArray(parsed.projects) &&
        parsed.projects.length > 0 &&
        typeof parsed.projects[0] === 'string'
      ) {
        // 旧フォーマット (string[]) → 新フォーマット (ProjectEntry[]) への自動マイグレーション
        projects = (parsed.projects as string[]).map((name, i) => ({
          name,
          id: i + 1,
        }));
        lastProjectId = projects.length;
      } else {
        projects = Array.isArray(parsed.projects)
          ? (parsed.projects as ProjectEntry[])
          : [];
        lastProjectId =
          typeof parsed.lastProjectId === 'number' ? parsed.lastProjectId : 0;
      }

      return {
        activeProject:
          typeof parsed.activeProject === 'string'
            ? parsed.activeProject
            : null,
        projects,
        lastProjectId,
      };
    } catch {
      return { activeProject: null, projects: [], lastProjectId: 0 };
    }
  }

  save(config: GlobalConfig): void {
    this.ensureDirectory();
    writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
  }
}

export { CONFIG_PATH };
