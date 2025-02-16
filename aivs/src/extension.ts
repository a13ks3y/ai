import * as vscode from 'vscode';
import ollama from 'ollama';
import { marked } from 'marked';

export function activate(context: vscode.ExtensionContext) {
	let modelName = 'codellama:latest';
	vscode.window.showInformationMessage('AIVS is Installed.');
	const messages: {role:string, content:string}[] = []; // todo: load from config?
	
	const disposables = [
		vscode.commands.registerCommand('aivs.killyourself', () => {
			vscode.window.showErrorMessage('Sorry Dave, but I can not do that.');
		}),
		vscode.commands.registerCommand('aivs.openTelegramWeb', () => {
			vscode.window.showErrorMessage('Sorry Dave, but I can not do that.');
		}),
		vscode.commands.registerCommand('aivs.startChat', async () => {
			const panel = vscode.window.createWebviewPanel(
				'panel',
				'AIVS',
				vscode.ViewColumn.One,
				{ enableScripts: true }
			);
			panel.webview.html = await buildChatWebViewHtml(context);
			panel.webview.onDidReceiveMessage(async (msg) => {
				//showPs(modelName);
				if (msg.command === 'chat') {
					let responseText = '';
					try {
						messages.push({
							role: 'user',
							content: msg.text
						});
						const streamResponse = await ollama.chat({
							model: modelName,
							stream: true,
							messages,
							// format: 'json', // this will make model to answer in random json format (or in particluar json scheme if given)
							
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
						const html = marked.parse(responseText);
						panel.webview.postMessage({
							command: 'chatFinishResponse',
							text: html
						});
						showPs(modelName);
						
						// todo: preserve messages somehow?
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


async function showPs(modelName: string) {
	const ps = await ollama.ps();
				//console.table(ps.models);
				ps.models.some(model => {
					if (model.name === modelName) {
						// todo: figure out how to better present this information
						vscode.window.showInformationMessage(
							
							`Name: ${model.name}`,
							`Size: ${model.size}`,
							`RAM Size: ${model.size_vram}`,
							`Details:`,
							`${JSON.stringify(model.details)}`
							
						);
						return true;
					} else {
						return false;
					}
				});
}