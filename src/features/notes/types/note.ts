/**
 * Ре-експорт типів нотаток для сумісності фічі.
 * Експортує інтерфейси Note та SortOption з ядра для потреб модуля нотаток.
 */
// Re-export from core types for backward compatibility
export type { SortOption } from "@/core/types/sorting";
export type { Note } from "@/core/types/note";
