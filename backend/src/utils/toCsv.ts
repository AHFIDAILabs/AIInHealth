// A cell starting with =, +, -, or @ is interpreted as a formula by Excel/Sheets
// when the CSV is opened — exactly what an attacker-controlled field (a public
// registration's fullName/organization/message, say) could be set to. Prefixing
// with a leading quote neutralizes it without changing the visible value.
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

const escapeCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  let str = Array.isArray(value) ? value.map((v) => JSON.stringify(v)).join('; ') : String(value);
  if (FORMULA_TRIGGER.test(str)) str = `'${str}`;
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

export const toCsv = (rows: Record<string, unknown>[], columns: string[]): string => {
  const header = columns.join(',');
  const body = rows.map((row) => columns.map((col) => escapeCell(row[col])).join(',')).join('\n');
  return `${header}\n${body}`;
};
