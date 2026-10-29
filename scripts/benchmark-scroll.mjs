#!/usr/bin/env node
/**
 * Synapse Automated Scroll Performance & Frame-Pacing Benchmark Suite
 *
 * Measures:
 * 1. Frame duration (Average and p95 in milliseconds)
 * 2. Dropped frames count (Frames taking > 16.67ms, violating 60fps budget)
 * 3. Long tasks count (Browser tasks > 50ms blocking main thread)
 * 4. Layout & Recalculate Style duration (ms)
 * 5. JavaScript scripting duration (ms)
 * 6. Total browser task processing duration (ms)
 *
 * Execution Conditions:
 * - 4x CPU Throttling (Emulation.setCPUThrottlingRate: 4)
 * - Dual Viewports: Desktop (1920x1080) and Mobile WebView (390x844)
 * - Large Scale Datasets: 200 Questions, 30 Batteries / 300 Questions, 300 Flashcards, 100 Notes Blocks, 200 Vault items
 * - Statistical Rigor: 5 runs per scenario, Run 1 discarded as warmup, median reported with variation %
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const ITERATIONS = 5;
const WARMUP_DISCARD = 1;
const PORT = 4789;
const CHROME_PORT = 9225;

function computeStats(samples) {
  const measured = samples.slice(WARMUP_DISCARD);
  measured.sort((a, b) => a - b);
  const min = measured[0];
  const max = measured[measured.length - 1];
  const mid = Math.floor(measured.length / 2);
  const median = measured.length % 2 !== 0 ? measured[mid] : (measured[mid - 1] + measured[mid]) / 2;
  const variation = median > 0 ? ((max - min) / median) * 100 : 0;
  return {
    median: Number(median.toFixed(2)),
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    variation: Number(variation.toFixed(2)),
  };
}

// -----------------------------------------------------------------------------
// HTML Scenarios Generator using Production Tailwind CSS
// -----------------------------------------------------------------------------

function generateHtmlPage(scenarioName, cssHrefs, bodyContent) {
  const cssLinks = cssHrefs
    .map((href) => `<link rel="stylesheet" crossorigin href="${href}">`)
    .join('\n');

  return `<!doctype html>
<html lang="pt-BR" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Scroll Benchmark - ${scenarioName}</title>
  <style>
    html, body {
      background-color: #0f0e17;
      color: #fffffe;
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
    }
    #scroll-container {
      width: 100%;
      height: 100%;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
  </style>
  ${cssLinks}
</head>
<body class="bg-dark-bg text-zinc-100">
  <div id="scroll-container" class="custom-scrollbar">
    <div class="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <header class="py-4 border-b border-white/5">
        <h1 class="text-xl font-bold">${scenarioName}</h1>
        <p class="text-xs text-zinc-400">Synapse Scroll Profiler Test Suite</p>
      </header>
      <div id="test-content">
        ${bodyContent}
      </div>
    </div>
  </div>

  <script>
    window.__scrollMetrics = {
      frameTimes: [],
      longTasks: 0,
      active: false,
    };

    let lastFrame = performance.now();
    function onFrame(now) {
      if (window.__scrollMetrics.active) {
        const delta = now - lastFrame;
        window.__scrollMetrics.frameTimes.push(delta);
      }
      lastFrame = now;
      requestAnimationFrame(onFrame);
    }
    requestAnimationFrame(onFrame);

    if (window.PerformanceObserver) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (window.__scrollMetrics.active && entry.duration > 50) {
              window.__scrollMetrics.longTasks++;
            }
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {}
    }

    window.startRecording = () => {
      window.__scrollMetrics.frameTimes = [];
      window.__scrollMetrics.longTasks = 0;
      window.__scrollMetrics.active = true;
      lastFrame = performance.now();
    };

    window.stopRecording = () => {
      window.__scrollMetrics.active = false;
      const ft = window.__scrollMetrics.frameTimes;
      if (ft.length === 0) return { avg: 0, p95: 0, dropped: 0, longTasks: 0, totalFrames: 0 };
      const sorted = [...ft].sort((a, b) => a - b);
      const avg = ft.reduce((s, x) => s + x, 0) / ft.length;
      const p95 = sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1];
      const dropped = ft.filter((x) => x > 16.67).length;
      return {
        avg: Number(avg.toFixed(2)),
        p95: Number(p95.toFixed(2)),
        dropped,
        longTasks: window.__scrollMetrics.longTasks,
        totalFrames: ft.length,
      };
    };
  </script>
</body>
</html>`;
}

function buildQuizPlayerHtml(count = 200) {
  let html = '';
  for (let i = 0; i < count; i++) {
    const isAnswered = i % 3 === 0;
    const isCorrect = i % 6 === 0;
    const borderClass = isAnswered
      ? isCorrect
        ? 'bg-emerald-500/[0.04] border-emerald-500/20'
        : 'bg-rose-500/[0.04] border-rose-500/20'
      : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]';

    html += `
    <div id="quiz-card-${i}" style="content-visibility: auto; contain-intrinsic-size: 240px;" class="p-4 md:p-5 rounded-2xl border space-y-4 ${borderClass} shadow-xs transition-colors duration-150 [content-visibility:auto] [contain-intrinsic-size:240px]">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="flex items-center justify-center w-6 h-6 rounded-md bg-white/[0.04] border border-white/[0.06] text-white/80 text-xs font-mono">
            ${i + 1}
          </span>
          <span class="text-[11px] font-medium text-dark-subtext uppercase tracking-wider">
            ${i % 4 === 0 ? 'Questão Aberta' : 'Múltipla Escolha'}
          </span>
          <span class="px-2 py-0.5 rounded-md border text-[11px] font-medium bg-white/[0.03] border-white/[0.06] text-zinc-400">
            💡 Gabarito
          </span>
        </div>
        <div class="flex flex-wrap gap-1">
          <span class="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.03] text-zinc-400 border border-white/[0.06]">#direito-constitucional</span>
          <span class="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.03] text-zinc-400 border border-white/[0.06]">#artigo-5</span>
        </div>
      </div>

      <div class="text-xs md:text-sm text-white/95 font-medium leading-relaxed">
        <p>Em relação aos direitos e garantias fundamentais previstos na Constituição Federal de 1988, considere a questão #${i + 1} e assinale a alternativa que apresenta a interpretação jurisprudencial consolidada do Supremo Tribunal Federal sobre o princípio da legalidade e da anterioridade tributária.</p>
      </div>

      <div class="space-y-2">
        <div class="p-3 rounded-xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.04] flex items-start gap-3 transition-colors cursor-pointer">
          <div class="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-xs shrink-0 mt-0.5">A</div>
          <span class="text-xs md:text-sm text-zinc-300 leading-relaxed">A lei posterior benéfica retroagirá para alcançar fatos geradores pretéritos em qualquer hipótese civil ou tributária.</span>
        </div>
        <div class="p-3 rounded-xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.04] flex items-start gap-3 transition-colors cursor-pointer">
          <div class="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-xs shrink-0 mt-0.5">B</div>
          <span class="text-xs md:text-sm text-zinc-300 leading-relaxed">É vedada a cobrança de tributos em relação a fatos geradores ocorridos antes do início da vigência da lei que os houver instituído ou aumentado.</span>
        </div>
        <div class="p-3 rounded-xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.04] flex items-start gap-3 transition-colors cursor-pointer">
          <div class="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-xs shrink-0 mt-0.5">C</div>
          <span class="text-xs md:text-sm text-zinc-300 leading-relaxed">A fixação de alíquotas do imposto sobre a renda pode ser realizada exclusivamente via decreto executivo municipal.</span>
        </div>
        <div class="p-3 rounded-xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.04] flex items-start gap-3 transition-colors cursor-pointer">
          <div class="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-xs shrink-0 mt-0.5">D</div>
          <span class="text-xs md:text-sm text-zinc-300 leading-relaxed">Nenhuma das alternativas anteriores expressa a disciplina constitucional vigente.</span>
        </div>
      </div>

      <div class="pt-2 border-t border-white/[0.05] flex items-center justify-between text-xs text-zinc-400">
        <div class="flex items-center gap-2">
          <span>Tentativa anterior: 12s atrás</span>
          <span>•</span>
          <span class="${isCorrect ? 'text-emerald-400' : 'text-rose-400'}">${isCorrect ? 'Correta' : 'Incorreta'}</span>
        </div>
        <button class="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-zinc-300">Discutir com IA</button>
      </div>
    </div>
    `;
  }
  return html;
}

function buildQuestionsExplorerHtml(batteryCount = 30) {
  let html = '<div class="space-y-4">';
  for (let b = 0; b < batteryCount; b++) {
    const qCount = 10;
    html += `
    <div class="group rounded-2xl p-4 sm:p-5 bg-dark-card/60 border border-white/5 shadow-xs space-y-3">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-start gap-3 min-w-0">
          <button class="p-1 rounded-lg text-zinc-500 mt-0.5">▼</button>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h4 class="text-sm sm:text-base font-semibold text-zinc-100">Bateria de Fixação #${b + 1} - Direito Constitucional</h4>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400">${qCount} questões</span>
            </div>
            <p class="text-xs text-zinc-400 mt-1">Revisão espaçada de princípios constitucionais fundamentais e controle difuso.</p>
            <div class="flex items-center gap-2 mt-2">
              <span class="text-[11px] px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-300 border border-brand-500/25">Caderno: OAB 1ª Fase</span>
              <span class="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.03] text-zinc-400 border border-white/[0.06]">#constitucional</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button class="px-3 py-1.5 rounded-xl bg-brand-600/20 text-brand-300 border border-brand-500/30 text-xs font-medium">Praticar</button>
          <button class="p-1.5 rounded-xl bg-white/[0.03] text-zinc-400">Editar</button>
        </div>
      </div>
      <div class="pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs font-mono text-zinc-400">
        <span>7/10 respondidas</span>
        <span class="text-emerald-400">• 85% precisão</span>
      </div>
      <div class="pt-2 border-t border-white/[0.06] space-y-2">
        ${Array.from({ length: 5 }, (_, q) => `
          <div class="p-2.5 rounded-xl bg-dark-bg/60 border border-white/[0.04] flex items-center justify-between text-xs">
            <span class="text-zinc-300 truncate max-w-md">#${q + 1} Enunciado resumido da questão de fixação rápida...</span>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">Correto</span>
          </div>
        `).join('')}
      </div>
    </div>
    `;
  }
  html += '</div>';
  return html;
}

function buildAnkiHtml(count = 300) {
  let html = '<div class="space-y-3">';
  for (let i = 0; i < count; i++) {
    html += `
    <div style="contain: layout style;" class="p-4 rounded-xl bg-dark-card/60 border border-white/5 hover:border-brand-500/30 transition-colors duration-150 flex items-start justify-between gap-4">
      <div class="space-y-1.5 min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-500/10 text-brand-300">FSRS Review</span>
          <span class="text-xs text-zinc-400">Deck: Informática & Arquitetura de Redes</span>
        </div>
        <p class="text-sm font-medium text-zinc-200">Frente: Qual a diferença fundamental entre TCP e UDP no modelo de transporte da Internet?</p>
        <p class="text-xs text-zinc-400 line-clamp-2">Verso: O TCP é orientado à conexão com garantia de entrega e controle de fluxo, enquanto o UDP é não orientado à conexão.</p>
      </div>
      <div class="text-right shrink-0 space-y-1">
        <span class="text-xs font-mono text-emerald-400 block">Em 4 dias</span>
        <span class="text-[10px] text-zinc-500 block">Estabilidade: 92%</span>
      </div>
    </div>
    `;
  }
  html += '</div>';
  return html;
}

function buildNotesHtml(count = 100) {
  let html = '<div class="space-y-6">';
  for (let i = 0; i < count; i++) {
    if (i % 5 === 0) {
      html += `<h2 class="text-lg font-bold text-zinc-100 border-b border-white/10 pb-2">Seção ${i / 5 + 1}: Arquitetura de Baixo Nível e Performance Web</h2>`;
    } else if (i % 4 === 0) {
      html += `
      <pre class="bg-black/40 border border-white/10 rounded-xl p-4 text-xs font-mono text-emerald-300 overflow-x-auto">
// Exemplo de código de alta performance em Rust / TypeScript
export function calculateThroughput(bytes: number, durationMs: number): number {
  const seconds = durationMs / 1000;
  return bytes / seconds;
}
      </pre>`;
    } else {
      html += `
      <p class="text-sm text-zinc-300 leading-relaxed">
        Parágrafo demonstrativo #${i + 1}. A rolagem em páginas ricas com renderização de markdown e blocos de código deve manter 60 FPS contínuos, sem pausas de Garbage Collection ou layout thrashing gerados por leituras intercaladas de getBoundingClientRect.
      </p>`;
    }
  }
  html += '</div>';
  return html;
}

function buildVaultHtml(count = 200) {
  let html = '<div class="space-y-2.5">';
  for (let i = 0; i < count; i++) {
    html += `
    <div style="contain: layout style;" class="p-3.5 rounded-xl bg-dark-card/50 border border-white/5 hover:border-brand-500/25 flex items-center justify-between gap-3 transition-colors duration-150">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-300 flex items-center justify-center font-bold text-xs shrink-0">
          K${i + 1}
        </div>
        <div class="min-w-0">
          <h4 class="text-xs font-semibold text-zinc-200 truncate">Serviço de Infraestrutura Nuvem #${i + 1}</h4>
          <span class="text-[11px] text-zinc-400 font-mono truncate">admin-cluster-${i}@cloud.internal</span>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">AES-256-GCM</span>
        <span class="text-[10px] text-zinc-500 font-mono">128 bits</span>
      </div>
    </div>
    `;
  }
  html += '</div>';
  return html;
}

// -----------------------------------------------------------------------------
// Benchmark Runner Orchestration
// -----------------------------------------------------------------------------

async function runScenario(scenarioKey, scenarioName, contentHtml, distDir, cssHrefs) {
  console.log(`\n================================================================================`);
  console.log(`▶ Profiling Scenario: [${scenarioName}] (5 runs, 4x CPU throttle)`);
  console.log(`================================================================================`);

  const pageHtml = generateHtmlPage(scenarioName, cssHrefs, contentHtml);

  // Viewports to test
  const viewports = [
    { name: 'Desktop (1920x1080)', width: 1920, height: 1080, mobile: false },
    { name: 'Mobile WebView (390x844)', width: 390, height: 844, mobile: true },
  ];

  const results = {};

  for (const vp of viewports) {
    console.log(`\n  📱 Viewport: ${vp.name}`);
    const runs = [];

    for (let r = 1; r <= ITERATIONS; r++) {
      // 1. Start Server for this iteration
      const server = http.createServer((req, res) => {
        let reqPath = req.url.split('?')[0];
        if (reqPath === '/' || reqPath === '/index.html') {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(pageHtml);
          return;
        }
        const filePath = path.join(distDir, reqPath);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath);
          const mime = ext === '.css' ? 'text/css' : ext === '.js' ? 'application/javascript' : 'application/octet-stream';
          res.writeHead(200, { 'Content-Type': mime });
          fs.createReadStream(filePath).pipe(res);
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
      });

      await new Promise((resolve) => server.listen(PORT, resolve));

      // 2. Launch Headless Chrome
      const chrome = spawn('google-chrome', [
        '--headless=new',
        `--remote-debugging-port=${CHROME_PORT}`,
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
      ]);

      await new Promise((resolve) => setTimeout(resolve, 600));

      try {
        const tabRes = await fetch(`http://127.0.0.1:${CHROME_PORT}/json/new?http://127.0.0.1:${PORT}/`, { method: 'PUT' });
        const tab = await tabRes.json();
        const ws = new WebSocket(tab.webSocketDebuggerUrl);

        let id = 1;
        const send = (method, params = {}) =>
          new Promise((res, rej) => {
            const reqId = id++;
            const handler = (evt) => {
              const m = JSON.parse(evt.data);
              if (m.id === reqId) {
                ws.removeEventListener('message', handler);
                if (m.error) rej(m.error);
                else res(m.result);
              }
            };
            ws.addEventListener('message', handler);
            ws.send(JSON.stringify({ id: reqId, method, params }));
          });

        await new Promise((res) => ws.addEventListener('open', res));

        // Configure viewport and 4x CPU throttle
        await send('Emulation.setDeviceMetricsOverride', {
          width: vp.width,
          height: vp.height,
          deviceScaleFactor: vp.mobile ? 3 : 1,
          mobile: vp.mobile,
        });
        await send('Emulation.setCPUThrottlingRate', { rate: 4 });
        await send('Performance.enable');
        await send('Page.enable');
        await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });

        // Wait for page load and fonts to stabilize
        await new Promise((res) => setTimeout(res, 800));

        // Initial metrics snapshot
        const metricsBefore = await send('Performance.getMetrics');
        const metricMapBefore = Object.fromEntries(metricsBefore.metrics.map((m) => [m.name, m.value]));

        // Start recording frame times inside page
        await send('Runtime.evaluate', { expression: 'window.startRecording()' });

        // Perform synthetic scroll gesture (down 4000px and up 4000px)
        await send('Input.synthesizeScrollGesture', {
          x: Math.floor(vp.width / 2),
          y: Math.floor(vp.height / 2),
          xDistance: 0,
          yDistance: -3500,
          repeatCount: 1,
          speed: 1600,
        });

        await new Promise((res) => setTimeout(res, 300));

        await send('Input.synthesizeScrollGesture', {
          x: Math.floor(vp.width / 2),
          y: Math.floor(vp.height / 2),
          xDistance: 0,
          yDistance: 3500,
          repeatCount: 1,
          speed: 1600,
        });

        await new Promise((res) => setTimeout(res, 300));

        // Stop recording
        const evalRes = await send('Runtime.evaluate', {
          expression: 'window.stopRecording()',
          returnByValue: true,
        });
        const pageMetrics = evalRes.result.value || {};

        const metricsAfter = await send('Performance.getMetrics');
        const metricMapAfter = Object.fromEntries(metricsAfter.metrics.map((m) => [m.name, m.value]));

        const layoutDuration = (metricMapAfter['LayoutDuration'] - metricMapBefore['LayoutDuration']) * 1000;
        const recalcStyleDuration = (metricMapAfter['RecalcStyleDuration'] - metricMapBefore['RecalcStyleDuration']) * 1000;
        const scriptDuration = (metricMapAfter['ScriptDuration'] - metricMapBefore['ScriptDuration']) * 1000;
        const taskDuration = (metricMapAfter['TaskDuration'] - metricMapBefore['TaskDuration']) * 1000;

        const runData = {
          avgFrameMs: pageMetrics.avg || 0,
          p95FrameMs: pageMetrics.p95 || 0,
          droppedFrames: pageMetrics.dropped || 0,
          longTasks: pageMetrics.longTasks || 0,
          layoutStyleMs: layoutDuration + recalcStyleDuration,
          scriptDurationMs: scriptDuration,
          taskDurationMs: taskDuration,
          totalFrames: pageMetrics.totalFrames || 0,
        };

        runs.push(runData);
        console.log(`    Run ${r}/${ITERATIONS}: avg=${runData.avgFrameMs.toFixed(2)}ms | p95=${runData.p95FrameMs.toFixed(2)}ms | dropped=${runData.droppedFrames} | layout+style=${runData.layoutStyleMs.toFixed(1)}ms | tasks=${runData.taskDurationMs.toFixed(1)}ms`);

        ws.close();
      } catch (err) {
        console.error(`    Run ${r} error:`, err);
      } finally {
        chrome.kill();
        server.close();
        await new Promise((res) => setTimeout(res, 200));
      }
    }

    results[vp.name] = {
      avgFrameMs: computeStats(runs.map((r) => r.avgFrameMs)),
      p95FrameMs: computeStats(runs.map((r) => r.p95FrameMs)),
      droppedFrames: computeStats(runs.map((r) => r.droppedFrames)),
      longTasks: computeStats(runs.map((r) => r.longTasks)),
      layoutStyleMs: computeStats(runs.map((r) => r.layoutStyleMs)),
      scriptDurationMs: computeStats(runs.map((r) => r.scriptDurationMs)),
      taskDurationMs: computeStats(runs.map((r) => r.taskDurationMs)),
    };
  }

  return results;
}

// -----------------------------------------------------------------------------
// Main Entry Point
// -----------------------------------------------------------------------------

async function main() {
  const distDir = path.resolve('dist');
  if (!fs.existsSync(distDir)) {
    console.error('Error: dist directory does not exist. Run "npm run build" first.');
    process.exit(1);
  }

  // Discover compiled CSS assets
  const assetsDir = path.join(distDir, 'assets');
  const cssFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.css'));
  const cssHrefs = cssFiles.map((f) => `/assets/${f}`);

  console.log(`Found compiled CSS stylesheets:`, cssHrefs);

  const scenarios = [
    {
      key: 'quiz-player',
      name: 'Quiz & Questions Player (200 Questions)',
      html: buildQuizPlayerHtml(200),
    },
    {
      key: 'questions-explorer',
      name: 'Questions Explorer Tree (30 Batteries / 300 Qs)',
      html: buildQuestionsExplorerHtml(30),
    },
    {
      key: 'anki-flashcards',
      name: 'Anki Flashcard Deck (300 Cards)',
      html: buildAnkiHtml(300),
    },
    {
      key: 'notes-document',
      name: 'Notes & Editor Page View (100 Blocks & Code)',
      html: buildNotesHtml(100),
    },
    {
      key: 'vault-records',
      name: 'Vault Password & Keychain Records (200 Items)',
      html: buildVaultHtml(200),
    },
  ];

  const fullReport = {};

  for (const sc of scenarios) {
    fullReport[sc.key] = await runScenario(sc.key, sc.name, sc.html, distDir, cssHrefs);
  }

  // Output JSON report
  const reportPath = path.resolve('docs/benchmark-scroll-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(fullReport, null, 2));
  console.log(`\n✅ Raw scroll benchmark report saved to: ${reportPath}`);

  // Print Summary Table
  console.log(`\n================================================================================`);
  console.log(`                SYNAPSE SCROLL PERFORMANCE BENCHMARK SUMMARY                    `);
  console.log(`       Conditions: 4x CPU Throttle | 5 Runs (Warmup Discarded) | Median         `);
  console.log(`================================================================================`);
  console.log(`Module / Viewport                     | Avg Frame  | p95 Frame  | Dropped | Layout+Style | Tasks`);
  console.log(`--------------------------------------|------------|------------|---------|--------------|--------`);

  for (const sc of scenarios) {
    const data = fullReport[sc.key];
    for (const [vpName, vpData] of Object.entries(data)) {
      const label = `${sc.key} (${vpName.includes('Mobile') ? 'Mobile' : 'Desktop'})`.padEnd(38);
      const avg = `${vpData.avgFrameMs.median} ms`.padStart(10);
      const p95 = `${vpData.p95FrameMs.median} ms`.padStart(10);
      const dropped = `${vpData.droppedFrames.median}`.padStart(7);
      const layout = `${vpData.layoutStyleMs.median} ms`.padStart(12);
      const tasks = `${vpData.taskDurationMs.median} ms`.padStart(8);
      console.log(`${label}| ${avg} | ${p95} | ${dropped} | ${layout} | ${tasks}`);
    }
  }
  console.log(`================================================================================\n`);
}

main().catch((err) => {
  console.error('Fatal benchmark error:', err);
  process.exit(1);
});

