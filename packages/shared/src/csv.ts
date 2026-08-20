/** Parser CSV mínimo: comillas, comas dentro de campo, BOM. */

export function parseCsv(text: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const table = parseCsvRows(text.replace(/^\uFEFF/, ""));
  if (table.length === 0) return { headers: [], rows: [] };
  const headers = table[0]!.map((h) => h.trim().toLowerCase());
  const data = table
    .slice(1)
    .filter((cols) => cols.some((c) => c.trim() !== ""));
  return {
    headers,
    rows: data.map((cols) => {
      const rec: Record<string, string> = {};
      for (let i = 0; i < headers.length; i++) {
        rec[headers[i]!] = (cols[i] ?? "").trim();
      }
      return rec;
    }),
  };
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    if (ch === "\r") continue;
    cell += ch;
  }
  if (quoted) {
    throw new Error("CSV con comillas sin cerrar");
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
