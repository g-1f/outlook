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

    // Ensure special characters like & and $ are not incorrectly escaped
    const escapeHtml = (str) => {
      return str
        .replace(/&(?![a-zA-Z0-9#]+;)/g, "&amp;") // Escape & only when not part of an entity
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    };

    // Escape HTML but not & and $ specifically
    text = escapeHtml(text);

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
