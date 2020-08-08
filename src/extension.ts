import * as vscode from 'vscode';
import * as path from "path";
import * as fs from "fs";
import { URI } from 'vscode-uri'

export const getAnnotationsFile = (): string => {
	const workspaceFolder = vscode.workspace.rootPath;
	if (workspaceFolder) {
		const extensionDirPath = path.join(workspaceFolder, ".vscode", "code-annotation");
		if (!fs.existsSync(extensionDirPath)) {
			fs.mkdirSync(extensionDirPath, { recursive: true });
		}
		const extensionFilePath = path.join(extensionDirPath, "annotations.json");
		if (!fs.existsSync(extensionFilePath)) {
			fs.writeFileSync(extensionFilePath, '{"notes":[]}');
		}
		return extensionFilePath;
	} else {
	  	throw new Error("workspace not found");
	}
};

class TreeDataProvider implements vscode.TreeDataProvider<TreeItem> {

	private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined> = new vscode.EventEmitter<TreeItem | undefined>();
  	readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined> = this._onDidChangeTreeData.event;

	refresh(): void {
		this._onDidChangeTreeData.fire(undefined);
	}

	data: TreeItem[];

	constructor() {

		const annotationFile = getAnnotationsFile();
		console.log(`annotationFile: ${annotationFile}`);
		const rawdata = fs.readFileSync(annotationFile, "utf8");
		const annotations = JSON.parse(rawdata).notes;
		console.log(annotations);

		this.data = [new TreeItem('Root', undefined)]
		for (let note in annotations) {
			console.log(annotations[note]);
			const itemText = annotations[note].text;
			this.data[0].addChild(new TreeItem(itemText, undefined), annotations[note].fileName);
		}
	}

	getTreeItem(element: TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
	  return element;
	}

	getChildren(element?: TreeItem | undefined): vscode.ProviderResult<TreeItem[]> {
	  if (element === undefined) {
		return this.data;
	  }
	  return element.children;
	}
}

class TreeItem extends vscode.TreeItem {
	children: TreeItem[] | undefined;

	constructor(label: string, children?: TreeItem[]) {
	  super(
		  label,
		  children === undefined ? vscode.TreeItemCollapsibleState.None :
								   vscode.TreeItemCollapsibleState.Expanded);
	  this.children = children;
	}

	addChild(element: TreeItem, fileName: string) {
		if (this.children === undefined) {
			this.children = [];
			this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
		}
		element.resourceUri = URI.parse(fileName);
		this.children.push(element)
	}
}

export function activate(context: vscode.ExtensionContext) {
	console.log('Extension "code-annotation" is now active!');

	const tree = new TreeDataProvider();
	vscode.window.registerTreeDataProvider('codeAnnotationView', tree);
	vscode.commands.registerCommand('code-annotation.refreshEntry', () =>
		tree.refresh()
	);

	let disposable = vscode.commands.registerCommand('code-annotation.addNote', async () => {
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

				const annotationFile = getAnnotationsFile();
				const rawdata = fs.readFileSync(annotationFile, "utf8");
				let annotations = JSON.parse(rawdata);
				annotations.notes.push({fileName: fsPath, text: annotationText});
				const data = JSON.stringify(annotations);
				fs.writeFileSync(annotationFile, data);

				vscode.commands.executeCommand('code-annotation.refreshEntry');
				vscode.window.showInformationMessage('Annotation saved!');
			}
		}
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
