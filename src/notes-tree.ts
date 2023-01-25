import * as vscode from 'vscode';
import * as path from 'path';

import { getNotes, saveNotes, Note } from './note-db';
import { getConfiguration } from './configuration';
import { getRelativePathForFileName,
    getTimeStampsString } from './utils';
import { setDecorations } from './decoration/decoration';

const getIconPathFromType = (type: string, theme: string): string => {
    return path.join(__filename, '..', '..', 'resources', theme, type.toLowerCase() + '.svg');
};

const getIconPath = (status: string): any => {
    const noteType = (status === 'pending') ? 'note' : 'notedone';
    return {
        light: getIconPathFromType(noteType, 'light'),
        dark: getIconPathFromType(noteType, 'dark')
    };
};

const getContextValue = (status: string): string => {
    return (status === 'pending') ? '$PendingNote' : '$CompleteNote';
};

const createNoteItem = (note: Note): NoteItem => {
    const fullPathFileName = note.fileName;
    let details: NoteItem[] = [];

    if (getConfiguration().showFileName && fullPathFileName.length > 0) {
        // Creates an item under the main note with the File name (if existing)
        const relativePath = getRelativePathForFileName(note.fileName);
        details.push(new NoteItem(`File: ${relativePath}`));
    }
    if (getConfiguration().showCreatedAtTimestamp && note.createdAt) {
        details.push(new NoteItem(`Created at: ${getTimeStampsString(note.createdAt)}`));
    }
    if (getConfiguration().showResolvedAtTimestamp && note.resolvedAt) {
        details.push(new NoteItem(`Resolved at: ${getTimeStampsString(note.resolvedAt)}`));
    }

	let noteItem = new NoteItem(note.text, {
		children: details,
		noteId: note.id.toString(),
		collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
	});
	if (noteItem.id) {
		noteItem.command = new OpenNoteCommand(noteItem.id);
    }
    if (details.length > 0) {
        // If details isn't undefined, set the command to the same as the parent
        details[0].command = noteItem.command;
    }
    noteItem.tooltip = note.text;
    noteItem.contextValue = getContextValue(note.status);
    noteItem.iconPath = getIconPath(note.status);

    return noteItem;
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
    checkAllNotes(data: any): void {
        const children = data.children;
        if (!children) { return; }

        for (let index = 0; index < children.length; index++) {
            const current = children[index];
            this.checkNote(current);
        }
    }
    uncheckAllNotes(data: any): void {
        const children = data.children;
		
        if (!children) { return; }

        for (let index = 0; index < children.length; index++) {
            const current = children[index];
            this.uncheckNote(current);
        }
    }
    removeAllNotes(data: any): void {
        const children = data.children;
		
        if (!children) { return; }

        for (let index = 0; index < children.length; index++) {
            const current = children[index];
            this.removeNote(current);
        }
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
    copyNote(item: NoteItem) {
        return this.provider.copyItem(item.id);
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
	    this.data = [new NoteItem('Pending', { context: '$menu-pending' }), new NoteItem('Done', { context: '$menu-done' })];
	    for (let note in annotations) {
	        const noteItem = createNoteItem(annotations[note]);
	        const isPending = annotations[note].status === 'pending';
	        if (isPending) {
	            this.data[0].addChild(noteItem);
	            countPeding++;
	        } else {
	            this.data[1].addChild(noteItem);
	            countDone++;
	        }
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
	    setDecorations();
	}

	checkItem(id: string | undefined, status: 'pending' | 'done'): void {
	    const notes = getNotes();
	    const index = notes.findIndex((item: { id: Number }) => {
	        return item.id.toString() === id;
	    });

	    if (index >= 0) {
	        notes[index].status = status;
	        const fromDoneToPending = notes[index].resolvedAt && status === 'done';
	        notes[index].resolvedAt =  fromDoneToPending ? undefined : new Date();
	    }

	    saveNotes(notes);
	}

	editItem(id: string | undefined): void {
	    const notes = getNotes();
	    const index = notes.findIndex((item: { id: Number }) => {
	        return item.id.toString() === id;
	    });
			
	    vscode.window.showInputBox({ placeHolder: 'New text for annotation...', value: notes[index].text}).then(annotationText => {
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

	        if (fileName.length <= 0) {
	            return;
	        }

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

	copyItem(id: string | undefined): void {
	    const notes = getNotes();
	    const index = notes.findIndex((item: { id: Number }) => {
	        return item.id.toString() === id;
	    });

	    if (index === -1) {
	        return;
	    }

	    const content = notes[index].text;
	    vscode.env.clipboard.writeText(content).then(() => {
	        vscode.window.showInformationMessage('Note copied successfully');
	    });
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
    children: NoteItem[];

    constructor(label: string, options?: {
        children?: NoteItem[];
        noteId?: string;
        context?: string;
        collapsibleState?: vscode.TreeItemCollapsibleState;
    }) {
        super(label);
        this.children = options?.children ?? [];
        this.id = options?.noteId;
        this.contextValue = options?.context;
        this.collapsibleState = options?.collapsibleState ?? (
            this.children.length === 0 ?
                vscode.TreeItemCollapsibleState.None :
                vscode.TreeItemCollapsibleState.Expanded);
    }

    addChild(element: NoteItem) {
        this.children.push(element);
        this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
    }
}
