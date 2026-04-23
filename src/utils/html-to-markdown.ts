/**
 * Simple HTML to Markdown converter
 * Converts common HTML elements to markdown format
 */

export function htmlToMarkdown(html: string): string {
  if (!html || html.trim() === "") {
    return "";
  }

  const markdown = html
    // Remove script and style tags completely
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")

    // Headers
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n")
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1\n\n")
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, "##### $1\n\n")
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, "###### $1\n\n")

    // Bold and italic
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*")
    .replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*")

    // Links
    .replace(/<a[^>]*href=['"](.*?)['"][^>]*>(.*?)<\/a>/gi, "[$2]($1)")

    // Images
    .replace(
      /<img[^>]*src=['"](.*?)['"][^>]*alt=['"](.*?)['"][^>]*\/?>/gi,
      "![$2]($1)"
    )
    .replace(
      /<img[^>]*alt=['"](.*?)['"][^>]*src=['"](.*?)['"][^>]*\/?>/gi,
      "![$1]($2)"
    )
    .replace(/<img[^>]*src=['"](.*?)['"][^>]*\/?>/gi, "![]($1)")

    // Lists
    .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
      const items = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n");
      return items + "\n";
    })
    .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
      let counter = 1;
      const items = content.replace(
        /<li[^>]*>([\s\S]*?)<\/li>/gi,
        () => `${counter++}. $1\n`
      );
      return items + "\n";
    })

    // Blockquotes
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, "> $1\n\n")

    // Code
    .replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`")
    .replace(
      /<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
      "```\n$1\n```\n\n"
    )
    .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "```\n$1\n```\n\n")

    // Tables
    .replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (match, tableContent) => {
      return convertTable(tableContent) + "\n\n";
    })

    // Horizontal rule
    .replace(/<hr[^>]*\/?>/gi, "---\n\n")

    // Line breaks and paragraphs
    .replace(/<br[^>]*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")

    // Divs (treat as paragraphs)
    .replace(/<\/div>/gi, "\n\n")
    .replace(/<div[^>]*>/gi, "")

    // Remove remaining HTML tags
    .replace(/<[^>]*>/g, "")

    // Decode HTML entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")

    // Clean up whitespace
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .replace(/^\s+|\s+$/g, "")
    .replace(/[ \t]+/g, " ");

  return markdown;
}

/**
 * Convert HTML table to Markdown table format
 */
function convertTable(tableContent: string): string {
  // Extract table rows
  const rows: string[][] = [];

  // Remove thead, tbody, tfoot tags but keep their content
  const cleanContent = tableContent
    .replace(/<\/?thead[^>]*>/gi, "")
    .replace(/<\/?tbody[^>]*>/gi, "")
    .replace(/<\/?tfoot[^>]*>/gi, "");

  // Extract all rows
  const rowMatches = cleanContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);

  if (!rowMatches || rowMatches.length === 0) {
    return "";
  }

  rowMatches.forEach((rowHtml) => {
    const row: string[] = [];

    // Extract cells (both th and td)
    const cellMatches = rowHtml.match(
      /<(?:th|td)[^>]*>([\s\S]*?)<\/(?:th|td)>/gi
    );

    if (cellMatches) {
      cellMatches.forEach((cellHtml) => {
        // Extract cell content and clean it
        const cellContent = cellHtml
          .replace(/<(?:th|td)[^>]*>([\s\S]*?)<\/(?:th|td)>/gi, "$1")
          .replace(/<[^>]*>/g, "") // Remove any remaining HTML tags
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();

        row.push(cellContent || " ");
      });
    }

    if (row.length > 0) {
      rows.push(row);
    }
  });

  if (rows.length === 0) {
    return "";
  }

  // Determine the maximum number of columns
  const maxCols = Math.max(...rows.map((row) => row.length));

  // Ensure all rows have the same number of columns
  rows.forEach((row) => {
    while (row.length < maxCols) {
      row.push(" ");
    }
  });

  let markdown = "";

  rows.forEach((row, index) => {
    // Add the row
    markdown += "| " + row.join(" | ") + " |\n";

    // Add separator after first row (header)
    if (index === 0) {
      markdown += "| " + row.map(() => "---").join(" | ") + " |\n";
    }
  });

  return markdown.trim();
}
