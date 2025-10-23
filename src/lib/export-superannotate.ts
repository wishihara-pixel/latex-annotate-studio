import { Comment } from "@/types/comment";

/**
 * SuperAnnotate JSON format for text annotations
 * This is a basic structure - you may need to adjust based on SuperAnnotate's exact requirements
 */
export interface SuperAnnotateAnnotation {
  type: string;
  points: Array<{x: number; y: number}>;
  className: string;
  attributes: Array<{
    name: string;
    value: string;
  }>;
  metadata: {
    text: string;
    startOffset: number;
    endOffset: number;
  };
}

export interface SuperAnnotateExport {
  metadata: {
    name: string;
    width: number;
    height: number;
    status: string;
  };
  instances: SuperAnnotateAnnotation[];
  tags: string[];
  comments: Array<{
    correspondence: Array<{
      text: string;
      email: string;
      timestamp: number;
    }>;
  }>;
}

/**
 * Convert our Comment format to SuperAnnotate format
 */
export function convertToSuperAnnotate(
  comments: Comment[],
  sourceText: string,
  documentName: string = "latex-document"
): SuperAnnotateExport {
  const instances: SuperAnnotateAnnotation[] = comments.map((comment, index) => {
    return {
      type: "text",
      points: [
        { x: 0, y: index * 20 }, // Placeholder coordinates - adjust as needed
        { x: 100, y: index * 20 + 10 }
      ],
      className: mapCommentTypeToClassName(comment.type),
      attributes: comment.data.map((dataItem, idx) => ({
        name: `field_${idx}`,
        value: dataItem
      })),
      metadata: {
        text: comment.text,
        startOffset: comment.range.start,
        endOffset: comment.range.end
      }
    };
  });

  return {
    metadata: {
      name: documentName,
      width: 1000, // Adjust based on your needs
      height: 1000, // Adjust based on your needs
      status: "NotStarted"
    },
    instances,
    tags: comments.map(c => c.type),
    comments: comments.map(comment => ({
      correspondence: [{
        text: comment.data.join("\n"),
        email: "user@example.com", // Replace with actual user if available
        timestamp: comment.timestamp
      }]
    }))
  };
}

/**
 * Map our comment types to SuperAnnotate class names
 */
function mapCommentTypeToClassName(type: string): string {
  const mapping: Record<string, string> = {
    "voq": "Verification of Quality",
    "strength": "Strength",
    "improvement": "Area of Improvement",
    "other": "Other"
  };
  return mapping[type] || type;
}

/**
 * Export annotations as JSON file
 */
export function downloadSuperAnnotateJSON(
  comments: Comment[],
  sourceText: string,
  filename: string = "annotations-superannotate.json"
): void {
  const exportData = convertToSuperAnnotate(comments, sourceText, filename);
  const jsonString = JSON.stringify(exportData, null, 2);
  
  // Create blob and download
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export just our current format (for backup or debugging)
 */
export function downloadRawAnnotations(
  comments: Comment[],
  sourceText: string,
  filename: string = "annotations-raw.json"
): void {
  const exportData = {
    version: "1.0",
    timestamp: Date.now(),
    sourceText,
    annotations: comments
  };
  
  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

