import { performance } from 'node:perf_hooks';
import {
  BLUE,
  BOLD,
  CYAN,
  DIM,
  GREEN,
  isTTY,
  RESET,
  supportsColor,
  YELLOW,
} from '../constants/ansi-colors';
import { runPromisePool, type Task } from './run-promise-pool';
import { runPromisePoolAndReturn } from './run-promise-pool-and-return';
import { runPromisePoolStream } from './run-promise-pool-stream';

type BenchmarkRow = {
  scenario: string;
  concurrencyLimit: number;
  taskCount: number;
  durationMs: number;
};

const ERASE_LINE = '\x1b[K';

const taskCount = readPositiveIntegerEnv('PROMISE_POOL_BENCH_TASKS', 25_000);
const taskDelayMs = readNonNegativeIntegerEnv(
  'PROMISE_POOL_BENCH_DELAY_MS',
  15,
);
const concurrencyLimits = readConcurrencyLimitsEnv(
  'PROMISE_POOL_BENCH_CONCURRENCY',
  [100, 200, 300, 400, 500],
);

// Paleta: vira no-op quando o ambiente não suporta cor (pipe/CI sem FORCE_COLOR).
const useColor = supportsColor();
const c = useColor
  ? { BLUE, BOLD, CYAN, DIM, GREEN, YELLOW, RESET }
  : { BLUE: '', BOLD: '', CYAN: '', DIM: '', GREEN: '', YELLOW: '', RESET: '' };
const paint = (code: string, text: string | number) =>
  useColor ? `${code}${text}${c.RESET}` : String(text);
const seconds = (ms: number) => (ms / 1000).toFixed(3);

console.info(
  `${c.BOLD}Promise Pool benchmark${c.RESET} — ${taskCount.toLocaleString()} tasks · ${taskDelayMs}ms cada · concorrências [${concurrencyLimits.join(', ')}]`,
);
console.info(
  paint(
    DIM,
    'Dica: tarefas são setTimeout puro (sem contenção real), então tempo ≈ N/C × delay.',
  ),
);
console.info('');

const rows: BenchmarkRow[] = [];

for (const concurrencyLimit of concurrencyLimits) {
  rows.push(
    await bench('and-return array', concurrencyLimit, tick =>
      runPromisePoolAndReturn({
        tasks: createArrayTasks(taskCount, taskDelayMs),
        concurrencyLimit,
        onTaskComplete: () => tick(),
      }).then(() => undefined),
    ),
  );

  rows.push(
    await bench('core async iterable', concurrencyLimit, tick =>
      runPromisePool({
        tasks: createAsyncIterableTasks(taskCount, taskDelayMs),
        concurrencyLimit,
        onTaskComplete: () => tick(),
      }),
    ),
  );

  rows.push(
    await bench('stream async iterable', concurrencyLimit, async tick => {
      for await (const _item of runPromisePoolStream({
        tasks: createAsyncIterableTasks(taskCount, taskDelayMs),
        concurrencyLimit,
        bufferLimit: concurrencyLimit,
      })) {
        tick();
      }
    }),
  );
}

renderRanking(rows);

/**
 * Roda um cenário com uma barra de progresso ao vivo (estilo demo: `\r` + cor
 * no TTY; nada de animação em pipe/CI) e loga o tempo assim que termina.
 */
async function bench(
  scenario: string,
  concurrencyLimit: number,
  run: (tick: () => void) => Promise<void>,
): Promise<BenchmarkRow> {
  const label = `${scenario.padEnd(21)} ${c.DIM}concurrency=${c.RESET}${String(concurrencyLimit).padStart(4)}`;
  const tty = isTTY();
  // limita a ~200 renders por run para não pesar nem distorcer o tempo medido
  const renderEvery = Math.max(1, Math.floor(taskCount / 200));

  let done = 0;
  const render = () => {
    if (!tty) return;
    process.stdout.write(
      `\r${label}  ${progressBar(done, taskCount)}${ERASE_LINE}`,
    );
  };
  const tick = () => {
    done++;
    if (tty && done % renderEvery === 0) render();
  };

  const startedAt = performance.now();
  await run(tick);
  const durationMs = performance.now() - startedAt;

  const time = paint(BOLD, `${seconds(durationMs)} s`);
  if (tty) {
    process.stdout.write(`\r${ERASE_LINE}`);
    console.info(`${paint(GREEN, '✓')} ${label}  →  ${time}`);
  } else {
    console.info(
      `${scenario} concurrency=${concurrencyLimit} -> ${seconds(durationMs)} s`,
    );
  }

  return { scenario, concurrencyLimit, taskCount, durationMs };
}

