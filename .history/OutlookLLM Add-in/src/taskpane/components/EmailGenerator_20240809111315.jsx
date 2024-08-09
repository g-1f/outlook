const wrapInHtml = (content) => {
  if (content == null) {
    console.error("Received null or undefined content in wrapInHtml");
    return "<html><body><p>Error: No content available.</p></body></html>";
  }

  const escapeHtml = (unsafe) => {
    if (typeof unsafe !== 'string') {
      console.error("Non-string content passed to escapeHtml:", unsafe);
      return "";
    }
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Pre-process content to handle common markdown syntax
  const processMarkdown = (text) => {
    if (typeof text !== 'string') {
      console.error("Non-string content passed to processMarkdown:", text);
      return "";
    }
    
    // Convert markdown headers to HTML
    text = text.replace(/^(#{1,6})\s+(.*?)$/gm, (match, hashes, content) => {
      const level = hashes.length;
      return `<h${level}>${content}</h${level}>`;
    });
    
    // Convert markdown links to HTML
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    // Convert markdown bold to HTML
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert markdown italic to HTML
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convert markdown code blocks to HTML
    text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    
    // Convert markdown inline code to HTML
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Convert markdown unordered lists to HTML
    text = text.replace(/^(\s*)-\s+(.*?)$/gm, '<li>$2</li>');
    text = text.replace(/<li>.*?<\/li>/gs, '<ul>$&</ul>');

    // Convert markdown ordered lists to HTML
    text = text.replace(/^(\s*)\d+\.\s+(.*?)$/gm, '<li>$2</li>');
    text = text.replace(/<li>.*?<\/li>/gs, '<ol>$&</ol>');

    // Convert markdown horizontal rules to HTML
    text = text.replace(/^---$/gm, '<hr>');

    return text;
  };

  try {
    const processedContent = processMarkdown(content);
    const escapedContent = escapeHtml(processedContent);
    const formattedContent = escapedContent.replace(/\n/g, "<br>");

    return `
      <html>
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
            .email-content { 
              white-space: pre-wrap; 
              font-family: inherit; 
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
            p { margin-top: 0; margin-bottom: 1em; }
            ul, ol { 
              padding-left: 20px; 
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
          <div class="email-content">${formattedContent}</div>
        </body>
      </html>
    `;
  } catch (error) {
    console.error("Error in wrapInHtml:", error);
    return "<html><body><p>Error processing content.</p></body></html>";
  }
};