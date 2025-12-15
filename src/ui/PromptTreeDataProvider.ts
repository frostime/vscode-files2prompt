/*
 * Copyright (c) 2025 by frostime. All Rights Reserved.
 */
import * as vscode from 'vscode';
import * as path from 'path';
import {
  PromptItem,
  FilePromptItem,
  SnippetPromptItem,
  TreePromptItem,
  GitDiffPromptItem
} from '../types';
import { PromptItemStore } from '../core/PromptItemStore';

/**
 * TreeView 节点
 */
export class PromptItemNode {
  constructor(
    public readonly item: PromptItem,
    public readonly id: string,
    public readonly label: string,
    public readonly description: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) { }
}

/**
 * Prompt 项目 TreeView 数据提供者
 * 
 * 职责：为 TreeView 提供数据和拖放支持
 */
export class PromptTreeDataProvider
  implements
  vscode.TreeDataProvider<PromptItemNode>,
  vscode.TreeDragAndDropController<PromptItemNode> {

  private readonly _onDidChangeTreeData = new vscode.EventEmitter<PromptItemNode | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  // 拖放支持
  readonly dropMimeTypes = ['application/vnd.code.tree.promptItemsView'];
  readonly dragMimeTypes = ['application/vnd.code.tree.promptItemsView'];

  constructor(private readonly store: PromptItemStore) {
    store.onDidChange(() => this.refresh());
  }

  /**
   * 刷新 TreeView
   */
  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  /**
   * 处理拖拽开始
   */
  handleDrag(
    source: readonly PromptItemNode[],
    dataTransfer: vscode.DataTransfer
  ): void {
    dataTransfer.set(
      'application/vnd.code.tree.promptItemsView',
      new vscode.DataTransferItem(source)
    );
  }

  /**
   * 处理放置
   */
  async handleDrop(
    target: PromptItemNode | undefined,
    dataTransfer: vscode.DataTransfer
  ): Promise<void> {
    const transferItem = dataTransfer.get('application/vnd.code.tree.promptItemsView');
    if (!transferItem) return;

    const sources = transferItem.value as PromptItemNode[];
    if (!sources?.length) return;

    const items = this.store.getAll();
    const sourceIndex = items.findIndex(item => item.id === sources[0].id);
    let targetIndex = target
      ? items.findIndex(item => item.id === target.id)
      : items.length;

    // 如果源在目标之前，需要调整目标索引
    if (sourceIndex < targetIndex) {
      targetIndex--;
    }

    this.store.reorder(sourceIndex, targetIndex);
  }

  /**
   * 获取 TreeItem
   */
  getTreeItem(element: PromptItemNode): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(element.label, element.collapsibleState);
    treeItem.description = element.description;
    treeItem.id = element.id;

    // 设置图标和工具提示
    const { iconPath, tooltip } = this.getItemVisuals(element.item);
    treeItem.iconPath = iconPath;
    treeItem.tooltip = tooltip;

    // 设置上下文值（用于菜单 when 条件）
    treeItem.contextValue = `promptItem-${element.item.type}-${element.item.mode}`;

    return treeItem;
  }

  /**
   * 获取子节点
   */
  getChildren(element?: PromptItemNode): Thenable<PromptItemNode[]> {
    if (element) {
      return Promise.resolve([]);
    }

    const items = this.store.getAll();
    const nodes = items.map(item => this.createNode(item));
    return Promise.resolve(nodes);
  }

  /**
   * 创建 TreeView 节点
   */
  private createNode(item: PromptItem): PromptItemNode {
    const { label, description } = this.getItemLabelAndDescription(item);

    return new PromptItemNode(
      item,
      item.id,
      label,
      description,
      vscode.TreeItemCollapsibleState.None
    );
  }

  /**
   * 获取项目的标签和描述
   */
  private getItemLabelAndDescription(item: PromptItem): { label: string; description: string } {
    switch (item.type) {
      case 'file': {
        const fileItem = item as FilePromptItem;
        return {
          label: path.basename(fileItem.filePath),
          description: fileItem.filePath
        };
      }
      case 'snippet': {
        const snippetItem = item as SnippetPromptItem;
        return {
          label: snippetItem.title || path.basename(snippetItem.filePath),
          description: `Lines ${snippetItem.lineStart}-${snippetItem.lineEnd}`
        };
      }
      case 'terminal':
        return {
          label: item.title,
          description: '终端输出'
        };
      case 'tree': {
        const treeItem = item as TreePromptItem;
        return {
          label: item.title,
          description: treeItem.filePath
        };
      }
      case 'git-diff': {
        const gitItem = item as GitDiffPromptItem;
        return {
          label: item.title,
          description: gitItem.filePath || 'Git Diff'
        };
      }
      case 'user-instruction':
        return {
          label: item.title,
          description: '用户指令'
        };
      default:
        //@ts-ignore
        return { label: item.title ?? '/', description: '' };
    }
  }

  /**
   * 获取项目的图标和工具提示
   */
  private getItemVisuals(item: PromptItem): {
    iconPath: vscode.ThemeIcon;
    tooltip: string
  } {
    const isDynamic = item.mode === 'dynamic';
    const modeLabel = isDynamic ? ' (动态)' : ' (静态)';

    switch (item.type) {
      case 'file': {
        const fileItem = item as FilePromptItem;
        return {
          iconPath: isDynamic
            ? new vscode.ThemeIcon('file', new vscode.ThemeColor('charts.blue'))
            : new vscode.ThemeIcon('file'),
          tooltip: `文件: ${fileItem.filePath}${modeLabel}`
        };
      }
      case 'snippet': {
        const snippetItem = item as SnippetPromptItem;
        return {
          iconPath: new vscode.ThemeIcon('code'),
          tooltip: `代码片段: ${snippetItem.filePath} (lines ${snippetItem.lineStart}-${snippetItem.lineEnd}) (静态)`
        };
      }
      case 'terminal':
        return {
          iconPath: new vscode.ThemeIcon('terminal'),
          tooltip: `终端输出: ${item.title} (静态)`
        };
      case 'tree': {
        const treeItem = item as TreePromptItem;
        return {
          iconPath: isDynamic
            ? new vscode.ThemeIcon('list-tree', new vscode.ThemeColor('charts.green'))
            : new vscode.ThemeIcon('list-tree'),
          tooltip: `文件夹树结构: ${treeItem.filePath}${modeLabel}`
        };
      }
      case 'git-diff': {
        const gitItem = item as GitDiffPromptItem;
        const baseTooltip = gitItem.filePath
          ? `Git Diff: ${gitItem.filePath}`
          : '全局 Git Diff';
        return {
          iconPath: isDynamic
            ? new vscode.ThemeIcon('git-compare', new vscode.ThemeColor('charts.orange'))
            : new vscode.ThemeIcon('git-compare'),
          tooltip: `${baseTooltip}${modeLabel}`
        };
      }
      case 'user-instruction':
        return {
          iconPath: new vscode.ThemeIcon('comment', new vscode.ThemeColor('charts.purple')),
          tooltip: `用户指令: ${item.title} (静态)`
        };
      default:
        return {
          iconPath: new vscode.ThemeIcon('question'),
          tooltip: '/'
        };
    }
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}
