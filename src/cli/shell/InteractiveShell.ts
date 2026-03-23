import { createInterface } from 'node:readline';
import { Command } from 'commander';
import { GlobalConfigService } from '../../services/GlobalConfigService.js';
import { registerAddCommand } from '../commands/add.js';
import { registerListCommand } from '../commands/list.js';
import { registerShowCommand } from '../commands/show.js';
import { registerStartCommand } from '../commands/start.js';
import { registerDoneCommand } from '../commands/done.js';
import { registerDeleteCommand } from '../commands/delete.js';
import { registerArchiveCommand } from '../commands/archive.js';
import { registerProjectCommand } from '../commands/project.js';
import { registerMoveCommand } from '../commands/move.js';
import { registerInboxCommand } from '../commands/inbox.js';
import { registerDailyCommand } from '../commands/daily.js';
import { registerTimeCommand } from '../commands/time.js';
import { registerOnboardCommand } from '../commands/onboard.js';
import { registerScheduleCommand } from '../commands/schedule.js';
import { registerEditCommand } from '../commands/edit.js';

class ShellExitError extends Error {
  constructor(public readonly code: number) {
    super(`process.exit(${code}) called`);
    this.name = 'ShellExitError';
  }
}

/**
 * Shell-like argument parser that handles single and double quoted strings.
 * Returns null if the input contains unclosed quotes.
 */
export function parseInput(line: string): string[] | null {
  const args: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (const char of line) {
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    } else if (/\s/.test(char) && !inSingleQuote && !inDoubleQuote) {
      if (current.length > 0) {
        args.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (inSingleQuote || inDoubleQuote) {
    return null;
  }

  if (current.length > 0) {
    args.push(current);
  }
  return args;
}

function createShellProgram(): Command {
  const program = new Command();
  program.exitOverride();
  program.allowUnknownOption(false);
  program.name('task');

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
  registerScheduleCommand(program);
  registerEditCommand(program);

  return program;
}

/**
 * Returns a readline completer function for the given Commander program.
 */
export function buildCompleter(
  program: Command
): (line: string) => [string[], string] {
  const subcommands = program.commands.map((c) => c.name());

  return function completer(line: string): [string[], string] {
    const parts = line.trimStart().split(/\s+/).filter(Boolean);
    const endsWithSpace = line.endsWith(' ');

    // Complete subcommand names
    if (parts.length === 0 || (parts.length === 1 && !endsWithSpace)) {
      const partial = parts[0] ?? '';
      const completions = subcommands.filter((s) => s.startsWith(partial));
      return [completions, partial];
    }

    // Complete option flags for the current subcommand
    const subcmdName = parts[0];
    const subcmd = program.commands.find((c) => c.name() === subcmdName);
    if (subcmd) {
      const lastPart = endsWithSpace ? '' : parts[parts.length - 1];
      if (lastPart.startsWith('-')) {
        const flags = subcmd.options.flatMap((o) =>
          [o.short, o.long].filter((s): s is string => Boolean(s))
        );
        const completions = flags.filter((f) => f.startsWith(lastPart));
        return [completions, lastPart];
      }
    }

    return [[], line];
  };
}

/**
 * Returns the shell prompt string reflecting the current active project.
 */
export function getPrompt(configService: GlobalConfigService): string {
  const project = configService.getActiveProject();
  const label = project ?? 'inbox';
  return `task [${label}]> `;
}

export class InteractiveShell {
  private readonly configService: GlobalConfigService;

  constructor(configService?: GlobalConfigService) {
    this.configService = configService ?? new GlobalConfigService();
  }

  async run(): Promise<void> {
    const templateProgram = createShellProgram();

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      completer: buildCompleter(templateProgram),
    });

    rl.setPrompt(getPrompt(this.configService));
    rl.prompt();

    return new Promise<void>((resolve) => {
      rl.on('line', async (line: string) => {
        const trimmed = line.trim();

        if (trimmed === '') {
          rl.setPrompt(getPrompt(this.configService));
          rl.prompt();
          return;
        }

        if (trimmed === 'exit' || trimmed === 'quit') {
          rl.close();
          return;
        }

        const args = parseInput(trimmed);
        if (args === null) {
          console.error('エラー: クォートが閉じられていません');
        } else if (args.length > 0) {
          await this.runCommand(args);
        }

        rl.setPrompt(getPrompt(this.configService));
        rl.prompt();
      });

      rl.on('close', () => {
        process.stdout.write('\n');
        resolve();
      });

      rl.on('SIGINT', () => {
        rl.close();
      });
    });
  }

  private async runCommand(args: string[]): Promise<void> {
    const program = createShellProgram();
    const originalExit = process.exit;

    (process as NodeJS.Process).exit = ((code?: number) => {
      throw new ShellExitError(code ?? 0);
    }) as typeof process.exit;

    try {
      await program.parseAsync(['node', 'task', ...args]);
    } catch (err) {
      if (err instanceof ShellExitError) {
        // Command called process.exit — suppress in shell mode
      } else if (
        err instanceof Error &&
        'code' in err &&
        typeof (err as { code: unknown }).code === 'string' &&
        (err as { code: string }).code.startsWith('commander.')
      ) {
        // Commander parse error — already printed to stderr by Commander
      } else if (err instanceof Error) {
        console.error(err.message);
      }
    } finally {
      (process as NodeJS.Process).exit = originalExit;
    }
  }
}
