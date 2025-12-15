/*
 * Copyright (c) 2025 by frostime. All Rights Reserved.
 */
import * as vscode from 'vscode';
import * as vm from 'vm';
import { FilePromptItem, SnippetPromptItem, PromptItem } from '../types';

/**
 * 预设格式化模板类型
 */
export type FormatPreset =
  | 'xml'           // <Content src="..." lang="...">...</Content>
  | 'markdown'      // ```lang\n...\n``` with header
  | 'plain'         // 纯文本，无包装
  | 'github'        // GitHub 风格，带文件路径注释
  | 'custom';       // 自定义 JS 函数

/**
 * 格式化上下文，传递给自定义格式化函数
 */
export interface FormatContext {
  /** 文件相对路径 */
  filePath: string;
  /** 语言标识 */
  language: string;
  /** 文件内容 */
  content: string;
  /** 项目类型 */
  type: 'file' | 'snippet';
  /** 代码片段的起始行（仅 snippet） */
  lineStart?: number;
  /** 代码片段的结束行（仅 snippet） */
  lineEnd?: number;
}

/**
 * 自定义格式化函数类型
 */
export type CustomFormatter = (ctx: FormatContext) => string;

/**
 * 格式化配置
 */
export interface FormatterConfig {
  preset: FormatPreset;
  customScript?: string;
}

/**
 * 格式化服务
 * 
 * 职责：将代码内容格式化为指定格式
 */
export class FormatterService {
  private config: FormatterConfig;
  private customFormatter: CustomFormatter | null = null;

  constructor() {
    this.config = this.loadConfig();
    this.compileCustomFormatter();
  }

  /**
   * 从 VS Code 配置加载
   */
  private loadConfig(): FormatterConfig {
    const vsConfig = vscode.workspace.getConfiguration('assembleCodeToPrompt');

    return {
      preset: vsConfig.get<FormatPreset>('format.preset') ?? 'xml',
      customScript: vsConfig.get<string>('format.customScript')
    };
  }

  /**
   * 重新加载配置
   */
  reload(): void {
    this.config = this.loadConfig();
    this.compileCustomFormatter();
  }

  /**
   * 编译自定义格式化脚本
   */
  private compileCustomFormatter(): void {
    this.customFormatter = null;

    if (this.config.preset !== 'custom' || !this.config.customScript) {
      return;
    }

    try {
      // 创建沙箱环境
      const sandbox = {
        result: null as CustomFormatter | null
      };

      // 包装用户脚本，期望用户定义一个函数
      const wrappedScript = `
        result = (function() {
          ${this.config.customScript}
          // 期望用户脚本中定义了 format 函数
          if (typeof format === 'function') {
            return format;
          }
          // 或者直接返回一个函数
          return null;
        })();
      `;

      vm.createContext(sandbox);
      vm.runInContext(wrappedScript, sandbox, { timeout: 1000 });

      if (typeof sandbox.result === 'function') {
        this.customFormatter = sandbox.result;
      } else {
        console.warn('自定义格式化脚本未返回有效的函数');
      }
    } catch (error) {
      console.error('编译自定义格式化脚本失败:', error);
      vscode.window.showErrorMessage(
        `自定义格式化脚本编译失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 格式化代码项目
   */
  format(item: PromptItem, content: string): string {
    if (item.type !== 'file' && item.type !== 'snippet') {
      return content;
    }

    const ctx = this.createContext(item, content);

    switch (this.config.preset) {
      case 'xml':
        return this.formatXml(ctx);
      case 'markdown':
        return this.formatMarkdown(ctx);
      case 'plain':
        return this.formatPlain(ctx);
      case 'github':
        return this.formatGitHub(ctx);
      case 'custom':
        return this.formatCustom(ctx);
      default:
        return this.formatXml(ctx);
    }
  }

  /**
   * 创建格式化上下文
   */
  private createContext(item: PromptItem, content: string): FormatContext {
    if (item.type === 'file') {
      const fileItem = item as FilePromptItem;
      return {
        filePath: fileItem.filePath,
        language: fileItem.language,
        content,
        type: 'file'
      };
    }

    if (item.type === 'snippet') {
      const snippetItem = item as SnippetPromptItem;
      return {
        filePath: snippetItem.filePath,
        language: snippetItem.language,
        content,
        type: 'snippet',
        lineStart: snippetItem.lineStart,
        lineEnd: snippetItem.lineEnd
      };
    }

    // 不应该到达这里
    return { filePath: '', language: '', content, type: 'file' };
  }

  /**
   * XML 格式（默认）
   * <Content src="path" lang="language">content</Content>
   */
  private formatXml(ctx: FormatContext): string {
    const src = ctx.type === 'snippet'
      ? `${ctx.filePath} (lines ${ctx.lineStart}-${ctx.lineEnd})`
      : ctx.filePath;

    return `<Content src="${src}" lang="${ctx.language}">\n${ctx.content}\n</Content>`;
  }

  /**
   * Markdown 格式
   * ```language
   * content
   * ```
   */
  private formatMarkdown(ctx: FormatContext): string {
    const lang = ctx.language || 'text';
    return `\`\`\`${lang}\n${ctx.content}\n\`\`\``;
  }

  /**
   * 纯文本格式
   */
  private formatPlain(ctx: FormatContext): string {
    return ctx.content;
  }

  /**
   * GitHub 风格
   * <!-- filepath: path -->
   * ```language
   * content
   * ```
   */
  private formatGitHub(ctx: FormatContext): string {
    const lang = ctx.language || 'text';
    const filepath = ctx.type === 'snippet'
      ? `${ctx.filePath}#L${ctx.lineStart}-L${ctx.lineEnd}`
      : ctx.filePath;

    return `<!-- filepath: ${filepath} -->\n\`\`\`${lang}\n${ctx.content}\n\`\`\``;
  }

  /**
   * 自定义格式
   */
  private formatCustom(ctx: FormatContext): string {
    if (!this.customFormatter) {
      // 回退到 XML 格式
      console.warn('自定义格式化函数不可用，回退到 XML 格式');
      return this.formatXml(ctx);
    }

    try {
      const result = this.customFormatter(ctx);
      if (typeof result !== 'string') {
        throw new Error('格式化函数必须返回字符串');
      }
      return result;
    } catch (error) {
      console.error('执行自定义格式化函数失败:', error);
      // 回退到 XML 格式
      return this.formatXml(ctx);
    }
  }

  /**
   * 获取当前预设
   */
  getPreset(): FormatPreset {
    return this.config.preset;
  }

  /**
   * 获取所有可用预设
   */
  static getAvailablePresets(): Array<{ id: FormatPreset; label: string; description: string }> {
    return [
      {
        id: 'xml',
        label: 'XML 标签',
        description: '<Content src="..." lang="...">...</Content>'
      },
      {
        id: 'markdown',
        label: 'Markdown 代码块',
        description: '```lang\\n...\\n```'
      },
      {
        id: 'plain',
        label: '纯文本',
        description: '无包装，仅内容'
      },
      {
        id: 'github',
        label: 'GitHub 风格',
        description: '带文件路径注释的代码块'
      },
      {
        id: 'custom',
        label: '自定义',
        description: '使用自定义 JavaScript 函数'
      }
    ];
  }
}
