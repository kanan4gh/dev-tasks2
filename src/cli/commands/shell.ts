import type { Command } from 'commander';
import { InteractiveShell } from '../shell/InteractiveShell.js';

export function registerShellCommand(program: Command): void {
  program
    .command('shell')
    .description(
      'インタラクティブシェルを起動する（task プレフィックスなしでサブコマンドを実行）'
    )
    .action(async () => {
      const shell = new InteractiveShell();
      await shell.run();
    });
}
