---
change: "side-select-subset"
updated: "2026-05-27T23:15:00"
---

# Tasks

## Legend
`[ ]` Todo | `[x]` Done

## Tasks

### Phase 1: Data Layer ✅
- [x] Modify `src/types/index.ts` — `PromptItemBase` 增加 `selected: boolean` per design.md
- [x] Modify `src/core/PromptItemStore.ts` — `add()` 增加 `item.selected ??= true` 防御
- [x] Modify `src/core/PromptItemStore.ts` — 新增 `setSelected(id, selected)` 方法，复用 `update()`
- [x] Modify `src/core/PromptItemStore.ts` — 新增 `selectAll(selected)` 方法，payload 用 `[...this.items]` 副本
- [x] Modify `src/providers/FileProvider.ts` — `create()` / `createFromDirectory()` 创建对象补 `selected: true`
- [x] Modify `src/providers/SnippetProvider.ts` — `create()` 创建对象补 `selected: true`
- [x] Modify `src/providers/TerminalProvider.ts` — `create()` 创建对象补 `selected: true`
- [x] Modify `src/providers/FolderTreeProvider.ts` — `create()` 创建对象补 `selected: true`
- [x] Modify `src/providers/GitDiffProvider.ts` — `create()` / `createForFile()` 创建对象补 `selected: true`
- [x] Modify `src/providers/UserInstructionProvider.ts` — `create()` 创建对象补 `selected: true`
**Verification**: `npm run compile` 无类型错误 ✓

### Phase 2: UI Layer ✅
- [x] Modify `src/ui/PromptTreeDataProvider.ts` — `getTreeItem()` 根据 `item.selected` 设置 `checkboxState` per design.md
- [x] Modify `src/extension.ts` — TreeView 创建后注册 `onDidChangeCheckboxState` 事件，disposable 加入 `context.subscriptions`
**Verification**: `npm run compile` 通过 ✓

### Phase 3: Command Layer ✅
- [x] Modify `src/commands/CommandRegistry.ts` — 新增 `selectAllItems()` 命令，调用 `store.selectAll(true)`
- [x] Modify `src/commands/CommandRegistry.ts` — 新增 `deselectAllItems()` 命令，调用 `store.selectAll(false)`
- [x] Modify `src/commands/CommandRegistry.ts` — `register()` 注册两个新命令
- [x] Modify `src/commands/CommandRegistry.ts` — `generatePrompt()` 过滤 `selected === true`，空集弹 warning
- [x] Modify `src/commands/CommandRegistry.ts` — `exportToZip()` 过滤 `selected === true`，空集弹 warning
- [x] Modify `package.json` — 注册 `selectAllItems` / `deselectAllItems` 命令（含 icon）
- [x] Modify `package.json` — `view/title` 菜单新增全选/取消全选按钮（navigation@5 / @6）
**Verification**: `npm run compile` 通过 ✓

---

## Progress

**Overall**: 100%

| Phase | Progress | Status |
|-------|----------|--------|
| Phase 1 | 100% | ✅ |
| Phase 2 | 100% | ✅ |
| Phase 3 | 100% | ✅ |

**Recent**:
- Phase 1: Data Layer 完成 — types/store/providers 全部更新
- Phase 2: UI Layer 完成 — checkboxState + onDidChangeCheckboxState
- Phase 3: Command Layer 完成 — selectAll/deselectAll + 过滤逻辑
