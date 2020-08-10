import * as vscode from 'vscode';
import * as path from "path";
import { URI } from 'vscode-uri';

import { getNotes, saveNotes } from './note-db';
import { getConfiguration } from './configuration';

export const getIconPath = (type: string, theme: string): string => {
	return path.join(__filename, '..', '..', 'resources', theme, type.toLowerCase() + '.svg');
};

export class TreeActions {
	constructor(private provider: NotesTree) { }

	removeNote(item: NoteItem) {
		return this.provider.removeItem(item.id);
	}
	checkNote(item: NoteItem) {
		return this.provider.checkItem(item.id, 'done');
	}
	uncheckNote(item: NoteItem) {
		return this.provider.checkItem(item.id, 'pending');
	}
	openNote(item: NoteItem) {
		return this.provider.openItem(item.id);
	}
	openNoteFromId(id: string) {
		return this.provider.openItem(id);
	}
	editNote(item: NoteItem) {
		return this.provider.editItem(item.id);
	}
}

export class NotesTree implements vscode.TreeDataProvider<NoteItem> {

	private _onDidChangeTreeData: vscode.EventEmitter<NoteItem | undefined | null | void> = new vscode.EventEmitter<NoteItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<NoteItem | undefined | null | void> = this._onDidChangeTreeData.event;

	refresh(): void {
		this.sourceData();
		this._onDidChangeTreeData.fire(null);
	}

	sourceData(): void {
		const annotations = getNotes();
		let countPeding = 0;
		let countDone = 0;
		this.data = [];
		this.data = [new NoteItem('Pending'), new NoteItem('Done')];
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
			let details = undefined;
			if (getConfiguration().showFileName) {
				const fullPathFileName = annotations[note].fileName;
				const workspacePath = vscode.workspace.rootPath;
				let relativePath = workspacePath;
				if (workspacePath) {
					relativePath = fullPathFileName.replace(workspacePath, '');
					if (relativePath.charAt(0) === '/') { relativePath = relativePath.substr(1); }
				}
				details = [new NoteItem(`File: ${relativePath}`)];
			}

			rootByStatus.addChild(new NoteItem(itemText, details, annotations[note].id.toString()),
				annotations[note].fileName,
				annotations[note].status);
		}
		this.data[0].label += ` (${countPeding})`;
		this.data[1].label += ` (${countDone})`;
	}

	removeItem(id: string | undefined): void {
		const notes = getNotes();
		const indexToRemove = notes.findIndex((item: { id: Number }) => {
			return item.id.toString() === id;
		});

		if (indexToRemove >= 0) {
			notes.splice(indexToRemove, 1);
		}

		saveNotes(notes);
	}

	checkItem(id: string | undefined, status: 'pending' | 'done'): void {
		const notes = getNotes();
		const index = notes.findIndex((item: { id: Number }) => {
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
			const index = notes.findIndex((item: { id: Number }) => {
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
		const index = notes.findIndex((item: { id: Number }) => {
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

	data: NoteItem[];

	constructor() {
		vscode.commands.registerCommand('code-annotation.refreshEntry', () =>
			this.refresh()
		);

		this.data = [];
		this.sourceData();
	}

	getTreeItem(element: NoteItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
		return element;
	}

	getChildren(element?: NoteItem | undefined): vscode.ProviderResult<NoteItem[]> {
		if (element === undefined) {
			return this.data;
		}
		return element.children;
	}
}

class OpenNoteCommand implements vscode.Command {
	command = 'code-annotation.openNoteFromId';
	title = 'Open File';
	arguments?: any[];

	constructor(id: string) {
		this.arguments = [id];
	}
}

class NoteItem extends vscode.TreeItem {
	children: NoteItem[] | undefined;

	constructor(label: string, children?: NoteItem[] | undefined, noteId?: string | undefined) {
		super(
			label,
			children === undefined ? vscode.TreeItemCollapsibleState.None :
				vscode.TreeItemCollapsibleState.Expanded);
		this.children = children;
		if (noteId) {
			this.id = noteId;
		}
	}

	addChild(element: NoteItem, fileName: string, status: string) {
		if (this.children === undefined) {
			this.children = [];
			this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
		}
		element.resourceUri = URI.parse(fileName);
		element.tooltip = fileName;
		element.contextValue = (status === "pending") ? '$PendingNote' : '$CompleteNote';
		if (element.id) {
			element.command = new OpenNoteCommand(element.id);
		}
		const noteType = (status === "pending") ? "todo" : "check";
		element.iconPath = {
			light: getIconPath(noteType, 'light'),
			dark: getIconPath(noteType, 'dark')
		};
		this.children.push(element);
	}
}