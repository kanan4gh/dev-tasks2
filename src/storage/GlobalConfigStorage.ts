import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  chmodSync,
} from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { GlobalConfig } from '../types/index.js';

const TASK_DIR = join(homedir(), '.task');
const CONFIG_PATH = join(TASK_DIR, 'config.json');

const DEFAULT_CONFIG: GlobalConfig = {
  activeProject: null,
  projects: [],
};

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
      return { ...DEFAULT_CONFIG };
    }
    try {
      const raw = readFileSync(this.configPath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<GlobalConfig>;
      return {
        activeProject: parsed.activeProject ?? null,
        projects: Array.isArray(parsed.projects)
          ? (parsed.projects as string[])
          : [],
      };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  save(config: GlobalConfig): void {
    this.ensureDirectory();
    writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
  }
}

export { CONFIG_PATH };
