/*
 * Copyright (c) 2025 by frostime. All Rights Reserved.
 */
import * as vscode from 'vscode';
import * as path from 'path';
import { PromptItem, PromptManager } from './promptManager';

export class PromptItemNode {
  constructor(
    public readonly item: PromptItem,
    public readonly id: string,
    public readonly label: string,
    public readonly description: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {}
}

export class PromptTreeProvider implements vscode.TreeDataProvider<PromptItemNode>, vscode.TreeDragAndDropController<PromptItemNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<PromptItemNode | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  // 拖放支持
  dropMimeTypes = ['application/vnd.code.tree.promptItemsView'];
  dragMimeTypes = ['application/vnd.code.tree.promptItemsView'];

  constructor(private promptManager: PromptManager) {
    // 监听 promptManager 的变化
    promptManager.onDidChangeItems(() => this.refresh());
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  // 处理拖放
  handleDrag(source: readonly PromptItemNode[], dataTransfer: vscode.DataTransfer): void {
    dataTransfer.set('application/vnd.code.tree.promptItemsView', new vscode.DataTransferItem(source));
  }

  // 处理放置
  async handleDrop(target: PromptItemNode | undefined, dataTransfer: vscode.DataTransfer): Promise<void> {
    const transferItem = dataTransfer.get('application/vnd.code.tree.promptItemsView');
    if (!transferItem) {
      return;
    }

    const sources = transferItem.value as PromptItemNode[];
    if (!sources || sources.length === 0) {
      return;
    }

    // 获取所有项目
    const items = this.promptManager.getItems();

    // 获取源项目和目标项目的索引
    const sourceIndex = items.findIndex(item => item.id === sources[0].id);
    let targetIndex = target ? items.findIndex(item => item.id === target.id) : items.length;

    // 如果源在目标之前，需要调整目标索引
    if (sourceIndex < targetIndex) {
      targetIndex--;
    }

    // 重新排序
    this.promptManager.reorderItems(sourceIndex, targetIndex);
  }

  getTreeItem(element: PromptItemNode): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(element.label, element.collapsibleState);
    treeItem.description = element.description;
    treeItem.id = element.id;

    // 设置图标和工具提示
    switch (element.item.type) {
      case 'file':
        treeItem.iconPath = new vscode.ThemeIcon('file');
        treeItem.tooltip = `文件: ${element.item.filePath}`;
        break;
      case 'snippet':
        treeItem.iconPath = new vscode.ThemeIcon('code');
        treeItem.tooltip = `代码片段: ${element.item.filePath} (lines ${element.item.lineStart}-${element.item.lineEnd})`;
        break;
      case 'terminal':
        treeItem.iconPath = new vscode.ThemeIcon('terminal');
        treeItem.tooltip = `终端输出: ${element.item.title}`;
        break;
      case 'tree':
        treeItem.iconPath = new vscode.ThemeIcon('list-tree');
        treeItem.tooltip = `文件夹树结构: ${element.item.filePath}`;
        break;
    }

    // 设置上下文
    treeItem.contextValue = element.item.type;

    return treeItem;
  }

  getChildren(element?: PromptItemNode): Thenable<PromptItemNode[]> {
    if (element) {
      return Promise.resolve([]);
    } else {
      const items = this.promptManager.getItems();
      return Promise.resolve(
        items.map(item => {
          let label = '';
          let description = '';

          switch (item.type) {
            case 'file':
              label = path.basename(item.filePath || '');
              description = item.filePath || '';
              break;
            case 'snippet':
              label = item.title || path.basename(item.filePath || '');
              description = `Lines ${item.lineStart}-${item.lineEnd}`;
              break;
            case 'terminal':
              label = item.title;
              description = '终端输出';
              break;
            case 'tree':
              label = item.title;
              description = item.filePath || '';
              break;
          }

          return new PromptItemNode(
            item,
            item.id,
            label,
            description,
            vscode.TreeItemCollapsibleState.None
          );
        })
      );
    }
  }
}
