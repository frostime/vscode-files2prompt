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

    // 设置图标
    if (element.item.type === 'file') {
      treeItem.iconPath = new vscode.ThemeIcon('file');
    } else {
      treeItem.iconPath = new vscode.ThemeIcon('code');
    }

    // 设置上下文
    treeItem.contextValue = element.item.type;

    // 设置工具提示
    if (element.item.type === 'file') {
      treeItem.tooltip = `文件: ${element.item.filePath}`;
    } else {
      treeItem.tooltip = `代码片段: ${element.item.filePath} (lines ${element.item.lineStart}-${element.item.lineEnd})`;
    }

    // 添加删除命令
    treeItem.command = {
      command: 'files-to-prompt.previewPromptItem',
      title: '预览',
      arguments: [element.item]
    };

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

          if (item.type === 'file') {
            label = path.basename(item.filePath || '');
            description = item.filePath || '';
          } else {
            label = item.title;
            description = `Lines ${item.lineStart}-${item.lineEnd}`;
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
