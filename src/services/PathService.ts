/*
 * Copyright (c) 2025 by frostime. All Rights Reserved.
 */
import * as vscode from 'vscode';
import { ProviderContext } from '../providers/IContentProvider';

/**
 * 路径服务
 * 
 * 提供统一的路径处理功能
 */
export class PathService implements ProviderContext {
  /**
   * 获取相对于工作区的路径
   */
  getRelativePath(uri: vscode.Uri): string {
    const filePath = uri.fsPath;

    if (vscode.workspace.workspaceFolders?.length) {
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
      if (workspaceFolder) {
        return filePath.substring(workspaceFolder.uri.fsPath.length + 1);
      }
    }

    return filePath;
  }

  /**
   * 获取工作区根目录
   */
  getWorkspaceRoot(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }
}
