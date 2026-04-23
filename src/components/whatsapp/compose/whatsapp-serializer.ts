import type { Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode, Mark } from "@tiptap/pm/model";

function applyMarks(text: string, marks: readonly Mark[]): string {
  let result = text;
  for (const mark of marks) {
    if (mark.type.name === "bold") result = `*${result}*`;
    else if (mark.type.name === "italic") result = `_${result}_`;
    else if (mark.type.name === "strike") result = `~${result}~`;
    else if (mark.type.name === "code") result = `\`\`\`${result}\`\`\``;
  }
  return result;
}

function serializeNode(node: ProseMirrorNode): string {
  if (node.type.name === "text") return applyMarks(node.text ?? "", node.marks);
  if (node.type.name === "hardBreak") return "\n";
  let content = "";
  node.forEach((child) => { content += serializeNode(child); });
  return content;
}

export function getWhatsAppText(editor: Editor): string {
  const paragraphs: string[] = [];
  editor.state.doc.forEach((node) => { paragraphs.push(serializeNode(node)); });
  return paragraphs.join("\n");
}
