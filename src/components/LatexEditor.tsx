import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { renderLatex } from "@/lib/latex-renderer";
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
    updateProject,
    updateProjectQuestion,
    updateProjectTrace,
  } = useProjects();

  // Fallback if no project
  const question = activeProject?.question || "";
  const setQuestion = (newQuestion: string) => {
    if (activeProjectId) {
      updateProjectQuestion(activeProjectId, newQuestion);
    }
  };

  const [renderedQuestion, setRenderedQuestion] = useState("");
  
  // Active response tab (1 or 2)
  const [activeResponse, setActiveResponse] = useState<"1" | "2">("1");
  
  // Response 1 state (the model's response text, separate from trace)
  const [response1, setResponse1] = useState("");
  const [renderedResponse1, setRenderedResponse1] = useState("");
  const [latexCode1, setLatexCode1] = useState("");
  const [renderedHtml1, setRenderedHtml1] = useState("");
  const [comments1, setComments1] = useState<Comment[]>([]);
  
  // Response 2 state
  const [response2, setResponse2] = useState("");
  const [renderedResponse2, setRenderedResponse2] = useState("");
  const [latexCode2, setLatexCode2] = useState("");
  const [renderedHtml2, setRenderedHtml2] = useState("");
  const [comments2, setComments2] = useState<Comment[]>([]);
  
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
  const isInitialLoadRef = useRef(true);
  
  // Get current active response data
  const latexCode = activeResponse === "1" ? latexCode1 : latexCode2;
  const setLatexCode = activeResponse === "1" ? setLatexCode1 : setLatexCode2;
  const renderedHtml = activeResponse === "1" ? renderedHtml1 : renderedHtml2;
  const comments = activeResponse === "1" ? comments1 : comments2;
  const setComments = activeResponse === "1" ? setComments1 : setComments2;
  const previewRef = activeResponse === "1" ? previewRef1 : previewRef2;

  // Load project data
  useEffect(() => {
    if (!activeProject) return;

    console.log("Loading project data:", activeProject.name);
    
    // Prevent saving while loading new project data
    isInitialLoadRef.current = true;

    // Load trace 1 data
    const trace1 = activeProject.traces.find(t => t.id === "trace1");
    if (trace1) {
      console.log("Loading trace1 - comments:", trace1.comments.length);
      setLatexCode1(trace1.traceCode);
      setComments1(trace1.comments);
      setResponse1(trace1.response);
    }

    // Load trace 2 data
    const trace2 = activeProject.traces.find(t => t.id === "trace2");
    if (trace2) {
      console.log("Loading trace2 - comments:", trace2.comments.length);
      setLatexCode2(trace2.traceCode);
      setComments2(trace2.comments);
      setResponse2(trace2.response);
    }
    
    // Mark initial load as complete after a short delay
    setTimeout(() => {
      isInitialLoadRef.current = false;
    }, 100);
  }, [activeProject]);

  useEffect(() => {
    const html = renderLatex(question, []);
    setRenderedQuestion(html);
  }, [question]);

  // Render Response 1 (the text response)
  useEffect(() => {
    const html = renderLatex(response1, []);
    setRenderedResponse1(html);
  }, [response1]);

  // Render Response 2 (the text response)
  useEffect(() => {
    const html = renderLatex(response2, []);
    setRenderedResponse2(html);
  }, [response2]);

  // Render Trace 1
  useEffect(() => {
    console.log("Rendering Trace 1 with", comments1.length, "comments");
    const html = renderLatex(latexCode1, comments1);
    setRenderedHtml1(html);
  }, [latexCode1, comments1]);

  // Render Trace 2
  useEffect(() => {
    console.log("Rendering Trace 2 with", comments2.length, "comments");
    const html = renderLatex(latexCode2, comments2);
    setRenderedHtml2(html);
  }, [latexCode2, comments2]);

  // Save changes back to project (skip during initial load)
  useEffect(() => {
    if (!activeProjectId || !activeProject || isInitialLoadRef.current) return;
    
    console.log("Saving trace1 - comments:", comments1.length);
    updateProjectTrace(activeProjectId, "trace1", {
      traceCode: latexCode1,
      comments: comments1,
      response: response1,
    });
  }, [latexCode1, comments1, response1, activeProjectId]);

  useEffect(() => {
    if (!activeProjectId || !activeProject || isInitialLoadRef.current) return;
    
    console.log("Saving trace2 - comments:", comments2.length);
    updateProjectTrace(activeProjectId, "trace2", {
      traceCode: latexCode2,
      comments: comments2,
      response: response2,
    });
  }, [latexCode2, comments2, response2, activeProjectId]);

  useEffect(() => {
    if (previewRef.current) {
      attachHighlightListeners();
    }
  }, [renderedHtml]);

  const saveComments = (newComments: Comment[]) => {
    if (activeResponse === "1") {
      setComments1(newComments);
    } else {
      setComments2(newComments);
    }
  };

  const getSourcePositionFromSelection = (range: Range): { start: number; end: number } | null => {
    const selectedText = range.toString().trim();
    if (!selectedText) return null;
    
    const index = latexCode.indexOf(selectedText);
    if (index === -1) {
      console.warn('Could not find selected text in source');
      return null;
    }
    
    return {
      start: index,
      end: index + selectedText.length
    };
  };

  const attachHighlightListeners = () => {
    if (!previewRef.current) return;

    const highlights = previewRef.current.querySelectorAll(".latex-highlight");
    highlights.forEach((el) => {
      el.addEventListener("click", handleHighlightClick);
    });
  };

  const handleHighlightClick = (e: Event) => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    const commentId = target.dataset.commentId;
    
    if (commentId) {
      setActiveCommentId(commentId);
      
      const sidebarComments = document.querySelectorAll('.rounded-lg[data-comment-id]');
      const commentElement = Array.from(sidebarComments).find(
        el => el.getAttribute('data-comment-id') === commentId
      );
      if (commentElement) {
        commentElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  const handleMouseDown = () => {
    setIsSelectingText(true);
  };

  const handleMouseUp = () => {
    if (!previewRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setIsSelectingText(false);
      return;
    }

    const range = selection.getRangeAt(0);
    
    if (!previewRef.current.contains(range.commonAncestorContainer)) return;

    const text = selection.toString().trim();
    if (!text) return;

    const rects = range.getClientRects();
    if (rects.length === 0) return;

    // Get the position of the selection and the preview container
    const rect = rects[0];
    const previewRect = previewRef.current.getBoundingClientRect();
    const BUTTON_RIGHT_MARGIN = 30;
    
    // Since the button is absolutely positioned within the card container,
    // we need to calculate relative to the card, not the preview
    const cardElement = previewRef.current.parentElement;
    if (!cardElement) return;
    
    const cardRect = cardElement.getBoundingClientRect();
    
    // Calculate position relative to card
    const buttonTop = rect.top - cardRect.top;
    
    setButtonPosition({
      top: buttonTop,
      left: previewRect.width - BUTTON_RIGHT_MARGIN,
    });

    setSelectedRange(range.cloneRange());
    setSelectedText(text);
    setShowAddButton(true);
    setIsSelectingText(true);
    
    setTimeout(() => setIsSelectingText(false), 100);
  };

  const handleAddAnnotationClick = () => {
    if (!selectedRange || !selectedText) {
      console.error('No selected range or text available');
      return;
    }
    
    const sourceRange = getSourcePositionFromSelection(selectedRange);
    const commentRange = sourceRange || { start: 0, end: selectedText.length };
    
    if (!sourceRange) {
      console.log('⚠️ Could not map to source - will match by rendered text instead');
    }

    const newComment: Comment = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      type: "other",
      text: selectedText,
      timestamp: Date.now(),
      range: commentRange,
      data: [],
    };

    const updatedComments = [...comments, newComment];
    saveComments(updatedComments);

    setShowAnnotationForm(true);
    setActiveCommentId(newComment.id);
    
    setShowAddButton(false);
    window.getSelection()?.removeAllRanges();
  };

  const handleCloseAddButton = () => {
    setShowAddButton(false);
    setSelectedRange(null);
    setSelectedText("");
  };

  const handleAddComment = (comment: Omit<Comment, "id" | "text" | "timestamp" | "range">) => {
    if (!activeCommentId) return;

    const updatedComments = comments.map(c => 
      c.id === activeCommentId 
        ? { ...c, type: comment.type, data: comment.data }
        : c
    );
    
    saveComments(updatedComments);
    
    setShowAnnotationForm(false);
    setActiveCommentId(null);
  };

  const handleCloseAnnotationForm = () => {
    if (activeCommentId && showAnnotationForm) {
      const comment = comments.find(c => c.id === activeCommentId);
      if (comment && (!comment.data || comment.data.length === 0 || !comment.data.some(d => d && d.trim()))) {
        saveComments(comments.filter(c => c.id !== activeCommentId));
      }
    }
    setShowAnnotationForm(false);
    setActiveCommentId(null);
  };

  const handleDeleteComment = (id: string) => {
    saveComments(comments.filter((c) => c.id !== id));
    if (activeCommentId === id) {
      setActiveCommentId(null);
    }
  };

  const handleUpdateComment = (id: string, updates: Partial<Comment>) => {
    saveComments(
      comments.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const handleCommentClick = (id: string) => {
    setActiveCommentId(id);
    
    const highlight = previewRef.current?.querySelector(`.latex-highlight[data-comment-id="${id}"]`);
    if (highlight) {
      highlight.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleClickOutside = () => {
    if (isSelectingText) return;
    
    if (showAddButton) {
      setShowAddButton(false);
      window.getSelection()?.removeAllRanges();
    } else if (!showAnnotationForm) {
      setActiveCommentId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-2">
              LaTeX Annotator
            </h1>
            <p className="text-muted-foreground">
              Write LaTeX, render beautifully, annotate precisely
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadRawAnnotations(comments, latexCode, `annotations-trace${activeResponse}-raw.json`)}
              disabled={comments.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export JSON (Trace {activeResponse})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadSuperAnnotateJSON(comments, latexCode, `annotations-trace${activeResponse}-superannotate.json`)}
              disabled={comments.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export SA (Trace {activeResponse})
            </Button>
          </div>
        </header>

        {/* Task Metadata Section */}
        {activeProject && (
          <div className="mb-4">
            <div className="rounded-lg border border-border bg-card/50 overflow-hidden">
              <div className="px-3 py-2 grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="taskUrl" className="text-xs text-muted-foreground whitespace-nowrap">
                    Task URL:
                  </label>
                  <Input
                    id="taskUrl"
                    type="url"
                    value={activeProject.taskUrl || ""}
                    onChange={(e) => {
                      if (activeProjectId) {
                        updateProject(activeProjectId, { taskUrl: e.target.value });
                      }
                    }}
                    placeholder="https://..."
                    className="text-xs h-7"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="taskId" className="text-xs text-muted-foreground whitespace-nowrap">
                    Task ID:
                  </label>
                  <Input
                    id="taskId"
                    type="text"
                    value={activeProject.taskId || ""}
                    onChange={(e) => {
                      if (activeProjectId) {
                        updateProject(activeProjectId, { taskId: e.target.value });
                      }
                    }}
                    placeholder="ID..."
                    className="text-xs h-7"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Question Reference Section */}
        <div className="mb-6">
          <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
            <div className="border-b border-border bg-accent/10 px-4 py-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Question</h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowQuestionEditor(!showQuestionEditor)}
              >
                {showQuestionEditor ? 'Hide Editor' : 'Edit'}
              </Button>
            </div>
            
            {showQuestionEditor ? (
              <div className="p-4 bg-[hsl(var(--editor-bg))]">
                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="min-h-[80px] border border-border rounded bg-background font-mono text-sm resize-y"
                  placeholder="Enter the question..."
                />
              </div>
            ) : (
              <div className="p-6 bg-[hsl(var(--preview-bg))]">
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderedQuestion }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Response Tabs */}
        <Tabs value={activeResponse} onValueChange={(v) => setActiveResponse(v as "1" | "2")} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="1">Trace 1</TabsTrigger>
            <TabsTrigger value="2">Trace 2</TabsTrigger>
          </TabsList>

          {/* Response 1 Content */}
          <TabsContent value="1" className="mt-0">
            <div className="grid lg:grid-cols-[1fr,320px] gap-6" onClick={handleClickOutside}>
              <div className="space-y-6">
                {/* Response Section */}
                <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                  <div className="border-b border-border bg-accent/10 px-4 py-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-foreground">Response</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setShowResponseEditor1(!showResponseEditor1)}
                    >
                      {showResponseEditor1 ? 'Preview' : 'Edit'}
                    </Button>
                  </div>
                  
                  {showResponseEditor1 ? (
                    <div className="p-4 bg-[hsl(var(--editor-bg))]">
                      <Textarea
                        value={response1}
                        onChange={(e) => setResponse1(e.target.value)}
                        className="min-h-[100px] border border-border rounded bg-background font-mono text-sm resize-y"
                        placeholder="Enter the model's response..."
                      />
                    </div>
                  ) : (
                    <div className="p-6 bg-[hsl(var(--preview-bg))]">
                      <div 
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: renderedResponse1 }}
                      />
                    </div>
                  )}
                </div>

                {/* Trace Editor Section */}
                {showTraceEditor1 && (
                  <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                    <div className="border-b border-border bg-secondary/30 px-4 py-3 flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-foreground">Trace Editor</h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setShowTraceEditor1(false)}
                      >
                        Hide
                      </Button>
                    </div>
                    <Textarea
                      value={latexCode1}
                      onChange={(e) => setLatexCode1(e.target.value)}
                      className="min-h-[300px] border-0 rounded-none bg-[hsl(var(--editor-bg))] font-mono text-sm resize-y focus-visible:ring-0 placeholder:text-muted-foreground/50"
                      placeholder="Enter trace excerpt..."
                    />
                  </div>
                )}
                
                {!showTraceEditor1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTraceEditor1(true)}
                    className="w-full"
                  >
                    Show Trace Editor
                  </Button>
                )}

                {/* Trace Preview Section */}
                <div className="rounded-xl border border-border bg-card shadow-lg overflow-visible relative">
                  <div className="border-b border-border bg-secondary/30 px-4 py-3">
                    <h2 className="text-sm font-semibold text-foreground">Trace Preview</h2>
                  </div>
                  <div
                    ref={previewRef1}
                    className="min-h-[300px] p-6 bg-[hsl(var(--preview-bg))] prose prose-sm max-w-none"
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    dangerouslySetInnerHTML={{ __html: renderedHtml1 }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  
                  {showAddButton && activeResponse === "1" && (
                    <AddAnnotationButton
                      position={buttonPosition}
                      onClick={handleAddAnnotationClick}
                      onClose={handleCloseAddButton}
                    />
                  )}
                </div>
              </div>

              <CommentsSidebar
                comments={comments1}
                activeCommentId={activeCommentId}
                showAnnotationForm={showAnnotationForm}
                onCommentClick={handleCommentClick}
                onDeleteComment={handleDeleteComment}
                onUpdateComment={handleUpdateComment}
                onAddComment={handleAddComment}
                onCloseAnnotationForm={handleCloseAnnotationForm}
              />
            </div>
          </TabsContent>

          {/* Response 2 Content */}
          <TabsContent value="2" className="mt-0">
            <div className="grid lg:grid-cols-[1fr,320px] gap-6" onClick={handleClickOutside}>
              <div className="space-y-6">
                {/* Response Section */}
                <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                  <div className="border-b border-border bg-accent/10 px-4 py-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-foreground">Response</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setShowResponseEditor2(!showResponseEditor2)}
                    >
                      {showResponseEditor2 ? 'Preview' : 'Edit'}
                    </Button>
                  </div>
                  
                  {showResponseEditor2 ? (
                    <div className="p-4 bg-[hsl(var(--editor-bg))]">
                      <Textarea
                        value={response2}
                        onChange={(e) => setResponse2(e.target.value)}
                        className="min-h-[100px] border border-border rounded bg-background font-mono text-sm resize-y"
                        placeholder="Enter the model's response..."
                      />
                    </div>
                  ) : (
                    <div className="p-6 bg-[hsl(var(--preview-bg))]">
                      <div 
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: renderedResponse2 }}
                      />
                    </div>
                  )}
                </div>

                {/* Trace Editor Section */}
                {showTraceEditor2 && (
                  <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                    <div className="border-b border-border bg-secondary/30 px-4 py-3 flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-foreground">Trace Editor</h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setShowTraceEditor2(false)}
                      >
                        Hide
                      </Button>
                    </div>
                    <Textarea
                      value={latexCode2}
                      onChange={(e) => setLatexCode2(e.target.value)}
                      className="min-h-[300px] border-0 rounded-none bg-[hsl(var(--editor-bg))] font-mono text-sm resize-y focus-visible:ring-0 placeholder:text-muted-foreground/50"
                      placeholder="Enter trace excerpt..."
                    />
                  </div>
                )}
                
                {!showTraceEditor2 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTraceEditor2(true)}
                    className="w-full"
                  >
                    Show Trace Editor
                  </Button>
                )}

                {/* Trace Preview Section */}
                <div className="rounded-xl border border-border bg-card shadow-lg overflow-visible relative">
                  <div className="border-b border-border bg-secondary/30 px-4 py-3">
                    <h2 className="text-sm font-semibold text-foreground">Trace Preview</h2>
                  </div>
                  <div
                    ref={previewRef2}
                    className="min-h-[300px] p-6 bg-[hsl(var(--preview-bg))] prose prose-sm max-w-none"
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    dangerouslySetInnerHTML={{ __html: renderedHtml2 }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  
                  {showAddButton && activeResponse === "2" && (
                    <AddAnnotationButton
                      position={buttonPosition}
                      onClick={handleAddAnnotationClick}
                      onClose={handleCloseAddButton}
                    />
                  )}
                </div>
              </div>

              <CommentsSidebar
                comments={comments2}
                activeCommentId={activeCommentId}
                showAnnotationForm={showAnnotationForm}
                onCommentClick={handleCommentClick}
                onDeleteComment={handleDeleteComment}
                onUpdateComment={handleUpdateComment}
                onAddComment={handleAddComment}
                onCloseAnnotationForm={handleCloseAnnotationForm}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
