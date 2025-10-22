import katex from "katex";
import { Comment } from "@/types/comment";

// Escape HTML entities
const escapeHtml = (text: string): string => {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
};

// Render LaTeX with custom parentheses support
export const renderLatex = (text: string, comments: Comment[] = []): string => {
  // First, protect LaTeX display math blocks
  const displayMathBlocks: string[] = [];
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (match) => {
    displayMathBlocks.push(match);
    return `___DISPLAY_MATH_${displayMathBlocks.length - 1}___`;
  });

  // Protect standard inline math
  const inlineMathBlocks: string[] = [];
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (match) => {
    inlineMathBlocks.push(match);
    return `___INLINE_MATH_${inlineMathBlocks.length - 1}___`;
  });

  // Convert custom parentheses syntax to inline math
  // Match (content with LaTeX commands like \text, \times, ^, _, etc.)
  text = text.replace(/\(([^()]*(?:\\[a-zA-Z]+|[\^_{}])[^()]*)\)/g, (match, content) => {
    // Check if it looks like LaTeX (contains backslash or math symbols)
    if (/\\|[\^_{}]/.test(content)) {
      try {
        const rendered = katex.renderToString(content, {
          throwOnError: false,
          displayMode: false,
        });
        return `<span class="katex-inline-custom">${rendered}</span>`;
      } catch {
        return match;
      }
    }
    return match;
  });

  // Process markdown-style formatting
  text = text.replace(/^# (.*$)/gim, "<h1>$1</h1>");
  text = text.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  text = text.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*(.*?)\*/g, "<em>$1</em>");
  text = text.replace(/\n\n/g, "</p><p>");
  text = `<p>${text}</p>`;

  // Restore protected math blocks and render them
  text = text.replace(/___DISPLAY_MATH_(\d+)___/g, (match, index) => {
    const mathContent = displayMathBlocks[parseInt(index)];
    const content = mathContent.slice(2, -2); // Remove \[ and \]
    try {
      return katex.renderToString(content, {
        throwOnError: false,
        displayMode: true,
      });
    } catch {
      return escapeHtml(mathContent);
    }
  });

  text = text.replace(/___INLINE_MATH_(\d+)___/g, (match, index) => {
    const mathContent = inlineMathBlocks[parseInt(index)];
    const content = mathContent.slice(2, -2); // Remove \( and \)
    try {
      return katex.renderToString(content, {
        throwOnError: false,
        displayMode: false,
      });
    } catch {
      return escapeHtml(mathContent);
    }
  });

  // Apply highlights for comments
  if (comments.length > 0) {
    comments.forEach((comment) => {
      // Escape special regex characters in the comment text
      const escapedText = comment.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      
      // Create a regex that matches the exact text, but not within existing HTML tags or katex elements
      const regex = new RegExp(
        `(?![^<]*>)(?![^<]*<\\/(?:span|h[1-6]|strong|em|p))\\b(${escapedText})\\b`,
        "gi"
      );

      text = text.replace(regex, (match) => {
        return `<mark class="latex-highlight" data-comment-id="${comment.id}">${match}</mark>`;
      });
    });
  }

  return text;
};
