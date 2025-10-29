import katex from "katex";
import { Comment } from "@/types/comment";

// Escape HTML entities
const escapeHtml = (text: string): string => {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
};

// Unescape HTML entities (opposite of escapeHtml)
const unescapeHtml = (text: string): string => {
  const div = document.createElement("div");
  div.innerHTML = text;
  return div.textContent || text;
};

// Apply highlights to the LaTeX source using special marker tokens
// These markers will survive LaTeX rendering and can be used to wrap content after
const applyHighlightsToSource = (text: string, comments: Comment[]): { text: string; commentMap: Map<string, string> } => {
  if (comments.length === 0) return { text, commentMap: new Map() };

  // Sort comments by start position in reverse order to avoid position shifts
  const sortedComments = [...comments].sort((a, b) => b.range.start - a.range.start);
  
  let result = text;
  const commentMap = new Map<string, string>();
  
  sortedComments.forEach((comment) => {
    const start = comment.range.start;
    const end = comment.range.end;
    
    // Validate range
    if (start < 0 || end > result.length || start >= end) {
      console.warn('Invalid range for comment:', comment.id, start, end);
      return;
    }
    
    const before = result.substring(0, start);
    const highlighted = result.substring(start, end);
    const after = result.substring(end);
    
    // Use zero-width space markers with unique IDs that won't interfere with rendering
    const startToken = `\u200B##HLSTART##${comment.id}##\u200B`;
    const endToken = `\u200B##HLEND##${comment.id}##\u200B`;
    
    result = `${before}${startToken}${highlighted}${endToken}${after}`;
    commentMap.set(comment.id, highlighted);
    
    console.log(`Inserted markers for comment ${comment.id} around:`, highlighted.substring(0, 50));
  });
  
  return { text: result, commentMap };
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

// Helper function to process LaTeX content (without comments)
const processLatexContent = (content: string): string => {
  let processed = content;
  
  // Handle literal \n strings
  processed = processed.replace(/\\n(?![a-zA-Z])/g, "\n");
  
  // Auto-fix incomplete LaTeX commands
  processed = processed.replace(/\\left\s+(?![(\[{|])/g, '\\left( ');
  processed = processed.replace(/\\right\s+(?![)\]}|])/g, ' \\right)');
  processed = processed.replace(/\\bigg(?![lr])\s*(?![(\[{|])/g, '\\bigg| ');
  processed = processed.replace(/\\Bigg(?![lr])\s*(?![(\[{|])/g, '\\Bigg| ');
  processed = processed.replace(/\\big(?![glr])\s*(?![(\[{|])/g, '\\big| ');
  processed = processed.replace(/\\Big(?![glr])\s*(?![(\[{|])/g, '\\Big| ');
  
  // Try to render with KaTeX
  if (/\\[a-zA-Z]+|\^|_|\{|\}/.test(processed)) {
    try {
      return katex.renderToString(processed, {
        throwOnError: false,
        displayMode: false,
        strict: false,
        trust: true,
      });
    } catch (e) {
      return escapeHtml(processed);
    }
  }
  
  return escapeHtml(processed);
};

// Render LaTeX with custom parentheses support
export const renderLatex = (text: string, comments: Comment[] = []): string => {
  console.log('=== renderLatex called with', comments.length, 'comments ===');
  
  // FIRST: Unescape any HTML entities in the input
  // This handles cases where text was copied with escaped HTML like &lt;span&gt;
  text = unescapeHtml(text);
  
  // Don't insert markers - we'll apply highlights after rendering using text search
  const textBasedComments = comments;
  
  // Handle literal \n strings BEFORE any other processing
  // This prevents \n from interfering with LaTeX detection
  // The data might have literal "\n" character sequences (backslash + n) that need to be converted
  // We need to handle this carefully since LaTeX also uses backslashes
  
  // Replace ONLY standalone \n (not part of LaTeX commands like \newcommand)
  // This regex matches \n but not when followed by a letter (which would be a LaTeX command)
  text = text.replace(/\\n(?![a-zA-Z])/g, "\n");
  
  // Auto-fix incomplete LaTeX commands
  // Fix standalone \left, \right, \bigg, etc. that are missing delimiters
  text = text.replace(/\\left\s+(?![(\[{|])/g, '\\left( ');
  text = text.replace(/\\right\s+(?![)\]}|])/g, ' \\right)');
  text = text.replace(/\\bigg(?![lr])\s*(?![(\[{|])/g, '\\bigg| ');
  text = text.replace(/\\Bigg(?![lr])\s*(?![(\[{|])/g, '\\Bigg| ');
  text = text.replace(/\\big(?![glr])\s*(?![(\[{|])/g, '\\big| ');
  text = text.replace(/\\Big(?![glr])\s*(?![(\[{|])/g, '\\Big| ');
  
  // First, protect LaTeX display math blocks
  const displayMathBlocks: string[] = [];
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (match) => {
    displayMathBlocks.push(match);
    return `___DISPLAY_MATH_${displayMathBlocks.length - 1}___`;
  });

  // Protect standard inline math delimiters: \( ... \)
  const inlineMathBlocks: string[] = [];
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (match) => {
    inlineMathBlocks.push(match);
    return `___INLINE_MATH_${inlineMathBlocks.length - 1}___`;
  });
  
  // Protect environments like \begin{array}...\end{array}, \begin{cases}...\end{cases}, etc.
  // These need to be rendered as display math even if inline
  const environmentBlocks: string[] = [];
  text = text.replace(/\\begin\{([^}]+)\}([\s\S]*?)\\end\{\1\}/g, (match) => {
    environmentBlocks.push(match);
    return `___ENVIRONMENT_${environmentBlocks.length - 1}___`;
  });

  // Enhanced LaTeX detection - now supports multiple delimiters and more patterns
  // Apply in order from most specific to least specific to avoid double-rendering
  
  // 1. Square brackets with LaTeX content: [ content ]
  text = text.replace(/\[([^\[\]]*(?:\\[a-zA-Z]+|[\^_{}])[^\[\]]*)\]/g, (match, content) => {
    // Only if it looks like math (not a markdown link)
    if (/\\[a-zA-Z]+|[\^_{}]/.test(content) && !match.includes('](')) {
      try {
        const rendered = katex.renderToString(content, {
          throwOnError: false,
          displayMode: false,
          strict: false,
          trust: true,
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
          strict: false,
          trust: true,
        });
        return `<span class="katex-inline-custom">${rendered}</span>`;
      } catch {
        return match;
      }
    }
    return match;
  });
  
  // 3. Greek letters with subscripts/superscripts FIRST (before backslash commands)
  // Matches: γ^μ, g_{μν}, γ^μ_ν, etc.
  // Greek letter range: \u0370-\u03FF (Greek and Coptic), \u1F00-\u1FFF (Greek Extended)
  text = text.replace(/([\u0370-\u03FF\u1F00-\u1FFFa-zA-Z0-9]+(?:_\{[^}]+\}|\^\{[^}]+\}|_[\u0370-\u03FF\u1F00-\u1FFFa-zA-Z0-9]+|\^[\u0370-\u03FF\u1F00-\u1FFFa-zA-Z0-9]+)+)/g, (match) => {
    try {
      const rendered = katex.renderToString(match, {
        throwOnError: false,
        displayMode: false,
        strict: false,
        trust: true,
      });
      return `<span class="katex-inline-custom">${rendered}</span>`;
    } catch {
      return match;
    }
  });
  
  // 4. Aggressive inline detection: standalone LaTeX commands with proper brace matching
  // This handles nested braces like \frac{a}{b}, \frac{\frac{x}{y}}{z}, etc.
  const processInlineLaTeX = (text: string): string => {
    let result = '';
    let i = 0;
    
    while (i < text.length) {
      // Look for backslash followed by letters (LaTeX command)
      if (text[i] === '\\' && i + 1 < text.length && /[a-zA-Z]/.test(text[i + 1])) {
        let j = i + 1;
        // Get the command name
        while (j < text.length && /[a-zA-Z]/.test(text[j])) {
          j++;
        }
        
        // Now look for arguments in braces
        let command = text.substring(i, j);
        let args = '';
        let k = j;
        
        // Match all brace groups that follow
        while (k < text.length && text[k] === '{') {
          let braceCount = 1;
          let start = k;
          k++; // skip opening brace
          
          while (k < text.length && braceCount > 0) {
            if (text[k] === '{') braceCount++;
            else if (text[k] === '}') braceCount--;
            k++;
          }
          
          args += text.substring(start, k);
        }
        
        // Also check for superscripts and subscripts
        while (k < text.length && (text[k] === '^' || text[k] === '_')) {
          args += text[k++];
          if (k < text.length && text[k] === '{') {
            let braceCount = 1;
            let start = k;
            k++;
            while (k < text.length && braceCount > 0) {
              if (text[k] === '{') braceCount++;
              else if (text[k] === '}') braceCount--;
              k++;
            }
            args += text.substring(start, k);
          } else if (k < text.length && /[a-zA-Z0-9]/.test(text[k])) {
            args += text[k++];
          }
        }
        
        const fullMatch = command + args;
        
        // Try to render it
        if (args.length > 0) {
          try {
            const rendered = katex.renderToString(fullMatch, {
              throwOnError: false,
              displayMode: false,
              strict: false,
              trust: true,
            });
            result += `<span class="katex-inline-custom">${rendered}</span>`;
            i = k;
            continue;
          } catch (e) {
            // If rendering fails, just keep the original
          }
        }
      }
      
      result += text[i];
      i++;
    }
    
    return result;
  };
  
  text = processInlineLaTeX(text);
  
  // 5. Standalone Greek letters (render them as math to get proper font)
  // Only match if NOT already inside a katex-inline-custom span
  text = text.replace(/(?<!katex-inline-custom">[\s\S]{0,100})([\u0370-\u03FF\u1F00-\u1FFF]+)(?![\s\S]{0,100}<\/span>)/g, (match) => {
    try {
      const rendered = katex.renderToString(match, {
        throwOnError: false,
        displayMode: false,
        strict: false,
        trust: true,
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
  
  // Convert double newlines to paragraphs, single newlines to line breaks
  text = text.replace(/\n\n/g, "</p><p>");
  text = text.replace(/\n/g, "<br>");
  text = `<p>${text}</p>`;

  // Restore protected math blocks and render them
  text = text.replace(/___DISPLAY_MATH_(\d+)___/g, (match, index) => {
    const mathContent = displayMathBlocks[parseInt(index)];
    const content = mathContent.slice(2, -2); // Remove \[ and \]
    try {
      return katex.renderToString(content, {
        throwOnError: false,
        displayMode: true,
        strict: false,
        trust: true,
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
        strict: false,
        trust: true,
      });
    } catch {
      return escapeHtml(mathContent);
    }
  });
  
  // Restore environment blocks (array, cases, etc.)
  text = text.replace(/___ENVIRONMENT_(\d+)___/g, (match, index) => {
    const envContent = environmentBlocks[parseInt(index)];
    try {
      // Render environments in display mode for proper formatting
      return katex.renderToString(envContent, {
        throwOnError: false,
        displayMode: true,
        strict: false,
        trust: true,
      });
    } catch {
      return escapeHtml(envContent);
    }
  });

  // Apply text-based highlights AFTER all rendering is complete
  if (textBasedComments.length > 0) {
    console.log('Applying', textBasedComments.length, 'text-based highlights after rendering...');
    text = applyTextBasedHighlights(text, textBasedComments);
  }

  console.log('Final rendered HTML length:', text.length);
  return text;
};

// Helper to escape regex special characters
const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
