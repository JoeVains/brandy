// Text module content used to be stored as plain text. Rich formatting stores
// HTML instead — this keeps old plain-text content displaying correctly.
export function textModuleToHtml(content?: string): string {
  if (!content) return '';
  if (/<[a-z][\s\S]*>/i.test(content)) return content;
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped.replace(/\n/g, '<br>');
}
