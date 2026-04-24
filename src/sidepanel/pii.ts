interface PIIPattern {
  regex: RegExp;
  token: string;
}

const PII_PATTERNS: PIIPattern[] = [
  { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, token: '[EMAIL]' },
  { regex: /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g, token: '[PHONE]' },
  { regex: /\b\d{3}-\d{2}-\d{4}\b/g, token: '[SSN]' },
  { regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, token: '[CARD_NUM]' },
  { regex: /\b[A-Z]{1,2}\d{6,9}\b/g, token: '[PASSPORT]' },
];

export function maskPII(text: string): string {
  let result = text;
  for (const pattern of PII_PATTERNS) {
    pattern.regex.lastIndex = 0;
    result = result.replace(pattern.regex, pattern.token);
  }
  return result;
}

export function hasPII(text: string): boolean {
  for (const pattern of PII_PATTERNS) {
    pattern.regex.lastIndex = 0;
    if (pattern.regex.test(text)) return true;
  }
  return false;
}
