import { existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { GlobalConfigStorage } from '../storage/GlobalConfigStorage.js';
import { AppError } from '../types/index.js';
import type { GlobalConfig } from '../types/index.js';

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
    return config.projects.includes(name);
  }

  listProjects(): string[] {
    const config = this.storage.load();
    return [...config.projects];
  }

  createProject(name: string): void {
    const config = this.storage.load();
    if (config.projects.includes(name)) {
      throw new AppError(
        `プロジェクト "${name}" はすでに存在します`,
        'プロジェクト名が重複しています',
        '別の名前を指定するか、task project list で既存プロジェクトを確認してください'
      );
    }
    // プロジェクトディレクトリを作成
    const projectDir = join(this.taskDir, 'projects', name);
    if (!existsSync(projectDir)) {
      mkdirSync(projectDir, { recursive: true });
    }
    config.projects.push(name);
    this.storage.save(config);
  }

  removeProject(name: string): void {
    const config = this.storage.load();
    const index = config.projects.indexOf(name);
    if (index === -1) {
      throw new AppError(
        `プロジェクト "${name}" が見つかりません`,
        '指定されたプロジェクトは登録されていません',
        'task project list で登録済みプロジェクトを確認してください'
      );
    }
    config.projects.splice(index, 1);
    // アクティブプロジェクトが削除対象の場合は null に戻す
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
