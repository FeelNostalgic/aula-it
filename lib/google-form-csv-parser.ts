/**
 * Client-side parser for Google Forms CSV exports.
 * Google Forms exports use comma separators with RFC 4180 quoting.
 */

export type CsvRow = Record<string, string>;

export function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
    // Normalize line endings
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
    if (lines.length < 2) return { headers: [], rows: [] };

    const headers = parseCsvLine(lines[0]);
    const rows = lines.slice(1).map(line => {
        const values = parseCsvLine(line);
        return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
    });
    return { headers, rows };
}

function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let inQuote = false;
    let current = '';
    const sep = line.includes(';') && !line.includes(',') ? ';' : ',';
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
            if (inQuote && line[i + 1] === '"') { current += '"'; i++; }
            else inQuote = !inQuote;
        } else if (c === sep && !inQuote) {
            result.push(current.trim());
            current = '';
        } else {
            current += c;
        }
    }
    result.push(current.trim());
    return result;
}

/**
 * Heuristically identify the score column.
 * Looks for columns named "Puntuación", "Score", "Nota", or the last numeric column.
 */
export function guessScoreColumn(headers: string[], rows: CsvRow[]): string | null {
    const scoreNames = /puntuaci|score|nota|total|calificaci/i;
    const found = headers.find(h => scoreNames.test(h));
    if (found) return found;
    // Fallback: last column with mostly numeric values
    for (let i = headers.length - 1; i >= 0; i--) {
        const col = headers[i];
        const numericCount = rows.filter(r => r[col] && /^\d+([.,]\d+)?/.test(r[col])).length;
        if (numericCount > rows.length * 0.5) return col;
    }
    return null;
}

/**
 * Heuristically identify the student ID column.
 * Looks for columns where many values match known full_names.
 */
export function guessStudentIdColumn(headers: string[], rows: CsvRow[], knownNames: string[]): string | null {
    const nameSet = new Set(knownNames.map(n => n.toLowerCase()));
    let bestCol: string | null = null;
    let bestCount = 0;
    for (const h of headers) {
        const count = rows.filter(r => nameSet.has((r[h] ?? '').toLowerCase())).length;
        if (count > bestCount) { bestCount = count; bestCol = h; }
    }
    return bestCount > 0 ? bestCol : null;
}

export function parseScore(raw: string): number | null {
    if (!raw) return null;
    const cleaned = raw.replace(',', '.').replace(/[^0-9.]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
}