function progressBar(done: number, total: number): string {
  const width = 24;
  const filled = Math.round((done / total) * width);
  const bar = `${'█'.repeat(filled)}${c.DIM}${'░'.repeat(width - filled)}${c.RESET}`;
  const pct = ((done / total) * 100).toFixed(0).padStart(3);
  return `${c.BLUE}[${bar}]${c.RESET} ${pct}%  ${c.DIM}${done}/${total}${c.RESET}`;
}

/** Tabela personalizada: ranqueada por tempo, com os 3 melhores destacados. */
function renderRanking(allRows: BenchmarkRow[]): void {
  const ranked = [...allRows].sort((a, b) => a.durationMs - b.durationMs);
  const best = Math.max(ranked[0]?.durationMs ?? 0, 0.001);

  const data = ranked.map((row, i) => ({
    pos: String(i + 1),
    scenario: row.scenario,
    concurrency: String(row.concurrencyLimit),
    tasks: row.taskCount.toLocaleString(),
    s: seconds(row.durationMs),
    x: `${(row.durationMs / best).toFixed(2)}x`,
    rank: i,
  }));

  const columns: {
    key: keyof (typeof data)[number];
    title: string;
    right: boolean;
  }[] = [
    { key: 'pos', title: '#', right: true },
    { key: 'scenario', title: 'scenario', right: false },
    { key: 'concurrency', title: 'concurrency', right: true },
    { key: 'tasks', title: 'tasks', right: true },
    { key: 's', title: 's', right: true },
    { key: 'x', title: 'x best', right: true },
  ];

  const width: Record<string, number> = {};
  for (const col of columns) {
    width[col.key] = Math.max(
      col.title.length,
      ...data.map(d => String(d[col.key]).length),
    );
  }
  const cell = (value: string | number, col: (typeof columns)[number]) => {
    const w = width[col.key] ?? 0;
    return col.right ? String(value).padStart(w) : String(value).padEnd(w);
  };
  const rowText = (record: Record<string, string | number>) =>
    columns.map(col => cell(record[col.key] ?? '', col)).join('  ');

  const medals = ['🥇', '🥈', '🥉'];
  const rowColor = (rank: number) =>
    rank === 0
      ? c.BOLD + c.GREEN
      : rank === 1
        ? c.CYAN
        : rank === 2
          ? c.YELLOW
          : c.DIM;

  console.info('');
  console.info(c.BOLD + 'Ranking (mais rápido primeiro)' + c.RESET);
  const header = rowText(
    Object.fromEntries(columns.map(col => [col.key, col.title])),
  );
  console.info(c.BOLD + header + c.RESET);
  console.info(paint(DIM, '─'.repeat(header.length)));

  for (const d of data) {
    const line = rowText(d);
    const colored = useColor ? `${rowColor(d.rank)}${line}${c.RESET}` : line;
    const medal = d.rank < 3 ? `  ${medals[d.rank]}` : '';
    console.info(colored + medal);
  }

  const top = ranked[0];
  if (top) {
    console.info('');
    console.info(
      `${paint(GREEN, '🏆 Melhor:')} ${paint(BOLD, top.scenario)} @ concurrency=${top.concurrencyLimit} → ${paint(BOLD, `${seconds(top.durationMs)} s`)}`,
    );
  }
}

function createArrayTasks(count: number, delayMs: number): Task<number>[] {
  return Array.from({ length: count }, (_, index) =>
    createTask(index, delayMs),
  );
}

async function* createAsyncIterableTasks(
  count: number,
  delayMs: number,
): AsyncGenerator<Task<number>> {
  for (let index = 0; index < count; index++) {
    yield createTask(index, delayMs);
  }
}

function createTask(index: number, delayMs: number): Task<number> {
  return async () => {
    if (delayMs > 0) await sleep(delayMs);
    return index;
  };
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (Number.isInteger(value) && value > 0) return value;
  throw new RangeError(`${name} must be a positive integer`);
}

function readNonNegativeIntegerEnv(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (Number.isInteger(value) && value >= 0) return value;
  throw new RangeError(`${name} must be a non-negative integer`);
}

function readConcurrencyLimitsEnv(name: string, fallback: number[]): number[] {
  const raw = process.env[name];
  if (!raw) return fallback;

  const values = raw.split(',').map(value => Number(value.trim()));
  if (values.every(value => Number.isInteger(value) && value > 0)) {
    return values;
  }

  throw new RangeError(`${name} must be a comma-separated list of integers`);
}
