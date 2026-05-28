---
change: "side-select-subset"
created: 2026-05-27T22:53:07
---

# Design: side-select-subset

## Interface Contract

### Data Model Change

````ts
// src/types/index.ts — PromptItemBase 增加一个字段
interface PromptItemBase {
  id: string;
  type: PromptItemType;
  title: string;
  content: PromptContent;
  mode: ContentMode;
  index: number;
  selected: boolean;   // ← NEW: 默认 true
}
````

### Store API Extension

````ts
// src/core/PromptItemStore.ts

class PromptItemStore {
  /** 添加时防御：确保 selected 默认为 true */
  add(item: PromptItem): void {
    item.index = this.items.length;
    item.selected ??= true;   // ← NEW
    this.items.push(item);
    this._onDidChange.fire({ type: 'add', item });
  }

  /** 设置单个 item 的选中状态，复用 update() */
  setSelected(id: string, selected: boolean): boolean {
    return this.update(id, { selected });
  }

  /** 批量设置所有 item 的选中状态 */
  selectAll(selected: boolean): void {
    for (const item of this.items) {
      item.selected = selected;
    }
    this._onDidChange.fire({ type: 'update', items: [...this.items] });
  }
}
````

## Behavioral Flow

### Checkbox 点击流

```text
User clicks checkbox in TreeView
  │
  ├── VS Code fires onDidChangeCheckboxState(items)
  │     └── items: ReadonlyArray<[PromptItemNode, TreeItemCheckboxState]>
  │
  ├── extension.ts handler (registered via treeView.onDidChangeCheckboxState)
  │     └── for each [node, state]:
  │           store.setSelected(node.id, state === Checked)
  │
  └── store.setSelected() fires onDidChange('update')
        └── TreeView refreshes (already wired)
```

### 生成 Prompt 流

```text
User clicks "生成 Prompt" button
  │
  ├── CommandRegistry.generatePrompt()
  │     ├── selectedItems = store.getAll().filter(i => i.selected)
  │     ├── if selectedItems.length === 0:
  │     │     └── showWarningMessage('没有选中任何项目，请先勾选')
  │     │     └── return
  │     └── promptGenerator.generate(selectedItems)
  │
  └── openTextDocument(prompt)
```

### 导出 ZIP 流

```text
User clicks "导出 ZIP" button
  │
  ├── CommandRegistry.exportToZip()
  │     ├── selectedItems = store.getAll().filter(i => i.selected)
  │     ├── if selectedItems.length === 0:
  │     │     └── showWarningMessage('没有选中任何项目，请先勾选')
  │     │     └── return
  │     └── exportService.exportToZip(selectedItems)
```

### 全选/取消全选流

```text
User clicks "全选" / "取消全选" in TreeView title bar
  │
  ├── CommandRegistry.selectAllItems() / deselectAllItems()
  │     └── store.selectAll(true / false)
  │
  └── store fires onDidChange → TreeView refreshes
```

### onDidChangeCheckboxState 注册

```text
// src/extension.ts — TreeView 创建后，disposable 加入 subscriptions
const treeView = vscode.window.createTreeView('promptItemsView', { ... });

context.subscriptions.push(
  treeView.onDidChangeCheckboxState(e => {
    for (const [node, state] of e.items) {
      store.setSelected(node.id, state === vscode.TreeItemCheckboxState.Checked);
    }
  })
);
```

## UI Specification

### Checkbox 状态映射

| `item.selected` | `TreeItem.checkboxState` |
|-----------------|--------------------------|
| `true`          | `TreeItemCheckboxState.Checked` |
| `false`         | `TreeItemCheckboxState.Unchecked` |

### 标题栏按钮布局

```text
[▶ 生成] [📦 导出] [🗑 清空] [➕ 添加] [☑ 全选] [☐ 取消全选]
```

新增两个按钮位于标题栏末尾，codicon 分别为 `check-all` 和 `close-all`。

### package.json 新增命令

````json
{
  "command": "assemble-code-to-prompt.selectAllItems",
  "title": "全选",
  "icon": "$(check-all)"
},
{
  "command": "assemble-code-to-prompt.deselectAllItems",
  "title": "取消全选",
  "icon": "$(close-all)"
}
````

### Provider 补丁示例

所有 provider 创建对象时需补 `selected: true`，以 FileProvider 为例：

````ts
// src/providers/FileProvider.ts
const item: FilePromptItem = {
  id: uuidv4(),
  type: 'file',
  title: fileName,
  content: this.createDynamicContentGenerator(uri),
  filePath: relativePath,
  language: document.languageId,
  index: 0,
  mode: 'dynamic',
  selected: true   // ← NEW
};
````

其余 5 个 provider（Snippet / Terminal / FolderTree / GitDiff / UserInstruction）同理。

view/title 菜单注册：

````json
{
  "command": "assemble-code-to-prompt.selectAllItems",
  "when": "view == promptItemsView",
  "group": "navigation@5"
},
{
  "command": "assemble-code-to-prompt.deselectAllItems",
  "when": "view == promptItemsView",
  "group": "navigation@6"
}
````
