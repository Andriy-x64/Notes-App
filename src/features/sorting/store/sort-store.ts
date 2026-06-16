/**
 * In-memory Zustand сховище поточного типу сортування.
 * Зберігає активну опцію сортування та токен оновлення для реактивної синхронізації UI.
 * Персистентне збереження налаштувань — відповідальність settingsRepository.
 */
import { create } from "zustand";
import type { SortOption } from "@/core/types/sorting";

interface SortState {
  /**
   * Обраний користувачем тип сортування (наприклад, за датою оновлення чи назвою).
   */
  sortOption: SortOption;
  /**
   * Токен оновлення стану для реактивної синхронізації списків на UI.
   */
  refreshToken: number;
  /**
   * Змінює поточну опцію сортування нотаток.
   */
  setSortOption: (option: SortOption) => void;
  /**
   * Тригерить оновлення токена та змушує компоненти перечитати список нотаток із новим сортуванням.
   */
  triggerRefresh: () => void;
}

/**
 * Глобальний React-хук доступу до сховища Zustand для управління типом сортування нотаток.
 */
export const useSortStore = create<SortState>((set) => ({
  sortOption: "updated_at_desc",
  refreshToken: 0,
  setSortOption: (option) => set({ sortOption: option }),
  triggerRefresh: () => set((state) => ({ refreshToken: state.refreshToken + 1 })),
}));
