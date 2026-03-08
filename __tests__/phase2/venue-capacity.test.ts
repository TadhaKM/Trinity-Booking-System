/**
 * Tests for venue capacity validation via CreateEventSchema.
 */

import { CreateEventSchema } from '@/lib/validation';

const baseEvent = {
  title: 'Test Concert',
  description: 'A test event with enough description to pass validation.',
  societyId: 'clsociety123abc456',
  startDate: '2026-06-01T19:00',
  location: 'O\'Reilly Hall',
  ticketTypes: [
    { name: 'General', price: 10, quantity: 200 },
    { name: 'VIP', price: 25, quantity: 50 },
  ],
  organiserId: 'cluser123abc456def',
};

describe('CreateEventSchema — venue capacity', () => {
  it('accepts an event with no venue capacity set', () => {
    const result = CreateEventSchema.safeParse(baseEvent);
    expect(result.success).toBe(true);
  });

  it('accepts when total tickets equal venue capacity', () => {
    const result = CreateEventSchema.safeParse({ ...baseEvent, venueCapacity: 250 });
    expect(result.success).toBe(true);
  });

  it('accepts when total tickets are under venue capacity', () => {
    const result = CreateEventSchema.safeParse({ ...baseEvent, venueCapacity: 500 });
    expect(result.success).toBe(true);
  });

  it('accepts null venueCapacity (no limit)', () => {
    const result = CreateEventSchema.safeParse({ ...baseEvent, venueCapacity: null });
    expect(result.success).toBe(true);
  });

  it('rejects venueCapacity of 0', () => {
    const result = CreateEventSchema.safeParse({ ...baseEvent, venueCapacity: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects venueCapacity over 100,000', () => {
    const result = CreateEventSchema.safeParse({ ...baseEvent, venueCapacity: 200_000 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer venueCapacity', () => {
    const result = CreateEventSchema.safeParse({ ...baseEvent, venueCapacity: 99.5 });
    expect(result.success).toBe(false);
  });
});

describe('CreateEventSchema — ticket types', () => {
  it('requires at least one ticket type', () => {
    const result = CreateEventSchema.safeParse({ ...baseEvent, ticketTypes: [] });
    expect(result.success).toBe(false);
  });

  it('rejects negative ticket price', () => {
    const result = CreateEventSchema.safeParse({
      ...baseEvent,
      ticketTypes: [{ name: 'Bad', price: -5, quantity: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero ticket quantity', () => {
    const result = CreateEventSchema.safeParse({
      ...baseEvent,
      ticketTypes: [{ name: 'Bad', price: 10, quantity: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than 20 ticket types', () => {
    const manyTypes = Array.from({ length: 21 }, (_, i) => ({
      name: `Type ${i}`,
      price: 10,
      quantity: 10,
    }));
    const result = CreateEventSchema.safeParse({ ...baseEvent, ticketTypes: manyTypes });
    expect(result.success).toBe(false);
  });
});
