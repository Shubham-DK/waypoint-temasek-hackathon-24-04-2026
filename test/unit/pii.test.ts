import { maskPII, hasPII } from '@/sidepanel/pii';

describe('maskPII', () => {
  it('masks email addresses', () => {
    expect(maskPII('contact test@example.com now'))
      .toBe('contact [EMAIL] now');
  });

  it('masks phone numbers', () => {
    expect(maskPII('call 555-123-4567'))
      .toBe('call [PHONE]');
  });

  it('masks SSNs', () => {
    expect(maskPII('SSN: 123-45-6789'))
      .toBe('SSN: [SSN]');
  });

  it('masks credit card numbers', () => {
    expect(maskPII('card 4111 1111 1111 1111'))
      .toBe('card [CARD_NUM]');
  });

  it('masks passport numbers', () => {
    expect(maskPII('passport E12345678'))
      .toBe('passport [PASSPORT]');
  });

  it('leaves clean text unchanged', () => {
    expect(maskPII('hello world')).toBe('hello world');
  });

  it('masks multiple PII types in one string', () => {
    const input = 'Email test@x.com, phone (555) 123-4567';
    const result = maskPII(input);
    expect(result).toContain('[EMAIL]');
    expect(result).toContain('[PHONE]');
    expect(result).not.toContain('test@x.com');
  });
});

describe('hasPII', () => {
  it('returns true when PII is present', () => {
    expect(hasPII('test@example.com')).toBe(true);
  });

  it('returns false for clean text', () => {
    expect(hasPII('hello world')).toBe(false);
  });
});
