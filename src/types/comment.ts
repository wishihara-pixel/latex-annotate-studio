export type CommentType = "voq" | "strength" | "improvement" | "other";

export interface Comment {
  id: string;
  type: CommentType;
  text: string;
  data: string[];
  timestamp: number;
}
