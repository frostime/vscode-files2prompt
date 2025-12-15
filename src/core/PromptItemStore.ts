/*
 * Copyright (c) 2025 by frostime. All Rights Reserved.
 */
import * as vscode from 'vscode';
import { PromptItem, ItemChangeEvent, ItemChangeEventType } from '../types';

/**
 * Prompt 项目数据存储
 * 
 * 职责：纯粹的数据存储和管理，不涉及任何业务逻辑
 * 遵循单一职责原则（SRP）
 */
export class PromptItemStore {
  private items: PromptItem[] = [];
  
  private readonly _onDidChange = new vscode.EventEmitter<ItemChangeEvent>();
  readonly onDidChange = this._onDidChange.event;

  /**
   * 添加项目
   */
  add(item: PromptItem): void {
    item.index = this.items.length;
    this.items.push(item);
    this._onDidChange.fire({ type: 'add', item });
  }

  /**
   * 根据 ID 移除项目
   */
  remove(id: string): PromptItem | undefined {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) {
      return undefined;
    }

    const [removed] = this.items.splice(index, 1);
    this.reindex();
    this._onDidChange.fire({ type: 'remove', item: removed });
    return removed;
  }

  /**
   * 更新项目
   */
  update(id: string, updates: Partial<PromptItem>): boolean {
    const item = this.items.find(i => i.id === id);
    if (!item) {
      return false;
    }

    Object.assign(item, updates);
    this._onDidChange.fire({ type: 'update', item });
    return true;
  }

  /**
   * 根据 ID 获取项目
   */
  getById(id: string): PromptItem | undefined {
    return this.items.find(item => item.id === id);
  }

  /**
   * 获取所有项目的副本
   */
  getAll(): PromptItem[] {
    return [...this.items];
  }

  /**
   * 按类型筛选项目
   */
  getByType<T extends PromptItem>(type: T['type']): T[] {
    return this.items.filter(item => item.type === type) as T[];
  }

  /**
   * 检查项目是否已存在（基于自定义比较函数）
   */
  exists(predicate: (item: PromptItem) => boolean): boolean {
    return this.items.some(predicate);
  }

  /**
   * 查找项目
   */
  find(predicate: (item: PromptItem) => boolean): PromptItem | undefined {
    return this.items.find(predicate);
  }

  /**
   * 重新排序：将项目从 fromIndex 移动到 toIndex
   */
  reorder(fromIndex: number, toIndex: number): boolean {
    if (!this.isValidIndex(fromIndex) || !this.isValidIndex(toIndex)) {
      return false;
    }

    const [item] = this.items.splice(fromIndex, 1);
    this.items.splice(toIndex, 0, item);
    this.reindex();
    this._onDidChange.fire({ type: 'reorder', items: this.items });
    return true;
  }

  /**
   * 清空所有项目
   */
  clear(): void {
    const removed = [...this.items];
    this.items = [];
    this._onDidChange.fire({ type: 'clear', items: removed });
  }

  /**
   * 获取项目数量
   */
  get count(): number {
    return this.items.length;
  }

  /**
   * 检查是否为空
   */
  get isEmpty(): boolean {
    return this.items.length === 0;
  }

  /**
   * 重新计算所有项目的索引
   */
  private reindex(): void {
    this.items.forEach((item, index) => {
      item.index = index;
    });
  }

  /**
   * 验证索引是否有效
   */
  private isValidIndex(index: number): boolean {
    return index >= 0 && index < this.items.length;
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this._onDidChange.dispose();
  }
}
