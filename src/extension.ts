import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	console.log('Extension "vscode-code-annotation" is now active!');

	let disposable = vscode.commands.registerCommand('vscode-code-annotation.addNote', async () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const fsPath = editor.document.uri.fsPath;
			console.log(`fsPath: ${fsPath}`);
			const selection = editor.selection;
			const text = editor.document.getText(selection);
			console.log(`textRange: ${text}`);
			const annotationText = await vscode.window.showInputBox({ placeHolder: 'Give the annotation some text...' });
			if (annotationText) {
				console.log(`annotationText: ${annotationText}`);
				vscode.window.showInformationMessage('Annotation saved!');
			}
		}
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
