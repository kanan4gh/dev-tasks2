import { createInterface } from 'readline';
import { GlobalConfigService } from '../services/GlobalConfigService.js';
import { AppError } from '../types/index.js';

/**
 * アクティブプロジェクトに基づいてタスクファイルのパスを解決する
 */
export function resolveTaskFilePath(): string {
  const configService = new GlobalConfigService();
  const activeProject = configService.getActiveProject();
  return configService.getTaskFilePath(activeProject);
}

/**
 * アクティブプロジェクト名を返す（null = inbox モード）
 */
export function getActiveProject(): string | null {
  const configService = new GlobalConfigService();
  return configService.getActiveProject();
}

/**
 * task list 表示用のヘッダー文字列を返す
 */
export function resolveListHeader(): string {
  const activeProject = getActiveProject();
  if (activeProject === null) {
    return '[Inbox]';
  }
  return `[Project: ${activeProject}]`;
}

/**
 * タスク ID 文字列を正の整数として解析する
 */
export function parseId(idStr: string): number {
  const id = parseInt(idStr, 10);
  if (isNaN(id) || id <= 0) {
    throw new AppError(
      '無効な ID です',
      `"${idStr}" は有効なタスク ID ではありません`,
      '正の整数を指定してください'
    );
  }
  return id;
}

/**
 * ユーザーへの確認プロンプトを表示する（y で true）
 */
export function confirm(prompt: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}
