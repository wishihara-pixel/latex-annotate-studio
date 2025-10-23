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
  
  // Active response tab (1 or 2)
  const [activeResponse, setActiveResponse] = useState<"1" | "2">("1");
  
  // Response 1 state
  const [latexCode1, setLatexCode1] = useState(
    localStorage.getItem("latexCode_response1") || ""
  );
  const [renderedHtml1, setRenderedHtml1] = useState("");
  const [comments1, setComments1] = useState<Comment[]>([]);
  
  // Response 2 state
  const [latexCode2, setLatexCode2] = useState(
    localStorage.getItem("latexCode_response2") || ""
  );
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
  
  const previewRef1 = useRef<HTMLDivElement>(null);
  const previewRef2 = useRef<HTMLDivElement>(null);
  
  // Get current active response data
  const latexCode = activeResponse === "1" ? latexCode1 : latexCode2;
  const setLatexCode = activeResponse === "1" ? setLatexCode1 : setLatexCode2;
  const renderedHtml = activeResponse === "1" ? renderedHtml1 : renderedHtml2;
  const setRenderedHtml = activeResponse === "1" ? setRenderedHtml1 : setRenderedHtml2;
  const comments = activeResponse === "1" ? comments1 : comments2;
  const setComments = activeResponse === "1" ? setComments1 : setComments2;
  const previewRef = activeResponse === "1" ? previewRef1 : previewRef2;

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
    console.log("=== Mount effect - loading comments for both responses ===");
    
    // 🔄 MIGRATION: Copy old single-response data to Response 1 (one-time)
    const oldLatexCode = localStorage.getItem("latexCode");
    const oldComments = localStorage.getItem("latexComments");
    const hasNewFormat = localStorage.getItem("latexCode_response1") || localStorage.getItem("latexCode_response2");
    
    if ((oldLatexCode || oldComments) && !hasNewFormat) {
      console.log("🔄 Migrating old data to Response 1...");
      
      // Migrate LaTeX code
      if (oldLatexCode && !localStorage.getItem("latexCode_response1")) {
        localStorage.setItem("latexCode_response1", oldLatexCode);
        setLatexCode1(oldLatexCode);
        console.log("✓ Migrated LaTeX code to Response 1");
      }
      
      // Migrate comments
      if (oldComments && !localStorage.getItem("latexComments_response1")) {
        localStorage.setItem("latexComments_response1", oldComments);
        console.log("✓ Migrated comments to Response 1");
      }
      
      // Clean up old keys
      localStorage.removeItem("latexCode");
      localStorage.removeItem("latexComments");
      console.log("✓ Migration complete, old keys removed");
    }
    
    // Load Response 1 comments
    const stored1 = localStorage.getItem("latexComments_response1");
    if (stored1) {
      const parsedComments1 = JSON.parse(stored1);
      const cleaned1 = cleanupComments(parsedComments1, latexCode1);
      console.log("Loaded Response 1 comments:", cleaned1.length);
      setComments1(cleaned1);
      if (cleaned1.length !== parsedComments1.length) {
        localStorage.setItem("latexComments_response1", JSON.stringify(cleaned1));
      }
    }
    
    // Load Response 2 comments
    const stored2 = localStorage.getItem("latexComments_response2");
    if (stored2) {
      const parsedComments2 = JSON.parse(stored2);
      const cleaned2 = cleanupComments(parsedComments2, latexCode2);
      console.log("Loaded Response 2 comments:", cleaned2.length);
      setComments2(cleaned2);
      if (cleaned2.length !== parsedComments2.length) {
        localStorage.setItem("latexComments_response2", JSON.stringify(cleaned2));
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
    console.log("=== Rendering Response 1 ===");
    localStorage.setItem("latexCode_response1", latexCode1);
    const html = renderLatex(latexCode1, comments1);
    setRenderedHtml1(html);
  }, [latexCode1, comments1]);

  // Render Response 2
  useEffect(() => {
    console.log("=== Rendering Response 2 ===");
    localStorage.setItem("latexCode_response2", latexCode2);
    const html = renderLatex(latexCode2, comments2);
    setRenderedHtml2(html);
  }, [latexCode2, comments2]);

  useEffect(() => {
    if (previewRef.current) {
      attachHighlightListeners();
    }
  }, [renderedHtml]);

  const saveComments = (newComments: Comment[]) => {
    console.log("=== saveComments called for Response", activeResponse, "===");
    console.log("Saving comments:", newComments);
    const storageKey = `latexComments_response${activeResponse}`;
    
    if (activeResponse === "1") {
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
    
    // Strategy 1: Try exact match in source
    let index = latexCode.indexOf(selectedText);
    if (index !== -1) {
      console.log('Found exact match in source at position:', index);
      return { start: index, end: index + selectedText.length };
    }
    
    // Strategy 2: Find a significant unique substring
    // Take the first substantial word (5+ characters) that's likely to be in the source
    const words = selectedText.split(/\s+/).filter(w => w.length >= 4);
    
    if (words.length === 0) {
      console.warn('No substantial words found in selection');
      return null;
    }
    
    // Try to find the first substantial word in the source
    const firstWord = words[0];
    const firstWordIndex = latexCode.indexOf(firstWord);
    
    if (firstWordIndex === -1) {
      console.warn('Could not find first word in source:', firstWord);
      return null;
    }
    
    // Find the last substantial word
    const lastWord = words[words.length - 1];
    
    // Search for last word starting from first word position
    const searchStart = firstWordIndex;
    const lastWordIndex = latexCode.indexOf(lastWord, searchStart);
    
    if (lastWordIndex === -1) {
      console.warn('Could not find last word in source:', lastWord);
      // Fallback: use just the first word to the end of its sentence/line
      const endOfContext = Math.min(
        latexCode.indexOf('.', firstWordIndex) + 1,
        latexCode.indexOf('\n', firstWordIndex) + 1,
        firstWordIndex + 200
      );
      return { start: firstWordIndex, end: endOfContext > firstWordIndex ? endOfContext : firstWordIndex + firstWord.length };
    }
    
    const start = firstWordIndex;
    const end = lastWordIndex + lastWord.length;
    
    console.log('Found range in source:', start, '-', end);
    console.log('Source text:', latexCode.substring(start, Math.min(end, start + 100)));
    
    // Validate range
    if (start >= end || start < 0 || end > latexCode.length) {
      console.warn('Invalid range calculated:', start, end);
      return null;
    }
    
    return { start, end };
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

    // ========================================
    // 🔧 MANUAL BUTTON POSITION ADJUSTMENT
    // ========================================
    // Adjust these numbers to move the button:
    const MANUAL_VERTICAL_OFFSET = 700;  // 👈 Change this! Positive = move down, Negative = move up
    const BUTTON_RIGHT_MARGIN = -220;     // 👈 Distance from right edge (default 50px)
    // Position calculation
    const scrollTop = previewRef.current.scrollTop;
    const previewPadding = 24; // p-6 class = 24px padding
    
    setButtonPosition({
      top: rect.top - previewRect.top + scrollTop + previewPadding + MANUAL_VERTICAL_OFFSET,
      left: previewRect.width - BUTTON_RIGHT_MARGIN,
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
      console.log('Source text:', latexCode.substring(sourceRange.start, sourceRange.end).substring(0, 100));
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
              onClick={() => downloadRawAnnotations(comments, latexCode, `annotations-response${activeResponse}-raw.json`)}
              disabled={comments.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export JSON (Response {activeResponse})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadSuperAnnotateJSON(comments, latexCode, `annotations-response${activeResponse}-superannotate.json`)}
              disabled={comments.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export SA (Response {activeResponse})
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

        {/* Response Tabs */}
        <Tabs value={activeResponse} onValueChange={(v) => setActiveResponse(v as "1" | "2")} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="1">Response 1</TabsTrigger>
            <TabsTrigger value="2">Response 2</TabsTrigger>
          </TabsList>

          {/* Response 1 Content */}
          <TabsContent value="1" className="mt-0">
            <div className="grid lg:grid-cols-[1fr,320px] gap-6" onClick={handleClickOutside}>
              <div className="space-y-6">
                <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                  <div className="border-b border-border bg-secondary/30 px-4 py-3">
                    <h2 className="text-sm font-semibold text-foreground">Editor</h2>
                  </div>
                  <Textarea
                    value={latexCode1}
                    onChange={(e) => setLatexCode1(e.target.value)}
                    className="min-h-[300px] border-0 rounded-none bg-[hsl(var(--editor-bg))] font-mono text-sm resize-y focus-visible:ring-0 placeholder:text-muted-foreground/50"
                    placeholder="Enter trace excerpt..."
                  />
                </div>

                <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                  <div className="border-b border-border bg-secondary/30 px-4 py-3">
                    <h2 className="text-sm font-semibold text-foreground">Preview</h2>
                  </div>
                  <div
                    ref={previewRef1}
                    className="min-h-[300px] p-6 bg-[hsl(var(--preview-bg))] relative overflow-auto prose prose-sm max-w-none"
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
                <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                  <div className="border-b border-border bg-secondary/30 px-4 py-3">
                    <h2 className="text-sm font-semibold text-foreground">Editor</h2>
                  </div>
                  <Textarea
                    value={latexCode2}
                    onChange={(e) => setLatexCode2(e.target.value)}
                    className="min-h-[300px] border-0 rounded-none bg-[hsl(var(--editor-bg))] font-mono text-sm resize-y focus-visible:ring-0 placeholder:text-muted-foreground/50"
                    placeholder="Enter trace excerpt..."
                  />
                </div>

                <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                  <div className="border-b border-border bg-secondary/30 px-4 py-3">
                    <h2 className="text-sm font-semibold text-foreground">Preview</h2>
                  </div>
                  <div
                    ref={previewRef2}
                    className="min-h-[300px] p-6 bg-[hsl(var(--preview-bg))] relative overflow-auto prose prose-sm max-w-none"
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
