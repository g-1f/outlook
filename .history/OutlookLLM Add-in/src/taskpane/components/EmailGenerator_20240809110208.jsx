const EmailGenerator = ({ userId = "user1" }) => {
  // ... (keep existing state and other functions)

  const wrapInHtml = (content) => {
    const escapeHtml = (unsafe) => {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    // Pre-process content to handle common markdown syntax
    const processMarkdown = (text) => {
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

      return text;
    };

    const processedContent = processMarkdown(content);
    const escapedContent = escapeHtml(processedContent);
    const formattedContent = escapedContent.replace(/\n/g, "<br>");

    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .email-content { white-space: pre-wrap; font-family: inherit; }
            h1, h2, h3, h4, h5, h6 { margin-top: 1em; margin-bottom: 0.5em; line-height: 1.2; }
            h1 { font-size: 2em; }
            h2 { font-size: 1.5em; }
            h3 { font-size: 1.17em; }
            h4 { font-size: 1em; }
            h5 { font-size: 0.83em; }
            h6 { font-size: 0.67em; }
            pre { background-color: #f4f4f4; padding: 10px; border-radius: 4px; overflow-x: auto; }
            code { background-color: #f4f4f4; padding: 2px 4px; border-radius: 2px; font-family: monospace; }
            p { margin-top: 0; margin-bottom: 1em; }
          </style>
        </head>
        <body>
          <div class="email-content">${formattedContent}</div>
        </body>
      </html>
    `;
  };

  // ... (rest of the component remains the same)
};

export default EmailGenerator;