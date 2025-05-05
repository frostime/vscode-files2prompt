/*
 * Copyright (c) 2025 by frostime. All Rights Reserved.
 */
import * as vscode from 'vscode';
import { PromptManager } from './promptManager';

export class StatusBarController {
  private statusBarItem: vscode.StatusBarItem;
  private isCollecting: boolean = false;
  
  constructor(private promptManager: PromptManager) {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    this.statusBarItem.command = 'files-to-prompt.showPromptPanel';
    this.updateStatusBar();
    
    // 监听 promptManager 的变化
    promptManager.onDidChangeItems(() => this.updateStatusBar());
  }
  
  startCollecting(): void {
    this.isCollecting = true;
    this.updateStatusBar();
    this.statusBarItem.show();
  }
  
  stopCollecting(): void {
    this.isCollecting = false;
    this.updateStatusBar();
    this.statusBarItem.hide();
  }
  
  private updateStatusBar(): void {
    const itemCount = this.promptManager.getItems().length;
    this.statusBarItem.text = this.isCollecting
      ? `$(list-selection) Prompt: ${itemCount} 个项目`
      : `$(list-selection) Prompt`;
    
    // 如果有项目，即使不在收集模式也显示状态栏
    if (itemCount > 0) {
      this.statusBarItem.show();
    } else if (!this.isCollecting) {
      this.statusBarItem.hide();
    }
  }
  
  dispose(): void {
    this.statusBarItem.dispose();
  }
}
