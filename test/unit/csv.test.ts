import { parseCSV } from '@/sidepanel/csv';

describe('parseCSV', () => {
  it('parses simple CSV', () => {
    const rows = parseCSV('name,email\nAlice,a@b.com\nBob,b@c.com');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ name: 'Alice', email: 'a@b.com' });
    expect(rows[1]).toEqual({ name: 'Bob', email: 'b@c.com' });
  });

  it('handles quoted fields with commas', () => {
    const rows = parseCSV('name,address\n"Doe, John","123 Main St, Apt 4"');
    expect(rows[0].name).toBe('Doe, John');
    expect(rows[0].address).toBe('123 Main St, Apt 4');
  });

  it('handles CRLF line endings', () => {
    const rows = parseCSV('a,b\r\n1,2\r\n3,4');
    expect(rows).toHaveLength(2);
  });

  it('returns empty array for empty input', () => {
    expect(parseCSV('')).toEqual([]);
  });

  it('handles header-only CSV', () => {
    expect(parseCSV('name,email')).toEqual([]);
  });

  it('handles escaped quotes', () => {
    const rows = parseCSV('name\n"He said ""hello"""');
    expect(rows[0].name).toBe('He said "hello"');
  });

  it('handles three columns', () => {
    const rows = parseCSV('a,b,c\n1,2,3');
    expect(rows[0]).toEqual({ a: '1', b: '2', c: '3' });
  });
});
