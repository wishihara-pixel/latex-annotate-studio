import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useProjects } from "@/hooks/use-projects";
import { Plus, MoreVertical, Edit, Trash2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export const ProjectSidebar = () => {
  const {
    projects,
    activeProjectId,
    createProject,
    switchProject,
    deleteProject,
    renameProject,
  } = useProjects();

  console.log("ProjectSidebar render - projects:", projects);
  console.log("ProjectSidebar render - activeProjectId:", activeProjectId);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const handleCreateProject = () => {
    createProject(newProjectName.trim() || undefined);
    setNewProjectName("");
    setIsCreateDialogOpen(false);
  };

  const handleRenameProject = () => {
    if (renamingProjectId && renameValue.trim()) {
      renameProject(renamingProjectId, renameValue.trim());
      setRenamingProjectId(null);
      setRenameValue("");
      setIsRenameDialogOpen(false);
    }
  };

  const openRenameDialog = (projectId: string, currentName: string) => {
    setRenamingProjectId(projectId);
    setRenameValue(currentName);
    setIsRenameDialogOpen(true);
  };

  const handleDeleteProject = (projectId: string) => {
    if (projects.length > 1) {
      deleteProject(projectId);
    }
  };

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Create a new LaTeX annotation project.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Question 2"
                    className="col-span-3"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCreateProject();
                      }
                    }}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateProject}>Create Project</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Projects List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {projects.map((project) => (
            <div
              key={project.id}
              className={cn(
                "group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all hover:bg-gray-100",
                activeProjectId === project.id && "bg-blue-50 border border-blue-200"
              )}
              onClick={() => switchProject(project.id)}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {project.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      openRenameDialog(project.id, project.name);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  {projects.length > 1 && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project.id);
                      }}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription>
              Enter a new name for your project.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rename" className="text-right">
                Name
              </Label>
              <Input
                id="rename"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="col-span-3"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRenameProject();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleRenameProject}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
