import type { Command } from 'commander';
import { AppError } from '../../types/index.js';

export function parseDuration(input: string): number {
  const trimmed = input.trim();

  const hourMatch = trimmed.match(/^(\d+)h$/i);
  if (hourMatch) {
    const value = parseInt(hourMatch[1], 10);
    if (value <= 0) {
      throw new AppError(
        '無効な時間です',
        `"${input}" は 0 以下の値です`,
        '正の値を指定してください（例: 20min、1h、30s）'
      );
    }
    return value * 60 * 60 * 1000;
  }

  const minMatch = trimmed.match(/^(\d+)(?:min|m)$/i);
  if (minMatch) {
    const value = parseInt(minMatch[1], 10);
    if (value <= 0) {
      throw new AppError(
        '無効な時間です',
        `"${input}" は 0 以下の値です`,
        '正の値を指定してください（例: 20min、1h、30s）'
      );
    }
    return value * 60 * 1000;
  }

  const secMatch = trimmed.match(/^(\d+)s$/i);
  if (secMatch) {
    const value = parseInt(secMatch[1], 10);
    if (value <= 0) {
      throw new AppError(
        '無効な時間です',
        `"${input}" は 0 以下の値です`,
        '正の値を指定してください（例: 20min、1h、30s）'
      );
    }
    return value * 1000;
  }

  const numMatch = trimmed.match(/^(\d+)$/);
  if (numMatch) {
    const value = parseInt(numMatch[1], 10);
    if (value <= 0) {
      throw new AppError(
        '無効な時間です',
        `"${input}" は 0 以下の値です`,
        '正の値を指定してください（例: 20min、1h、30s）'
      );
    }
    return value * 60 * 1000;
  }

  throw new AppError(
    '無効な時間フォーマットです',
    `"${input}" は認識できない形式です`,
    '20min、1h、30s などの形式で指定してください（単位なしの数値は分として解釈されます）'
  );
}

function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export async function runTimer(totalMs: number): Promise<void> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let finished = false;

    const cleanup = (elapsed: number) => {
      if (finished) return;
      finished = true;
      clearInterval(timer);
      process.stdout.write('\n');
      const elapsedFormatted = formatTime(elapsed);
      console.log(`⏱  キャンセルしました（経過: ${elapsedFormatted}）`);
      process.exit(0);
    };

    process.on('SIGINT', () => {
      const elapsed = Date.now() - startTime;
      cleanup(elapsed);
    });

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = totalMs - elapsed;

      if (remaining <= 0) {
        clearInterval(timer);
        finished = true;
        process.stdout.write('\r');
        process.stdout.write(`⏱  完了！ (${formatTime(totalMs)})          \n`);
        process.stdout.write('\u0007');
        resolve();
        return;
      }

      process.stdout.write(`\r⏱  残り ${formatTime(remaining)} ...`);
    }, 1000);

    process.stdout.write(`⏱  残り ${formatTime(totalMs)} ...`);
  });
}

export function registerTimeCommand(program: Command): void {
  const time = program.command('time').description('タイマーを管理する');

  time
    .command('start <duration>')
    .description('カウントダウンタイマーを開始する（例: 20min、1h、30s、20）')
    .action(async (durationStr: string) => {
      try {
        const totalMs = parseDuration(durationStr);
        const label = formatTime(totalMs);
        console.log(`タイマーを開始しました: ${label}`);
        await runTimer(totalMs);
      } catch (error) {
        if (error instanceof AppError) {
          console.error(`[Error] ${error.message}`);
          console.error(`  原因: ${error.cause}`);
          console.error(`  対処: ${error.remedy}`);
        } else {
          console.error(error);
        }
        process.exit(1);
      }
    });
}
