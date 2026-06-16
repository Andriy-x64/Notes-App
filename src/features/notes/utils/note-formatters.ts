/**
 * Форматери для відображення дат нотаток.
 * Перетворює мітку часу у зрозумілий користувачеві формат дати.
 */
export const formatNoteDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};
