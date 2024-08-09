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

    // Process block elements first
    text = text
      // Convert headers
      .replace(/^(#{1,6})\s+(.*?)$/gm, (match, hashes, content) => {
        const level = hashes.length;
        return `<h${level}>${content}</h${level}>`;
      })
      // Convert lists
      .replace(/(\n|^)(\s*)(\d+\.|-)\s+(.+)/g, (match, lineStart, indent, bullet, item) => {
        const listType = bullet === '-' ? 'ul' : 'ol';
        const listItem = `<li>${item}</li>`;
        return `${lineStart}<${listType}><li>${item}</li></${listType}>`;
      })
      // Handle nested lists by replacing closing tags
      .replace(/<\/(ul|ol)>\n(<\1>)/g, '')
      .replace(/<\/li>\n(<li>)/g, '</li>$1')
      // Convert paragraphs
      .replace(/(\n|^)(?!<\/?(ul|ol|li|h[1-6]|p|a|code|pre|strong|em|hr))(.+)/g, '$1<p>$3</p>');

    // Process inline elements
    text = text
      // Convert links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // Convert bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Convert italic text
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Convert code blocks
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      // Convert inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Convert horizontal rules
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