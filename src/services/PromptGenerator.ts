/*
 * Copyright (c) 2025 by frostime. All Rights Reserved.
 */
import {
  PromptItem,
  FilePromptItem,
  SnippetPromptItem,
  SortOrder,
  PromptContent
} from '../types';
import { FormatterService } from './FormatterService';

/**
 * 代码项目的格式化信息
 */
interface CodePromptInfo {
  path: string;
  prompt: string;
  index: number;
}

/**
 * Prompt 生成服务
 *
 * 职责：将 PromptItem 集合转换为格式化的 Prompt 文本
 * 遵循单一职责原则（SRP）
 */
export class PromptGenerator {
  private formatterService: FormatterService;
  private static readonly SECTION_DIVIDER = '='.repeat(16);

  constructor(formatterService?: FormatterService) {
    this.formatterService = formatterService ?? new FormatterService();
  }

  /**
   * 设置格式化服务（用于依赖注入）
   */
  setFormatterService(service: FormatterService): void {
    this.formatterService = service;
  }
  /**
   * 生成完整的 Prompt
   */
  async generate(items: PromptItem[], sortOrder: SortOrder = 'openingOrder'): Promise<string> {
    if (items.length === 0) {
      return '没有选择任何文件或代码片段';
    }

    const sections: string[] = [];

    // 按类型分组
    const grouped = this.groupItemsByType(items);

    // 1. 终端输出
    if (grouped.terminals.length > 0) {
      sections.push(await this.formatTerminals(grouped.terminals));
    }

    // 2. 文件夹结构
    if (grouped.trees.length > 0) {
      sections.push(await this.formatTrees(grouped.trees));
    }

    // 3. Git Diff
    if (grouped.gitDiffs.length > 0) {
      sections.push(await this.formatGitDiffs(grouped.gitDiffs));
    }

    // 4. 代码文件和片段
    if (grouped.codeItems.length > 0) {
      sections.push(await this.formatCodeItems(grouped.codeItems, sortOrder));
    }

    // 5. 用户指令放在末尾，作为最后的补充说明
    if (grouped.userInstructions.length > 0) {
      sections.push(await this.formatUserInstructions(grouped.userInstructions));
    }

    return sections.join('').trim();
  }

  /**
   * 按类型分组项目
   */
  private groupItemsByType(items: PromptItem[]) {
    return {
      userInstructions: items.filter(i => i.type === 'user-instruction'),
      terminals: items.filter(i => i.type === 'terminal'),
      trees: items.filter(i => i.type === 'tree'),
      gitDiffs: items.filter(i => i.type === 'git-diff'),
      codeItems: items.filter(i => i.type === 'file' || i.type === 'snippet')
    };
  }

  /**
   * 格式化用户指令部分
   */
  private async formatUserInstructions(items: PromptItem[]): Promise<string> {
    let result = '';

    for (const item of items) {
      const content = await this.resolveContent(item.content);
      result += `${content}\n\n`;
    }

    return this.wrapSection('USER INSTRUCTIONS', result);
  }

  /**
   * 格式化终端输出部分
   */
  private async formatTerminals(items: PromptItem[]): Promise<string> {
    let result = '';

    for (const item of items) {
      const content = await this.resolveContent(item.content);
      result += `${item.title}\n\`\`\`\n${content}\n\`\`\`\n\n`;
    }

    return this.wrapSection('TERMINAL OUTPUT', result);
  }

  /**
   * 格式化文件夹树部分
   */
  private async formatTrees(items: PromptItem[]): Promise<string> {
    let result = '';

    for (const item of items) {
      const content = await this.resolveContent(item.content);
      result += `${item.title}\n\`\`\`\n${content}\n\`\`\`\n\n`;
    }

    return this.wrapSection('FOLDER STRUCTURE', result);
  }

  /**
   * 格式化 Git Diff 部分
   */
  private async formatGitDiffs(items: PromptItem[]): Promise<string> {
    let result = '';

    for (const item of items) {
      const content = await this.resolveContent(item.content);
      result += `${item.title}\n\`\`\`diff\n${content}\n\`\`\`\n\n`;
    }

    return this.wrapSection('GIT DIFF (--cached)', result);
  }

  /**
   * 格式化代码项目部分
   */
  private async formatCodeItems(items: PromptItem[], sortOrder: SortOrder): Promise<string> {
    const codePrompts: CodePromptInfo[] = [];

    for (const item of items) {
      const content = await this.resolveContent(item.content);
      const info = this.formatCodeItem(item, content);
      codePrompts.push(info);
    }

    // 排序
    this.sortCodePrompts(codePrompts, sortOrder);

    // 生成文件路径列表
    const outlines = codePrompts.map(p => `- ${p.path}`).join('\n');
    const contents = codePrompts.map(p => p.prompt).join('\n\n');

    return this.wrapSection(
      'SOURCES',
      `Outlines:\n\n${outlines}\n\nContent:\n\n${contents}\n\n`
    );
  }

  /**
   * 格式化单个代码项目
   */
  private formatCodeItem(item: PromptItem, content: string): CodePromptInfo {
    // 使用格式化服务格式化内容
    const formattedContent = this.formatterService.format(item, content);
    const useRawMarkdownPrompt = this.formatterService.getPreset() === 'markdown';

    if (item.type === 'file') {
      const fileItem = item as FilePromptItem;
      return {
        path: fileItem.filePath,
        prompt: useRawMarkdownPrompt
          ? formattedContent
          : this.wrapCodePrompt(fileItem, formattedContent),
        index: item.index
      };
    }

    if (item.type === 'snippet') {
      const snippetItem = item as SnippetPromptItem;
      const location = `${snippetItem.filePath} (lines ${snippetItem.lineStart}-${snippetItem.lineEnd})`;
      return {
        path: location,
        prompt: useRawMarkdownPrompt
          ? formattedContent
          : this.wrapCodePrompt(snippetItem, formattedContent),
        index: item.index
      };
    }

    // 不应该到达这里
    return { path: '', prompt: '', index: 0 };
  }

  private wrapCodePrompt(item: FilePromptItem | SnippetPromptItem, formattedContent: string): string {
    if (item.type === 'file') {
      return `文件: ${item.filePath}\n${formattedContent}`;
    }

    const location = `${item.filePath} (lines ${item.lineStart}-${item.lineEnd})`;
    return `代码片段: ${location}\n${formattedContent}`;
  }

  private wrapSection(title: string, content: string): string {
    const body = content.trim();
    const divider = PromptGenerator.SECTION_DIVIDER;
    return `${divider} BEGIN ${title} ${divider}\n\n${body}\n\n${divider} END ${title} ${divider}\n\n`;
  }

  /**
   * 排序代码项目
   */
  private sortCodePrompts(prompts: CodePromptInfo[], sortOrder: SortOrder): void {
    if (sortOrder === 'filePath') {
      prompts.sort((a, b) => a.path.localeCompare(b.path));
    } else {
      prompts.sort((a, b) => a.index - b.index);
    }
  }

  /**
   * 解析内容（静态或动态）
   */
  private async resolveContent(content: PromptContent): Promise<string> {
    if (typeof content === 'string') {
      return content;
    }

    try {
      return await content();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`动态内容生成失败:`, error);
      return `[Error: 无法生成动态内容 - ${message}]`;
    }
  }
}
