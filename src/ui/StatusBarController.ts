/*
 * Copyright (c) 2025 by frostime. All Rights Reserved.
 */
import * as vscode from 'vscode';
import { PromptItemStore } from '../core/PromptItemStore';

/**
 * 状态栏控制器
 * 
 * 职责：管理状态栏项目的显示
 */
export class StatusBarController implements vscode.Disposable {
  private readonly statusBarItem: vscode.StatusBarItem;
  private readonly disposables: vscode.Disposable[] = [];

  constructor(private readonly store: PromptItemStore) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left
    );

    this.update();

    // 监听数据变化
    this.disposables.push(
      store.onDidChange(() => this.update())
    );
  }

  /**
   * 更新状态栏显示
   */
  private update(): void {
    const count = this.store.count;
    this.statusBarItem.text = `$(list-selection) Prompt: ${count} 个项目`;

    if (count > 0) {
      this.statusBarItem.show();
    } else {
      this.statusBarItem.hide();
    }
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.statusBarItem.dispose();
    this.disposables.forEach(d => d.dispose());
  }
}
