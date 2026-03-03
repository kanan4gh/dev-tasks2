import type { Command } from 'commander';
import { DailyStorage } from '../../storage/DailyStorage.js';
import { DailyManager } from '../../services/DailyManager.js';
import { Renderer } from '../Renderer.js';
import { AppError } from '../../types/index.js';
import { confirm } from '../helpers.js';

function createManager(): DailyManager {
  return new DailyManager(new DailyStorage());
}

function parseDailyId(idStr: string): number {
  const id = parseInt(idStr, 10);
  if (isNaN(id) || id <= 0) {
    throw new AppError(
      '無効な ID です',
      `"${idStr}" は有効な ID ではありません`,
      '正の整数を指定してください'
    );
  }
  return id;
}

export function registerDailyCommand(program: Command): void {
  const daily = program.command('daily').description('ルーティーンを管理する');

  daily
    .command('add <title>')
    .description('ルーティーンを登録する')
    .action((title: string) => {
      const renderer = new Renderer();
      try {
        const manager = createManager();
        const routine = manager.addRoutine(title);
        renderer.renderSuccess(
          `ルーティーンを追加しました (ID: ${routine.id})`
        );
      } catch (error) {
        if (error instanceof AppError) renderer.renderError(error);
        else console.error(error);
        process.exit(1);
      }
    });

  daily
    .command('list')
    .description('今日のルーティーン一覧を表示する')
    .option('--all', '一時停止中のルーティーンも表示する')
    .action((options: { all?: boolean }) => {
      const renderer = new Renderer();
      try {
        const manager = createManager();
        const items = manager.listRoutines(options.all ?? false);
        const today = new Date().toISOString().slice(0, 10);
        renderer.renderDailyList(items, today);
      } catch (error) {
        if (error instanceof AppError) renderer.renderError(error);
        else console.error(error);
        process.exit(1);
      }
    });

  daily
    .command('done <id>')
    .description('ルーティーンを済にする')
    .action((idStr: string) => {
      const renderer = new Renderer();
      try {
        const id = parseDailyId(idStr);
        const manager = createManager();
        manager.markDone(id);
        renderer.renderSuccess(`ID: ${id} を済にしました`);
      } catch (error) {
        if (error instanceof AppError) renderer.renderError(error);
        else console.error(error);
        process.exit(1);
      }
    });

  daily
    .command('pause <id>')
    .description('ルーティーンを一時停止する')
    .action((idStr: string) => {
      const renderer = new Renderer();
      try {
        const id = parseDailyId(idStr);
        const manager = createManager();
        manager.pauseRoutine(id);
        renderer.renderSuccess(`ID: ${id} を一時停止しました`);
      } catch (error) {
        if (error instanceof AppError) renderer.renderError(error);
        else console.error(error);
        process.exit(1);
      }
    });

  daily
    .command('resume <id>')
    .description('ルーティーンの一時停止を解除する')
    .action((idStr: string) => {
      const renderer = new Renderer();
      try {
        const id = parseDailyId(idStr);
        const manager = createManager();
        manager.resumeRoutine(id);
        renderer.renderSuccess(`ID: ${id} の一時停止を解除しました`);
      } catch (error) {
        if (error instanceof AppError) renderer.renderError(error);
        else console.error(error);
        process.exit(1);
      }
    });

  daily
    .command('delete <id>')
    .description('ルーティーンを削除する')
    .action(async (idStr: string) => {
      const renderer = new Renderer();
      try {
        const id = parseDailyId(idStr);
        const ok = await confirm(`ID: ${id} を削除しますか？ (y/N): `);
        if (!ok) {
          console.log('キャンセルしました。');
          return;
        }
        const manager = createManager();
        manager.deleteRoutine(id);
        renderer.renderSuccess(`ID: ${id} を削除しました`);
      } catch (error) {
        if (error instanceof AppError) renderer.renderError(error);
        else console.error(error);
        process.exit(1);
      }
    });

  daily
    .command('stats')
    .description('直近7日の達成率を表示する')
    .action(() => {
      const renderer = new Renderer();
      try {
        const manager = createManager();
        const stats = manager.getStats();
        const dates = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d.toISOString().slice(0, 10);
        });
        renderer.renderDailyStats(stats, dates);
      } catch (error) {
        if (error instanceof AppError) renderer.renderError(error);
        else console.error(error);
        process.exit(1);
      }
    });

  daily
    .command('reset')
    .description('今日のチェック状態をリセットする')
    .action(async () => {
      const renderer = new Renderer();
      try {
        const ok = await confirm(
          '今日のチェック状態をリセットしますか？ (y/N): '
        );
        if (!ok) {
          console.log('キャンセルしました。');
          return;
        }
        const manager = createManager();
        manager.reset();
        renderer.renderSuccess('今日のチェック状態をリセットしました');
      } catch (error) {
        if (error instanceof AppError) renderer.renderError(error);
        else console.error(error);
        process.exit(1);
      }
    });
}
