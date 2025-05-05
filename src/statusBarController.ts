/*
 * Copyright (c) 2025 by frostime. All Rights Reserved.
 */
import * as vscode from 'vscode';
import { PromptManager } from './promptManager';

export class StatusBarController {
  private statusBarItem: vscode.StatusBarItem;

  constructor(private promptManager: PromptManager) {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    this.statusBarItem.command = 'files-to-prompt.showPromptPanel';
    this.updateStatusBar();

    // 监听 promptManager 的变化
    promptManager.onDidChangeItems(() => this.updateStatusBar());
  }

  private updateStatusBar(): void {
    const itemCount = this.promptManager.getItems().length;
    this.statusBarItem.text = `$(list-selection) Prompt: ${itemCount} 个项目`;

    // 如果有项目则显示状态栏，否则隐藏
    if (itemCount > 0) {
      this.statusBarItem.show();
    } else {
      this.statusBarItem.hide();
    }
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}
