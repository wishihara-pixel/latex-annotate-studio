import { useProjects } from "@/hooks/use-projects";

const Debug = () => {
  const projectsData = useProjects();
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Info</h1>
      
      <div className="space-y-4">
        <div className="border p-4 rounded">
          <h2 className="font-semibold mb-2">Projects State</h2>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify(projectsData, null, 2)}
          </pre>
        </div>
        
        <div className="border p-4 rounded">
          <h2 className="font-semibold mb-2">LocalStorage</h2>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-96">
            {JSON.stringify({
              'latex-annotate-projects': localStorage.getItem('latex-annotate-projects'),
              'question': localStorage.getItem('question'),
              'latexCode_response1': localStorage.getItem('latexCode_response1'),
              'latexCode_response2': localStorage.getItem('latexCode_response2'),
            }, null, 2)}
          </pre>
        </div>
        
        <button 
          className="px-4 py-2 bg-red-500 text-white rounded"
          onClick={() => {
            localStorage.clear();
            window.location.reload();
          }}
        >
          Clear LocalStorage & Reload
        </button>
      </div>
    </div>
  );
};

export default Debug;

