import katex from "katex";
import { Comment } from "@/types/comment";

// Escape HTML entities
const escapeHtml = (text: string): string => {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
};

// Apply highlights to the LaTeX source before rendering
// Returns both the modified text and the text-based comments
const applyHighlightsToSource = (text: string, comments: Comment[]): { text: string; textBasedComments: Comment[] } => {
  if (comments.length === 0) return { text, textBasedComments: [] };

  // Separate comments into source-mappable and text-based
  const sourceMappable: Comment[] = [];
  const textBased: Comment[] = [];
  
  comments.forEach((comment) => {
    const start = comment.range.start;
    const end = comment.range.end;
    
    // Check if this is a valid source range
    // Fallback ranges (0 to text.length) indicate text-based matching needed
    if (start === 0 && end === comment.text.length) {
      textBased.push(comment);
      console.log('Text-based highlight will be applied for:', comment.id);
    } else if (start >= 0 && end <= text.length && start < end) {
      sourceMappable.push(comment);
    } else {
      console.warn('Invalid range for comment:', comment.id, start, end);
    }
  });

  // Sort source-mappable comments by start position in reverse order
  // This prevents position shifts when inserting markers
  const sortedComments = [...sourceMappable].sort((a, b) => b.range.start - a.range.start);

  let result = text;
  
  sortedComments.forEach((comment) => {
    const start = comment.range.start;
    const end = comment.range.end;

    // Extract the text to be highlighted
    const before = result.substring(0, start);
    const highlighted = result.substring(start, end);
    const after = result.substring(end);

    // Insert highlight markers that will survive the rendering process
    result = `${before}<<<HIGHLIGHT_START:${comment.id}>>>${highlighted}<<<HIGHLIGHT_END:${comment.id}>>>${after}`;
  });

  return { text: result, textBasedComments: textBased };
};

// Helper function to apply text-based highlights to rendered HTML
const applyTextBasedHighlights = (html: string, textBasedComments: Comment[]): string => {
  if (textBasedComments.length === 0) return html;
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  textBasedComments.forEach((comment) => {
    const searchText = comment.text.trim();
    console.log('Applying text-based highlight for:', searchText.substring(0, 50));
    
    // Get all text content to verify it exists
    const fullText = doc.body.textContent || '';
    if (!fullText.includes(searchText)) {
      console.warn('Text not found in rendered output:', searchText.substring(0, 50));
      return;
    }
    
    // Find text nodes that contain the search text
    const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
    let node: Node | null;
    let found = false;
    
    while ((node = walker.nextNode()) && !found) {
      const textNode = node as Text;
      const text = textNode.textContent || '';
      const index = text.indexOf(searchText);
      
      if (index !== -1) {
        // Found it - wrap it
        const before = text.substring(0, index);
        const match = text.substring(index, index + searchText.length);
        const after = text.substring(index + searchText.length);
        
        const mark = doc.createElement('mark');
        mark.className = 'latex-highlight';
        mark.setAttribute('data-comment-id', comment.id);
        mark.textContent = match;
        
        const parent = textNode.parentNode!;
        if (before) parent.insertBefore(doc.createTextNode(before), textNode);
        parent.insertBefore(mark, textNode);
        if (after) parent.insertBefore(doc.createTextNode(after), textNode);
        parent.removeChild(textNode);
        
        console.log('✓ Applied text-based highlight for:', comment.id);
        found = true;
      }
    }
    
    if (!found) {
      console.warn('Could not apply text-based highlight for:', searchText.substring(0, 50));
    }
  });
  
  return doc.body.innerHTML;
};

