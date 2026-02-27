import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  renameSync,
  unlinkSync,
} from 'fs';
import { dirname } from 'path';
import { AppError } from '../types/index.js';
import type { IStorage, Task } from '../types/index.js';

export class FileStorage implements IStorage {
  private readonly filePath: string;
  private readonly backupPath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.backupPath = `${filePath}.bak`;
  }

  ensureDirectory(): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  load(): Task[] {
    this.ensureDirectory();
    if (!existsSync(this.filePath)) {
      return [];
    }
    try {
      const raw = readFileSync(this.filePath, 'utf-8');
      return JSON.parse(raw) as Task[];
    } catch {
      return [];
    }
  }

  save(tasks: Task[]): void {
    this.ensureDirectory();

    // バックアップを作成してから書き込む（失敗時はバックアップから復元）
    const hasExisting = existsSync(this.filePath);
    if (hasExisting) {
      copyFileSync(this.filePath, this.backupPath);
    }

    try {
      const tmpPath = `${this.filePath}.tmp`;
      writeFileSync(tmpPath, JSON.stringify(tasks, null, 2), 'utf-8');
      renameSync(tmpPath, this.filePath);

      if (hasExisting && existsSync(this.backupPath)) {
        unlinkSync(this.backupPath);
      }
    } catch (error) {
      // 書き込み失敗時はバックアップから復元
      if (hasExisting && existsSync(this.backupPath)) {
        renameSync(this.backupPath, this.filePath);
      }
      throw new AppError(
        'タスクデータの保存に失敗しました',
        error instanceof Error ? error.message : String(error),
        'ディスク容量を確認してください'
      );
    }
  }
}
