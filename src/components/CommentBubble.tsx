import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { Comment, CommentType } from "@/types/comment";

interface CommentBubbleProps {
  position: { top: number; left: number };
  onSubmit: (comment: Omit<Comment, "id" | "text" | "timestamp">) => void;
  onClose: () => void;
}

export const CommentBubble = ({ position, onSubmit, onClose }: CommentBubbleProps) => {
  const [type, setType] = useState<CommentType | "">("");
  const [fields, setFields] = useState<string[]>([]);

  const handleTypeChange = (value: CommentType) => {
    setType(value);
    const fieldCount = {
      voq: 5,
      strength: 1,
      improvement: 2,
      other: 1,
    }[value];
    setFields(new Array(fieldCount).fill(""));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!type) return;

    onSubmit({ type, data: fields });
    onClose();
  };

  const renderFields = () => {
    if (!type) return null;

    const fieldConfigs = {
      voq: [
        { label: "Verification Tool", placeholder: "Enter tool name" },
        { label: "Exact Query", placeholder: "Enter query" },
        { label: "URL", placeholder: "Enter URL" },
        { label: "Source Excerpt", placeholder: "Enter source excerpt", multiline: true },
        { label: "Reasoning Trace", placeholder: "Enter reasoning trace", multiline: true },
      ],
      strength: [
        { label: "Strength Description", placeholder: "Explain the strength", multiline: true },
      ],
      improvement: [
        { label: "Excerpt", placeholder: "Enter excerpt", multiline: true },
        { label: "Explanation", placeholder: "Explain the improvement", multiline: true },
      ],
      other: [
        { label: "Comment", placeholder: "Enter your comment", multiline: true },
      ],
    };

    return fieldConfigs[type].map((config, i) => (
      <div key={i} className="space-y-1">
        <label className="text-xs font-medium text-foreground">{config.label}</label>
        {config.multiline ? (
          <Textarea
            value={fields[i] || ""}
            onChange={(e) => {
              const newFields = [...fields];
              newFields[i] = e.target.value;
              setFields(newFields);
            }}
            placeholder={config.placeholder}
            className="min-h-[60px] text-sm"
          />
        ) : (
          <Input
            value={fields[i] || ""}
            onChange={(e) => {
              const newFields = [...fields];
              newFields[i] = e.target.value;
              setFields(newFields);
            }}
            placeholder={config.placeholder}
            className="text-sm"
          />
        )}
      </div>
    ));
  };

  return (
    <div
      className="absolute z-50 w-80 bg-card border border-border rounded-lg shadow-xl p-4 animate-in fade-in zoom-in-95 duration-200"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Add Annotation</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Type</label>
          <Select value={type} onValueChange={handleTypeChange}>
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

        {renderFields()}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={!type}>
            Add
          </Button>
        </div>
      </form>
    </div>
  );
};
