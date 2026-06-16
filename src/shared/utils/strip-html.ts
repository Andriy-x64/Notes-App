/**
 * Очищує HTML-контент і повертає plain text.
 * Використовується для збереження текстової версії нотатки,
 * перевірки значущості вмісту та генерації короткого опису.
 */
export function stripHtml(html: string): string {
  if (!html) {
    return "";
  }

  let text = html;

  // Замінюємо блочні елементи та розриви рядків на нові рядки для збереження форматування
  text = text.replace(/<(?:p|div|br|hr|li|h[1-6])(?:\s+[^>]*)?>/gi, "\n");
  text = text.replace(/<\/(?:p|div|li|h[1-6])>/gi, "\n");

  // Видаляємо всі інші теги HTML (замінюючи пробілом, щоб запобігти зливанню слів)
  text = text.replace(/<[^>]*>/g, " ");

  // Замінюємо поширені HTML-сутності
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');

  // Об'єднуємо послідовні пробіли/табуляції в один пробіл
  text = text.replace(/[ \t]+/g, " ");

  // Нормалізуємо символи нового рядка
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Видаляємо пробіли навколо символів нового рядка
  text = text.replace(/[ \t]*\n[ \t]*/g, "\n");

  // Скорочуємо 3 або більше послідовних нових рядків максимум до 2
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}
