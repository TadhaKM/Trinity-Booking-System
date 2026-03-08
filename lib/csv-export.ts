/**
 * CSV export utilities — pure functions, no I/O.
 */

/** Escape a value for CSV: wrap in quotes and escape internal quotes. */
function csvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Build a CSV string from headers + rows. */
export function buildCsv(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): string {
  const lines = [
    headers.map(csvCell).join(','),
    ...rows.map((row) => row.map(csvCell).join(',')),
  ];
  return lines.join('\r\n');
}

export interface AttendeeRow {
  name: string;
  email: string;
  ticketType: string;
  ticketRef: string;
  orderRef: string;
  price: number;
  status: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  purchasedAt: string;
}

/** Generate attendee CSV for an event. */
export function buildAttendeesCsv(attendees: AttendeeRow[]): string {
  const headers = [
    'Name',
    'Email',
    'Ticket Type',
    'Ticket Ref',
    'Order Ref',
    'Price (€)',
    'Status',
    'Checked In',
    'Check-In Time',
    'Purchased At',
  ];

  const rows = attendees.map((a) => [
    a.name,
    a.email,
    a.ticketType,
    a.ticketRef,
    a.orderRef,
    a.price.toFixed(2),
    a.status,
    a.checkedIn ? 'Yes' : 'No',
    a.checkedInAt ?? '',
    a.purchasedAt,
  ]);

  return buildCsv(headers, rows);
}
