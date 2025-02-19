import * as vscode from 'vscode';
import ollama from 'ollama';

export function activate(context: vscode.ExtensionContext) {
	//vscode.window.showInformationMessage('AIVS is Installed.');
	const messages: {role:string, content:string}[] = []; // todo: load from file?
	
	const disposables = [
		vscode.commands.registerCommand('aivs.killyourself', () => {
			vscode.window.showErrorMessage('Sorry Dave, but I can not do that.');
		}),
		vscode.commands.registerCommand('aivs.openTelegramWeb', () => {
			vscode.window.showErrorMessage('Sorry Dave, but I can not do that.');
		}),
		vscode.commands.registerCommand('aivs.setModelName', async () => {
			const modelName = await vscode.window.showInputBox({
				prompt: 'Enter the model name',
				placeHolder: 'codellama'
			});
			if (modelName) {
				await vscode.workspace.getConfiguration().update('aivs.modelName', modelName, vscode.ConfigurationTarget.Global);
				vscode.window.showInformationMessage(`Model name set to ${modelName}`);
			}
		}),
		vscode.commands.registerCommand('aivs.openChat', async () => {
			const panel = vscode.window.createWebviewPanel(
				'panel',
				'AIVS',
				vscode.ViewColumn.One,
				{ enableScripts: true }
			);
			panel.webview.html = await buildChatWebViewHtml(context);
			panel.webview.onDidReceiveMessage(async (msg) => {
				if (msg.command === 'chat') {
					let responseText = '';
					try {
						const modelName = vscode.workspace.getConfiguration().get('aivs.modelName', 'codellama');
						messages.push({
							role: 'user',
							content: msg.text
						});
						const streamResponse = await ollama.chat({
							model: modelName,
							stream: true,
							messages
						});
						let role = 'system';
						for await (const part of streamResponse) {
							role = part.message.role;
							responseText += part.message.content;
							panel.webview.postMessage({
								command: 'chatResponse',
								text: responseText
							});
						}
						messages.push({
							content: responseText,
							role
						});
						panel.webview.postMessage({
							command: 'chatFinishResponse',
							text: responseText
						});
						console.debug(messages);
					} catch (err) {
						vscode.window.showErrorMessage((err as Error).message);
					}
				}
			})
		}),
	];

	context.subscriptions.push(...disposables);
}

// This method is called when your extension is deactivated
export function deactivate() {}

import path from 'path';
async function buildChatWebViewHtml(context: vscode.ExtensionContext) {
	const htmlPath = path.join(context.extensionPath, 'src', 'chat.html'); // Construct the path
	try {
		const htmlContent = await vscode.workspace.fs.readFile(vscode.Uri.file(htmlPath));
		return htmlContent.toString(); // Set the HTML
	} catch (error) {
		console.error('Error reading HTML file:', error);
		return "<h1>Error loading HTML</h1>"; // Error handling
	}
}