const wrapInHtml = (content) => {
  if (content == null) {
    console.error("Received null or undefined content in wrapInHtml");
    return "<html><body><p>Error: No content available.</p></body></html>";
  }

  const unescapeSpecialChars = (text) => {
    return text
      .replace(/\\&/g, '&')
      .replace(/\\\$/g, '$')
      .replace(/\\#/g, '#')
      .replace(/\\%/g, '%')
      .replace(/\\_/g, '_')
      .replace(/\\{/g, '{')
      .replace(/\\}/g, '}');
  };

  const processMarkdown = (text) => {
    if (typeof text !== 'string') {
      console.error("Non-string content passed to processMarkdown:", text);
      return "";
    }

    // Unescape special characters first
    text = unescapeSpecialChars(text);

    // Minimal HTML escaping function
    const minimalEscape = (str) => {
      return str
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    };

    // Process block elements
    text = text
      // Convert headers
      .replace(/^(#{1,6})\s+(.*?)$/gm, (match, hashes, content) => {
        const level = hashes.length;
        return `<h${level}>${minimalEscape(content)}</h${level}>`;
      })
      // Convert lists
      .replace(/(\n|^)(\s*)(\d+\.|-)\s+(.+)/g, (match, lineStart, indent, bullet, item) => {
        const listType = bullet === '-' ? 'ul' : 'ol';
        return `${lineStart}<${listType}><li>${minimalEscape(item)}</li></${listType}>`;
      })
      // Handle nested lists
      .replace(/<\/(ul|ol)>\n(<\1>)/g, '')
      .replace(/<\/li>\n(<li>)/g, '</li>$1')
      // Convert paragraphs
      .replace(/(\n|^)(?!<\/?(ul|ol|li|h[1-6]|p|a|code|pre|strong|em|hr))(.+)/g, (match, lineStart, content) => {
        return `${lineStart}<p>${minimalEscape(content)}</p>`;
      });

    // Process inline elements
    text = text
      // Convert links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
        return `<a href="${minimalEscape(url)}">${minimalEscape(text)}</a>`;
      })
      // Convert bold text
      .replace(/\*\*(.*?)\*\*/g, (match, content) => `<strong>${minimalEscape(content)}</strong>`)
      // Convert italic text
      .replace(/\*(.*?)\*/g, (match, content) => `<em>${minimalEscape(content)}</em>`)
      // Convert code blocks
      .replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => `<pre><code>${minimalEscape(code)}</code></pre>`)
      // Convert inline code
      .replace(/`([^`]+)`/g, (match, code) => `<code>${minimalEscape(code)}</code>`)
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
              font-size: 11pt;
              color: #000;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            h1, h2, h3, h4, h5, h6 { margin-top: 1em; margin-bottom: 0.5em; }
            p { margin-top: 0; margin-bottom: 1em; }
            pre { background-color: #f4f4f4; padding: 10px; border-radius: 4px; overflow-x: auto; }
            code { background-color: #f4f4f4; padding: 2px 4px; border-radius: 2px; font-family: monospace; }
            ul, ol { padding-left: 30px; margin-bottom: 1em; }
            li { margin-bottom: 0.5em; }
            hr { border: none; border-top: 1px solid #ccc; margin: 20px 0; }
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