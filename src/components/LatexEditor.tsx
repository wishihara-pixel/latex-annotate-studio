import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { renderLatex } from "@/lib/latex-renderer";
import { CommentBubble } from "./CommentBubble";
import { CommentsSidebar } from "./CommentsSidebar";
import { Comment } from "@/types/comment";
import "katex/dist/katex.min.css";

export const LatexEditor = () => {
  const [latexCode, setLatexCode] = useState(
    localStorage.getItem("latexCode") || 
    "# Example LaTeX Document\n\nThis is a sample document with LaTeX support.\n\n## Inline Math\nThe equation (E = mc^2) shows mass-energy equivalence.\n\n## Display Math\n\\[\n\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}\n\\]\n\n## Custom Parentheses Syntax\nScientific notation: (3.4 \\times 10^{-7})\n\nText formatting: (\\text{Hello World})\n\n**Try selecting text to add annotations!**"
  );
  const [renderedHtml, setRenderedHtml] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [showBubble, setShowBubble] = useState(false);
  const [bubblePosition, setBubblePosition] = useState({ top: 0, left: 0 });
  const [selectedRange, setSelectedRange] = useState<Range | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("latexComments");
    if (stored) {
      setComments(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("latexCode", latexCode);
    const html = renderLatex(latexCode, comments);
    setRenderedHtml(html);
  }, [latexCode, comments]);

  useEffect(() => {
    if (previewRef.current) {
      attachHighlightListeners();
    }
  }, [renderedHtml]);

  const saveComments = (newComments: Comment[]) => {
    setComments(newComments);
    localStorage.setItem("latexComments", JSON.stringify(newComments));
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
      
      // Scroll comment into view
      const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
      if (commentElement) {
        commentElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  const handleMouseUp = () => {
    if (!previewRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

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

    // Get position for bubble
    const rects = range.getClientRects();
    if (rects.length === 0) return;

    const rect = rects[0];
    const previewRect = previewRef.current.getBoundingClientRect();

    setBubblePosition({
      top: rect.bottom - previewRect.top + 8,
      left: rect.left - previewRect.left,
    });

    setSelectedRange(range.cloneRange());
    setSelectedText(text);
    setShowBubble(true);
  };

  const handleAddComment = (comment: Omit<Comment, "id" | "text" | "timestamp">) => {
    if (!selectedRange || !selectedText) return;

    const newComment: Comment = {
      ...comment,
      id: Date.now().toString(36),
      text: selectedText,
      timestamp: Date.now(),
    };

    saveComments([...comments, newComment]);
    setShowBubble(false);
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
    
    // Scroll highlight into view
    const highlight = previewRef.current?.querySelector(`[data-comment-id="${id}"]`);
    if (highlight) {
      highlight.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleClickOutside = () => {
    setShowBubble(false);
    setActiveCommentId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-2">
            LaTeX Annotator
          </h1>
          <p className="text-muted-foreground">
            Write LaTeX, render beautifully, annotate precisely
          </p>
        </header>

        <div className="grid lg:grid-cols-[1fr,320px] gap-6" onClick={handleClickOutside}>
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
              <div className="border-b border-border bg-secondary/30 px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">Editor</h2>
              </div>
              <Textarea
                value={latexCode}
                onChange={(e) => setLatexCode(e.target.value)}
                className="min-h-[300px] border-0 rounded-none bg-[hsl(var(--editor-bg))] font-mono text-sm resize-y focus-visible:ring-0"
                placeholder="Type your LaTeX here..."
              />
            </div>

            <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
              <div className="border-b border-border bg-secondary/30 px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">Preview</h2>
              </div>
              <div
                ref={previewRef}
                className="min-h-[300px] p-6 bg-[hsl(var(--preview-bg))] relative overflow-auto prose prose-sm max-w-none"
                onMouseUp={handleMouseUp}
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
                onClick={(e) => e.stopPropagation()}
              />
              
              {showBubble && (
                <CommentBubble
                  position={bubblePosition}
                  onSubmit={handleAddComment}
                  onClose={() => setShowBubble(false)}
                />
              )}
            </div>
          </div>

          <CommentsSidebar
            comments={comments}
            activeCommentId={activeCommentId}
            onCommentClick={handleCommentClick}
            onDeleteComment={handleDeleteComment}
            onUpdateComment={handleUpdateComment}
          />
        </div>
      </div>
    </div>
  );
};
