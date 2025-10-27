import { LatexEditor } from "@/components/LatexEditor";
import { ProjectSidebar } from "@/components/ProjectSidebar";
import { useProjects } from "@/hooks/use-projects";

const Index = () => {
  const { activeProjectId } = useProjects();

  return (
    <div className="flex h-screen">
      <ProjectSidebar />
      <div className="flex-1 overflow-y-auto">
        <LatexEditor key={activeProjectId || 'no-project'} />
      </div>
    </div>
  );
};

export default Index;
