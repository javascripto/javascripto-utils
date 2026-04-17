// ANSI escape codes for terminal styling
// Compatible with most terminals and GitHub Actions log output.

// Reset / styles
export const RESET = '\x1b[0m';
export const BOLD = '\x1b[1m';
export const DIM = '\x1b[2m';
export const ITALIC = '\x1b[3m';
export const UNDERLINE = '\x1b[4m';
export const INVERSE = '\x1b[7m';
export const HIDDEN = '\x1b[8m';
export const STRIKETHROUGH = '\x1b[9m';

// Foreground (regular)
export const BLACK = '\x1b[30m';
export const RED = '\x1b[31m';
export const GREEN = '\x1b[32m';
export const YELLOW = '\x1b[33m';
export const BLUE = '\x1b[34m';
export const MAGENTA = '\x1b[35m';
export const CYAN = '\x1b[36m';
export const WHITE = '\x1b[37m';

// Foreground (bright)
export const BRIGHT_BLACK = '\x1b[90m';
export const BRIGHT_RED = '\x1b[91m';
export const BRIGHT_GREEN = '\x1b[92m';
export const BRIGHT_YELLOW = '\x1b[93m';
export const BRIGHT_BLUE = '\x1b[94m';
export const BRIGHT_MAGENTA = '\x1b[95m';
export const BRIGHT_CYAN = '\x1b[96m';
export const BRIGHT_WHITE = '\x1b[97m';

// Background (regular)
export const BG_BLACK = '\x1b[40m';
export const BG_RED = '\x1b[41m';
export const BG_GREEN = '\x1b[42m';
export const BG_YELLOW = '\x1b[43m';
export const BG_BLUE = '\x1b[44m';
export const BG_MAGENTA = '\x1b[45m';
export const BG_CYAN = '\x1b[46m';
export const BG_WHITE = '\x1b[47m';

// Background (bright)
export const BG_BRIGHT_BLACK = '\x1b[100m';
export const BG_BRIGHT_RED = '\x1b[101m';
export const BG_BRIGHT_GREEN = '\x1b[102m';
export const BG_BRIGHT_YELLOW = '\x1b[103m';
export const BG_BRIGHT_BLUE = '\x1b[104m';
export const BG_BRIGHT_MAGENTA = '\x1b[105m';
export const BG_BRIGHT_CYAN = '\x1b[106m';
export const BG_BRIGHT_WHITE = '\x1b[107m';

export const isTTY = () =>
  typeof process !== 'undefined' && Boolean(process.stdout?.isTTY);

// Detecta suporte prático a cores no ambiente atual.
// Considera FORCE_COLOR (1/2/3), GitHub Actions, COLORTERM e padrões em TERM.
export function supportsColor() {
  if (typeof process === 'undefined') return false;
  const env = process.env || {};
  if (
    env.FORCE_COLOR === '1' ||
    env.FORCE_COLOR === '2' ||
    env.FORCE_COLOR === '3'
  )
    return true;
  if (env.GITHUB_ACTIONS) return true; // Actions normalmente exibe ANSI nos logs
  if (env.COLORTERM) return true;
  if (env.TERM && /256color|xterm|screen|ansi|cygwin/i.test(env.TERM))
    return true;
  return Boolean(process.stdout?.isTTY);
}

// Helper: wrap text with color/style (optional convenience)
export function colorize(text: string, prefix: string, suffix = RESET) {
  return supportsColor() ? `${prefix}${text}${suffix}` : String(text);
}

// Recommended environment variables for CI logs and color support.
// Valores sugeridos para referência quando configurar GitHub Actions.
export const CI_ENV_VARS = {
  TERM: 'xterm-256color',
  COLORTERM: 'truecolor',
  FORCE_COLOR: '1',
};

// Usage note (exported string for reference):
export const CI_ENV_NOTE =
  'Set TERM, COLORTERM and FORCE_COLOR in workflow env to encourage ANSI colors; avoid NO_COLOR.';

type ColorArray = { name: string; code: string }[];

// Exported lists (name + code) for programmatic use
export const styles: ColorArray = [
  { name: 'BOLD', code: BOLD },
  { name: 'DIM', code: DIM },
  { name: 'ITALIC', code: ITALIC },
  { name: 'UNDERLINE', code: UNDERLINE },
  { name: 'INVERSE', code: INVERSE },
  { name: 'HIDDEN', code: HIDDEN },
  { name: 'STRIKETHROUGH', code: STRIKETHROUGH },
] as const;

export const fgsNormal: ColorArray = [
  { name: 'BLACK', code: BLACK },
  { name: 'RED', code: RED },
  { name: 'GREEN', code: GREEN },
  { name: 'YELLOW', code: YELLOW },
  { name: 'BLUE', code: BLUE },
  { name: 'MAGENTA', code: MAGENTA },
  { name: 'CYAN', code: CYAN },
  { name: 'WHITE', code: WHITE },
] as const;

