export function serializeToWhatsApp(html: string): string {
  const formattingPatterns = [
    { regex: /<strong>(.*?)<\/strong>/g, replaceWith: "*$1*" }, // Bold
    { regex: /<em>(.*?)<\/em>/g, replaceWith: "_$1_" }, // Italic
    { regex: /<u>(.*?)<\/u>/g, replaceWith: "~$1~" }, // Underline
    { regex: /<ul[^>]*>/g, replaceWith: "" }, // Remove <ul> tags and any classes
    { regex: /<\/ul>/g, replaceWith: "" }, // Remove </ul> tags
    { regex: /<ol[^>]*>/g, replaceWith: "" }, // Remove <ol> tags and any classes
    { regex: /<\/ol>/g, replaceWith: "" }, // Remove </ol> tags
    { regex: /<li>/g, replaceWith: "• " }, // Convert <li> to bullet point
    { regex: /<\/li>/g, replaceWith: "\n" }, // Convert <\li> to  a new line
    { regex: /<br\s*\/?>/g, replaceWith: " " }, // Remove <br> tags and replace with space
    { regex: /<p>/g, replaceWith: "" }, // Remove <p> opening tag
    { regex: /<\/p>/g, replaceWith: "\n" }, // Convert closing <p> tag to a new line
  ];

  formattingPatterns.forEach(({ regex, replaceWith }) => {
    html = html.replace(regex, replaceWith);
  });

  // Clean up multiple spaces or extra newlines
  html = html.replace(/\n\s*\n/g, "\n");

  return html;
}

export function deserializeFromWhatsApp(message: string): string {
  const formattingPatterns = [
    { regex: /\*(.*?)\*/g, replaceWith: "<strong>$1</strong>" }, // Bold
    { regex: /_(.*?)_/g, replaceWith: "<em>$1</em>" }, // Italic
    { regex: /~(.*?)~/g, replaceWith: "<u>$1</u>" }, // Underline
    { regex: /• (.*?)(?=\n|$)/g, replaceWith: "<li>$1</li>" }, // Bullet list item
  ];

  formattingPatterns.forEach(({ regex, replaceWith }) => {
    message = message.replace(regex, replaceWith);
  });

  // Wrap list items in <ul> tags (Only if there are multiple <li>)
  message = message.replace(/(<li>.*?<\/li>)/g, "<ul>$1</ul>");

  // Wrap paragraphs (newline-based) in <p> tags
  message = message.replace(/([^\n]+)/g, "<p>$1</p>");

  return message;
}
