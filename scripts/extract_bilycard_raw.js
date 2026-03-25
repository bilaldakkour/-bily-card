const fs = require('fs');
const path = require('path');

const sourcePath = path.resolve(__dirname, '../lib/data/bilycardProducts.ts');
const text = fs.readFileSync(sourcePath, 'utf8');
const marker = 'const rawBilycardProducts: Product[] =';
const markerIndex = text.indexOf(marker);
if (markerIndex < 0) {
  throw new Error('Marker not found');
}
const start = text.indexOf('[', markerIndex + marker.length);
if (start < 0) {
  throw new Error('Array start not found');
}

let depth = 0;
let inString = false;
let quote = '';
let escaped = false;
let end = -1;

for (let i = start; i < text.length; i += 1) {
  const ch = text[i];
  if (inString) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === quote) {
      inString = false;
      quote = '';
    }
    continue;
  }

  if (ch === '"' || ch === "'") {
    inString = true;
    quote = ch;
    continue;
  }
  if (ch === '[') {
    depth += 1;
    continue;
  }
  if (ch === ']') {
    depth -= 1;
    if (depth === 0) {
      end = i;
      break;
    }
  }
}

if (end < start) {
  throw new Error('Array end not found');
}

const jsonArray = text.slice(start, end + 1);
const rows = JSON.parse(jsonArray);
const outPath = path.resolve(__dirname, '../exports/dailycard_raw_catalog.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(rows, null, 2), 'utf8');
console.log(JSON.stringify({ outPath, count: rows.length }));
