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

    // Process lists
    text = text.replace(/(?:(?:^|\n)(?:(\d+\.)|-)(?:[ \t]+)(.+))(?:\n|$)/g, (match, number, item) => {
      const listType = number ? 'ol' : 'ul';
      return `<${listType}><li>${item}</li></${listType}>`;
    });

    // Merge adjacent lists of the same type
    text = text.replace(/(<\/[ou]l>)\s*<\1>/g, '');

    // Process other Markdown elements
    text = text
      // Headers
      .replace(/^(#{1,6})\s+(.*?)$/gm, (match, hashes, content) => {
        const level = hashes.length;
        return `<h${level}>${content}</h${level}>`;
      })
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
      .replace(/^---$/gm, '<hr>')
      // Paragraphs
      .replace(/(?:(?:^|\n+)(?!\s*(-|\d+\.)|\s*#{1,6}|\s*<(?:ul|ol|li|h|p|bl))((?:(?:^|\n)(?!\s*(-|\d+\.)|\s*#{1,6}|\s*<(?:ul|ol|li|h|p|bl)).*)+))/g, (match, content) => `<p>${content.trim()}</p>`);

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
        </head>
        <body>
          ${processedContent}
        </body>
      </html>
    `;
  } catch (error) {
    console.error("Error in wrapInHtml:", error);
    return "<html><body><p>Error processing content.</p></body></html>";
  }
};