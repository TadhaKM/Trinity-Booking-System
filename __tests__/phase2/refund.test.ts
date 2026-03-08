/**
 * Tests for refund logic:
 *  - buildCsv helpers
 *  - sanitizeComment / sanitizeReason
 *  - CreateRefundRequestSchema validation
 *  - ReviewRefundSchema validation
 */

import { buildCsv, buildAttendeesCsv } from '@/lib/csv-export';
import { sanitizeComment, sanitizeReason, stripHtml } from '@/lib/sanitize';
import { CreateRefundRequestSchema, ReviewRefundSchema } from '@/lib/validation';

// ── CSV export ─────────────────────────────────────────────────────────────────

describe('buildCsv', () => {
  it('generates correct CSV with headers', () => {
    const csv = buildCsv(['Name', 'Email'], [['Alice', 'alice@tcd.ie'], ['Bob', 'bob@tcd.ie']]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('Name,Email');
    expect(lines[1]).toBe('Alice,alice@tcd.ie');
    expect(lines[2]).toBe('Bob,bob@tcd.ie');
  });

  it('wraps cells containing commas in quotes', () => {
    const csv = buildCsv(['Name'], [['Smith, John']]);
    expect(csv).toContain('"Smith, John"');
  });

  it('escapes internal double-quotes', () => {
    const csv = buildCsv(['Note'], [[`He said "hello"`]]);
    expect(csv).toContain('"He said ""hello"""');
  });

  it('handles null and undefined as empty strings', () => {
    const csv = buildCsv(['A', 'B'], [[null, undefined]]);
    expect(csv.split('\r\n')[1]).toBe(',');
  });
});

describe('buildAttendeesCsv', () => {
  it('generates a 10-column CSV', () => {
    const attendees = [
      {
        name: 'Alice',
        email: 'alice@tcd.ie',
        ticketType: 'General',
        ticketRef: 'abc123',
        orderRef: 'order1',
        price: 10.5,
        status: 'CONFIRMED',
        checkedIn: true,
        checkedInAt: '2025-03-01T18:00:00Z',
        purchasedAt: '2025-02-01T10:00:00Z',
      },
    ];
    const csv = buildAttendeesCsv(attendees);
    const [header, row] = csv.split('\r\n');
    expect(header.split(',').length).toBe(10);
    expect(row).toContain('Alice');
    expect(row).toContain('Yes');
    expect(row).toContain('10.50');
  });
});

// ── Sanitisation ───────────────────────────────────────────────────────────────

describe('stripHtml', () => {
  it('removes HTML tags', () => {
    expect(stripHtml('<script>alert("xss")</script>Hello')).toBe('Hello');
    expect(stripHtml('<b>Bold</b> text')).toBe('Bold text');
  });

  it('preserves plain text', () => {
    expect(stripHtml('Just a normal comment')).toBe('Just a normal comment');
  });
});

describe('sanitizeComment', () => {
  it('strips HTML and trims whitespace', () => {
    expect(sanitizeComment('  <em>Nice</em> event!  ')).toBe('Nice event!');
  });

  it('truncates to maxLength', () => {
    const long = 'a'.repeat(3000);
    expect(sanitizeComment(long, 2000).length).toBe(2000);
  });
});

describe('sanitizeReason', () => {
  it('strips HTML from refund reasons', () => {
    expect(sanitizeReason('<b>I want a refund</b>')).toBe('I want a refund');
  });
});

// ── Validation schemas ─────────────────────────────────────────────────────────

describe('CreateRefundRequestSchema', () => {
  const valid = {
    userId: 'cluser123abc456def',
    orderId: 'clorder123abc456d',
    reason: 'Event was cancelled unexpectedly',
  };

  it('accepts a valid full-order refund request', () => {
    expect(CreateRefundRequestSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts with optional ticketId', () => {
    const result = CreateRefundRequestSchema.safeParse({ ...valid, ticketId: 'clticket123abc456' });
    expect(result.success).toBe(true);
  });

  it('rejects when reason is too short', () => {
    const result = CreateRefundRequestSchema.safeParse({ ...valid, reason: 'short' });
    expect(result.success).toBe(false);
  });

  it('rejects when orderId is missing', () => {
    const { orderId: _, ...rest } = valid;
    const result = CreateRefundRequestSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

describe('ReviewRefundSchema', () => {
  it('accepts APPROVE action', () => {
    const result = ReviewRefundSchema.safeParse({ adminId: 'cladmin123abc456de', action: 'APPROVE' });
    expect(result.success).toBe(true);
  });

  it('accepts REJECT with a note', () => {
    const result = ReviewRefundSchema.safeParse({
      adminId: 'cladmin123abc456de',
      action: 'REJECT',
      reviewNote: 'Outside refund window',
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown action', () => {
    const result = ReviewRefundSchema.safeParse({ adminId: 'cladmin123abc456de', action: 'MAYBE' });
    expect(result.success).toBe(false);
  });
});
