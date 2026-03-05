#!/usr/bin/env node
import { Command } from 'commander';
import { registerAddCommand } from './commands/add.js';
import { registerListCommand } from './commands/list.js';
import { registerShowCommand } from './commands/show.js';
import { registerStartCommand } from './commands/start.js';
import { registerDoneCommand } from './commands/done.js';
import { registerDeleteCommand } from './commands/delete.js';
import { registerArchiveCommand } from './commands/archive.js';
import { registerProjectCommand } from './commands/project.js';
import { registerMoveCommand } from './commands/move.js';
import { registerInboxCommand } from './commands/inbox.js';
import { registerDailyCommand } from './commands/daily.js';
import { registerTimeCommand } from './commands/time.js';
import { registerOnboardCommand } from './commands/onboard.js';
import { checkUpdate } from '../utils/checkUpdate.js';

const VERSION = '0.6.1';

async function main(): Promise<void> {
  // Commander.js の .version() は同期のみ対応のため、--version を手動ハンドルする
  if (process.argv.includes('--version') || process.argv.includes('-V')) {
    console.log(VERSION);
    const notice = await checkUpdate(VERSION);
    if (notice) console.log(notice);
    process.exit(0);
    return;
  }

  const program = new Command();

  program
    .name('task')
    .description('ターミナルで完結する、開発者向け GTD タスク管理ツール')
    .version(VERSION);

  registerAddCommand(program);
  registerListCommand(program);
  registerShowCommand(program);
  registerStartCommand(program);
  registerDoneCommand(program);
  registerDeleteCommand(program);
  registerArchiveCommand(program);
  registerProjectCommand(program);
  registerMoveCommand(program);
  registerInboxCommand(program);
  registerDailyCommand(program);
  registerTimeCommand(program);
  registerOnboardCommand(program);

  program.parse(process.argv);
}

main();
