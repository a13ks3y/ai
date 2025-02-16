import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Should register killyourself command', async () => {
		const commands = await vscode.commands.getCommands(true);
		assert.notEqual(-1, commands.indexOf('killyourself'));
	});
});
