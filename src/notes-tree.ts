import * as vscode from 'vscode';
import * as path from 'path';

import { 
    getNotes, saveNotes, getMeasurementSystems, getVectors, 
    getPoints, getFrames, getSpaces, Note,
    addSpace, addMeasurementSystem
} from './note-db';
import { getConfiguration } from './configuration';
import { getRelativePathForFileName } from './utils';
import { setDecorations } from './decoration/decoration';
import { Position, TextEditor, WebviewPanel } from 'vscode';

const getIconPathFromType = (type: string, theme: string): string => {
    return path.join(__filename, '..', '..', 'resources', theme, type.toLowerCase() + '.svg');
};

const getIconPath = (status: string): any => {
    const noteType = (status === 'pending') ? 'todo' : 'check';
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
    let details = undefined;

    if (getConfiguration().showFileName && fullPathFileName.length > 0) {
        // Creates an item under the main note with the File name (if existing)
        const relativePath = getRelativePathForFileName(note.fileName);
        details = [new NoteItem(`File: ${relativePath}`)];
    }

    let noteItem = new NoteItem(note.text, details, note.id.toString());
    if (noteItem.id) {
        noteItem.command = new OpenNoteCommand(noteItem.id);
    }
    if (details) {
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

export class InfoView {
    private webviewPanel!: WebviewPanel;

    private getActiveCursorLocation(): Position | null {
        if (vscode.window.activeTextEditor)
            return vscode.window.activeTextEditor.selection.active;
        else
            return null;
    }

    getHoveredNotes() : Note[] {            
        let hovered_notes : Note[] = [];
        let notes = getNotes();
        notes.forEach(note => {
            if (this.isHoveredNote(note)) 
                hovered_notes.push(note);
        });
        return hovered_notes;
    }

    async editHoveredNotes() {
        console.log("Editing hovered notes...")
	    let notes = getNotes();
        console.log("Got notes...");
        console.log(notes);
        let hover_index = 0;
        for (let index = 0; index < notes.length; index++) {
            let note = notes[index];
            console.log("Trying notes["+index+"]", note);
            if (!this.isHoveredNote(note)) continue;
            this.updatePreviewIndex(hover_index);
            let spaces = getSpaces();
            let ms = getMeasurementSystems();
            console.log(spaces);
            let i = 0;
            let options : vscode.QuickPickItem[] = spaces;
            let createNewSpace : vscode.QuickPickItem = {
                label: "Create new Space"
            };
            options.push(createNewSpace);
            const quickPick = await vscode.window.showQuickPick(spaces, {
                placeHolder: 'Select a space'
            });
            console.log("quick pick")
            console.log(quickPick);
            if (quickPick === undefined)
                return;
            if (quickPick.label == "Create new Space") {
                console.log("creating new space")
                await addSpace();
                await this.editHoveredNotes();
                return;
            }
            let ms_options : vscode.QuickPickItem[] = ms;
            let createNewMS: vscode.QuickPickItem = {
                label: "Create new Measurement System"
            };
            ms_options.push(createNewMS);
            const MSquickPick = await vscode.window.showQuickPick(ms, {
                placeHolder: 'Select a space'
            });
            console.log("quick pick")
            console.log(quickPick);
            if (MSquickPick === undefined)
                return;
            if (MSquickPick.label == "Create new Measurement System") {
                console.log("creating new measurement system")
                await addMeasurementSystem();
                await this.editHoveredNotes();
                return;
            }
            await vscode.window.showInputBox({ placeHolder: 'New text for annotation...', value: notes[index].text}).then(annotationText => {
                if (index >= 0 && annotationText) {
                    notes[index].text = annotationText;
                    notes[index].space = quickPick;
                    notes[index].measurement_system = MSquickPick;
                }
            });
            saveNotes(notes);
            console.log("Saving notes["+index+"]");
            this.updatePreview();
            hover_index++;
        }
    }

    private isHoveredNote(note : Note) : boolean {
        let loc = this.getActiveCursorLocation();
        let condition = (loc && note.fileName == vscode.window.activeTextEditor?.document.fileName 
            && note.positionStart.line <= loc.line && note.positionEnd.line >= loc.line);
        if (condition == null) return false;
        return condition;
    }

    private displayNote(note : Note, editing: boolean) : string {
        let full : string = "";
        if (note) {
            if (editing)
                full += `<pre style="color: lightgreen">${JSON.stringify(note, undefined, 2)}</pre></b>`
            else
                full += "<pre>" + JSON.stringify(note, undefined, 2) + "</pre>"
        }
        return full;
    }

    // <script src="${this.getMediaPath('index.js')}"></script>
    async updatePreview() {
        this.updatePreviewIndex(-1);
    }
    async updatePreviewIndex(index : number) {
        console.log(index);
        let contents : string = "";
        let notes = this.getHoveredNotes();
        for (let i = 0; i < notes.length; i++)
            contents += this.displayNote(notes[i], i == index);
        contents += '<p style="color:lightblue">Key bindings</p>';
        contents += '<p style="color:lightblue"><b>Ctrl+Alt+R</b> to run Peirce, generating type information annotations</p>';
        contents += '<p style="color:lightblue"><b>Ctrl+Alt+E</b> to edit existing type information annotations</p>';
        contents += '<p style="color:lightblue"><b>Ctrl+Alt+M</b> to add measurement systems</p>';
        contents += '<p style="color:lightblue"><b>Ctrl+Alt+V</b> to add vectors</p>';
        contents += '<p style="color:lightblue"><b>Ctrl+Alt+P</b> to add points</p>';
        contents += '<p style="color:lightblue"><b>Ctrl+Alt+F</b> to add frames</p>';
        contents += '<p style="color:lightblue"><b>Ctrl+Alt+S</b> to add spaces</p>';

        let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8" />
                <meta http-equiv="Content-type" content="text/html;charset=utf-8">
                <title>Infoview</title>
                <style></style>
            </head>
            <body>
                <div id="react_root"></div>
                ${contents}
                <!-- script here -->
            </body>
            </html>`
        this.webviewPanel.webview.html = html;
    }

    async openPreview() {
        vscode.window.onDidChangeTextEditorSelection(() => this.updatePreview());
        let editor = undefined;
        if (vscode.window.activeTextEditor != undefined) {
            editor = vscode.window.activeTextEditor;
        }
        else 
            return;
        let column = (editor && editor.viewColumn) ? editor.viewColumn + 1 : vscode.ViewColumn.Two;
        const loc = this.getActiveCursorLocation();
        console.log(loc);
        if (column === 4) { column = vscode.ViewColumn.Three; }
        this.webviewPanel = vscode.window.createWebviewPanel('Peirce', 'Peirce Infoview',
            { viewColumn: column, preserveFocus: true },
            {
                enableFindWidget: true,
                retainContextWhenHidden: true,
                enableScripts: true,
                enableCommandUris: true,
            });
        this.updatePreview();
        //this.webviewPanel.onDidDispose(() => this.webviewPanel = null);
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
	    this.data = [];
	    this.data = [new NoteItem('Annotations', undefined, undefined, '$menu-pending'), 
            new NoteItem('Measurement Systems', undefined, undefined, '$MeasurementSystem'),
            new NoteItem('Vectors', undefined, undefined, '$Vector'),
            new NoteItem('Points', undefined, undefined, '$Point'),
            new NoteItem('Frames', undefined, undefined, '$Frame'),
            new NoteItem('Spaces', undefined, undefined, '$Space'),
        ];
        console.log("In notes tree")
	    const annotations = getNotes();
        console.log(annotations)
	    for (let note in annotations) {
	        const noteItem = createNoteItem(annotations[note]);
            console.log(note)
            this.data[0].addChild(noteItem);
	    }
	    this.data[0].label += ` (${annotations.length})`;

	    const measurement_systems = getMeasurementSystems();
        console.log("measurement systems")
        console.log(measurement_systems)
	    for (let ms in measurement_systems) {
            const measurement_system = measurement_systems[ms];
            let noteItem = new NoteItem(measurement_system.label)
            this.data[1].addChild(noteItem);
	    }
	    this.data[1].label += ` (${measurement_systems.length})`;

	    const vectors = getVectors();
        console.log("vectors")
        console.log(vectors)
	    for (let v in vectors) {
	        //const noteItem = createNonNoteItem(vectors[v]);
            const vector = vectors[v];
            let magnitude;
            if (vector.magnitude != null) {
                magnitude = vector.magnitude.toString();
            }
            let noteItem = new NoteItem(vector.label + ": " + magnitude)
            this.data[2].addChild(noteItem);
	    }
	    this.data[2].label += ` (${vectors.length})`;

	    const points = getPoints();
        console.log("points")
        console.log(points)
	    for (let p in points) {
            const point = points[p];
            let magnitude;
            if (point.magnitude)
                magnitude = point.magnitude.toString();
	        const noteItem = new NoteItem(point.label + ": " + magnitude)
            this.data[3].addChild(noteItem);
	    }
	    this.data[3].label += ` (${points.length})`;

	    const frames = getFrames();
        console.log("frames")
        console.log(frames)
	    for (let f in frames) {
            const frame = frames[f];
            let point;
            if (frame.point)
                point = new NoteItem(frame.point.label.toString());
            else
                return;
            let vector;
            if (frame.vector)
                vector = new NoteItem(frame.vector.label.toString());
            else
                return;
	        const noteItem = new NoteItem(frame.label, [point, vector])
            this.data[4].addChild(noteItem);
	    }
	    this.data[4].label += ` (${frames.length})`;

	    const spaces = getSpaces();
        console.log("spaces")
        console.log(spaces)
	    for (let s in spaces) {
            const space = spaces[s];
            let noteItem = new NoteItem(space.label)
            const frame = space.frame;
            if (frame) {
                noteItem.children = [new NoteItem(frame.label)];
            }
            this.data[5].addChild(noteItem);
	    }
	    this.data[5].label += ` (${spaces.length})`;
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
	    }

	    saveNotes(notes);
	}

	async editItem(id: string | undefined): Promise<void> {
        vscode.window.showInformationMessage('Annotation edited!');
        console.log('ADD VECTOR')
        let spaces = getSpaces();
        let ms = getMeasurementSystems();
        console.log(spaces);
        let i = 0;
        let options : vscode.QuickPickItem[] = spaces;
        let createNewSpace : vscode.QuickPickItem = {
            label: "Create new Space"
        };
        options.push(createNewSpace);
        const quickPick = await vscode.window.showQuickPick(spaces, {
            placeHolder: 'Select a space'
        });
        console.log("quick pick")
        console.log(quickPick);
        if (quickPick === undefined)
            return;
        if (quickPick.label == "Create new Space") {
            console.log("creating new space")
            addSpace();
            this.editItem(id);
            return;
        }
        let ms_options : vscode.QuickPickItem[] = ms;
        let createNewMS: vscode.QuickPickItem = {
            label: "Create new Measurement System"
        };
        ms_options.push(createNewMS);
        const MSquickPick = await vscode.window.showQuickPick(ms, {
            placeHolder: 'Select a space'
        });
        console.log("quick pick")
        console.log(quickPick);
        if (MSquickPick === undefined)
            return;
        if (MSquickPick.label == "Create new Measurement System") {
            console.log("creating new measurement system")
            addMeasurementSystem();
            this.editItem(id);
            return;
        }

	    const notes = getNotes();
	    const index = notes.findIndex((item: { id: Number }) => {
	        return item.id.toString() === id;
	    });
			
	    await vscode.window.showInputBox({ placeHolder: 'New text for annotation...', value: notes[index].text}).then(annotationText => {
	        if (index >= 0 && annotationText) {
	            notes[index].text = annotationText;
                notes[index].space = quickPick;
                notes[index].measurement_system = MSquickPick;
	        }
	    });
        saveNotes(notes);
        
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
	children: NoteItem[] | undefined;

	constructor(label: string, children?: NoteItem[] | undefined, noteId?: string | undefined, context?: string | undefined) {
	    super(
	        label,
	        children === undefined ? vscode.TreeItemCollapsibleState.None :
	            vscode.TreeItemCollapsibleState.Expanded);
	    this.children = children;
	    if (noteId) {
	        this.id = noteId;
	    }
	    if (context) {
	        this.contextValue = context;
	    }
	}

	addChild(element: NoteItem) {
	    if (this.children === undefined) {
	        this.children = [];
	        this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
	    }
	    this.children.push(element);
	}
}