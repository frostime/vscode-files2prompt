/*
 * Copyright (c) 2025 by frostime. All Rights Reserved.
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { FilePromptItem, PromptItem } from '../types';
import { BaseContentProvider, ProviderContext } from './IContentProvider';
import { IgnoreService } from '../services/IgnoreService';

/**
 * 文件内容提供者
 * 
 * 职责：处理文件类型的 Prompt 项目创建
 */
export class FileProvider extends BaseContentProvider<FilePromptItem> {
  readonly type = 'file' as const;
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
   * 从 URI 创建文件项目
   */
  async create(uri: vscode.Uri): Promise<FilePromptItem | undefined> {
    try {
      const filePath = uri.fsPath;
      const stats = await fs.promises.stat(filePath);

      if (stats.isDirectory()) {
        // 目录交给外层处理，这里返回 undefined
        return undefined;
      }

      const document = await vscode.workspace.openTextDocument(uri);
      const relativePath = this.context.getRelativePath(uri);
      const fileName = path.basename(filePath);

      const item: FilePromptItem = {
        id: uuidv4(),
        type: 'file',
        title: fileName,
        content: this.createDynamicContentGenerator(uri),
        filePath: relativePath,
        language: document.languageId,
        index: 0, // 由 Store 设置
        mode: 'dynamic'
      };

      this.showStatusMessage(`已添加文件: ${fileName}`);
      return item;

    } catch (error) {
      this.showError(`添加文件失败: ${this.getErrorMessage(error)}`);
      return undefined;
    }
  }

  /**
   * 批量添加目录下的所有文件
   */
  async createFromDirectory(uri: vscode.Uri): Promise<FilePromptItem[]> {
    const items: FilePromptItem[] = [];
    
    try {
      const dirPath = uri.fsPath;
      const dirName = path.basename(dirPath);
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry.name);
        const entryUri = vscode.Uri.file(entryPath);

        if (entry.isDirectory()) {
          // 检查目录是否应该被忽略
          if (this.ignoreService.shouldIgnoreDirectory(entry.name)) {
            continue;
          }
          const subItems = await this.createFromDirectory(entryUri);
          items.push(...subItems);
        } else if (entry.isFile()) {
          // 检查文件是否应该被忽略
          if (this.ignoreService.shouldIgnoreFile(entry.name)) {
            continue;
          }
          try {
            const item = await this.create(entryUri);
            if (item) {
              items.push(item);
            }
          } catch {
            // 忽略无法添加的文件（如二进制文件）
          }
        }
      }

      if (items.length > 0) {
        this.showStatusMessage(`已从目录 ${dirName} 添加 ${items.length} 个文件`);
      }

    } catch (error) {
      this.showError(`处理目录失败: ${this.getErrorMessage(error)}`);
    }

    return items;
  }

  /**
   * 检查文件是否已存在
   */
  isDuplicate(item: Partial<FilePromptItem>, existingItems: PromptItem[]): boolean {
    return existingItems.some(
      existing => existing.type === 'file' && 
                  (existing as FilePromptItem).filePath === item.filePath
    );
  }

  /**
   * 创建动态内容生成器
   */
  private createDynamicContentGenerator(uri: vscode.Uri): () => Promise<string> {
    return async () => {
      const document = await vscode.workspace.openTextDocument(uri);
      return document.getText();
    };
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
