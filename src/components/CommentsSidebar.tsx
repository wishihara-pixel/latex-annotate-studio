import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Edit2, Check, X, MessageSquare, Copy } from "lucide-react";
import { Comment, CommentType } from "@/types/comment";
import { cn } from "@/lib/utils";

interface CommentsSidebarProps {
  comments: Comment[];
  activeCommentId: string | null;
  showAnnotationForm: boolean;
  onCommentClick: (id: string) => void;
  onDeleteComment: (id: string) => void;
  onUpdateComment: (id: string, updates: Partial<Comment>) => void;
  onAddComment: (comment: Omit<Comment, "id" | "text" | "timestamp" | "range">) => void;
  onCloseAnnotationForm: () => void;
}

export const CommentsSidebar = ({
  comments,
  activeCommentId,
  showAnnotationForm,
  onCommentClick,
  onDeleteComment,
  onUpdateComment,
  onAddComment,
  onCloseAnnotationForm,
}: CommentsSidebarProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editType, setEditType] = useState<CommentType | "">("");
  const [editFields, setEditFields] = useState<string[]>([]);
  const annotationFormRef = useRef<HTMLDivElement>(null);

  // Annotation form state
  const [annotationType, setAnnotationType] = useState<CommentType | "">("");
  const [annotationFields, setAnnotationFields] = useState<string[]>([]);

  const getCommentTypeLabel = (type: CommentType) => {
    const labels = {
      voq: "Verification",
      strength: "Strength",
      improvement: "Improvement",
      other: "Other",
    };
    return labels[type];
  };

  const getCommentTypeColor = (type: CommentType) => {
    const colors = {
      voq: "bg-blue-100 text-blue-700 border-blue-200",
      strength: "bg-green-100 text-green-700 border-green-200",
      improvement: "bg-amber-100 text-amber-700 border-amber-200",
      other: "bg-purple-100 text-purple-700 border-purple-200",
    };
    return colors[type];
  };

  const startEditing = (comment: Comment) => {
    setEditingId(comment.id);
    setEditType(comment.type);
    setEditFields(comment.data);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditType("");
    setEditFields([]);
  };

  const saveEdit = (id: string) => {
    if (!editType) return;
    onUpdateComment(id, { type: editType, data: editFields });
    cancelEditing();
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here if you want
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Auto-scroll to annotation form when it opens
  useEffect(() => {
    if (showAnnotationForm && annotationFormRef.current) {
      // Small delay to ensure the form is rendered
      setTimeout(() => {
        annotationFormRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest' 
        });
      }, 100);
    }
  }, [showAnnotationForm]);

  const handleAnnotationTypeChange = (value: CommentType) => {
    setAnnotationType(value);
    const fieldCount = {
      voq: 5,
      strength: 1,
      improvement: 2,
      other: 1,
    }[value];
    setAnnotationFields(new Array(fieldCount).fill(""));
  };

  const handleAnnotationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annotationType) return;

    onAddComment({ type: annotationType, data: annotationFields });
    setAnnotationType("");
    setAnnotationFields([]);
    // Don't call onCloseAnnotationForm - handleAddComment already closes the form
    // Calling it here causes a race condition with stale state
  };

  const renderCommentContent = (comment: Comment) => {
    const fieldConfigs = {
      voq: ["Tool", "Query", "URL", "Source", "Reasoning"],
      strength: ["Description"],
      improvement: ["Excerpt", "Explanation"],
      other: ["Comment"],
    };

    const labels = fieldConfigs[comment.type];

    return (
      <div className="space-y-2 text-xs">
        {comment.data.map((value, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-foreground">{labels[i]}:</span>{" "}
              <span className="text-muted-foreground break-words">{value}</span>
            </div>
            {value && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 flex-shrink-0 opacity-60 hover:opacity-100"
                onClick={() => copyToClipboard(value)}
                title="Copy to clipboard"
              >
                <Copy className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderEditForm = (comment: Comment) => {
    const fieldConfigs = {
      voq: [
        { label: "Tool", multiline: false },
        { label: "Query", multiline: false },
        { label: "URL", multiline: false },
        { label: "Source", multiline: true },
        { label: "Reasoning", multiline: true },
      ],
      strength: [{ label: "Description", multiline: true }],
      improvement: [
        { label: "Excerpt", multiline: true },
        { label: "Explanation", multiline: true },
      ],
      other: [{ label: "Comment", multiline: true }],
    };

    const configs = editType ? fieldConfigs[editType] : fieldConfigs[comment.type];

    return (
      <div className="space-y-3 pt-3 border-t">
        <Select value={editType || comment.type} onValueChange={(v) => setEditType(v as CommentType)}>
          <SelectTrigger className="text-xs h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="voq">Verification</SelectItem>
            <SelectItem value="strength">Strength</SelectItem>
            <SelectItem value="improvement">Improvement</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        {configs.map((config, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">{config.label}</label>
              {editFields[i] && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-60 hover:opacity-100"
                  onClick={() => copyToClipboard(editFields[i])}
                  title="Copy to clipboard"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              )}
            </div>
            {config.multiline ? (
              <Textarea
                value={editFields[i] || ""}
                onChange={(e) => {
                  const newFields = [...editFields];
                  newFields[i] = e.target.value;
                  setEditFields(newFields);
                }}
                className="min-h-[50px] text-xs"
              />
            ) : (
              <Input
                value={editFields[i] || ""}
                onChange={(e) => {
                  const newFields = [...editFields];
                  newFields[i] = e.target.value;
                  setEditFields(newFields);
                }}
                className="h-8 text-xs"
              />
            )}
          </div>
        ))}

        <div className="flex gap-2">
          <Button size="sm" className="h-7 text-xs flex-1" onClick={() => saveEdit(comment.id)}>
            <Check className="h-3 w-3 mr-1" /> Save
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={cancelEditing}>
            <X className="h-3 w-3 mr-1" /> Cancel
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden sticky top-8 max-h-[calc(100vh-8rem)]">
      <div className="border-b border-border bg-secondary/30 px-4 py-3 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">
          Annotations ({comments.length})
        </h2>
      </div>

      <div className="overflow-auto max-h-[calc(100vh-12rem)] p-4 space-y-3">
        {/* Annotation form moved to bottom - see below */}
        {false && showAnnotationForm && (
          <div className="bg-accent/10 border border-accent rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Add Annotation</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onCloseAnnotationForm}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleAnnotationSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Type</label>
                <Select value={annotationType} onValueChange={handleAnnotationTypeChange}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="voq">Verification of Quality</SelectItem>
                    <SelectItem value="strength">Strength</SelectItem>
                    <SelectItem value="improvement">Area of Improvement</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {annotationType && (
                <div className="space-y-2">
                  {annotationType === "voq" && (
                    <>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Verification Tool</label>
                        <Select
                          value={annotationFields[0] || ""}
                          onValueChange={(value) => {
                            const newFields = [...annotationFields];
                            newFields[0] = value;
                            setAnnotationFields(newFields);
                          }}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Select verification tool..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Perplexity">Perplexity</SelectItem>
                            <SelectItem value="Google">Google</SelectItem>
                            <SelectItem value="Gemini">Gemini</SelectItem>
                            <SelectItem value="Calculator">Calculator</SelectItem>
                            <SelectItem value="Code Executor">Code Executor</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Exact Query</label>
                        <Input
                          value={annotationFields[1] || ""}
                          onChange={(e) => {
                            const newFields = [...annotationFields];
                            newFields[1] = e.target.value;
                            setAnnotationFields(newFields);
                          }}
                          placeholder="Enter query"
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">URL</label>
                        <Input
                          value={annotationFields[2] || ""}
                          onChange={(e) => {
                            const newFields = [...annotationFields];
                            newFields[2] = e.target.value;
                            setAnnotationFields(newFields);
                          }}
                          placeholder="Enter URL"
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Source Excerpt</label>
                        <Textarea
                          value={annotationFields[3] || ""}
                          onChange={(e) => {
                            const newFields = [...annotationFields];
                            newFields[3] = e.target.value;
                            setAnnotationFields(newFields);
                          }}
                          placeholder="Enter source excerpt"
                          className="min-h-[60px] text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Reasoning Trace</label>
                        <Textarea
                          value={annotationFields[4] || ""}
                          onChange={(e) => {
                            const newFields = [...annotationFields];
                            newFields[4] = e.target.value;
                            setAnnotationFields(newFields);
                          }}
                          placeholder="Enter reasoning trace"
                          className="min-h-[60px] text-sm"
                        />
                      </div>
                    </>
                  )}
                  {annotationType === "strength" && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Strength Description</label>
                      <Textarea
                        value={annotationFields[0] || ""}
                        onChange={(e) => {
                          const newFields = [...annotationFields];
                          newFields[0] = e.target.value;
                          setAnnotationFields(newFields);
                        }}
                        placeholder="Explain the strength"
                        className="min-h-[60px] text-sm"
                      />
                    </div>
                  )}
                  {annotationType === "improvement" && (
                    <>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Excerpt</label>
                        <Textarea
                          value={annotationFields[0] || ""}
                          onChange={(e) => {
                            const newFields = [...annotationFields];
                            newFields[0] = e.target.value;
                            setAnnotationFields(newFields);
                          }}
                          placeholder="Enter excerpt"
                          className="min-h-[60px] text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Explanation</label>
                        <Textarea
                          value={annotationFields[1] || ""}
                          onChange={(e) => {
                            const newFields = [...annotationFields];
                            newFields[1] = e.target.value;
                            setAnnotationFields(newFields);
                          }}
                          placeholder="Explain the improvement"
                          className="min-h-[60px] text-sm"
                        />
                      </div>
                    </>
                  )}
                  {annotationType === "other" && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Comment</label>
                      <Textarea
                        value={annotationFields[0] || ""}
                        onChange={(e) => {
                          const newFields = [...annotationFields];
                          newFields[0] = e.target.value;
                          setAnnotationFields(newFields);
                        }}
                        placeholder="Enter your comment"
                        className="min-h-[60px] text-sm"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={onCloseAnnotationForm}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={!annotationType}>
                  Add
                </Button>
              </div>
            </form>
          </div>
        )}

        {comments.filter(c => c.data.length > 0 && c.data.some(d => d && d.trim())).length === 0 && !showAnnotationForm ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No annotations yet</p>
            <p className="text-xs mt-1">Select text to add one</p>
          </div>
        ) : (
          comments
            .filter(c => c.data.length > 0 && c.data.some(d => d && d.trim())) // Only show completed comments
            .map((comment) => (
            <div
              key={comment.id}
              data-comment-id={comment.id}
              className={cn(
                "p-3 rounded-lg border-l-4 transition-all cursor-pointer hover:shadow-md",
                activeCommentId === comment.id
                  ? "bg-accent/10 border-accent shadow-md"
                  : "bg-secondary/50 border-[hsl(var(--highlight))]"
              )}
              onClick={() => onCommentClick(comment.id)}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span
                  className={cn(
                    "text-xs px-2 py-1 rounded-full font-medium border",
                    getCommentTypeColor(comment.type)
                  )}
                >
                  {getCommentTypeLabel(comment.type)}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing(comment);
                    }}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteComment(comment.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="text-xs font-medium mb-2 p-2 bg-[hsl(var(--highlight))]/20 rounded flex items-start justify-between gap-2">
                <span className="flex-1">"{comment.text}"</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 flex-shrink-0 opacity-60 hover:opacity-100"
                  onClick={() => copyToClipboard(comment.text)}
                  title="Copy highlighted text"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>

              {editingId === comment.id ? renderEditForm(comment) : renderCommentContent(comment)}
            </div>
          ))
        )}

        {/* Add Annotation Form - now at the bottom */}
        {showAnnotationForm && (
          <div ref={annotationFormRef} className="bg-accent/10 border border-accent rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Add Annotation</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onCloseAnnotationForm}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleAnnotationSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Type</label>
                <Select value={annotationType} onValueChange={handleAnnotationTypeChange}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="voq">Verification of Quality</SelectItem>
                    <SelectItem value="strength">Strength</SelectItem>
                    <SelectItem value="improvement">Area of Improvement</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {annotationType && (
                <div className="space-y-2">
                  {annotationType === "voq" && (
                    <>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Verification Tool</label>
                        <Select
                          value={annotationFields[0] || ""}
                          onValueChange={(value) => {
                            const newFields = [...annotationFields];
                            newFields[0] = value;
                            setAnnotationFields(newFields);
                          }}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Select verification tool..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Perplexity">Perplexity</SelectItem>
                            <SelectItem value="Google">Google</SelectItem>
                            <SelectItem value="Gemini">Gemini</SelectItem>
                            <SelectItem value="Calculator">Calculator</SelectItem>
                            <SelectItem value="Code Executor">Code Executor</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Exact Query</label>
                        <Input
                          value={annotationFields[1] || ""}
                          onChange={(e) => {
                            const newFields = [...annotationFields];
                            newFields[1] = e.target.value;
                            setAnnotationFields(newFields);
                          }}
                          placeholder="Enter query"
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">URL</label>
                        <Input
                          value={annotationFields[2] || ""}
                          onChange={(e) => {
                            const newFields = [...annotationFields];
                            newFields[2] = e.target.value;
                            setAnnotationFields(newFields);
                          }}
                          placeholder="Enter URL"
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Source Excerpt</label>
                        <Textarea
                          value={annotationFields[3] || ""}
                          onChange={(e) => {
                            const newFields = [...annotationFields];
                            newFields[3] = e.target.value;
                            setAnnotationFields(newFields);
                          }}
                          placeholder="Enter source excerpt"
                          className="min-h-[60px] text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Reasoning Trace</label>
                        <Textarea
                          value={annotationFields[4] || ""}
                          onChange={(e) => {
                            const newFields = [...annotationFields];
                            newFields[4] = e.target.value;
                            setAnnotationFields(newFields);
                          }}
                          placeholder="Enter reasoning trace"
                          className="min-h-[60px] text-sm"
                        />
                      </div>
                    </>
                  )}

                  {annotationType === "strength" && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Strength Description</label>
                      <Textarea
                        value={annotationFields[0] || ""}
                        onChange={(e) => {
                          const newFields = [...annotationFields];
                          newFields[0] = e.target.value;
                          setAnnotationFields(newFields);
                        }}
                        placeholder="Explain the strength"
                        className="min-h-[60px] text-sm"
                      />
                    </div>
                  )}

                  {annotationType === "improvement" && (
                    <>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Excerpt</label>
                        <Textarea
                          value={annotationFields[0] || ""}
                          onChange={(e) => {
                            const newFields = [...annotationFields];
                            newFields[0] = e.target.value;
                            setAnnotationFields(newFields);
                          }}
                          placeholder="Enter excerpt"
                          className="min-h-[60px] text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Explanation</label>
                        <Textarea
                          value={annotationFields[1] || ""}
                          onChange={(e) => {
                            const newFields = [...annotationFields];
                            newFields[1] = e.target.value;
                            setAnnotationFields(newFields);
                          }}
                          placeholder="Explain the improvement"
                          className="min-h-[60px] text-sm"
                        />
                      </div>
                    </>
                  )}

                  {annotationType === "other" && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Comment</label>
                      <Textarea
                        value={annotationFields[0] || ""}
                        onChange={(e) => {
                          const newFields = [...annotationFields];
                          newFields[0] = e.target.value;
                          setAnnotationFields(newFields);
                        }}
                        placeholder="Enter your comment"
                        className="min-h-[60px] text-sm"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="button" size="sm" variant="outline" className="flex-1" onClick={onCloseAnnotationForm}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={!annotationType}>
                  Add
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