// Render LaTeX with custom parentheses support
export const renderLatex = (text: string, comments: Comment[] = []): string => {
  console.log('=== renderLatex called with', comments.length, 'comments ===');
  
  // Apply highlights to the SOURCE before any rendering
  const { text: highlightedText, textBasedComments } = applyHighlightsToSource(text, comments);
  
  // CRITICAL: Protect highlight markers IMMEDIATELY before any processing
  // Store them and replace with safe placeholders
  // Use a format that won't be touched by markdown or LaTeX: XXXHIGHLIGHTXXX
  const protectedMarkers: Array<{ commentId: string; content: string }> = [];
  text = highlightedText.replace(/<<<HIGHLIGHT_START:([^>]+)>>>([\s\S]*?)<<<HIGHLIGHT_END:\1>>>/g, (match, commentId, content) => {
    const index = protectedMarkers.length;
    protectedMarkers.push({ commentId, content });
    return `XXXHIGHLIGHTPLACEHOLDERXXX${index}XXXENDXXX`;
  });
  
  console.log('Protected', protectedMarkers.length, 'highlights from processing');
  console.log('Text-based comments to process later:', textBasedComments.length);
  
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

  // Enhanced LaTeX detection - now supports multiple delimiters and more patterns
  
  // 1. Square brackets with LaTeX content: [ content ]
  text = text.replace(/\[([^\[\]]*(?:\\[a-zA-Z]+|[\^_{}])[^\[\]]*)\]/g, (match, content) => {
    // Only if it looks like math (not a markdown link)
    if (/\\[a-zA-Z]+|[\^_{}]/.test(content) && !match.includes('](')) {
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
  
  // 2. Parentheses with LaTeX content: ( content )
  text = text.replace(/\(([^()]*(?:\\[a-zA-Z]+|[\^_{}])[^()]*)\)/g, (match, content) => {
    // Check if it looks like LaTeX
    if (/\\[a-zA-Z]+|[\^_{}]/.test(content)) {
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
  
  // 3. Aggressive inline detection: standalone LaTeX commands or expressions
  // Matches things like: \frac{a}{b}, \sqrt{2}, x^2, x_i, etc. (not in delimiters)
  text = text.replace(/(?<![\\([\$])\\([a-zA-Z]+)(\{[^}]*\})*(\^[^{\s]*|\^\{[^}]*\})?(_[^{\s]*|_\{[^}]*\})?/g, (match) => {
    // Don't match if this is part of a larger LaTeX block or markdown formatting
    try {
      const rendered = katex.renderToString(match, {
        throwOnError: false,
        displayMode: false,
      });
      return `<span class="katex-inline-custom">${rendered}</span>`;
    } catch {
      return match;
    }
  });
  
  // 4. Superscripts and subscripts standalone: x^2, x_i, etc.
  text = text.replace(/([a-zA-Z0-9])(\^[{\w}]+|_[{\w}]+)+(?![}])/g, (match) => {
    try {
      const rendered = katex.renderToString(match, {
        throwOnError: false,
        displayMode: false,
      });
      return `<span class="katex-inline-custom">${rendered}</span>`;
    } catch {
      return match;
    }
  });

  // Highlights are already protected as ___PROTECTED_HIGHLIGHT_N___ placeholders
  // They will be restored after all other processing

  // Process markdown-style formatting
  text = text.replace(/^# (.*$)/gim, "<h1>$1</h1>");
  text = text.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  text = text.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*(.*?)\*/g, "<em>$1</em>");
  text = text.replace(/\n\n/g, "</p><p>");
  text = `<p>${text}</p>`;
  
  // Debug: Check if placeholders survived markdown processing
  const placeholderCount = (text.match(/XXXHIGHLIGHTPLACEHOLDERXXX\d+XXXENDXXX/g) || []).length;
  console.log('After markdown processing, found', placeholderCount, 'placeholders');

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

  // Restore protected highlights and convert to HTML marks
  console.log('Restoring', protectedMarkers.length, 'protected highlights...');
  
  // Debug: Check what placeholders look like in the text right now
  const foundPlaceholders = text.match(/XXXHIGHLIGHTPLACEHOLDERXXX\d+XXXENDXXX/g);
  console.log('Placeholders to restore:', foundPlaceholders);
  
  text = text.replace(/XXXHIGHLIGHTPLACEHOLDERXXX(\d+)XXXENDXXX/g, (match, index) => {
    const markerIndex = parseInt(index);
    console.log('Found placeholder for index:', markerIndex, 'Match:', match);
    if (markerIndex < protectedMarkers.length) {
      const marker = protectedMarkers[markerIndex];
      console.log(`Restoring highlight ${markerIndex} for comment:`, marker.commentId, 'Content:', marker.content.substring(0, 50));
      return `<mark class="latex-highlight" data-comment-id="${marker.commentId}">${marker.content}</mark>`;
    }
    console.warn('Could not find marker for index:', markerIndex);
    return match;
  });
  
  console.log('After restoration, remaining placeholders:', (text.match(/XXXHIGHLIGHTPLACEHOLDERXXX\d+XXXENDXXX/g) || []).length);
  
  // Safety cleanup: Remove any remaining unconverted markers
  const remainingStart = text.match(/<<<HIGHLIGHT_START:[^>]+>>>/g);
  const remainingEnd = text.match(/<<<HIGHLIGHT_END:[^>]+>>>/g);
  if (remainingStart || remainingEnd) {
    console.warn('Found unconverted markers:', { start: remainingStart, end: remainingEnd });
    text = text.replace(/<<<HIGHLIGHT_START:[^>]+>>>/g, '');
    text = text.replace(/<<<HIGHLIGHT_END:[^>]+>>>/g, '');
  }

  // Apply text-based highlights for comments that couldn't be mapped to source
  if (textBasedComments.length > 0) {
    console.log('Applying', textBasedComments.length, 'text-based highlights...');
    text = applyTextBasedHighlights(text, textBasedComments);
  }

  console.log('Final rendered HTML length:', text.length);
  return text;
};
