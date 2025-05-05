/*
 * Copyright (c) 2025 by frostime. All Rights Reserved.
 */
import * as vscode from 'vscode';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// 表示添加到 prompt 集合中的单个项目
export interface PromptItem {
  id: string;                    // 唯一标识符
  type: 'file' | 'snippet';      // 类型：文件或代码片段
  title: string;                 // 标题或描述
  content: string;               // 内容
  filePath?: string;             // 文件路径（如果适用）
  language?: string;             // 语言（用于语法高亮）
  lineStart?: number;            // 代码片段的起始行（如果适用）
  lineEnd?: number;              // 代码片段的结束行（如果适用）
  index: number;                 // 用于排序
}

export class PromptManager {
  private items: PromptItem[] = [];
  private _onDidChangeItems = new vscode.EventEmitter<void>();
  readonly onDidChangeItems = this._onDidChangeItems.event;
  
  constructor(
    private fileTemplate: string,
    private baseTemplate: string
  ) {}
  
  // 添加文件
  async addFile(uri: vscode.Uri): Promise<void> {
    try {
      const document = await vscode.workspace.openTextDocument(uri);
      const content = document.getText();
      const filePath = uri.fsPath;
      
      // 获取相对路径
      let relativePath = filePath;
      if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (workspaceFolder) {
          relativePath = filePath.substring(workspaceFolder.uri.fsPath.length + 1);
        }
      }
      
      const fileName = path.basename(filePath);
      
      const item: PromptItem = {
        id: uuidv4(),
        type: 'file',
        title: fileName,
        content: content,
        filePath: relativePath,
        language: document.languageId,
        index: this.items.length
      };
      
      this.items.push(item);
      this._onDidChangeItems.fire();
      
      vscode.window.showInformationMessage(`已添加文件: ${fileName}`);
    } catch (error) {
      vscode.window.showErrorMessage(`添加文件失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // 添加代码片段
  addSnippet(document: vscode.TextDocument, selection: vscode.Selection, title?: string): void {
    try {
      const content = document.getText(selection);
      const filePath = document.uri.fsPath;
      
      // 获取相对路径
      let relativePath = filePath;
      if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (workspaceFolder) {
          relativePath = filePath.substring(workspaceFolder.uri.fsPath.length + 1);
        }
      }
      
      const fileName = path.basename(filePath);
      const lineStart = selection.start.line + 1;
      const lineEnd = selection.end.line + 1;
      
      const item: PromptItem = {
        id: uuidv4(),
        type: 'snippet',
        title: title || `${fileName} (lines ${lineStart}-${lineEnd})`,
        content: content,
        filePath: relativePath,
        language: document.languageId,
        lineStart: lineStart,
        lineEnd: lineEnd,
        index: this.items.length
      };
      
      this.items.push(item);
      this._onDidChangeItems.fire();
      
      vscode.window.showInformationMessage(`已添加代码片段: ${item.title}`);
    } catch (error) {
      vscode.window.showErrorMessage(`添加代码片段失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // 删除项目
  removeItem(id: string): void {
    const index = this.items.findIndex(item => item.id === id);
    if (index !== -1) {
      const item = this.items[index];
      this.items.splice(index, 1);
      
      // 更新索引
      for (let i = 0; i < this.items.length; i++) {
        this.items[i].index = i;
      }
      
      this._onDidChangeItems.fire();
      vscode.window.showInformationMessage(`已删除: ${item.title}`);
    }
  }
  
  // 重新排序
  reorderItems(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= this.items.length || toIndex < 0 || toIndex >= this.items.length) {
      return;
    }
    
    const item = this.items[fromIndex];
    this.items.splice(fromIndex, 1);
    this.items.splice(toIndex, 0, item);
    
    // 更新索引
    for (let i = 0; i < this.items.length; i++) {
      this.items[i].index = i;
    }
    
    this._onDidChangeItems.fire();
  }
  
  // 清空集合
  clear(): void {
    this.items = [];
    this._onDidChangeItems.fire();
    vscode.window.showInformationMessage('已清空 Prompt 集合');
  }
  
  // 获取所有项目
  getItems(): PromptItem[] {
    return [...this.items];
  }
  
  // 生成最终的 prompt
  generatePrompt(sortOrder: 'openingOrder' | 'filePath' = 'openingOrder'): string {
    if (this.items.length === 0) {
      return '没有选择任何文件或代码片段';
    }
    
    let prompts: { path: string, prompt: string, index: number }[] = [];
    
    for (const [index, item] of this.items.entries()) {
      if (item.type === 'file') {
        // 使用与原有功能相同的模板替换
        const fileContent = this.fileTemplate
          .replace(/{{Content}}/g, item.content)
          .replace(/{{FilePath}}/g, item.filePath || '')
          .replace(/{{FileName}}/g, path.basename(item.filePath || ''))
          .replace(/{{FileExt}}/g, path.extname(item.filePath || '').substring(1));
        
        prompts.push({
          path: item.filePath || '',
          prompt: fileContent,
          index: item.index
        });
      } else if (item.type === 'snippet') {
        // 为代码片段创建特殊的格式
        const snippetContent = this.fileTemplate
          .replace(/{{Content}}/g, item.content)
          .replace(/{{FilePath}}/g, `${item.filePath || ''} (lines ${item.lineStart}-${item.lineEnd})`)
          .replace(/{{FileName}}/g, path.basename(item.filePath || ''))
          .replace(/{{FileExt}}/g, path.extname(item.filePath || '').substring(1));
        
        prompts.push({
          path: `${item.filePath || ''} (snippet)`,
          prompt: snippetContent,
          index: item.index
        });
      }
    }
    
    // 排序
    if (sortOrder === 'filePath') {
      prompts.sort((a, b) => a.path.localeCompare(b.path));
    } else {
      prompts.sort((a, b) => a.index - b.index);
    }
    
    const filePathList = prompts.map(p => p.path).map(p => `- ${p}`).join('\n');
    const mergedContent = prompts.map(p => p.prompt).join('\n\n');
    
    // 应用基础模板
    return this.baseTemplate
      .replace(/{{FilesPrompts}}/g, mergedContent)
      .replace(/{{FilePathList}}/g, filePathList);
  }
}
