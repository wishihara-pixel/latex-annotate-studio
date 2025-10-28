import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { renderLatex } from "@/lib/latex-renderer";
import { CommentBubble } from "./CommentBubble";
import { AddAnnotationButton } from "./AddAnnotationButton";
import { CommentsSidebar } from "./CommentsSidebar";
import { Comment } from "@/types/comment";
import { downloadSuperAnnotateJSON, downloadRawAnnotations } from "@/lib/export-superannotate";
import { Download } from "lucide-react";
import { useProjects } from "@/hooks/use-projects";
import "katex/dist/katex.min.css";

export const LatexEditor = () => {
  const {
    activeProject,
    activeProjectId,
    updateProjectQuestion,
    updateProjectTrace,
    addCommentToTrace,
    updateCommentInTrace,
    deleteCommentFromTrace,
  } = useProjects();

  // Rendered content state
  const [renderedQuestion, setRenderedQuestion] = useState("");
  const [renderedResponse1, setRenderedResponse1] = useState("");
  const [renderedResponse2, setRenderedResponse2] = useState("");
  const [renderedTrace1, setRenderedTrace1] = useState("");
  const [renderedTrace2, setRenderedTrace2] = useState("");
  
  // Active trace tab (1 or 2)
  const [activeTrace, setActiveTrace] = useState<"1" | "2">("1");
  
  // Shared UI state
  const [showAddButton, setShowAddButton] = useState(false);
  const [showAnnotationForm, setShowAnnotationForm] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });
  const [selectedRange, setSelectedRange] = useState<Range | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [isSelectingText, setIsSelectingText] = useState(false);
  const [showQuestionEditor, setShowQuestionEditor] = useState(false);
  const [showResponseEditor1, setShowResponseEditor1] = useState(false);
  const [showResponseEditor2, setShowResponseEditor2] = useState(false);
  const [showTraceEditor1, setShowTraceEditor1] = useState(true);
  const [showTraceEditor2, setShowTraceEditor2] = useState(true);
  
  const previewRef1 = useRef<HTMLDivElement>(null);
  const previewRef2 = useRef<HTMLDivElement>(null);

  // Early return if no active project
  if (!activeProject || !activeProjectId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-600 mb-2">No Project Selected</h2>
          <p className="text-gray-500">Create a new project or select an existing one to get started.</p>
        </div>
      </div>
    );
  }
  
  // Get current trace data from active project
  const trace1 = activeProject.traces.find(t => t.id === "trace1") || {
    id: "trace1",
    response: "",
    traceCode: "",
    comments: []
  };
  
  const trace2 = activeProject.traces.find(t => t.id === "trace2") || {
    id: "trace2", 
    response: "",
    traceCode: "",
    comments: []
  };

  // Get current active trace data
  const currentTrace = activeTrace === "1" ? trace1 : trace2;
  const previewRef = activeTrace === "1" ? previewRef1 : previewRef2;

  // Update project question
  const handleQuestionChange = (newQuestion: string) => {
    updateProjectQuestion(activeProjectId, newQuestion);
  };

  // Update trace response
  const handleResponseChange = (traceId: string, newResponse: string) => {
    updateProjectTrace(activeProjectId, traceId, { response: newResponse });
  };

  // Update trace code
  const handleTraceCodeChange = (traceId: string, newTraceCode: string) => {
    updateProjectTrace(activeProjectId, traceId, { traceCode: newTraceCode });
  };

  // Render LaTeX content when project data changes
  useEffect(() => {
    if (activeProject?.question) {
      const html = renderLatex(activeProject.question, []);
      setRenderedQuestion(html);
    }
  }, [activeProject?.question]);

  useEffect(() => {
    if (trace1) {
      const html = renderLatex(trace1.response, []);
      setRenderedResponse1(html);
    }
  }, [trace1?.response]);

  useEffect(() => {
    if (trace2) {
      const html = renderLatex(trace2.response, []);
      setRenderedResponse2(html);
    }
  }, [trace2?.response]);

  useEffect(() => {
    if (trace1) {
      const html = renderLatex(trace1.traceCode, trace1.comments);
      setRenderedTrace1(html);
    }
  }, [trace1?.traceCode, trace1?.comments]);

  useEffect(() => {
    if (trace2) {
      const html = renderLatex(trace2.traceCode, trace2.comments);
      setRenderedTrace2(html);
    }
  }, [trace2?.traceCode, trace2?.comments]);

  useEffect(() => {
    if (previewRef.current) {
      attachHighlightListeners();
    }
  }, [activeTrace === "1" ? renderedTrace1 : renderedTrace2]);

  const saveComments = (newComments: Comment[]) => {
    console.log("=== saveComments called for Trace", activeTrace, "===");
    console.log("Saving comments:", newComments);
    
    const traceId = activeTrace === "1" ? "trace1" : "trace2";
    updateProjectTrace(activeProjectId, traceId, { comments: newComments });
  };

  const getSourcePositionFromSelection = (range: Range): { start: number; end: number } | null => {
    // Get the plain text content from the selection
    const selectedText = range.toString().trim();
    
    if (!selectedText) return null;
    
    console.log('Mapping selection to source. Selected text:', selectedText.substring(0, 100));
    
    // Find the position in the source LaTeX
    const sourceText = currentTrace.traceCode;
    const index = sourceText.indexOf(selectedText);
    
    if (index === -1) {
      console.warn('Could not find selected text in source');
      return null;
    }
    
    return {
      start: index,
      end: index + selectedText.length
    };
  };

  const handleSelectionComplete = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString().trim();
    
    if (!selectedText || selectedText.length < 2) {
      hideAddButton();
      return;
    }

    console.log('Selection complete:', selectedText);
    
    // Get source position
    const sourcePosition = getSourcePositionFromSelection(range);
    if (!sourcePosition) {
      hideAddButton();
      return;
    }

    setSelectedRange(range);
    setSelectedText(selectedText);
    
    // Position the button
    const rect = range.getBoundingClientRect();
    const containerRect = previewRef.current?.getBoundingClientRect();
    
    if (containerRect) {
      setButtonPosition({
        top: rect.bottom - containerRect.top + 5,
        left: rect.left - containerRect.left + (rect.width / 2)
      });
      setShowAddButton(true);
    }
  };

  const hideAddButton = () => {
    setShowAddButton(false);
    setSelectedRange(null);
    setSelectedText("");
  };

  const handleAddAnnotation = () => {
    if (!selectedRange || !selectedText) return;

    const sourcePosition = getSourcePositionFromSelection(selectedRange);
    if (!sourcePosition) return;

    setShowAnnotationForm(true);
    setShowAddButton(false);
  };

  const handleAnnotationSubmit = (type: string, annotationText: string, data: string[]) => {
    if (!selectedRange || !selectedText || !activeProjectId) return;

    const sourcePosition = getSourcePositionFromSelection(selectedRange);
    if (!sourcePosition) return;

    const newComment: Comment = {
      id: Date.now().toString(),
      type: type as any,
      text: selectedText,
      data: data,
      timestamp: Date.now(),
      range: sourcePosition
    };

    console.log('Adding comment:', newComment);
    
    const traceId = activeTrace === "1" ? "trace1" : "trace2";
    addCommentToTrace(activeProjectId, traceId, newComment);

    setShowAnnotationForm(false);
    hideAddButton();
    window.getSelection()?.removeAllRanges();
  };

  const handleAnnotationCancel = () => {
    setShowAnnotationForm(false);
    hideAddButton();
    window.getSelection()?.removeAllRanges();
  };

  const handleCommentUpdate = (commentId: string, updates: Partial<Comment>) => {
    if (!activeProjectId) return;
    const traceId = activeTrace === "1" ? "trace1" : "trace2";
    updateCommentInTrace(activeProjectId, traceId, commentId, updates);
  };

  const handleCommentDelete = (commentId: string) => {
    if (!activeProjectId) return;
    const traceId = activeTrace === "1" ? "trace1" : "trace2";
    deleteCommentFromTrace(activeProjectId, traceId, commentId);
  };

  const attachHighlightListeners = () => {
    if (!previewRef.current) return;

    const preview = previewRef.current;
    
    const handleMouseUp = (e: MouseEvent) => {
      if (isSelectingText) {
        setTimeout(() => handleSelectionComplete(), 10);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if ((e.target as Element).closest('.comment-bubble')) {
        return;
      }
      setIsSelectingText(true);
      hideAddButton();
    };

    const handleClick = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.comment-bubble')) {
        setActiveCommentId(null);
      }
    };

    preview.addEventListener('mousedown', handleMouseDown);
    preview.addEventListener('mouseup', handleMouseUp);
    preview.addEventListener('click', handleClick);

    return () => {
      preview.removeEventListener('mousedown', handleMouseDown);
      preview.removeEventListener('mouseup', handleMouseUp);
      preview.removeEventListener('click', handleClick);
    };
  };

  const handleExportSuperAnnotate = () => {
    if (!activeProject) return;
    downloadSuperAnnotateJSON(activeProject.question, currentTrace.traceCode, currentTrace.comments);
  };

  const handleExportRaw = () => {
    if (!activeProject) return;
    downloadRawAnnotations(activeProject.question, currentTrace.traceCode, currentTrace.comments);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Export buttons */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex gap-2">
          <Button onClick={handleExportSuperAnnotate} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export SuperAnnotate
          </Button>
          <Button onClick={handleExportRaw} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Raw
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        <div className="flex-1 p-4 overflow-auto">
          {/* Question Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">Question</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowQuestionEditor(!showQuestionEditor)}
              >
                {showQuestionEditor ? "Preview" : "Edit"}
              </Button>
            </div>
            
            {showQuestionEditor ? (
              <Textarea
                value={activeProject.question}
                onChange={(e) => handleQuestionChange(e.target.value)}
                placeholder="Enter your LaTeX question here..."
                className="min-h-[150px] font-mono"
              />
            ) : (
              <div
                className="border rounded-lg p-4 min-h-[150px] bg-white"
                dangerouslySetInnerHTML={{ __html: renderedQuestion }}
              />
            )}
          </div>

          {/* Traces Section */}
          <Tabs value={activeTrace} onValueChange={(value) => setActiveTrace(value as "1" | "2")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="1">Trace 1</TabsTrigger>
              <TabsTrigger value="2">Trace 2</TabsTrigger>
            </TabsList>
            
            <TabsContent value="1" className="space-y-4">
              {/* Response 1 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-md font-semibold">Response</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowResponseEditor1(!showResponseEditor1)}
                  >
                    {showResponseEditor1 ? "Preview" : "Edit"}
                  </Button>
                </div>
                
                {showResponseEditor1 ? (
                  <Textarea
                    value={trace1.response}
                    onChange={(e) => handleResponseChange("trace1", e.target.value)}
                    placeholder="Enter response LaTeX here..."
                    className="min-h-[200px] font-mono"
                  />
                ) : (
                  <div
                    className="border rounded-lg p-4 min-h-[200px] bg-white"
                    dangerouslySetInnerHTML={{ __html: renderedResponse1 }}
                  />
                )}
              </div>

              {/* Trace Code 1 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-md font-semibold">Trace</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTraceEditor1(!showTraceEditor1)}
                  >
                    {showTraceEditor1 ? "Preview" : "Edit"}
                  </Button>
                </div>
                
                {showTraceEditor1 ? (
                  <Textarea
                    value={trace1.traceCode}
                    onChange={(e) => handleTraceCodeChange("trace1", e.target.value)}
                    placeholder="Enter trace LaTeX here..."
                    className="min-h-[400px] font-mono"
                  />
                ) : (
                  <div className="relative">
                    <div
                      ref={previewRef1}
                      className="border rounded-lg p-4 min-h-[400px] bg-white relative"
                      dangerouslySetInnerHTML={{ __html: renderedTrace1 }}
                    />
                    
                    {showAddButton && activeTrace === "1" && (
                      <AddAnnotationButton
                        position={buttonPosition}
                        onAdd={handleAddAnnotation}
                        onCancel={hideAddButton}
                      />
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="2" className="space-y-4">
              {/* Response 2 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-md font-semibold">Response</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowResponseEditor2(!showResponseEditor2)}
                  >
                    {showResponseEditor2 ? "Preview" : "Edit"}
                  </Button>
                </div>
                
                {showResponseEditor2 ? (
                  <Textarea
                    value={trace2.response}
                    onChange={(e) => handleResponseChange("trace2", e.target.value)}
                    placeholder="Enter response LaTeX here..."
                    className="min-h-[200px] font-mono"
                  />
                ) : (
                  <div
                    className="border rounded-lg p-4 min-h-[200px] bg-white"
                    dangerouslySetInnerHTML={{ __html: renderedResponse2 }}
                  />
                )}
              </div>

              {/* Trace Code 2 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-md font-semibold">Trace</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTraceEditor2(!showTraceEditor2)}
                  >
                    {showTraceEditor2 ? "Preview" : "Edit"}
                  </Button>
                </div>
                
                {showTraceEditor2 ? (
                  <Textarea
                    value={trace2.traceCode}
                    onChange={(e) => handleTraceCodeChange("trace2", e.target.value)}
                    placeholder="Enter trace LaTeX here..."
                    className="min-h-[400px] font-mono"
                  />
                ) : (
                  <div className="relative">
                    <div
                      ref={previewRef2}
                      className="border rounded-lg p-4 min-h-[400px] bg-white relative"
                      dangerouslySetInnerHTML={{ __html: renderedTrace2 }}
                    />
                    
                    {showAddButton && activeTrace === "2" && (
                      <AddAnnotationButton
                        position={buttonPosition}
                        onAdd={handleAddAnnotation}
                        onCancel={hideAddButton}
                      />
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Comments Sidebar */}
        <CommentsSidebar
          comments={currentTrace.comments}
          onCommentUpdate={handleCommentUpdate}
          onCommentDelete={handleCommentDelete}
          activeCommentId={activeCommentId}
          onCommentClick={setActiveCommentId}
          sourceText={currentTrace.traceCode}
        />
      </div>

      {/* Annotation Form */}
      {showAnnotationForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Add Annotation</h3>
            <p className="text-sm text-gray-600 mb-4">Selected text: "{selectedText}"</p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const type = formData.get('type') as string;
              const text = formData.get('text') as string;
              handleAnnotationSubmit(type, text, [text]);
            }}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Type</label>
                <select name="type" className="w-full border rounded px-3 py-2" defaultValue="other">
                  <option value="voq">Verification of Quality</option>
                  <option value="strength">Strength</option>
                  <option value="improvement">Improvement</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Comment</label>
                <Textarea name="text" className="w-full" placeholder="Enter your comment..." />
              </div>
              
              <div className="flex gap-2">
                <Button type="submit">Add Annotation</Button>
                <Button type="button" variant="outline" onClick={handleAnnotationCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
