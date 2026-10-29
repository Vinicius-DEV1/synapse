#!/usr/bin/env node
/**
 * Synapse Performance Budget Enforcement
 *
 * Enforces production bundle budgets defined from Round 2 optimization baselines.
 * Breaks CI / exit 1 if any bundle metric exceeds the configured threshold.
 */

import fs from 'fs';
import path from 'path';

const BUDGETS = {
  totalDistKb: 18500, // Max 18.5 MB total bundle
  totalCssKb: 350, // Max 350 KB total CSS
  reactVendorChunkKb: 250, // Max 250 KB for core react vendor chunk (guards against bloat)
  mainEntryChunkKb: 250, // Max 250 KB for initial main entry chunk
  cultureViewChunkKb: 400, // Max 400 KB for CultureView (guards against eager ONNX bundle)
  maxAppChunkKb: 1600, // Max 1.6 MB for largest single app JS chunk (ELK layout engine)
  pdfWorkerChunkKb: 2500, // Max 2.5 MB for Mozilla PDF.js web worker
};

function getFiles(dir, ext = null) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getFiles(full, ext));
    } else if (!ext || entry.name.endsWith(ext)) {
      files.push({ name: entry.name, path: full, size: fs.statSync(full).size });
    }
  }
  return files;
}

function checkBudgets() {
  const distDir = path.resolve('dist');
  if (!fs.existsSync(distDir)) {
    console.error('❌ Error: dist/ directory not found. Please run "npm run build" first.');
    process.exit(1);
  }

  const allFiles = getFiles(distDir);
  const totalDistBytes = allFiles.reduce((acc, f) => acc + f.size, 0);
  const totalDistKb = Number((totalDistBytes / 1024).toFixed(2));

  const cssFiles = getFiles(distDir, '.css');
  const totalCssBytes = cssFiles.reduce((acc, f) => acc + f.size, 0);
  const totalCssKb = Number((totalCssBytes / 1024).toFixed(2));

  const jsFiles = getFiles(distDir, '.js').concat(getFiles(distDir, '.mjs'));
  let maxAppChunk = { name: '', size: 0 };
  let pdfWorkerChunk = { name: '', size: 0 };
  let reactVendor = { name: '', size: 0 };
  let mainEntry = { name: '', size: 0 };
  let cultureView = { name: '', size: 0 };

  for (const f of jsFiles) {
    if (f.name.startsWith('pdf.worker-')) {
      pdfWorkerChunk = f;
    } else if (f.size > maxAppChunk.size) {
      maxAppChunk = f;
    }

    if (f.name.startsWith('react-vendor-')) reactVendor = f;
    if (f.name.startsWith('main-')) mainEntry = f;
    if (f.name.startsWith('CultureView-')) cultureView = f;
  }

  const measurements = [
    {
      name: 'Total Bundle Size',
      actual: totalDistKb,
      budget: BUDGETS.totalDistKb,
      unit: 'KB',
    },
    {
      name: 'Total CSS Size',
      actual: totalCssKb,
      budget: BUDGETS.totalCssKb,
      unit: 'KB',
    },
    {
      name: 'React Vendor Chunk',
      actual: Number((reactVendor.size / 1024).toFixed(2)),
      budget: BUDGETS.reactVendorChunkKb,
      unit: 'KB',
    },
    {
      name: 'Main Entry Chunk',
      actual: Number((mainEntry.size / 1024).toFixed(2)),
      budget: BUDGETS.mainEntryChunkKb,
      unit: 'KB',
    },
    {
      name: 'CultureView Chunk',
      actual: Number((cultureView.size / 1024).toFixed(2)),
      budget: BUDGETS.cultureViewChunkKb,
      unit: 'KB',
    },
    {
      name: 'Largest App Chunk',
      actual: Number((maxAppChunk.size / 1024).toFixed(2)),
      budget: BUDGETS.maxAppChunkKb,
      unit: 'KB',
    },
    {
      name: 'PDF Worker Chunk',
      actual: Number((pdfWorkerChunk.size / 1024).toFixed(2)),
      budget: BUDGETS.pdfWorkerChunkKb,
      unit: 'KB',
    },
  ];

  console.log('================================================================================');
  console.log('                 SYNAPSE CI PERFORMANCE BUDGET GATE REPORT                     ');
  console.log('================================================================================');

  let failedCount = 0;
  for (const m of measurements) {
    const passed = m.actual <= m.budget;
    const diff = m.actual - m.budget;
    const diffPct = ((diff / m.budget) * 100).toFixed(1);
    const status = passed ? '✅ PASS' : '❌ FAIL';

    if (!passed) failedCount++;

    const actualStr = `${m.actual} ${m.unit}`.padStart(12);
    const budgetStr = `${m.budget} ${m.unit}`.padStart(12);
    const deltaStr = passed ? 'within budget' : `+${diff.toFixed(1)} ${m.unit} (+${diffPct}%)`;

    console.log(` ${status} | ${m.name.padEnd(22)} | Actual: ${actualStr} | Budget: ${budgetStr} | ${deltaStr}`);
  }

  console.log('================================================================================');

  if (failedCount > 0) {
    console.error(`\n❌ PERFORMANCE BUDGET BREACHED: ${failedCount} budget(s) exceeded the threshold!`);
    process.exit(1);
  } else {
    console.log('\n✔ All performance budgets respected. Quality gate passed successfully.');
    process.exit(0);
  }
}

checkBudgets();
