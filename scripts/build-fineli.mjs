#!/usr/bin/env node
// Converts a Fineli open-data "basic package" (semicolon CSV, Latin-1) into src/data/fineli.json.
//
// Usage: node scripts/build-fineli.mjs <path-to-extracted-package-folder> <release-label>
//   e.g. node scripts/build-fineli.mjs ~/Downloads/Fineli_Rel20 "Release 20"
//
// Data: Fineli, Finnish Institute for Health and Welfare (THL), CC BY 4.0. https://fineli.fi
// Output rows: [id, nameFi, nameEn, kcal, protein, carbs, fat, servingGrams|null, servingUnit|null] per 100 g.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [dir, release = 'unknown release'] = process.argv.slice(2);
if (!dir) {
  console.error('Usage: node scripts/build-fineli.mjs <package-folder> "<release label>"');
  process.exit(1);
}

function readCsv(name) {
  const text = readFileSync(join(dir, name), 'latin1');
  const [header, ...lines] = text.split(/\r?\n/).filter(Boolean);
  const cols = header.split(';');
  return lines.map((line) => Object.fromEntries(line.split(';').map((v, i) => [cols[i], v])));
}

const num = (v) => (v === undefined || v === '' ? null : Number(v.replace(',', '.')));
const r1 = (v) => Math.round(v * 10) / 10;

const names = { FI: new Map(), EN: new Map() };
for (const lang of ['FI', 'EN']) for (const row of readCsv(`foodname_${lang}.csv`)) names[lang].set(row.FOODID, row.FOODNAME);

const values = new Map();
for (const row of readCsv('component_value.csv')) {
  if (!['ENERC', 'PROT', 'CHOAVL', 'FAT'].includes(row.EUFDNAME)) continue;
  if (!values.has(row.FOODID)) values.set(row.FOODID, {});
  values.get(row.FOODID)[row.EUFDNAME] = num(row.BESTLOC);
}

// One typical serving per food: a medium piece or portion if Fineli has one.
const SERVING_PRIORITY = ['KPL_M', 'PORTM', 'KPL_S', 'PORTS', 'DL', 'KPL_L', 'PORTL'];
const servings = new Map();
for (const row of readCsv('foodaddunit.csv')) {
  const rank = SERVING_PRIORITY.indexOf(row.FOODUNIT);
  if (rank < 0) continue;
  const current = servings.get(row.FOODID);
  if (!current || rank < current.rank) servings.set(row.FOODID, { rank, unit: row.FOODUNIT, grams: num(row.MASS) });
}

const rows = [];
for (const food of readCsv('food.csv')) {
  const v = values.get(food.FOODID);
  if (!v || v.ENERC === undefined) continue;
  const s = servings.get(food.FOODID);
  rows.push([
    Number(food.FOODID),
    names.FI.get(food.FOODID) ?? food.FOODNAME,
    names.EN.get(food.FOODID) ?? names.FI.get(food.FOODID) ?? food.FOODNAME,
    Math.round((v.ENERC ?? 0) / 4.184), // kJ → kcal
    r1(v.PROT ?? 0),
    r1(v.CHOAVL ?? 0),
    r1(v.FAT ?? 0),
    s ? r1(s.grams) : null,
    s ? s.unit : null,
  ]);
}

const out = { source: 'Fineli, Finnish Institute for Health and Welfare (THL)', license: 'CC BY 4.0', release, foods: rows };
writeFileSync(new URL('../src/data/fineli.json', import.meta.url), JSON.stringify(out));
console.log(`Wrote ${rows.length} foods (${release}) to src/data/fineli.json`);
