import type { Command } from 'commander';
import { Renderer } from '../Renderer.js';
import { GlobalConfigService } from '../../services/GlobalConfigService.js';
import { AppError } from '../../types/index.js';
import { confirm } from '../helpers.js';
import { ProjectListUseCase } from '../../usecases/ProjectListUseCase.js';

export function registerProjectCommand(program: Command): void {
  const projectCmd = program
    .command('project')
    .description('プロジェクトを管理する');

  // task project create <name>
  projectCmd
    .command('create <name>')
    .description('新しいプロジェクトをグローバル設定に登録する')
    .action((name: string) => {
      const renderer = new Renderer();
      try {
        validateProjectName(name);
        const configService = new GlobalConfigService();
        configService.createProject(name);
        renderer.renderSuccess(`プロジェクト "${name}" を作成しました`);
        console.log(`  切り替えるには: task project use ${name}`);
      } catch (error) {
        if (error instanceof AppError) {
          renderer.renderError(error);
        } else {
          console.error(error);
        }
        process.exit(1);
      }
    });

  // task project list
  projectCmd
    .command('list')
    .description('登録済みプロジェクト一覧を表示する')
    .action(() => {
      const renderer = new Renderer();
      try {
        const { projects, activeProject, taskCounts, inboxCount } =
          new ProjectListUseCase().execute();
        renderer.renderProjectList(
          projects,
          activeProject,
          taskCounts,
          inboxCount
        );
      } catch (error) {
        if (error instanceof AppError) {
          renderer.renderError(error);
        } else {
          console.error(error);
        }
        process.exit(1);
      }
    });

  // task project use <name>
  projectCmd
    .command('use <name>')
    .description('アクティブプロジェクトを切り替える')
    .action((name: string) => {
      const renderer = new Renderer();
      try {
        const configService = new GlobalConfigService();

        if (!configService.projectExists(name)) {
          throw new AppError(
            `プロジェクト "${name}" が見つかりません`,
            '指定されたプロジェクトは存在しません',
            'task project create でプロジェクトを作成してください'
          );
        }

        configService.setActiveProject(name);
        renderer.renderSuccess(
          `アクティブプロジェクトを "${name}" に切り替えました`
        );
      } catch (error) {
        if (error instanceof AppError) {
          renderer.renderError(error);
        } else {
          console.error(error);
        }
        process.exit(1);
      }
    });

  // task project rename <old-name> <new-name>
  projectCmd
    .command('rename <oldName> <newName>')
    .description('プロジェクト名を変更する')
    .action((oldName: string, newName: string) => {
      const renderer = new Renderer();
      try {
        validateProjectName(newName);
        const configService = new GlobalConfigService();
        configService.renameProject(oldName, newName);
        renderer.renderSuccess(
          `プロジェクト "${oldName}" を "${newName}" に名称変更しました`
        );
      } catch (error) {
        if (error instanceof AppError) {
          renderer.renderError(error);
        } else {
          console.error(error);
        }
        process.exit(1);
      }
    });

  // task project remove <name>
  projectCmd
    .command('remove <name>')
    .description(
      'プロジェクトをグローバル設定から削除する（タスクデータは保持）'
    )
    .action(async (name: string) => {
      const renderer = new Renderer();
      try {
        const configService = new GlobalConfigService();

        if (!configService.projectExists(name)) {
          throw new AppError(
            `プロジェクト "${name}" が見つかりません`,
            '指定されたプロジェクトは存在しません',
            'task project list で登録済みプロジェクトを確認してください'
          );
        }

        const confirmed = await confirm(
          `プロジェクト "${name}" をリストから削除しますか？（タスクデータは ~/.task/projects/${name}/ に保持されます） [y/N] `
        );

        if (!confirmed) {
          console.log('削除をキャンセルしました。');
          return;
        }

        const wasActive = configService.getActiveProject() === name;
        // プロジェクトをリストから削除（ディレクトリ＝タスクデータは保持）
        configService.removeProject(name);

        if (wasActive) {
          renderer.renderInfo(
            'アクティブプロジェクトを解除し、Inbox モードに切り替えました。'
          );
        }

        renderer.renderSuccess(
          `プロジェクト "${name}" をリストから削除しました（データは ~/.task/projects/${name}/ に保持されています）`
        );
      } catch (error) {
        if (error instanceof AppError) {
          renderer.renderError(error);
        } else {
          console.error(error);
        }
        process.exit(1);
      }
    });
}

function validateProjectName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new AppError(
      'プロジェクト名は必須です',
      '名前が空です',
      '1文字以上の名前を指定してください'
    );
  }
  if (name === 'inbox') {
    throw new AppError(
      '"inbox" はシステム予約名です',
      'inbox は Inbox モードのために予約されています',
      '別のプロジェクト名を指定してください'
    );
  }
}
