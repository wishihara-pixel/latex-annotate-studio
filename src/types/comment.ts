export type CommentType = "voq" | "strength" | "improvement" | "other";

export interface CommentRange {
  start: number;
  end: number;
}

export interface Comment {
  id: string;
  type: CommentType;
  text: string;
  data: string[];
  timestamp: number;
  range: CommentRange;
}
