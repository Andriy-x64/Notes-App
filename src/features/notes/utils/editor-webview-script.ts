/**
 * JavaScript-скрипт, що впроваджується у WebView редактора після його ініціалізації.
 *
 * Відповідальність:
 * - Кастомний менеджер Undo/Redo з дебаунсом (300 мс групування, ліміт 500 кроків).
 * - Збереження та відновлення позиції курсора (caret) через обхід DOM-дерева.
 * - Перехоплення execCommand для маршрутизації undo/redo до власного стеку.
 * - Виправлення поведінки pell-editor при роботі зі списками та заголовками.
 * - Повідомлення React Native про стан кнопок Undo/Redo через ReactNativeWebView.postMessage.
 */
export const EDITOR_WEBVIEW_SCRIPT = `
(function() {
  try {
    const content = document.getElementById('content');
    if (!content) return;

    // 1. Зберігаємо посилання на оригінальні методи
    const originalExec = document.execCommand;
    const originalQueryValue = document.queryCommandValue;

    // 2. Змінні для кастомного менеджера історії
    let history = [];
    let historyIndex = -1;
    let historyTimeout = null;
    let isRestoringHistory = false;
    let isHistoryAction = false;

    // 3. Допоміжні функції роботи з деревом DOM для збереження/відновлення виділення (caret)
    function getNodePath(root, node) {
      const path = [];
      let current = node;
      while (current && current !== root) {
        const parent = current.parentNode;
        if (!parent) break;
        const index = Array.prototype.indexOf.call(parent.childNodes, current);
        path.push(index);
        current = parent;
      }
      return path;
    }

    function getNodeFromPath(root, path) {
      let current = root;
      for (let i = path.length - 1; i >= 0; i--) {
        const index = path[i];
        if (current && current.childNodes && index < current.childNodes.length) {
          current = current.childNodes[index];
        } else {
          return null;
        }
      }
      return current;
    }

    function getSelectionState() {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return null;
      const range = sel.getRangeAt(0);
      return {
        startPath: getNodePath(content, range.startContainer),
        startOffset: range.startOffset,
        endPath: getNodePath(content, range.endContainer),
        endOffset: range.endOffset
      };
    }

    function restoreSelectionState(state) {
      if (!state) return;
      const startNode = getNodeFromPath(content, state.startPath);
      const endNode = getNodeFromPath(content, state.endPath);
      if (startNode && endNode) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        const range = document.createRange();
        try {
          range.setStart(startNode, state.startOffset);
          range.setEnd(endNode, state.endOffset);
          sel.addRange(range);
        } catch (e) {
          console.log("Error restoring range: " + e.message);
        }
      }
    }

    // 4. Функції кастомної історії
    function updateUndoRedoState() {
      const canUndo = historyIndex > 0;
      const canRedo = historyIndex < history.length - 1;
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'UNDO_REDO_STATE',
          data: { canUndo, canRedo }
        }));
      }
    }

    function commitSnapshot() {
      if (historyTimeout) {
        clearTimeout(historyTimeout);
        historyTimeout = null;
      }

      const currentHtml = content.innerHTML;

      // Якщо вміст не змінився з останнього збереженого кроку — нічого не робимо
      if (historyIndex >= 0 && history[historyIndex].html === currentHtml) {
        return;
      }

      // Видаляємо всі кроки Redo, якщо записуємо новий стан
      history = history.slice(0, historyIndex + 1);

      history.push({
        html: currentHtml,
        selection: getSelectionState()
      });
      historyIndex++;

      // Обмежуємо розмір стека для економії пам'яті (до 500 кроків)
      if (history.length > 500) {
        history.shift();
        historyIndex--;
      }

      updateUndoRedoState();
    }

    function queueSnapshot() {
      if (historyTimeout) {
        clearTimeout(historyTimeout);
      }
      historyTimeout = setTimeout(commitSnapshot, 300); // 300 мс групування
    }

    function triggerContentChange() {
      const event = new Event('input', { bubbles: true, cancelable: true });
      content.dispatchEvent(event);
    }

    function performUndo() {
      commitSnapshot();
      if (historyIndex > 0) {
        historyIndex--;
        const state = history[historyIndex];
        isRestoringHistory = true;
        isHistoryAction = true;
        try {
          content.innerHTML = state.html;
          restoreSelectionState(state.selection);
          triggerContentChange();
        } finally {
          isRestoringHistory = false;
          isHistoryAction = false;
        }
        updateUndoRedoState();
      }
    }

    function performRedo() {
      if (historyIndex < history.length - 1) {
        historyIndex++;
        const state = history[historyIndex];
        isRestoringHistory = true;
        isHistoryAction = true;
        try {
          content.innerHTML = state.html;
          restoreSelectionState(state.selection);
          triggerContentChange();
        } finally {
          isRestoringHistory = false;
          isHistoryAction = false;
        }
        updateUndoRedoState();
      }
    }

    // 5. Перехоплення execCommand для кастомного Undo/Redo та списків
    document.execCommand = function(commandId, showUI, value) {
      const cleanCommandId = commandId.toLowerCase();

      // Перехоплюємо Undo / Redo
      if (cleanCommandId === 'undo') {
        performUndo();
        return true;
      }
      if (cleanCommandId === 'redo') {
        performRedo();
        return true;
      }

      // Перед виконанням будь-якої форматуючої команди комітимо поточний стан
      commitSnapshot();

      // Логіка збереження виділення при зміні списків
      if (cleanCommandId === 'formatblock') {
        const targetTag = (value || '').toLowerCase();

        if (document.queryCommandState('insertUnorderedList')) {
          originalExec.call(document, 'insertUnorderedList', false, null);
        }
        if (document.queryCommandState('insertOrderedList')) {
          originalExec.call(document, 'insertOrderedList', false, null);
        }

        const currentBlock = document.queryCommandValue('formatBlock').toLowerCase();
        if (
          (currentBlock === 'h1' && targetTag === '<h1>') ||
          (currentBlock === 'h2' && targetTag === '<h2>')
        ) {
          const res = originalExec.call(document, 'formatBlock', false, '<div>');
          commitSnapshot();
          return res;
        }
      } else if (
        cleanCommandId === 'insertunorderedlist' ||
        cleanCommandId === 'insertorderedlist'
      ) {
        const currentBlock = document.queryCommandValue('formatBlock').toLowerCase();
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(currentBlock)) {
          const sel = window.getSelection();
          let savedRange = null;
          if (sel && sel.rangeCount > 0) {
            savedRange = sel.getRangeAt(0).cloneRange();
          }
          originalExec.call(document, 'formatBlock', false, '<div>');
          if (savedRange && sel) {
            try {
              sel.removeAllRanges();
              sel.addRange(savedRange);
            } catch(e) {}
          }
        }
      }

      const res = originalExec.call(document, commandId, showUI, value);
      commitSnapshot();
      return res;
    };

    // 6. Перехоплення queryCommandValue для обходу formatParagraph(true) під час Undo/Redo
    document.queryCommandValue = function(commandId) {
      const val = originalQueryValue.call(document, commandId);
      if (isHistoryAction && commandId && commandId.toLowerCase() === 'formatblock' && val === '') {
        return 'div';
      }
      return val;
    };

    // 7. Обробники подій для вводу тексту
    const originalOnInput = content.oninput;
    content.oninput = function(event) {
      if (isRestoringHistory) {
        if (originalOnInput) {
          originalOnInput.call(this, event);
        }
        return;
      }

      queueSnapshot();

      if (originalOnInput) {
        originalOnInput.call(this, event);
      }
    };

    // Комітимо знімок негайно при пробілі або Enter (групування по словах)
    content.addEventListener('keydown', function(event) {
      if (event.key === ' ' || event.key === 'Enter') {
        commitSnapshot();
      }
    });

    // Перехоплення гарячих клавіш Ctrl+Z / Ctrl+Y
    document.addEventListener('keydown', function(event) {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isUndo = (isMac ? event.metaKey : event.ctrlKey) && event.key.toLowerCase() === 'z';
      const isRedo = (isMac ? event.metaKey : event.ctrlKey) && (event.key.toLowerCase() === 'y' || (event.shiftKey && event.key.toLowerCase() === 'z'));

      if (isUndo) {
        event.preventDefault();
        performUndo();
      } else if (isRedo) {
        event.preventDefault();
        performRedo();
      }
    });

    // 8. Перехоплення innerHTML для сумісності з авто-очищенням та ініціалізацією
    let desc = null;
    let proto = content;
    while (proto) {
      desc = Object.getOwnPropertyDescriptor(proto, 'innerHTML');
      if (desc) break;
      proto = Object.getPrototypeOf(proto);
    }

    if (desc) {
      Object.defineProperty(content, 'innerHTML', {
        get() {
          const val = desc.get.call(this);
          if (isHistoryAction && val === '<br>') {
            return 'ignored-br';
          }
          return val;
        },
        set(value) {
          desc.set.call(this, value);

          // Скидаємо історію лише при реальному завантаженні нового вмісту ззовні
          // (setContentHTML при відкритті нотатки).
          // НЕ скидаємо, коли pell-editor очищає '' або '<br>' після стирання тексту.
          if (!isRestoringHistory && !isHistoryAction) {
            const isRealLoad = value !== '' && value !== '<br>' && value !== '<div><br></div>';
            if (isRealLoad) {
              history = [{ html: value, selection: null }];
              historyIndex = 0;
              if (historyTimeout) {
                clearTimeout(historyTimeout);
                historyTimeout = null;
              }
              updateUndoRedoState();
            }
          }
        },
        configurable: true,
        enumerable: true
      });
    }

    // 9. Ініціалізуємо початковий знімок
    if (history.length === 0) {
      history = [{
        html: content.innerHTML,
        selection: getSelectionState()
      }];
      historyIndex = 0;
      updateUndoRedoState();
    }

  } catch (e) {
    console.log("INJECTED SCRIPT ERROR: " + e.message + "\\n" + e.stack);
  }
})();
true;
`;
