/*
 * Copyright (c) 2025 by frostime. All Rights Reserved.
 */
import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { SnippetPromptItem, PromptItem } from '../types';
import { BaseContentProvider, ProviderContext } from './IContentProvider';

/**
 * 代码片段内容提供者
 */
export class SnippetProvider extends BaseContentProvider<SnippetPromptItem> {
  readonly type = 'snippet' as const;

  constructor(context: ProviderContext) {
    super(context);
  }

  /**
   * 从编辑器选区创建代码片段项目
   */
  async create(
    document: vscode.TextDocument,
    selection: vscode.Selection,
    title?: string
  ): Promise<SnippetPromptItem | undefined> {
    try {
      const content = document.getText(selection);
      const relativePath = this.context.getRelativePath(document.uri);
      const lineStart = selection.start.line + 1;
      const lineEnd = selection.end.line + 1;

      const item: SnippetPromptItem = {
        id: uuidv4(),
        type: 'snippet',
        title: title || '',
        content: content, // 代码片段始终是静态的
        filePath: relativePath,
        language: document.languageId,
        lineStart,
        lineEnd,
        index: 0,
        mode: 'static'
      };

      this.showStatusMessage(`已添加代码片段: ${relativePath} (${lineStart}-${lineEnd})`);
      return item;

    } catch (error) {
      this.showError(`添加代码片段失败: ${this.getErrorMessage(error)}`);
      return undefined;
    }
  }

  /**
   * 检查代码片段是否已存在
   */
  isDuplicate(item: Partial<SnippetPromptItem>, existingItems: PromptItem[]): boolean {
    return existingItems.some(
      existing => 
        existing.type === 'snippet' &&
        (existing as SnippetPromptItem).filePath === item.filePath &&
        (existing as SnippetPromptItem).lineStart === item.lineStart &&
        (existing as SnippetPromptItem).lineEnd === item.lineEnd
    );
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
