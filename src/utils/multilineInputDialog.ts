/*
 * Copyright (c) 2025 by frostime. All Rights Reserved.
 */
import * as vscode from 'vscode';

export interface MultilineInputOptions {
  title?: string;
  description?: string;
  placeholder?: string;
  initialValue?: string;
  maxLength?: number;
  submitButtonText?: string;
  cancelButtonText?: string;
}

/**
 * 多行文本输入对话框工具类
 * 使用 Webview 创建一个支持多行文本输入的对话框
 */
export class MultilineInputDialog {
  /**
   * 显示多行输入对话框
   * @param options 对话框配置选项
   * @returns 用户输入的文本，如果取消则返回 undefined
   */
  static async show(options: MultilineInputOptions = {}): Promise<string | undefined> {
    const {
      title = '文本输入',
      description = '请输入文本内容',
      placeholder = '请输入内容...',
      initialValue = '',
      maxLength = 5000,
      submitButtonText = '确定',
      cancelButtonText = '取消'
    } = options;

    return new Promise((resolve) => {
      // 创建 Webview 面板
      const panel = vscode.window.createWebviewPanel(
        'multilineInputDialog',
        title,
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true
        }
      );

      // 设置 Webview 内容
      panel.webview.html = MultilineInputDialog.getHtml({
        title,
        description,
        placeholder,
        initialValue,
        maxLength,
        submitButtonText,
        cancelButtonText
      });

      // 监听来自 Webview 的消息
      panel.webview.onDidReceiveMessage(
        (message) => {
          switch (message.command) {
            case 'submit':
              resolve(message.text);
              panel.dispose();
              break;
            case 'cancel':
              resolve(undefined);
              panel.dispose();
              break;
          }
        }
      );

      // 监听面板关闭
      panel.onDidDispose(() => {
        resolve(undefined);
      });
    });
  }

  /**
   * 生成多行输入对话框的 HTML
   */
  private static getHtml(options: Required<MultilineInputOptions>): string {
    const {
      title,
      description,
      placeholder,
      initialValue,
      maxLength,
      submitButtonText,
      cancelButtonText
    } = options;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
          }
          h2 {
            color: var(--vscode-foreground);
            margin-bottom: 10px;
            font-size: 1.2em;
          }
          .description {
            color: var(--vscode-descriptionForeground);
            margin-bottom: 20px;
            line-height: 1.5;
          }
          textarea {
            width: 100%;
            min-height: 200px;
            padding: 10px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            resize: vertical;
            box-sizing: border-box;
            border-radius: 2px;
          }
          textarea:focus {
            outline: 1px solid var(--vscode-focusBorder);
            border-color: var(--vscode-focusBorder);
          }
          .button-container {
            margin-top: 20px;
            text-align: right;
          }
          button {
            padding: 8px 16px;
            margin-left: 10px;
            border: none;
            border-radius: 2px;
            cursor: pointer;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
          }
          .primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
          }
          .primary:hover {
            background-color: var(--vscode-button-hoverBackground);
          }
          .primary:disabled {
            background-color: var(--vscode-button-background);
            opacity: 0.5;
            cursor: not-allowed;
          }
          .secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
          }
          .secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
          }
          .char-count {
            color: var(--vscode-descriptionForeground);
            font-size: 0.9em;
            margin-top: 5px;
            text-align: right;
          }
          .error {
            color: var(--vscode-errorForeground);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>${title}</h2>
          <div class="description">
            ${description}
          </div>
          <textarea 
            id="inputText" 
            placeholder="${placeholder}"
            autofocus
          >${initialValue}</textarea>
          <div class="char-count">
            <span id="charCount">${initialValue.length}</span> / ${maxLength} 字符
          </div>
          <div class="button-container">
            <button class="secondary" onclick="cancel()">${cancelButtonText}</button>
            <button class="primary" id="submitBtn" onclick="submit()">${submitButtonText}</button>
          </div>
        </div>

        <script>
          const vscode = acquireVsCodeApi();
          const textarea = document.getElementById('inputText');
          const charCount = document.getElementById('charCount');
          const submitBtn = document.getElementById('submitBtn');
          const maxLength = ${maxLength};

          // 更新字符计数和按钮状态
          function updateUI() {
            const count = textarea.value.length;
            charCount.textContent = count;
            
            const isOverLimit = count > maxLength;
            const isEmpty = textarea.value.trim().length === 0;
            
            charCount.className = isOverLimit ? 'char-count error' : 'char-count';
            submitBtn.disabled = isOverLimit || isEmpty;
          }

          // 监听文本变化
          textarea.addEventListener('input', updateUI);
          
          // 初始化UI状态
          updateUI();

          // 提交函数
          function submit() {
            const text = textarea.value.trim();
            if (!text) {
              alert('内容不能为空');
              return;
            }
            if (text.length > maxLength) {
              alert(\`内容过长，请控制在\${maxLength}字符以内\`);
              return;
            }
            vscode.postMessage({
              command: 'submit',
              text: text
            });
          }

          // 取消函数
          function cancel() {
            vscode.postMessage({
              command: 'cancel'
            });
          }

          // 键盘快捷键
          document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
              if (!submitBtn.disabled) {
                submit();
              }
            }
            if (e.key === 'Escape') {
              cancel();
            }
          });

          // 自动调整文本框高度
          textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.max(200, this.scrollHeight) + 'px';
          });
        </script>
      </body>
      </html>
    `;
  }
}
