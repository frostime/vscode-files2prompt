/*
 * Copyright (c) 2025 by frostime. All Rights Reserved.
 */
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PromptItem, FilePromptItem, SnippetPromptItem, PromptContent } from '../types';

// 使用 Node.js 内置的 zlib，配合手动构建 ZIP 文件
// 或者使用更简单的方法：调用系统命令

/**
 * 导出服务
 * 
 * 职责：将 Prompt 项目导出为 ZIP 文件
 */
export class ExportService {
  /**
   * 将项目导出为 ZIP 文件
   */
  async exportToZip(items: PromptItem[]): Promise<string | undefined> {
    // 筛选出文件和代码片段
    const exportableItems = items.filter(
      item => item.type === 'file' || item.type === 'snippet'
    );

    if (exportableItems.length === 0) {
      vscode.window.showWarningMessage('没有可导出的文件');
      return undefined;
    }

    // 让用户选择保存位置
    const saveUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(
        path.join(
          vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || os.homedir(),
          'prompt-files.zip'
        )
      ),
      filters: {
        'ZIP 文件': ['zip']
      },
      saveLabel: '导出 ZIP'
    });

    if (!saveUri) {
      return undefined;
    }

    try {
      // 创建临时目录
      const tempDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'prompt-export-')
      );

      try {
        // 将所有文件复制到临时目录
        await this.copyFilesToTemp(exportableItems, tempDir);

        // 创建 ZIP 文件
        await this.createZipFromDirectory(tempDir, saveUri.fsPath);

        vscode.window.showInformationMessage(
          `已导出 ${exportableItems.length} 个文件到 ${path.basename(saveUri.fsPath)}`
        );

        return saveUri.fsPath;

      } finally {
        // 清理临时目录
        await this.removeDirectory(tempDir);
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`导出失败: ${message}`);
      return undefined;
    }
  }

  /**
   * 将文件复制到临时目录
   */
  private async copyFilesToTemp(items: PromptItem[], tempDir: string): Promise<void> {
    for (const item of items) {
      try {
        const content = await this.resolveContent(item.content);
        const targetPath = this.getTargetPath(item, tempDir);

        // 确保目录存在
        await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });

        // 写入文件
        await fs.promises.writeFile(targetPath, content, 'utf8');
      } catch (error) {
        console.error(`复制文件失败: ${item.title}`, error);
      }
    }
  }

  /**
   * 获取目标文件路径
   */
  private getTargetPath(item: PromptItem, tempDir: string): string {
    if (item.type === 'file') {
      const fileItem = item as FilePromptItem;
      return path.join(tempDir, fileItem.filePath);
    }

    if (item.type === 'snippet') {
      const snippetItem = item as SnippetPromptItem;
      // 为代码片段创建带行号的文件名
      const ext = path.extname(snippetItem.filePath);
      const base = path.basename(snippetItem.filePath, ext);
      const dir = path.dirname(snippetItem.filePath);
      const newName = `${base}_L${snippetItem.lineStart}-${snippetItem.lineEnd}${ext}`;
      return path.join(tempDir, dir, newName);
    }

    return path.join(tempDir, item.title);
  }

  /**
   * 解析内容
   */
  private async resolveContent(content: PromptContent): Promise<string> {
    if (typeof content === 'string') {
      return content;
    }
    return content();
  }

  /**
   * 从目录创建 ZIP 文件
   * 使用系统命令或 Node.js 实现
   */
  private async createZipFromDirectory(sourceDir: string, zipPath: string): Promise<void> {
    // 尝试使用系统 zip 命令
    const platform = process.platform;

    if (platform === 'win32') {
      // Windows: 使用 PowerShell
      await this.execCommand(
        `powershell -Command "Compress-Archive -Path '${sourceDir}\\*' -DestinationPath '${zipPath}' -Force"`
      );
    } else {
      // macOS/Linux: 使用 zip 命令
      await this.execCommand(
        `cd "${sourceDir}" && zip -r "${zipPath}" .`
      );
    }
  }

  /**
   * 执行命令
   */
  private execCommand(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      require('child_process').exec(command, (error: Error | null, stdout: string, stderr: string) => {
        if (error) {
          reject(new Error(stderr || error.message));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 递归删除目录
   */
  private async removeDirectory(dir: string): Promise<void> {
    try {
      await fs.promises.rm(dir, { recursive: true, force: true });
    } catch (error) {
      console.error('清理临时目录失败:', error);
    }
  }

  /**
   * 快速导出到剪贴板目录（可选功能）
   */
  async exportToTempAndCopyPath(items: PromptItem[]): Promise<string | undefined> {
    const exportableItems = items.filter(
      item => item.type === 'file' || item.type === 'snippet'
    );

    if (exportableItems.length === 0) {
      vscode.window.showWarningMessage('没有可导出的文件');
      return undefined;
    }

    try {
      const tempDir = path.join(os.tmpdir(), `prompt-export-${Date.now()}`);
      await fs.promises.mkdir(tempDir, { recursive: true });

      const zipPath = path.join(tempDir, 'prompt-files.zip');
      
      // 创建文件临时目录
      const filesDir = path.join(tempDir, 'files');
      await fs.promises.mkdir(filesDir, { recursive: true });

      await this.copyFilesToTemp(exportableItems, filesDir);
      await this.createZipFromDirectory(filesDir, zipPath);

      // 复制路径到剪贴板
      await vscode.env.clipboard.writeText(zipPath);
      
      vscode.window.showInformationMessage(
        `ZIP 文件路径已复制到剪贴板: ${zipPath}`,
        '打开文件夹'
      ).then(selection => {
        if (selection === '打开文件夹') {
          vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(zipPath));
        }
      });

      return zipPath;

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`导出失败: ${message}`);
      return undefined;
    }
  }
}
