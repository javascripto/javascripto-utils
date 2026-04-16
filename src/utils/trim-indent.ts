export function trimIndent(string: string) {
  const lines = string.split('\n').filter((line, index, lines) => {
    const isFirstOrLastLine = [0, lines.length - 1].includes(index);
    return !isFirstOrLastLine || line.trim() !== '';
  });
  const indent = lines.reduce((minIndent, line) => {
    if (line.trim() === '') return minIndent;
    const lineIndent = line.match(/^(\s*)/)![0].length;
    return Math.min(minIndent, lineIndent);
  }, Infinity);
  return lines.map(line => line.slice(indent)).join('\n');
}
