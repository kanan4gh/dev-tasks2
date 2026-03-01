export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'archived';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  branch: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string;
}

export interface TaskFilter {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority;
}

export interface ProjectEntry {
  name: string;
  id: number;
}

export interface GlobalConfig {
  activeProject: string | null;
  projects: ProjectEntry[];
  lastProjectId: number;
}

export interface IStorage {
  load(): Task[];
  save(tasks: Task[]): void;
  ensureDirectory(): void;
}

export class AppError extends Error {
  constructor(
    message: string,
    public readonly cause: string,
    public readonly remedy: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}
