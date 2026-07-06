import DOMPurify from "isomorphic-dompurify";

/** Strips executable/markup content from user text before it's stored or rendered as HTML. */
export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [
      "b", "i", "em", "strong", "a", "code", "pre", "br", "p", "ul", "ol", "li",
      "blockquote", "h1", "h2", "h3", "span",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
  });
}

/** Plain-text sanitization: strips all markup, used before persisting raw message content. */
export function sanitizePlainText(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}
