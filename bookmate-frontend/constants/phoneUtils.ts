// Formats digits into +7 777 777 77 77 as the user types
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');

  // Build display string based on how many digits we have
  // First digit is always 7 (we replace 8 with 7)
  let d = digits;
  if (d.startsWith('8')) d = '7' + d.slice(1);
  if (!d.startsWith('7') && d.length > 0) d = '7' + d;
  d = d.slice(0, 11);

  if (d.length === 0) return '';

  let result = '+7';
  if (d.length > 1) result += ' ' + d.slice(1, 4);
  if (d.length > 4) result += ' ' + d.slice(4, 7);
  if (d.length > 7) result += ' ' + d.slice(7, 9);
  if (d.length > 9) result += ' ' + d.slice(9, 11);

  return result;
}

// Returns true only when the number is fully entered (+7 + 10 digits)
export function isPhoneComplete(formatted: string): boolean {
  return formatted.replace(/\D/g, '').length === 11;
}
