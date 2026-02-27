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

const program = new Command();

program
  .name('task')
  .description('ターミナルで完結する、開発者向け GTD タスク管理ツール')
  .version('0.2.0');

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

program.parse(process.argv);
