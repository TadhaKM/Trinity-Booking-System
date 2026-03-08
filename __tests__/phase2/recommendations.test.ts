/**
 * Tests for recommendation helpers (pure logic parts).
 */

import { buildCsv } from '@/lib/csv-export';
import { PushSubscribeSchema } from '@/lib/validation';

// ── PushSubscribeSchema ────────────────────────────────────────────────────────

describe('PushSubscribeSchema', () => {
  it('accepts a valid subscription', () => {
    const result = PushSubscribeSchema.safeParse({
      userId: 'cluser123abc456def',
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
      p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlqHHmgjYHpn9-YDG8ZqAP9IQE',
      auth: 'tBHItJI5svbpez7KI4CCXg',
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-HTTPS endpoint', () => {
    const result = PushSubscribeSchema.safeParse({
      userId: 'cluser123abc456def',
      endpoint: 'http://insecure.example.com/push',
      p256dh: 'validkey',
      auth: 'validauth',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing auth key', () => {
    const result = PushSubscribeSchema.safeParse({
      userId: 'cluser123abc456def',
      endpoint: 'https://push.example.com/abc',
      p256dh: 'validkey',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty endpoint', () => {
    const result = PushSubscribeSchema.safeParse({
      userId: 'cluser123abc456def',
      endpoint: '',
      p256dh: 'key',
      auth: 'auth',
    });
    expect(result.success).toBe(false);
  });
});

// ── CSV consistency ────────────────────────────────────────────────────────────

describe('buildCsv edge cases', () => {
  it('handles numbers correctly', () => {
    const csv = buildCsv(['Price'], [[10.5]]);
    expect(csv.split('\r\n')[1]).toBe('10.5');
  });

  it('handles boolean true/false', () => {
    const csv = buildCsv(['Checked In'], [[true], [false]]);
    const lines = csv.split('\r\n');
    expect(lines[1]).toBe('true');
    expect(lines[2]).toBe('false');
  });

  it('generates correct column count', () => {
    const headers = ['A', 'B', 'C', 'D', 'E'];
    const rows = [['1', '2', '3', '4', '5']];
    const csv = buildCsv(headers, rows);
    const [headerRow] = csv.split('\r\n');
    expect(headerRow.split(',').length).toBe(5);
  });

  it('returns only header row for empty data', () => {
    const csv = buildCsv(['Name', 'Email'], []);
    expect(csv).toBe('Name,Email');
  });
});
