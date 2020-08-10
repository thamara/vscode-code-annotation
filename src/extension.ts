import * as vscode from 'vscode';
import * as path from "path";
import * as fs from "fs";
import { URI } from 'vscode-uri';

import { getAnnotationsFile, getNotes, saveNotes, getNextId, addNote } from './utils';
import { generateMarkdownReport } from './reporting';

export const getIconPath = (type: string, theme: string): string => {
    return path.join(__filename, '..', '..', 'resources', theme, type.toLowerCase() + '.svg');
};

class TreeActions {
    constructor(private provider: TreeDataProvider) { }

    removeNote(item: TreeItem) {
        return this.provider.removeItem(item.id);
    }
    checkNote(item: TreeItem) {
        return this.provider.checkItem(item.id, 'done');
	}
	uncheckNote(item: TreeItem) {
        return this.provider.checkItem(item.id, 'pending');
    }
    openNote(item: TreeItem) {
        return this.provider.openItem(item.id);
	}
	openNoteFromId(id: string) {
        return this.provider.openItem(id);
	}
	editNote(item: TreeItem) {
        return this.provider.editItem(item.id);
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
  	    const annotations = getNotes();
		let countPeding = 0;
		let countDone = 0;
		this.data = [];
  	    this.data = [new TreeItem('Pending'), new TreeItem('Done')];
  	    for (let note in annotations) {
			const itemText = annotations[note].text;
			const isPending = annotations[note].status === "pending";
			let rootByStatus = undefined;
			if (isPending) {
				rootByStatus = this.data[0];
				countPeding++;
			} else {
				rootByStatus = this.data[1];
				countDone++;
			}
			const fullPathFileName = annotations[note].fileName;
			const workspacePath = vscode.workspace.rootPath;
			let relativePath = workspacePath;
			if (workspacePath) {
				relativePath = fullPathFileName.replace(workspacePath, '');
				if (relativePath.charAt(0) === '/')
					relativePath = relativePath.substr(1);
			}
			let details = new TreeItem(`File: ${relativePath}`);

  	        rootByStatus.addChild(new TreeItem(itemText, [details], annotations[note].id.toString()),
								  annotations[note].fileName,
								  annotations[note].status);
		}
		this.data[0].label += ` (${countPeding})`;
		this.data[1].label += ` (${countDone})`;
	}

  	removeItem(id: string | undefined): void {
  	    const notes = getNotes();
  	    const indexToRemove = notes.findIndex((item: {id: Number}) => {
  	        return item.id.toString() === id;
  	    });

  	    if (indexToRemove >= 0)
  	    {notes.splice(indexToRemove, 1);}

  	    saveNotes(notes);
  	}

  	checkItem(id: string | undefined, status: 'pending' | 'done'): void {
  	    const notes = getNotes();
  	    const index = notes.findIndex((item: {id: Number}) => {
  	        return item.id.toString() === id;
  	    });

  	    if (index >= 0) {
			  notes[index].status = status;
		}

  	    saveNotes(notes);
	}

	editItem(id: string | undefined): void {
		vscode.window.showInputBox({ placeHolder: 'New text for annotation...' }).then(annotationText => {
			const notes = getNotes();
			const index = notes.findIndex((item: {id: Number}) => {
				return item.id.toString() === id;
			});
			if (index >= 0 && annotationText) {
				notes[index].text = annotationText;
				saveNotes(notes);
				vscode.window.showInformationMessage('Annotation edited!');
			}
		});
  }

  	openItem(id: string | undefined): void {
  	    const notes = getNotes();
  	    const index = notes.findIndex((item: {id: Number}) => {
  	        return item.id.toString() === id;
  	    });

  	    if (index >= 0) {
  	        const note = notes[index];
  	        const fileName = note.fileName;
  	        const fileLine = note.fileLine;

  	        var openPath = vscode.Uri.file(fileName);
  	        vscode.workspace.openTextDocument(openPath).then(doc => {
  	            vscode.window.showTextDocument(doc).then(editor => {
  	                var range = new vscode.Range(fileLine, 0, fileLine, 0);
  	                editor.revealRange(range);

  	                var start = new vscode.Position(note.positionStart.line, note.positionStart.character);
  	                var end = new vscode.Position(note.positionEnd.line, note.positionEnd.character);
  	                editor.selection = new vscode.Selection(start, end);

  	                var range = new vscode.Range(start, start);
  	                editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
  	            });
  	        });
  	    }
  	}

	data: TreeItem[];

	constructor() {
	    vscode.commands.registerCommand('code-annotation.refreshEntry', () =>
	        this.refresh()
	    );

	    this.data = [];
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

class OpenFileCommand implements vscode.Command {
    command = 'code-annotation.openNoteFromId';
    title = 'Open File';
    arguments?: any[];

    constructor(id: string) {
        this.arguments = [id];
    }
}

class TreeItem extends vscode.TreeItem {
	children: TreeItem[] | undefined;

	constructor(label: string, children?: TreeItem[] | undefined, noteId?: string | undefined) {
	  super(
		  label,
		  children === undefined ? vscode.TreeItemCollapsibleState.None :
								   vscode.TreeItemCollapsibleState.Expanded);
	  this.children = children;
	  if (noteId)
	  	this.id = noteId;
	}

	addChild(element: TreeItem, fileName: string, status: string) {
	    if (this.children === undefined) {
	        this.children = [];
	        this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
	    }
	    element.resourceUri = URI.parse(fileName);
	    element.tooltip = fileName;
		element.contextValue = (status === "pending") ? '$PendingNote' : '$CompleteNote';
		if (element.id) {
			element.command = new OpenFileCommand(element.id);
		}
	    const noteType = (status === "pending") ? "todo" : "check";
	    element.iconPath = {
	        light: getIconPath(noteType, 'light'),
	        dark: getIconPath(noteType, 'dark')
	    };
	    this.children.push(element);
	}
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "code-annotation" is now active!');

    const tree = new TreeDataProvider();
    const treeActions = new TreeActions(tree);

    vscode.window.registerTreeDataProvider('codeAnnotationView', tree);
    vscode.commands.registerCommand('code-annotation.removeNote', treeActions.removeNote.bind(treeActions));
    vscode.commands.registerCommand('code-annotation.checkNote', treeActions.checkNote.bind(treeActions));
    vscode.commands.registerCommand('code-annotation.uncheckNote', treeActions.uncheckNote.bind(treeActions));
	vscode.commands.registerCommand('code-annotation.openNote', treeActions.openNote.bind(treeActions));
	vscode.commands.registerCommand('code-annotation.editNote', treeActions.editNote.bind(treeActions));
	vscode.commands.registerCommand('code-annotation.openNoteFromId', (id: string) => {
		treeActions.openNoteFromId(id);
    });

    vscode.commands.registerCommand('code-annotation.summary', () => {
        generateMarkdownReport();
	});

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
    });

    let disposable = vscode.commands.registerCommand('code-annotation.addNote', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const fsPath = editor.document.uri.fsPath;
            const selection = editor.selection;
            const text = editor.document.getText(selection);
            const annotationText = await vscode.window.showInputBox({ placeHolder: 'Give the annotation some text...' });
            if (annotationText) {
                const nextId = getNextId();
                addNote({fileName: fsPath,
                    fileLine: selection.start.line,
                    positionStart: {line: selection.start.line, character: selection.start.character},
                    positionEnd: {line: selection.end.line, character: selection.end.character},
                    text: annotationText,
                    codeSnippet: text,
                    status: "pending",
                    id: nextId});
                vscode.window.showInformationMessage('Annotation saved!');
            }
        }
    });

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
