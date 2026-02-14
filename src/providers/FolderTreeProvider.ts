/*
 * Copyright (c) 2025 by frostime. All Rights Reserved.
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { TreePromptItem } from '../types';
import { BaseContentProvider, ProviderContext } from './IContentProvider';
import { IgnoreService } from '../services/IgnoreService';

/**
 * 文件夹树结构提供者
 */
export class FolderTreeProvider extends BaseContentProvider<TreePromptItem> {
  readonly type = 'tree' as const;
  private ignoreService: IgnoreService;

  constructor(context: ProviderContext, ignoreService?: IgnoreService) {
    super(context);
    this.ignoreService = ignoreService ?? new IgnoreService();
  }

  /**
   * 设置忽略服务（用于依赖注入）
   */
  setIgnoreService(service: IgnoreService): void {
    this.ignoreService = service;
  }

  /**
   * 从文件夹 URI 创建树结构项目
   */
  async create(uri: vscode.Uri): Promise<TreePromptItem | undefined> {
    try {
      const folderPath = uri.fsPath;
      const stats = await fs.promises.stat(folderPath);

      if (!stats.isDirectory()) {
        this.showWarning('请选择一个文件夹');
        return undefined;
      }

      const folderName = path.basename(folderPath);
      const relativePath = this.context.getRelativePath(uri);

      const item: TreePromptItem = {
        id: uuidv4(),
        type: 'tree',
        title: `Tree: ${folderName}`,
        content: this.createDynamicTreeGenerator(uri),
        filePath: relativePath,
        index: 0,
        mode: 'dynamic'
      };

      this.showStatusMessage(`已添加文件夹树结构: ${folderName}`);
      return item;

    } catch (error) {
      this.showError(`添加文件夹树结构失败: ${this.getErrorMessage(error)}`);
      return undefined;
    }
  }

  /**
   * 创建动态树结构生成器
   */
  private createDynamicTreeGenerator(uri: vscode.Uri): () => Promise<string> {
    return async () => {
      const folderName = path.basename(uri.fsPath);
      return `${folderName}/\n` + await this.generateFolderTree(uri, '');
    };
  }

  /**
   * 生成文件夹树结构
   */
  async generateFolderTree(uri: vscode.Uri, prefix: string): Promise<string> {
    const folderPath = uri.fsPath;
    let result = '';

    try {
      const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });

      // 过滤忽略的条目
      const filteredEntries = entries.filter(entry => {
        if (entry.isDirectory()) {
          return !this.ignoreService.shouldIgnoreDirectory(entry.name);
        }
        return !this.ignoreService.shouldIgnoreFile(entry.name);
      });

      const sortedEntries = this.sortEntries(filteredEntries);
      const lastIndex = sortedEntries.length - 1;

      for (let i = 0; i < sortedEntries.length; i++) {
        const entry = sortedEntries[i];
        const isLast = i === lastIndex;
        const entryPath = path.join(folderPath, entry.name);
        const entryUri = vscode.Uri.file(entryPath);

        const currentPrefix = prefix + (isLast ? '└── ' : '├── ');

        if (entry.isDirectory()) {
          result += `${currentPrefix}${entry.name}/\n`;
          const childPrefix = prefix + (isLast ? '    ' : '│   ');
          result += await this.generateFolderTree(entryUri, childPrefix);
        } else {
          result += `${currentPrefix}${entry.name}\n`;
        }
      }

      return result;

    } catch (error) {
      console.error(`生成文件夹树结构失败: ${error}`);
      return `${result}  [Error: 无法读取目录内容]\n`;
    }
  }

  /**
   * 排序目录条目：目录优先，然后按名称排序
   */
  private sortEntries(entries: fs.Dirent[]): fs.Dirent[] {
    return entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
