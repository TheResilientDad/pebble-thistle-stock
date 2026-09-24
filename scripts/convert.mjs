// Reads the shop's spreadsheet (data/stock-messy.xlsx), tidies it up,
// and writes src/data/stock.json for the app to use.
// Runs automatically before every build, so updating the spreadsheet is enough.
import ExcelJS from 'exceljs';
import { mkdirSync, writeFileSync } from 'node:fs';

const INPUT = 'data/stock-messy.xlsx';
const OUTPUT = 'src/data/stock.json';

// Every spelling we've seen, mapped to the one we want to show.
const CATEGORIES = {
  kitchen: 'Kitchen', kitchenware: 'Kitchen',
  tableware: 'Tableware', 'table ware': 'Tableware',
  bedding: 'Bedding', 'bed linen': 'Bedding',
  lighting: 'Lighting', lights: 'Lighting',
  'candles & scents': 'Candles & Scents', 'candles and scents': 'Candles & Scents', candles: 'Candles & Scents',
  bathroom: 'Bathroom', bath: 'Bathroom',
  decor: 'Decor', 'décor': 'Decor', 'home decor': 'Decor',
  storage: 'Storage',
};
const SUPPLIERS = {
  'northmere textiles ltd': 'Northmere Textiles',
  'saltmarsh candle co': 'Saltmarsh Candle Co.',
};
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

const text = (v) => (v == null ? '' : String(v).replace(/\s+/g, ' ').trim());

function money(v) {
  if (typeof v === 'number') return v;
  const n = parseFloat(text(v).replace(/[£,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function whole(v) {
  if (typeof v === 'number') return Math.round(v);
  const m = text(v).match(/\d+/); // "approx 20" -> 20
  return m ? parseInt(m[0], 10) : null;
}

const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

function date(v) {
  if (v instanceof Date) return iso(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate());
  const s = text(v);
  let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) return iso(+m[1], m[2] - 1, +m[3]);
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/))) { // UK day/month/year
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return iso(y, m[2] - 1, +m[1]);
  }
  if ((m = s.match(/^(\d{1,2})\s+([a-z]+)/i)) && MONTHS[m[2].slice(0, 3).toLowerCase()] != null) {
    // "3 Sept" has no year: assume this year, or last year if that would be in the future
    const month = MONTHS[m[2].slice(0, 3).toLowerCase()];
    const now = new Date();
    const y = new Date(now.getFullYear(), month, +m[1]) > now ? now.getFullYear() - 1 : now.getFullYear();
    return iso(y, month, +m[1]);
  }
  return null;
}

function cellValue(cell) {
  const v = cell.value;
  if (v && typeof v === 'object' && !(v instanceof Date)) return v.result ?? v.text ?? null; // formulas, rich text
  return v;
}

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(INPUT);
const ws = wb.worksheets[0];

const items = [];
const seen = new Set();
const report = { rows: 0, duplicates: 0, unknownCategories: new Set() };

ws.eachRow((row, i) => {
  if (i === 1) return; // headers
  const [item, category, sku, supplier, qty, cost, price, restocked] =
    [1, 2, 3, 4, 5, 6, 7, 8].map((c) => cellValue(row.getCell(c)));
  const name = text(item);
  if (!name) return;
  report.rows++;

  const catKey = text(category).toLowerCase();
  const cat = CATEGORIES[catKey] ?? (text(category) || 'Uncategorised');
  if (!CATEGORIES[catKey]) report.unknownCategories.add(text(category));
  const sup = text(supplier);

  const clean = {
    item: name,
    category: cat,
    sku: text(sku),
    supplier: SUPPLIERS[sup.toLowerCase()] ?? sup,
    quantity: whole(qty),
    unitCost: money(cost),
    salePrice: money(price),
    lastRestocked: date(restocked),
  };

  const key = JSON.stringify(clean);
  if (seen.has(key)) { report.duplicates++; return; }
  seen.add(key);
  items.push({ id: items.length + 1, ...clean });
});

mkdirSync('src/data', { recursive: true });
writeFileSync(OUTPUT, JSON.stringify({ updated: new Date().toISOString().slice(0, 10), items }, null, 2));

console.log(`Read ${report.rows} rows, removed ${report.duplicates} duplicates, kept ${items.length} items -> ${OUTPUT}`);
if (report.unknownCategories.size) console.log('New categories (add to CATEGORIES if these are typos):', [...report.unknownCategories]);
