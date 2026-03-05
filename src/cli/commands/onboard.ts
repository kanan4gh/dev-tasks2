import type { Command } from 'commander';
import { Renderer } from '../Renderer.js';
import { OnboardUseCase } from '../../usecases/OnboardUseCase.js';
import { AppError } from '../../types/index.js';

export function registerOnboardCommand(program: Command): void {
  program
    .command('onboard')
    .description('今の状況を概観し、今とりかかるべきタスクを提案する')
    .action(() => {
      const renderer = new Renderer();
      try {
        const useCase = new OnboardUseCase();
        const data = useCase.execute();
        renderer.renderOnboard(data);
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
