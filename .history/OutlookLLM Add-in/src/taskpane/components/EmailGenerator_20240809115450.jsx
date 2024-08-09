const wrapInHtml = (content) => {
  if (content == null) {
    console.error("Received null or undefined content in wrapInHtml");
    return "<html><body><p>Error: No content available.</p></body></html>";
  }

  const processMarkdown = (text) => {
    if (typeof text !== 'string') {
      console.error("Non-string content passed to processMarkdown:", text);
      return "";
    }

    // Helper function to process lists
    const processList = (listStr, isOrdered) => {
      const items = listStr.trim().split('\n');
      const listItems = items.map(item => {
        const trimmedItem = item.trim().replace(/^(\d+\.|-)\s*/, '');
        return `<li>${trimmedItem}</li>`;
      }).join('');
      return isOrdered ? `<ol>${listItems}</ol>` : `<ul>${listItems}</ul>`;
    };

    // Process block elements first
    const blocks = text.split(/\n{2,}/);
    text = blocks.map(block => {
      // Check for lists
      if (/^(\d+\.|-)\s/.test(block)) {
        return processList(block, /^\d+\./.test(block));
      }
      // Check for headers
      if (/^#{1,6}\s/.test(block)) {
        return block.replace(/^(#{1,6})\s+(.*?)$/gm, (match, hashes, content) => {
          const level = hashes.length;
          return `<h${level}>${content}</h${level}>`;
        });
      }
      // Treat as paragraph if not a special block
      return `<p>${block}</p>`;
    }).join('\n');

    // Process inline elements
    text = text
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Code blocks
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Horizontal rules
      .replace(/^---$/gm, '<hr>');

    return text;
  };

  try {
    const processedContent = processMarkdown(content);

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            h1, h2, h3, h4, h5, h6 {
              margin-top: 1em;
              margin-bottom: 0.5em;
              line-height: 1.2;
            }
            h1 { font-size: 2em; }
            h2 { font-size: 1.5em; }
            h3 { font-size: 1.17em; }
            h4 { font-size: 1em; }
            h5 { font-size: 0.83em; }
            h6 { font-size: 0.67em; }
            p { margin-top: 0; margin-bottom: 1em; }
            pre {
              background-color: #f4f4f4;
              padding: 10px;
              border-radius: 4px;
              overflow-x: auto;
            }
            code {
              background-color: #f4f4f4;
              padding: 2px 4px;
              border-radius: 2px;
              font-family: monospace;
            }
            ul, ol {
              padding-left: 30px;
              margin-bottom: 1em;
            }
            li { margin-bottom: 0.5em; }
            hr {
              border: none;
              border-top: 1px solid #ccc;
              margin: 20px 0;
            }
            a { color: #0066cc; text-decoration: none; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="email-content">${processedContent}</div>
        </body>
      </html>
    `;
  } catch (error) {
    console.error("Error in wrapInHtml:", error);
    return "<html><body><p>Error processing content.</p></body></html>";
  }
};