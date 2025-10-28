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
import "katex/dist/katex.min.css";

export const LatexEditor = () => {
  const [question, setQuestion] = useState(
    localStorage.getItem("question") || ""
  );
  const [renderedQuestion, setRenderedQuestion] = useState("");
  
  // Active trace tab (1 or 2)
  const [activeTrace, setActiveTrace] = useState<"1" | "2">("1");
  
  // Trace 1 state
  const [response1, setResponse1] = useState(
    localStorage.getItem("response_trace1") || ""
  );
  const [renderedResponse1, setRenderedResponse1] = useState("");
  const [traceCode1, setTraceCode1] = useState(
    localStorage.getItem("traceCode_trace1") || ""
  );
  const [renderedTrace1, setRenderedTrace1] = useState("");
  const [comments1, setComments1] = useState<Comment[]>([]);
  
  // Trace 2 state
  const [response2, setResponse2] = useState(
    localStorage.getItem("response_trace2") || ""
  );
  const [renderedResponse2, setRenderedResponse2] = useState("");
  const [traceCode2, setTraceCode2] = useState(
    localStorage.getItem("traceCode_trace2") || ""
  );
  const [renderedTrace2, setRenderedTrace2] = useState("");
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
  
  // Get current active trace data
  const response = activeTrace === "1" ? response1 : response2;
  const setResponse = activeTrace === "1" ? setResponse1 : setResponse2;
  const renderedResponse = activeTrace === "1" ? renderedResponse1 : renderedResponse2;
  const setRenderedResponse = activeTrace === "1" ? setRenderedResponse1 : setRenderedResponse2;
  const showResponseEditor = activeTrace === "1" ? showResponseEditor1 : showResponseEditor2;
  const setShowResponseEditor = activeTrace === "1" ? setShowResponseEditor1 : setShowResponseEditor2;
  const traceCode = activeTrace === "1" ? traceCode1 : traceCode2;
  const setTraceCode = activeTrace === "1" ? setTraceCode1 : setTraceCode2;
  const renderedTrace = activeTrace === "1" ? renderedTrace1 : renderedTrace2;
  const setRenderedTrace = activeTrace === "1" ? setRenderedTrace1 : setRenderedTrace2;
  const comments = activeTrace === "1" ? comments1 : comments2;
  const setComments = activeTrace === "1" ? setComments1 : setComments2;
  const previewRef = activeTrace === "1" ? previewRef1 : previewRef2;

  // Helper function to clean up incomplete comments
  const cleanupComments = (parsedComments: any[], sourceText: string) => {
    const now = Date.now();
    const ONE_MINUTE = 60 * 1000;
    
    return parsedComments
      .filter((comment: any) => {
        const isIncomplete = !comment.data || comment.data.length === 0 || !comment.data.some((d: string) => d && d.trim());
        
        if (isIncomplete) {
          const age = now - (comment.timestamp || 0);
          if (age > ONE_MINUTE) {
            console.log("🗑️ Removing old incomplete comment:", comment.id);
            return false;
          }
        }
        
        if (!comment.text || !comment.text.trim()) {
          console.log("🗑️ Removing comment with no text:", comment.id);
          return false;
        }
        
        return true;
      })
      .map((comment: any) => {
        if (!comment.range || comment.range.start === undefined || comment.range.end === undefined) {
          const index = sourceText.indexOf(comment.text);
          if (index !== -1) {
            return {
              ...comment,
              range: { start: index, end: index + comment.text.length }
            };
          } else {
            console.warn("Could not migrate comment:", comment.text);
            return null;
          }
        }
        return comment;
      })
      .filter((comment: any) => comment !== null);
  };

  useEffect(() => {
    console.log("=== Mount effect - loading comments for both traces ===");
    
    // 🔄 MIGRATION: Copy old response data to Trace 1 (one-time)
    const oldLatexCode1 = localStorage.getItem("latexCode_response1");
    const oldLatexCode2 = localStorage.getItem("latexCode_response2");
    const oldComments1 = localStorage.getItem("latexComments_response1");
    const oldComments2 = localStorage.getItem("latexComments_response2");
    const hasNewFormat = localStorage.getItem("traceCode_trace1") || localStorage.getItem("traceCode_trace2");
    
    if ((oldLatexCode1 || oldLatexCode2 || oldComments1 || oldComments2) && !hasNewFormat) {
      console.log("🔄 Migrating old response data to new trace format...");
      
      // Migrate Trace 1
      if (oldLatexCode1) {
        localStorage.setItem("traceCode_trace1", oldLatexCode1);
        setTraceCode1(oldLatexCode1);
        console.log("✓ Migrated trace code to Trace 1");
      }
      if (oldComments1) {
        localStorage.setItem("latexComments_trace1", oldComments1);
        console.log("✓ Migrated comments to Trace 1");
      }
      
      // Migrate Trace 2
      if (oldLatexCode2) {
        localStorage.setItem("traceCode_trace2", oldLatexCode2);
        setTraceCode2(oldLatexCode2);
        console.log("✓ Migrated trace code to Trace 2");
      }
      if (oldComments2) {
        localStorage.setItem("latexComments_trace2", oldComments2);
        console.log("✓ Migrated comments to Trace 2");
      }
      
      // Clean up old keys
      localStorage.removeItem("latexCode_response1");
      localStorage.removeItem("latexCode_response2");
      localStorage.removeItem("latexComments_response1");
      localStorage.removeItem("latexComments_response2");
      console.log("✓ Migration complete, old keys removed");
    }
    
    // Load Trace 1 comments
    const stored1 = localStorage.getItem("latexComments_trace1");
    if (stored1) {
      const parsedComments1 = JSON.parse(stored1);
      const cleaned1 = cleanupComments(parsedComments1, traceCode1);
      console.log("Loaded Trace 1 comments:", cleaned1.length);
      setComments1(cleaned1);
      if (cleaned1.length !== parsedComments1.length) {
        localStorage.setItem("latexComments_trace1", JSON.stringify(cleaned1));
      }
    }
    
    // Load Trace 2 comments
    const stored2 = localStorage.getItem("latexComments_trace2");
    if (stored2) {
      const parsedComments2 = JSON.parse(stored2);
      const cleaned2 = cleanupComments(parsedComments2, traceCode2);
      console.log("Loaded Trace 2 comments:", cleaned2.length);
      setComments2(cleaned2);
      if (cleaned2.length !== parsedComments2.length) {
        localStorage.setItem("latexComments_trace2", JSON.stringify(cleaned2));
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("question", question);
    const html = renderLatex(question, []);
    setRenderedQuestion(html);
  }, [question]);

  // Render Response 1
  useEffect(() => {
    localStorage.setItem("response_trace1", response1);
    const html = renderLatex(response1, []);
    setRenderedResponse1(html);
  }, [response1]);

  // Render Response 2
  useEffect(() => {
    localStorage.setItem("response_trace2", response2);
    const html = renderLatex(response2, []);
    setRenderedResponse2(html);
  }, [response2]);

  // Render Trace 1
  useEffect(() => {
    console.log("=== Rendering Trace 1 ===");
    localStorage.setItem("traceCode_trace1", traceCode1);
    const html = renderLatex(traceCode1, comments1);
    setRenderedTrace1(html);
  }, [traceCode1, comments1]);

  // Render Trace 2
  useEffect(() => {
    console.log("=== Rendering Trace 2 ===");
    localStorage.setItem("traceCode_trace2", traceCode2);
    const html = renderLatex(traceCode2, comments2);
    setRenderedTrace2(html);
  }, [traceCode2, comments2]);

  useEffect(() => {
    if (previewRef.current) {
      attachHighlightListeners();
    }
  }, [renderedTrace]);

  const saveComments = (newComments: Comment[]) => {
    console.log("=== saveComments called for Trace", activeTrace, "===");
    console.log("Saving comments:", newComments);
    const storageKey = `latexComments_trace${activeTrace}`;
    
    if (activeTrace === "1") {
      setComments1(newComments);
    } else {
      setComments2(newComments);
    }
    localStorage.setItem(storageKey, JSON.stringify(newComments));
    console.log("Saved to localStorage:", storageKey);
  };

  const getSourcePositionFromSelection = (range: Range): { start: number; end: number } | null => {
    // Get the plain text content from the selection
    const selectedText = range.toString().trim();
    
    if (!selectedText) return null;
    
    console.log('Mapping selection to source. Selected text:', selectedText.substring(0, 100));
    
    // Get the text BEFORE the selection to use as context
    const previewElement = previewRef.current;
    if (!previewElement) return null;
    
    // Create a range from the start of the preview to the start of the selection
    const fullRange = document.createRange();
    fullRange.setStart(previewElement, 0);
    fullRange.setEnd(range.startContainer, range.startOffset);
    const textBeforeSelection = fullRange.toString();
    
    console.log('Text before selection (last 50 chars):', textBeforeSelection.substring(Math.max(0, textBeforeSelection.length - 50)));
    
    // Strategy: Find all occurrences of the selected text in source
    // Then pick the one with the most matching context before it
    const occurrences: number[] = [];
    let searchPos = 0;
    
    // First try exact match
    while ((searchPos = traceCode.indexOf(selectedText, searchPos)) !== -1) {
      occurrences.push(searchPos);
      searchPos++;
    }
    
    console.log(`Found ${occurrences.length} exact matches in source`);
    
    if (occurrences.length === 0) {
      console.warn('No exact match found in source');
      return null;
    }
    
    if (occurrences.length === 1) {
      // Only one match, use it
      console.log('Single match found at:', occurrences[0]);
      return { start: occurrences[0], end: occurrences[0] + selectedText.length };
    }
    
    // Multiple matches - use context to disambiguate
    // Compare the last N characters before each occurrence with the rendered context
    let bestMatch = occurrences[0];
    let bestScore = 0;
    const contextLength = Math.min(100, textBeforeSelection.length);
    
    for (const occurrence of occurrences) {
      const sourceContextBefore = traceCode.substring(Math.max(0, occurrence - contextLength), occurrence);
      const renderedContextBefore = textBeforeSelection.substring(Math.max(0, textBeforeSelection.length - contextLength));
      
      // Score by counting matching characters from the end
      let score = 0;
      const minLen = Math.min(sourceContextBefore.length, renderedContextBefore.length);
      for (let i = 1; i <= minLen; i++) {
        if (sourceContextBefore[sourceContextBefore.length - i] === renderedContextBefore[renderedContextBefore.length - i]) {
          score++;
        } else {
          break; // Stop at first mismatch
        }
      }
      
      console.log(`Occurrence at ${occurrence}: context score ${score}`);
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = occurrence;
      }
    }
    
    console.log('Best match at:', bestMatch, 'with score:', bestScore);
    
    return { 
      start: bestMatch, 
      end: bestMatch + selectedText.length 
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
      
      // Scroll comment into view in the sidebar (not the highlight)
      // Use a more specific selector that targets sidebar comments
      const sidebarComments = document.querySelectorAll('.rounded-lg[data-comment-id]');
      const commentElement = Array.from(sidebarComments).find(
        el => el.getAttribute('data-comment-id') === commentId
      );
      if (commentElement) {
        commentElement.scrollIntoView({ behavior: "smooth", block: "center" });
        // Add a temporary highlight effect to the comment
        commentElement.classList.add("bg-accent/20");
        setTimeout(() => commentElement.classList.remove("bg-accent/20"), 1000);
      }
    }
  };

  const handleMouseDown = () => {
    setIsSelectingText(true);
    
    // If annotation form is open with an incomplete annotation, clean it up
    if (showAnnotationForm && activeCommentId) {
      const comment = comments.find(c => c.id === activeCommentId);
      if (comment && (!comment.data || comment.data.length === 0 || !comment.data.some(d => d && d.trim()))) {
        console.log("Removing incomplete annotation when starting new selection:", activeCommentId);
        saveComments(comments.filter(c => c.id !== activeCommentId));
      }
      setShowAnnotationForm(false);
      setActiveCommentId(null);
    }
    
    // Clear any previous selection when starting a new one
    setShowAddButton(false);
    setSelectedRange(null);
    setSelectedText("");
  };

  const handleMouseUp = () => {
    if (!previewRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setIsSelectingText(false);
      return;
    }

    const range = selection.getRangeAt(0);
    
    // Check if selection is within preview
    if (!previewRef.current.contains(range.commonAncestorContainer)) return;

    // Check if already in a highlight
    let node: Node | null = range.commonAncestorContainer;
    while (node && node !== previewRef.current) {
      if (node.nodeType === 1 && (node as Element).classList.contains("latex-highlight")) {
        return;
      }
      node = node.parentNode;
    }

    const text = selection.toString().trim();
    if (!text) return;

    // Get position for button - position on the RIGHT side of the preview, aligned with selection
    const rects = range.getClientRects();
    if (rects.length === 0) return;

    const rect = rects[0];
    const previewRect = previewRef.current.getBoundingClientRect();
    const scrollTop = previewRef.current.scrollTop;
    
    // Calculate Y position: the button should align with the TOP of the selected text
    // rect.top is viewport coords, previewRect.top is preview's viewport coords
    // Subtracting gives us position relative to preview container
    // Add scrollTop to account for scrolled content within the preview
    const relativeTop = rect.top - previewRect.top + scrollTop;
    
    // Calculate X position: place button on the right side
    // Use previewRect.width minus a margin to position from the right edge
    const buttonWidth = 32; // Button is h-8 w-8 = 32px
    const rightMargin = -5; // Some spacing from edge to avoid cutoff
    const relativeLeft = previewRect.width - buttonWidth - rightMargin;
    
    setButtonPosition({
      top: relativeTop,
      left: relativeLeft,
    });

    setSelectedRange(range.cloneRange());
    setSelectedText(text);
    setShowAddButton(true);
    setIsSelectingText(true);
    
    // Reset the selecting state after a short delay
    setTimeout(() => setIsSelectingText(false), 100);
  };

  const handleAddAnnotationClick = () => {
    if (!selectedRange || !selectedText) {
      console.error('No selected range or text available');
      return;
    }
    
    // Try to find the position of the selected text in the LaTeX source
    const sourceRange = getSourcePositionFromSelection(selectedRange);
    
    // If we can't map to source (e.g., rendered math), use a fallback
    // We'll use the text content for matching in rendered output
    const commentRange = sourceRange || { start: 0, end: selectedText.length };
    
    if (!sourceRange) {
      console.log('⚠️ Could not map to source - will match by rendered text instead');
      console.log('Selected text:', selectedText.substring(0, 100));
    } else {
      console.log('✓ Mapped selection to source range:', sourceRange);
      console.log('Source text:', traceCode.substring(sourceRange.start, sourceRange.end).substring(0, 100));
    }

    // Create permanent highlight immediately when user clicks "Add annotation"
    const newComment: Comment = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      type: "other",
      text: selectedText,
      timestamp: Date.now(),
      range: commentRange,
      data: [], // Empty data marks this as "pending completion"
    };

    console.log('Creating new comment with ID:', newComment.id);

    // Add the comment to create the permanent highlight
    const updatedComments = [...comments, newComment];
    saveComments(updatedComments);

    // Show the annotation form in sidebar
    setShowAnnotationForm(true);
    setActiveCommentId(newComment.id);
    
    // Hide the add button
    setShowAddButton(false);
    
    // Clear the browser selection - the permanent highlight will remain
    window.getSelection()?.removeAllRanges();
  };

  const handleCloseAddButton = () => {
    setShowAddButton(false);
    setSelectedRange(null);
    setSelectedText("");
  };

  const handleAddComment = (comment: Omit<Comment, "id" | "text" | "timestamp" | "range">) => {
    if (!activeCommentId) {
      console.error("No active comment ID when trying to add comment");
      return;
    }

    console.log("=== handleAddComment called ===");
    console.log("Comment type:", comment.type);
    console.log("Comment data:", comment.data);
    console.log("Active comment ID:", activeCommentId);
    console.log("Current comments before update:", comments);

    // Update the existing comment with the form data
    const updatedComments = comments.map(c => 
      c.id === activeCommentId 
        ? { ...c, type: comment.type, data: comment.data }
        : c
    );
    
    console.log("Updated comments after map:", updatedComments);
    
    saveComments(updatedComments);
    
    console.log("Comments saved to state and localStorage");
    
    // Close the form - don't check for incomplete, we just saved it
    setShowAnnotationForm(false);
    setActiveCommentId(null);
    
    // Clear the yellow selection highlight after successfully adding annotation
    setShowAddButton(false);
    setSelectedRange(null);
    setSelectedText("");
  };

  const handleCloseAnnotationForm = () => {
    // If there's an active comment being created (with empty data), remove it
    // This only happens when the user CANCELS (closes without submitting)
    if (activeCommentId && showAnnotationForm) {
      const comment = comments.find(c => c.id === activeCommentId);
      if (comment && (!comment.data || comment.data.length === 0 || !comment.data.some(d => d && d.trim()))) {
        // This is an incomplete comment, remove it
        console.log("Removing incomplete comment on cancel:", activeCommentId);
        saveComments(comments.filter(c => c.id !== activeCommentId));
      }
    }
    setShowAnnotationForm(false);
    setActiveCommentId(null);
    
    // Clear the yellow selection highlight when closing the form
    setShowAddButton(false);
    setSelectedRange(null);
    setSelectedText("");
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
    
    // Scroll highlight into view in the preview
    const highlight = previewRef.current?.querySelector(`.latex-highlight[data-comment-id="${id}"]`);
    if (highlight) {
      highlight.scrollIntoView({ behavior: "smooth", block: "center" });
      // Add a temporary highlight effect
      highlight.classList.add("active");
      setTimeout(() => highlight.classList.remove("active"), 1000);
    }
  };

  const handleClickOutside = () => {
    // Don't close if we're in the middle of selecting text
    if (isSelectingText) return;
    
    // Only close the add button, but keep annotation form open if it's being edited
    if (showAddButton) {
      setShowAddButton(false);
      window.getSelection()?.removeAllRanges();
    } else if (!showAnnotationForm) {
      // Only clear active comment if form is not open
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
              onClick={() => downloadRawAnnotations(comments, traceCode, `annotations-trace${activeTrace}-raw.json`)}
              disabled={comments.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export JSON (Trace {activeTrace})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadSuperAnnotateJSON(comments, traceCode, `annotations-trace${activeTrace}-superannotate.json`)}
              disabled={comments.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export SA (Trace {activeTrace})
            </Button>
          </div>
        </header>

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

        {/* Trace Tabs */}
        <Tabs value={activeTrace} onValueChange={(v) => setActiveTrace(v as "1" | "2")} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="1">Trace 1</TabsTrigger>
            <TabsTrigger value="2">Trace 2</TabsTrigger>
          </TabsList>

          {/* Trace 1 Content */}
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
                      {showResponseEditor1 ? 'Hide Editor' : 'Edit'}
                    </Button>
                  </div>
                  
                  {showResponseEditor1 ? (
                    <div className="p-4 bg-[hsl(var(--editor-bg))]">
                      <Textarea
                        value={response1}
                        onChange={(e) => setResponse1(e.target.value)}
                        className="min-h-[80px] border border-border rounded bg-background font-mono text-sm resize-y"
                        placeholder="Enter the response..."
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

                {/* Trace Editor */}
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
                      value={traceCode1}
                      onChange={(e) => setTraceCode1(e.target.value)}
                      className="min-h-[300px] border-0 rounded-none bg-[hsl(var(--editor-bg))] font-mono text-sm resize-y focus-visible:ring-0 placeholder:text-muted-foreground/50"
                      placeholder="Enter trace excerpt..."
                    />
                  </div>
                )}

                {/* Trace Preview */}
                <div className="rounded-xl border border-border bg-card shadow-lg overflow-visible">
                  <div className="border-b border-border bg-secondary/30 px-4 py-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-foreground">Trace Preview</h2>
                    {!showTraceEditor1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setShowTraceEditor1(true)}
                      >
                        Show Editor
                      </Button>
                    )}
                  </div>
                  <div className="relative overflow-visible">
                    <div
                      ref={previewRef1}
                      className="min-h-[300px] p-6 bg-[hsl(var(--preview-bg))] overflow-auto prose prose-sm max-w-none"
                      onMouseDown={handleMouseDown}
                      onMouseUp={handleMouseUp}
                      dangerouslySetInnerHTML={{ __html: renderedTrace1 }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {showAddButton && activeTrace === "1" && (
                      <AddAnnotationButton
                        position={buttonPosition}
                        onClick={handleAddAnnotationClick}
                        onClose={handleCloseAddButton}
                      />
                    )}
                  </div>
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

          {/* Trace 2 Content */}
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
                      {showResponseEditor2 ? 'Hide Editor' : 'Edit'}
                    </Button>
                  </div>
                  
                  {showResponseEditor2 ? (
                    <div className="p-4 bg-[hsl(var(--editor-bg))]">
                      <Textarea
                        value={response2}
                        onChange={(e) => setResponse2(e.target.value)}
                        className="min-h-[80px] border border-border rounded bg-background font-mono text-sm resize-y"
                        placeholder="Enter the response..."
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

                {/* Trace Editor */}
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
                      value={traceCode2}
                      onChange={(e) => setTraceCode2(e.target.value)}
                      className="min-h-[300px] border-0 rounded-none bg-[hsl(var(--editor-bg))] font-mono text-sm resize-y focus-visible:ring-0 placeholder:text-muted-foreground/50"
                      placeholder="Enter trace excerpt..."
                    />
                  </div>
                )}

                {/* Trace Preview */}
                <div className="rounded-xl border border-border bg-card shadow-lg overflow-visible">
                  <div className="border-b border-border bg-secondary/30 px-4 py-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-foreground">Trace Preview</h2>
                    {!showTraceEditor2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setShowTraceEditor2(true)}
                      >
                        Show Editor
                      </Button>
                    )}
                  </div>
                  <div className="relative overflow-visible">
                    <div
                      ref={previewRef2}
                      className="min-h-[300px] p-6 bg-[hsl(var(--preview-bg))] overflow-auto prose prose-sm max-w-none"
                      onMouseDown={handleMouseDown}
                      onMouseUp={handleMouseUp}
                      dangerouslySetInnerHTML={{ __html: renderedTrace2 }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {showAddButton && activeTrace === "2" && (
                      <AddAnnotationButton
                        position={buttonPosition}
                        onClick={handleAddAnnotationClick}
                        onClose={handleCloseAddButton}
                      />
                    )}
                  </div>
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
