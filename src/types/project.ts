import { Comment } from "./comment";

export interface Trace {
  id: string;
  response: string;
  traceCode: string;
  comments: Comment[];
}

export interface Project {
  id: string;
  name: string;
  question: string;
  taskUrl?: string;
  taskId?: string;
  traces: Trace[];
  createdAt: number;
  updatedAt: number;
}

export interface ProjectsState {
  projects: Project[];
  activeProjectId: string | null;
}
