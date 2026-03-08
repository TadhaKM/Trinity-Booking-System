/**
 * Server-side content sanitization.
 *
 * Strips HTML tags and normalises user-generated text to prevent XSS
 * when content is reflected back in API responses or stored in the DB.
 * This is a lightweight alternative to DOMPurify for Node environments.
 */

/** Strip all HTML tags AND dangerous tag content (script, style, etc.) from a string. */
export function stripHtml(input: string): string {
  return input
    // Remove script/style blocks including their content
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    // Remove all remaining HTML tags
    .replace(/<[^>]*>/g, '')
    .trim();
}

/** Sanitize a user-generated comment body: strip HTML, limit length. */
export function sanitizeComment(body: string, maxLength = 2000): string {
  return stripHtml(body).slice(0, maxLength);
}

/** Sanitize a free-text reason/review note: strip HTML, limit length. */
export function sanitizeReason(text: string, maxLength = 500): string {
  return stripHtml(text).slice(0, maxLength);
}
