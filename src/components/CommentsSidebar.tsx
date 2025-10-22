import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Edit2, Check, X, MessageSquare } from "lucide-react";
import { Comment, CommentType } from "@/types/comment";
import { cn } from "@/lib/utils";

interface CommentsSidebarProps {
  comments: Comment[];
  activeCommentId: string | null;
  onCommentClick: (id: string) => void;
  onDeleteComment: (id: string) => void;
  onUpdateComment: (id: string, updates: Partial<Comment>) => void;
}

export const CommentsSidebar = ({
  comments,
  activeCommentId,
  onCommentClick,
  onDeleteComment,
  onUpdateComment,
}: CommentsSidebarProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editType, setEditType] = useState<CommentType | "">("");
  const [editFields, setEditFields] = useState<string[]>([]);

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
          <div key={i}>
            <span className="font-semibold text-foreground">{labels[i]}:</span>{" "}
            <span className="text-muted-foreground">{value}</span>
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
            <label className="text-xs font-medium">{config.label}</label>
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
        {comments.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No annotations yet</p>
            <p className="text-xs mt-1">Select text to add one</p>
          </div>
        ) : (
          comments.map((comment) => (
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

              <div className="text-xs font-medium mb-2 p-2 bg-[hsl(var(--highlight))]/20 rounded">
                "{comment.text}"
              </div>

              {editingId === comment.id ? renderEditForm(comment) : renderCommentContent(comment)}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
