const escapeCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const str = Array.isArray(value) ? value.map((v) => JSON.stringify(v)).join('; ') : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

export const toCsv = (rows: Record<string, unknown>[], columns: string[]): string => {
  const header = columns.join(',');
  const body = rows.map((row) => columns.map((col) => escapeCell(row[col])).join(',')).join('\n');
  return `${header}\n${body}`;
};
