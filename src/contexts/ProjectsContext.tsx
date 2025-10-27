import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Project, ProjectsState, Trace } from "@/types/project";
import { Comment } from "@/types/comment";

const PROJECTS_STORAGE_KEY = "latex-annotate-projects";

interface ProjectsContextType {
  projects: Project[];
  activeProjectId: string | null;
  activeProject: Project | null;
  createProject: (name?: string) => string;
  switchProject: (projectId: string) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  updateProjectQuestion: (projectId: string, question: string) => void;
  updateProjectTrace: (projectId: string, traceId: string, updates: Partial<Trace>) => void;
  addCommentToTrace: (projectId: string, traceId: string, comment: Comment) => void;
  updateCommentInTrace: (projectId: string, traceId: string, commentId: string, updates: Partial<Comment>) => void;
  deleteCommentFromTrace: (projectId: string, traceId: string, commentId: string) => void;
  deleteProject: (projectId: string) => void;
  renameProject: (projectId: string, newName: string) => void;
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

export const ProjectsProvider = ({ children }: { children: ReactNode }) => {
  const [projectsState, setProjectsState] = useState<ProjectsState>({
    projects: [],
    activeProjectId: null,
  });

  // Load projects from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setProjectsState(parsed);
      } catch (error) {
        console.error("Failed to parse projects from localStorage:", error);
        initializeWithCurrentData();
      }
    } else {
      initializeWithCurrentData();
    }
  }, []);

  // Save projects to localStorage whenever state changes
  useEffect(() => {
    if (projectsState.projects.length > 0 || projectsState.activeProjectId) {
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projectsState));
    }
  }, [projectsState]);

  // Initialize with current localStorage data (migration)
  const initializeWithCurrentData = () => {
    console.log("=== Project Migration Start ===");
    
    // Get question
    const question = localStorage.getItem("question") || "";
    
    // Get trace 1 data (try multiple sources)
    const traceCode1 = localStorage.getItem("traceCode_trace1") || 
                       localStorage.getItem("latexCode") || 
                       localStorage.getItem("latexCode_response1") || "";
    const response1 = localStorage.getItem("response1") || 
                      localStorage.getItem("response_trace1") || "";
    // Check latexComments FIRST (original key), then response1, then trace1
    const comments1Data = localStorage.getItem("latexComments") ||
                          localStorage.getItem("latexComments_response1") ||
                          localStorage.getItem("latexComments_trace1") || "[]";
    let comments1: Comment[] = [];
    try {
      comments1 = JSON.parse(comments1Data);
      console.log("Parsed comments1 from storage:", comments1Data.substring(0, 100));
    } catch (e) {
      console.error("Failed to parse comments1:", e);
    }
    
    // Get trace 2 data
    const traceCode2 = localStorage.getItem("traceCode_trace2") || 
                       localStorage.getItem("latexCode_response2") || "";
    const response2 = localStorage.getItem("response2") || 
                      localStorage.getItem("response_trace2") || "";
    const comments2Data = localStorage.getItem("latexComments_response2") || "[]";
    let comments2: Comment[] = [];
    try {
      comments2 = JSON.parse(comments2Data);
    } catch (e) {
      console.error("Failed to parse comments2:", e);
    }
    
    console.log("Migrating data:");
    console.log("- Question:", question.substring(0, 50));
    console.log("- Trace 1 code length:", traceCode1.length);
    console.log("- Trace 1 comments:", comments1.length);
    console.log("- Trace 2 code length:", traceCode2.length);
    console.log("- Trace 2 comments:", comments2.length);
    
    // Create both traces with all data
    const traces: Trace[] = [
      {
        id: "trace1",
        response: response1,
        traceCode: traceCode1,
        comments: comments1,
      },
      {
        id: "trace2",
        response: response2,
        traceCode: traceCode2,
        comments: comments2,
      }
    ];

    // Create "Question 1" project with migrated data (even if empty for new users)
    const project: Project = {
      id: "project-1",
      name: "Question 1",
      question,
      taskUrl: "",
      taskId: "",
      traces,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setProjectsState({
      projects: [project],
      activeProjectId: "project-1",
    });
    
    console.log("=== Project Migration Complete: Created 'Question 1' ===");
    console.log("Final state:", { projects: [project], activeProjectId: "project-1" });
  };

  // Get active project
  const getActiveProject = (): Project | null => {
    if (!projectsState.activeProjectId) return null;
    return projectsState.projects.find(p => p.id === projectsState.activeProjectId) || null;
  };

  // Create new project
  const createProject = (name?: string): string => {
    const id = `project-${Date.now()}`;
    
    // Generate default name if none provided
    const projectName = name && name.trim() 
      ? name.trim()
      : `Question ${projectsState.projects.length + 1}`;
    
    const newProject: Project = {
      id,
      name: projectName,
      question: "",
      traces: [
        { id: "trace1", response: "", traceCode: "", comments: [] },
        { id: "trace2", response: "", traceCode: "", comments: [] }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setProjectsState(prev => ({
      projects: [newProject, ...prev.projects],
      activeProjectId: id,
    }));

    return id;
  };

  // Switch active project
  const switchProject = (projectId: string) => {
    setProjectsState(prev => ({
      ...prev,
      activeProjectId: projectId,
    }));
  };

  // Update project
  const updateProject = (projectId: string, updates: Partial<Project>) => {
    setProjectsState(prev => ({
      ...prev,
      projects: prev.projects.map(p =>
        p.id === projectId
          ? { ...p, ...updates, updatedAt: Date.now() }
          : p
      ),
    }));
  };

  // Update project question
  const updateProjectQuestion = (projectId: string, question: string) => {
    updateProject(projectId, { question });
  };

  // Update trace in project
  const updateProjectTrace = (
    projectId: string,
    traceId: string,
    updates: Partial<Trace>
  ) => {
    setProjectsState(prev => ({
      ...prev,
      projects: prev.projects.map(p =>
        p.id === projectId
          ? {
              ...p,
              traces: p.traces.map(t =>
                t.id === traceId ? { ...t, ...updates } : t
              ),
              updatedAt: Date.now(),
            }
          : p
      ),
    }));
  };

  // Add comment to trace
  const addCommentToTrace = (
    projectId: string,
    traceId: string,
    comment: Comment
  ) => {
    setProjectsState(prev => ({
      ...prev,
      projects: prev.projects.map(p =>
        p.id === projectId
          ? {
              ...p,
              traces: p.traces.map(t =>
                t.id === traceId
                  ? { ...t, comments: [...t.comments, comment] }
                  : t
              ),
              updatedAt: Date.now(),
            }
          : p
      ),
    }));
  };

  // Update comment in trace
  const updateCommentInTrace = (
    projectId: string,
    traceId: string,
    commentId: string,
    updates: Partial<Comment>
  ) => {
    setProjectsState(prev => ({
      ...prev,
      projects: prev.projects.map(p =>
        p.id === projectId
          ? {
              ...p,
              traces: p.traces.map(t =>
                t.id === traceId
                  ? {
                      ...t,
                      comments: t.comments.map(c =>
                        c.id === commentId ? { ...c, ...updates } : c
                      ),
                    }
                  : t
              ),
              updatedAt: Date.now(),
            }
          : p
      ),
    }));
  };

  // Delete comment from trace
  const deleteCommentFromTrace = (
    projectId: string,
    traceId: string,
    commentId: string
  ) => {
    setProjectsState(prev => ({
      ...prev,
      projects: prev.projects.map(p =>
        p.id === projectId
          ? {
              ...p,
              traces: p.traces.map(t =>
                t.id === traceId
                  ? {
                      ...t,
                      comments: t.comments.filter(c => c.id !== commentId),
                    }
                  : t
              ),
              updatedAt: Date.now(),
            }
          : p
      ),
    }));
  };

  // Delete project
  const deleteProject = (projectId: string) => {
    setProjectsState(prev => {
      const newProjects = prev.projects.filter(p => p.id !== projectId);
      const newActiveId = prev.activeProjectId === projectId
        ? (newProjects.length > 0 ? newProjects[0].id : null)
        : prev.activeProjectId;

      return {
        projects: newProjects,
        activeProjectId: newActiveId,
      };
    });
  };

  // Rename project
  const renameProject = (projectId: string, newName: string) => {
    updateProject(projectId, { name: newName });
  };

  const value: ProjectsContextType = {
    projects: projectsState.projects,
    activeProjectId: projectsState.activeProjectId,
    activeProject: getActiveProject(),
    createProject,
    switchProject,
    updateProject,
    updateProjectQuestion,
    updateProjectTrace,
    addCommentToTrace,
    updateCommentInTrace,
    deleteCommentFromTrace,
    deleteProject,
    renameProject,
  };

  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  );
};

export const useProjects = () => {
  const context = useContext(ProjectsContext);
  if (context === undefined) {
    throw new Error("useProjects must be used within a ProjectsProvider");
  }
  return context;
};

