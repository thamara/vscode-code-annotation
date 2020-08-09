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
			fs.writeFileSync(extensionFilePath, '{"notes":[], "nextId":1}');
		}
		return extensionFilePath;
	} else {
	  	throw new Error("workspace not found");
	}
};

class TreeActions {
    constructor(private provider: TreeDataProvider) { }

    removeNote(item: TreeItem) {
        return this.provider.removeItem(item.id);
	}
	checkNote(item: TreeItem) {
        return this.provider.checkItem(item.id);
	}
}

class TreeDataProvider implements vscode.TreeDataProvider<TreeItem> {

	private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> = new vscode.EventEmitter<TreeItem | undefined | null | void>();
  	readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

	refresh(): void {
		this.sourceData();
		this._onDidChangeTreeData.fire(null);
	}

	sourceData(): void {
		const annotationFile = getAnnotationsFile();
		const rawdata = fs.readFileSync(annotationFile, "utf8");
		const annotations = JSON.parse(rawdata).notes;

		this.data = [];
		this.data = [new TreeItem('Pending', undefined, "-1"), new TreeItem('Done', undefined, "-2")]
		for (let note in annotations) {
			const itemText = annotations[note].text;
			let rootByStatus = annotations[note].status == "pending" ? this.data[0] : this.data[1];
			rootByStatus.addChild(new TreeItem(itemText, undefined, annotations[note].id.toString()),
								  annotations[note].fileName,
								  annotations[note].status);
		}
	}

	removeItem(id: string | undefined): void {
		const annotationFile = getAnnotationsFile();
		const rawdata = fs.readFileSync(annotationFile, "utf8");
		let annotations = JSON.parse(rawdata);
		const indexToRemove = annotations.notes.findIndex((item: {fileName: String, text: String, status: String, id: Number}) => {
			return item.id.toString() == id;
		});
		if (indexToRemove >= 0)
			annotations.notes.splice(indexToRemove, 1);
		const data = JSON.stringify(annotations);
		fs.writeFileSync(annotationFile, data);

		vscode.commands.executeCommand('code-annotation.refreshEntry');
	}

	checkItem(id: string | undefined): void {
		const annotationFile = getAnnotationsFile();
		const rawdata = fs.readFileSync(annotationFile, "utf8");
		let annotations = JSON.parse(rawdata);
		const indexToRemove = annotations.notes.findIndex((item: {fileName: String, text: String, status: String, id: Number}) => {
			return item.id.toString() == id;
		});
		if (indexToRemove >= 0)
			annotations.notes[indexToRemove].status = "done";
		const data = JSON.stringify(annotations);
		fs.writeFileSync(annotationFile, data);

		vscode.commands.executeCommand('code-annotation.refreshEntry');
	}

	data: TreeItem[];

	constructor() {
		vscode.commands.registerCommand('code-annotation.refreshEntry', () =>
			this.refresh()
		);

		this.data = []
		this.sourceData();
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

	constructor(label: string, children: TreeItem[] | undefined, noteId: string) {
	  super(
		  label,
		  children === undefined ? vscode.TreeItemCollapsibleState.None :
								   vscode.TreeItemCollapsibleState.Expanded);
	  this.children = children;
	  this.id = noteId;
	}

	addChild(element: TreeItem, fileName: string, status: string) {
		if (this.children === undefined) {
			this.children = [];
			this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
		}
		element.resourceUri = URI.parse(fileName);
		element.tooltip = fileName
		element.contextValue = (status === "pending") ? '$PendingNote' : '$CompleteNote';
		this.children.push(element)
	}
}

export function activate(context: vscode.ExtensionContext) {
	console.log('Extension "code-annotation" is now active!');

	const tree = new TreeDataProvider();
    const treeActions = new TreeActions(tree);

	vscode.window.registerTreeDataProvider('codeAnnotationView', tree);
    vscode.commands.registerCommand('code-annotation.removeNote', treeActions.removeNote.bind(treeActions));
    vscode.commands.registerCommand('code-annotation.checkNote', treeActions.checkNote.bind(treeActions));


	vscode.commands.registerCommand('code-annotation.clearAllNotes', async () => {
		const message = 'Are you sure you want to clear all notes? This cannot be reverted.';
        const enableAction = 'I\'m sure';
        const cancelAction = 'Cancel';
		const userResponse = await vscode.window.showInformationMessage(message, enableAction, cancelAction);
		const clearAllNotes = userResponse === enableAction ? true : false;

		if (clearAllNotes) {
			const annotationFile = getAnnotationsFile();
			fs.unlinkSync(annotationFile);
			vscode.commands.executeCommand('code-annotation.refreshEntry');
			vscode.window.showInformationMessage('All notes cleared!');
		}
	})

	let disposable = vscode.commands.registerCommand('code-annotation.addNote', async () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const fsPath = editor.document.uri.fsPath;
			const selection = editor.selection;
			const text = editor.document.getText(selection);
			const annotationText = await vscode.window.showInputBox({ placeHolder: 'Give the annotation some text...' });
			if (annotationText) {
				const annotationFile = getAnnotationsFile();
				const rawdata = fs.readFileSync(annotationFile, "utf8");
				let annotations = JSON.parse(rawdata);
				const nextId = annotations.nextId;
				annotations.notes.push({fileName: fsPath, text: annotationText, status: "pending", id: nextId});
				annotations.nextId += 1;
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