export const fgsBright: ColorArray = [
  { name: 'BRIGHT_BLACK', code: BRIGHT_BLACK },
  { name: 'BRIGHT_RED', code: BRIGHT_RED },
  { name: 'BRIGHT_GREEN', code: BRIGHT_GREEN },
  { name: 'BRIGHT_YELLOW', code: BRIGHT_YELLOW },
  { name: 'BRIGHT_BLUE', code: BRIGHT_BLUE },
  { name: 'BRIGHT_MAGENTA', code: BRIGHT_MAGENTA },
  { name: 'BRIGHT_CYAN', code: BRIGHT_CYAN },
  { name: 'BRIGHT_WHITE', code: BRIGHT_WHITE },
] as const;

export const bgsNormal: ColorArray = [
  { name: 'BG_BLACK', code: BG_BLACK },
  { name: 'BG_RED', code: BG_RED },
  { name: 'BG_GREEN', code: BG_GREEN },
  { name: 'BG_YELLOW', code: BG_YELLOW },
  { name: 'BG_BLUE', code: BG_BLUE },
  { name: 'BG_MAGENTA', code: BG_MAGENTA },
  { name: 'BG_CYAN', code: BG_CYAN },
  { name: 'BG_WHITE', code: BG_WHITE },
] as const;

export const bgsBright: ColorArray = [
  { name: 'BG_BRIGHT_BLACK', code: BG_BRIGHT_BLACK },
  { name: 'BG_BRIGHT_RED', code: BG_BRIGHT_RED },
  { name: 'BG_BRIGHT_GREEN', code: BG_BRIGHT_GREEN },
  { name: 'BG_BRIGHT_YELLOW', code: BG_BRIGHT_YELLOW },
  { name: 'BG_BRIGHT_BLUE', code: BG_BRIGHT_BLUE },
  { name: 'BG_BRIGHT_MAGENTA', code: BG_BRIGHT_MAGENTA },
  { name: 'BG_BRIGHT_CYAN', code: BG_BRIGHT_CYAN },
  { name: 'BG_BRIGHT_WHITE', code: BG_BRIGHT_WHITE },
] as const;

export function displayColorsDemo() {
  console.info(`${BOLD + BLUE}=== COLORS DEMO ===${RESET}`);

  // column widths
  const col1 = 18; // fg
  const col2 = 22; // fg bright
  const col3 = 22; // bg
  const col4 = 28; // bg bright (wider to separate from styles)
  const col5 = 18; // styles

  const rows = Math.max(
    fgsNormal.length,
    fgsBright.length,
    bgsNormal.length,
    bgsBright.length,
    styles.length,
  );

  const getColorCell = (
    colorArray: ColorArray,
    index: number,
    colWidth: number,
  ) =>
    colorArray[index]
      ? `${colorArray[index]?.code}${colorArray[index]?.name.padEnd(colWidth)}${RESET}`
      : ''.padEnd(colWidth);

  const header = `\n${BOLD}${'Foreground'.padEnd(col1)}${'FG Bright'.padEnd(col2)}${'Background'.padEnd(col3)}${'BG Bright'.padEnd(col4)}${'Styles'.padEnd(col5)}${RESET}`;

  console.info(header);

  for (let index = 0; index < rows; index++) {
    const foreground = getColorCell(fgsNormal, index, col1);
    const foregroundBright = getColorCell(fgsBright, index, col2);
    const background = getColorCell(bgsNormal, index, col3);
    const backgroundBright = getColorCell(bgsBright, index, col4);
    const style = getColorCell(styles, index, col5);
    const row = `${foreground}${foregroundBright}${background}${backgroundBright}${style}`;
    console.info(row);
  }

  console.info(`\n${BOLD}Combinations:${RESET}`);
  console.info(
    `${BG_RED}${WHITE}${BOLD} ❌ ERROR ${RESET} ${RED}something failed ⚠️${RESET}`,
  );
  console.info(
    `${BG_GREEN}${BLACK}${BOLD} ✅ SUCCESS ${RESET} ${GREEN}all good 🎉${RESET}`,
  );

  console.info(`\n${BOLD}Helper usage:${RESET}`);
  console.info(colorize('info message', CYAN));
  console.info(
    `${colorize('warning', YELLOW)} ${colorize('and continue', BRIGHT_WHITE)}`,
  );

  console.info(
    `\n${BOLD}Note:${RESET} GitHub Actions supports ANSI colors in logs; italics may not be supported everywhere.`,
  );
}

if (import.meta.main) displayColorsDemo();
