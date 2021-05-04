import * as vscode from 'vscode';
import * as fs from 'fs';

import { getAnnotationFilePath, getConfiguration } from './configuration';
import { setDecorations } from './decoration/decoration';

export interface Position {
    line: number;
    character: number;
}

export interface Note {
    fileName: string;
    fileLine: number;
    positionStart: Position;
    positionEnd: Position;
    text: string;
    codeSnippet: string;
    status: 'pending' | 'done';
    id: number;
    interpretation: Interpretation | null;
    error : string;
    type: string;
}
export interface MeasurementSystem extends vscode.QuickPickItem{
    label: string;
}
export interface CoordinateSpace extends vscode.QuickPickItem {
    label: string; // interpX
    space: string; // Always "Classical Time Coordinate Space"
    parent: CoordinateSpace | null;
    origin: number | null;
    basis: number | null;
}
export interface Interpretation extends vscode.QuickPickItem {
    label: string;
    name: string;
    form: string;
    value: number;
    space: CoordinateSpace;
    type: string;
}

export interface NotesDb {
    notes: Note[];
    coordinate_spaces: CoordinateSpace[];
    nextId: number;
}

export const getNotesDb = (): NotesDb => {
    const annotationFile = getAnnotationFilePath();
    const rawdata = fs.readFileSync(annotationFile, 'utf8');
    let annotations = JSON.parse(rawdata);
    return annotations;
};

export const getNotes = (): Note[] => {
    return getNotesDb().notes;
};

export const getFileNotes = (): Note[] => {
    let db = getNotesDb();
    let new_notes : Note[] = [];
    db.notes.forEach(note => {
        // Might be able to clean this up
        // Set the vscode.editor.selection position,
        // and let the prebuilt addNote functions do the rest.
        if (note.fileName == vscode.window.activeTextEditor?.document.fileName)
            new_notes.push(note);
    });
    return new_notes;
};

export const deleteFilesNotes = (): void => {
    let db = getNotesDb();
    let new_notes : Note[] = [];
    db.notes.forEach(note => {
        // Might be able to clean this up
        // Set the vscode.editor.selection position,
        // and let the prebuilt addNote functions do the rest.
        if (note.fileName != vscode.window.activeTextEditor?.document.fileName)
            new_notes.push(note);
    });
    db.notes = new_notes;
    saveDb(db);
    return;
};

export const getSpaces = (): CoordinateSpace[] => {
    return getNotesDb().coordinate_spaces;
};

export const getNextId = (): number => {
    return getNotesDb().nextId;
};

export const saveDb = (db: NotesDb) => {
    const data = JSON.stringify(db);
    fs.writeFileSync(getAnnotationFilePath(), data);
    vscode.commands.executeCommand('code-annotation.refreshEntry');
};

export const saveNotes = (notes: Note[]) => {
    let db = getNotesDb();

    // Replace notes by the one passed
    db.notes = notes;

    // Save Db in JSON file
    saveDb(db);
};

const createNote = (annotationText: string, fromSelection: boolean) => {
    const nextId = getNextId();

    let codeSnippet = '';
    let fileName = '';
    let selection;
    let positionStart: Position = {line: 0, character: 0};
    let positionEnd: Position = {line: 0, character: 0};

    const editor = vscode.window.activeTextEditor;
    if (fromSelection && editor) {
        fileName = editor.document.uri.fsPath;
        selection = editor.selection;
        if (selection) {
            codeSnippet = editor.document.getText(selection);
            positionStart = { line: selection.start.line, character: selection.start.character };
            positionEnd = { line: selection.end.line, character: selection.end.character };
        }
    }
    const note: Note = {
        fileName: fileName,
        fileLine: selection ? selection.start.line : 0,
        positionStart: positionStart,
        positionEnd: positionEnd,
        text: annotationText,
        codeSnippet: codeSnippet,
        status: 'pending',
        id: nextId,
        interpretation: null,
        error: "Not checked",
        type: "Unknown"
    };
    return note;
};

const createPeirceNote = (annotationText: string, type: string, editor : vscode.TextEditor, range : vscode.Range) => {
    const nextId = getNextId();

    let codeSnippet = '';
    let fileName = '';
    let positionStart: Position = {line: 0, character: 0};
    let positionEnd: Position = {line: 0, character: 0};
    fileName = editor.document.uri.fsPath;
    console.log(range);
    console.log("Code snippet:")
    codeSnippet = editor.document.getText(range);
    console.log(codeSnippet);
    positionStart = { line: range.start.line, character: range.start.character };
    positionEnd = { line: range.end.line, character: range.end.character };
    const note: Note = {
        fileName: fileName,
        fileLine: range.start.line,
        positionStart: positionStart,
        positionEnd: positionEnd,
        text: annotationText,
        codeSnippet: codeSnippet,
        status: 'pending',
        id: nextId,
        interpretation: null,
        error: "Not checked",
        type: type,
    };
    return note;
};

