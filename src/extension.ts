import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	// 注册命令
	let disposable = vscode.commands.registerCommand('files-to-prompt.openedFiles', async () => {
		try {

			// 获取所有打开的文档（包括所有标签页）
			const openDocuments = vscode.workspace.textDocuments;

			if (openDocuments.length === 0) {
				vscode.window.showInformationMessage('No files are open to merge');
				return;
			}

			let mergedContent = '';

			for (const [index, document] of openDocuments.entries()) {
				// 跳过未保存到文件系统的文档（如：无标题文档）
				if (document.uri.scheme !== 'file') {
					continue;
				}

				const filePath = document.uri.fsPath;
				const content = document.getText();

				// 获取相对路径
				let relativePath = filePath;
				if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
					const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
					if (workspaceFolder) {
						relativePath = filePath.substring(workspaceFolder.uri.fsPath.length + 1);
					}
				}

				// 添加文件路径标签（使用相对路径）
				mergedContent += `<file path="${relativePath}">\n`;
				mergedContent += content;
				mergedContent += `\n</file>`;

				if (index < openDocuments.length - 1) {
					mergedContent += '\n\n';
				}
			}

			// 创建并显示新文档
			const newDocument = await vscode.workspace.openTextDocument({
				content: mergedContent,
				language: 'plaintext'
			});

			await vscode.window.showTextDocument(newDocument, { preview: false });

		} catch (error) {
			vscode.window.showErrorMessage(`Failed to merge files: ${error instanceof Error ? error.message : String(error)}`);
		}
	});

	context.subscriptions.push(disposable);
}

export function deactivate() { }
