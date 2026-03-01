import { existsSync, mkdirSync, renameSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { GlobalConfigStorage } from '../storage/GlobalConfigStorage.js';
import { AppError } from '../types/index.js';
import type { GlobalConfig, ProjectEntry } from '../types/index.js';

export class GlobalConfigService {
  private readonly storage: GlobalConfigStorage;
  private readonly taskDir: string;

  constructor(storage?: GlobalConfigStorage, taskDir?: string) {
    this.taskDir = taskDir ?? join(homedir(), '.task');
    this.storage = storage ?? new GlobalConfigStorage(this.taskDir);
  }

  getActiveProject(): string | null {
    const config = this.storage.load();
    return config.activeProject;
  }

  setActiveProject(name: string | null): void {
    const config = this.storage.load();
    config.activeProject = name;
    this.storage.save(config);
  }

  getAll(): GlobalConfig {
    return this.storage.load();
  }

  projectExists(name: string): boolean {
    const config = this.storage.load();
    return config.projects.some((p) => p.name === name);
  }

  listProjects(): string[] {
    const config = this.storage.load();
    return config.projects.map((p) => p.name);
  }

  listProjectEntries(): ProjectEntry[] {
    const config = this.storage.load();
    return [...config.projects];
  }

  getProjectById(id: number): ProjectEntry | undefined {
    const config = this.storage.load();
    return config.projects.find((p) => p.id === id);
  }

  getProjectByName(name: string): ProjectEntry | undefined {
    const config = this.storage.load();
    return config.projects.find((p) => p.name === name);
  }

  getActiveProjectEntry(): { name: string | null; id: number } {
    const config = this.storage.load();
    if (config.activeProject === null) {
      return { name: null, id: 0 };
    }
    const entry = config.projects.find((p) => p.name === config.activeProject);
    return entry ?? { name: config.activeProject, id: 0 };
  }

  createProject(name: string): void {
    const config = this.storage.load();
    if (config.projects.some((p) => p.name === name)) {
      throw new AppError(
        `プロジェクト "${name}" はすでに存在します`,
        'プロジェクト名が重複しています',
        '別の名前を指定するか、task project list で既存プロジェクトを確認してください'
      );
    }
    const projectDir = join(this.taskDir, 'projects', name);
    if (!existsSync(projectDir)) {
      mkdirSync(projectDir, { recursive: true });
    }
    config.lastProjectId += 1;
    config.projects.push({ name, id: config.lastProjectId });
    this.storage.save(config);
  }

  renameProject(oldName: string, newName: string): void {
    const config = this.storage.load();

    const index = config.projects.findIndex((p) => p.name === oldName);
    if (index === -1) {
      throw new AppError(
        `プロジェクト "${oldName}" が見つかりません`,
        '指定されたプロジェクトは登録されていません',
        'task project list で登録済みプロジェクトを確認してください'
      );
    }
    if (config.projects.some((p) => p.name === newName)) {
      throw new AppError(
        `プロジェクト "${newName}" はすでに存在します`,
        'プロジェクト名が重複しています',
        '別の名前を指定してください'
      );
    }
    if (newName === 'inbox') {
      throw new AppError(
        '"inbox" はシステム予約名です',
        'inbox はシステムが使用する名前です',
        '別の名前を指定してください'
      );
    }
    if (!newName || newName.trim().length === 0) {
      throw new AppError(
        'プロジェクト名は空にできません',
        '空の名前が指定されました',
        '1文字以上の名前を指定してください'
      );
    }

    config.projects[index] = { ...config.projects[index], name: newName };
    if (config.activeProject === oldName) {
      config.activeProject = newName;
    }

    const oldDir = join(this.taskDir, 'projects', oldName);
    const newDir = join(this.taskDir, 'projects', newName);
    if (existsSync(oldDir)) {
      renameSync(oldDir, newDir);
    }

    this.storage.save(config);
  }

  removeProject(name: string): void {
    const config = this.storage.load();
    const index = config.projects.findIndex((p) => p.name === name);
    if (index === -1) {
      throw new AppError(
        `プロジェクト "${name}" が見つかりません`,
        '指定されたプロジェクトは登録されていません',
        'task project list で登録済みプロジェクトを確認してください'
      );
    }
    config.projects.splice(index, 1);
    if (config.activeProject === name) {
      config.activeProject = null;
    }
    this.storage.save(config);
  }

  getTaskFilePath(projectName: string | null): string {
    if (projectName === null) {
      return join(this.taskDir, 'inbox', 'tasks.json');
    }
    return join(this.taskDir, 'projects', projectName, 'tasks.json');
  }

  getInboxTaskFilePath(): string {
    return join(this.taskDir, 'inbox', 'tasks.json');
  }
}
