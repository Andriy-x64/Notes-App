/**
 * Утиліта для формування короткого текстового прев'ю нотатки.
 * Працює з чистим текстом, обрізає його за максимальною довжиною (в символах) 
 * та форматує переноси рядків для відображення в картці нотатки або нагадування.
 */
const DEFAULT_PLACEHOLDER = "Без опису";
const DEFAULT_MAX_LENGTH = 120;

const normalizeLine = (line: string) => line.replace(/[ \t]+/g, " ").trim();

export function getNotePreview(
  contentPlain: string,
  maxLength: number = DEFAULT_MAX_LENGTH,
  placeholder: string = DEFAULT_PLACEHOLDER
): string {
  if (!contentPlain) {
    return placeholder;
  }

  const normalized = contentPlain
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map(normalizeLine)
    .filter((line, index, lines) => line.length > 0 || lines.length === 1)
    .join("\n")
    .trim();

  if (!normalized) {
    return placeholder;
  }

  const lines = normalized.split("\n");

  if (lines.length >= 2) {
    const firstLine = lines[0];
    const secondLine = lines[1];
    const hasMoreLines = lines.length > 2;

    if (hasMoreLines) {
      return `${firstLine}\n${secondLine}…`;
    }

    const combinedLength = firstLine.length + secondLine.length;
    if (combinedLength <= maxLength) {
      return normalized;
    }

    return `${firstLine}\n${secondLine}…`;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const truncated = normalized.slice(0, maxLength);
  const lastBreak = Math.max(
    truncated.lastIndexOf("\n"),
    truncated.lastIndexOf(" ")
  );
  const cut = lastBreak > maxLength * 0.7 ? truncated.slice(0, lastBreak) : truncated;

  return `${cut.trimEnd()}…`;
}