const createNoteFromSelection = (annotationText: string) => {
    return createNote(annotationText, true);
};

const createPlainNote = (annotationText: string) => {
    return createNote(annotationText, false);
};

const addNoteToDb = (note: Note) => {
    let db = getNotesDb();

    db.notes.push(note);
    db.nextId++;

    saveDb(db);
    vscode.window.showInformationMessage('Annotation saved!');
};

const getTODOFromSelectedText = (): string | undefined => {
    const editor = vscode.window.activeTextEditor;
    const selectedText = editor?.selection ? editor.document.getText(editor.selection) : '';
    const todoSelector = /\/\/\s*(TODO|FIX):\s*(.*)/;
    let matchArray = selectedText.match(todoSelector);
    if (matchArray && matchArray.length) {
        return matchArray[2];
    }
    for (const custom of getConfiguration().customTODO) {
        try {
            const customMatch = selectedText.match(custom);
            if (customMatch && customMatch.length) {
                // Use the second group to be consistent with the standard regex above
                if (!customMatch[2]) {
                    vscode.window.showWarningMessage(`Custom TODO RegEx (${custom}) doesn't have atleast two capture groups`);
                } else {
                    return customMatch[2];
                }
            }
        } catch (e) {
            vscode.window.showErrorMessage(`Error checking custom regex '${custom}': ${e.toString()}`);
            continue;
        }
    }
    return undefined;
};

export const addNote = async () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const todoText = getTODOFromSelectedText();
        let annotationText = await vscode.window.showInputBox({ placeHolder: 'Give the annotation some text...', value: todoText });
        if (annotationText) {
            addNoteToDb(createNoteFromSelection(annotationText));
        }
    }
    setDecorations();
};

/*
{"label": "time_std_space", "space": "Classical Time Coordinate Space", "parent": null, "origin": null, "basis": null }
*/
export const addSpace = async () => {
    let options : vscode.QuickPickItem[] = [];
    let derivedFrame : vscode.QuickPickItem = {
        label: "Space with Derived Frame",
    };
    let stdFrame: vscode.QuickPickItem = {
        label: "Space with Standard Frame",
    };
    options.push(stdFrame);
    options.push(derivedFrame);
    const quickPick = await vscode.window.showQuickPick(options);
    console.log("quick pick")
    console.log(quickPick);
    if (quickPick === undefined)
        return;
    let annotationText = await vscode.window.showInputBox({ placeHolder: 'Name of space?', value: "new space"});
    if (annotationText === undefined) 
        return;
    if (quickPick.label == "Space with Standard Frame") {
        const new_space : CoordinateSpace = {
            label: annotationText,
            space: "Classical Time Coordinate Space", 
            parent: null, 
            origin: null, 
            basis: null 
        }
        let db = getNotesDb();
        db.coordinate_spaces.push(new_space);
        saveDb(db);
    } else {
        const spaces = getSpaces();
        const parent = await vscode.window.showQuickPick(spaces, {
            placeHolder: 'Select a Parent Space'
        });
        console.log("quick pick")
        console.log(parent);
        if (parent === undefined)
            return;
        const vec_magnitude = await vscode.window.showInputBox({ placeHolder: 'Magnitude of vector?' });
        if (vec_magnitude === undefined || vec_magnitude == "" || Number(vec_magnitude) == NaN)
            return;
        const point_magnitude = await vscode.window.showInputBox({ placeHolder: 'Magnitude of point?'});
        if (point_magnitude === undefined || point_magnitude == "" || Number(point_magnitude) == NaN)
            return;
        const new_space : CoordinateSpace = {
            label: annotationText, 
            space: "Classical Time Coordinate Space", 
            parent: parent, 
            origin: +point_magnitude, 
            basis: +vec_magnitude
        }
        let db = getNotesDb();
        db.coordinate_spaces.push(new_space);
        saveDb(db);
    }
};

export const addPeirceNote = async (annotationText : string, type : string, editor : vscode.TextEditor, range : vscode.Range) => {
    if (editor) {
        addNoteToDb(createPeirceNote(annotationText, type, editor, range))
    }
    setDecorations();
};

export const addPlainNote = async () => {
    const annotationText = await vscode.window.showInputBox({ placeHolder: 'Give the annotation some text...' });
    if (annotationText) {
        addNoteToDb(createPlainNote(annotationText));
    }
};