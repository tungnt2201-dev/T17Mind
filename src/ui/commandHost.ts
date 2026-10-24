/**
 * ui/commandHost.ts — nối bảng lệnh (core/commandPalette.ts) với AppController và các store giao diện.
 */
import type { CommandHost } from "../core/commandPalette";
import type { AppController } from "./appController";
import { explorerStore, exportDocStore, libraryStore, mapsModalOpenStore, minimapStore, searchOpenStore, tagDbStore, themeEditorStore } from "./uiStores";
import { toggleShortcutsModal } from "./shortcutsModal";

export function createCommandHost(controller: AppController): CommandHost {
  return {
    addChild: () => controller.addChildToSelection(),
    newMap: () => void controller.newMap(),
    openMaps: () => mapsModalOpenStore.set(true),
    openFile: () => void controller.openWithDialog(),
    save: () => void controller.save(),
    saveAs: () => void controller.saveAs(),
    undo: () => controller.undo(),
    redo: () => controller.redo(),
    fitView: () => controller.fitToView(),
    goHome: () => controller.navigateHome(),
    searchInMap: () => searchOpenStore.set(true),
    toggleExplorer: () => explorerStore.update((s) => ({ ...s, open: !s.open })),
    toggleLibrary: () => libraryStore.update((s) => ({ ...s, open: !s.open })),
    toggleMinimap: () => minimapStore.update((s) => ({ ...s, open: !s.open })),
    openTagDatabase: () => tagDbStore.set({ tagId: null }),
    toggleLinking: () => controller.toggleLinkingMode(),
    addSticky: () => controller.createStickyNote(),
    addFloatingBranch: () => controller.createFloatingBranch(),
    autoArrange: () => controller.autoArrange(),
    setLayout: (layout) => controller.setLayoutType(layout),
    exportDocument: () => exportDocStore.set({ scope: "map" }),
    openShortcuts: () => toggleShortcutsModal(),
    openThemeEditor: () => themeEditorStore.set({ baseThemeId: null }),
  };
}
