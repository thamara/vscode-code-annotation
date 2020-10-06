import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getAnnotationFilePath } from './configuration';
import { utils } from 'mocha';

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
}

export interface NotesDb {
    notes: Note[];
    nextId: number;
    customTODO: string[];
}

export const getNotesDb = (): NotesDb => {
    const annotationFile = getAnnotationFilePath();
    const rawdata = fs.readFileSync(annotationFile, 'utf8');
    let annotations = JSON.parse(rawdata);
    if (!annotations.customTODO) {
        annotations.customTODO = [];
    }
    return annotations;
};

export const getNotes = (): Note[] => {
    return getNotesDb().notes;
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
    let selection = undefined;
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
        id: nextId
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
    for (const custom of getNotesDb().customTODO) {
        const customMatch = selectedText.match(custom);
        if (customMatch && customMatch.length) {
            // Use the second group to be consistent with the standard regex above
            if (!customMatch[2]) {
                vscode.window.showWarningMessage(`Custom TODO RegEx (${custom}) doesn't have atleast two capture groups`);
            } else {
                return customMatch[2];
            }
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
};

export const addPlainNote = async () => {
    const annotationText = await vscode.window.showInputBox({ placeHolder: 'Give the annotation some text...' });
    if (annotationText) {
        addNoteToDb(createPlainNote(annotationText));
    }
};

export const addCustomTODO = async () => {
    const annotationText = await vscode.window.showInputBox({ placeHolder: 'Enter a new regular expression for a custom TODO comment...'});
    if (annotationText) {
        let valid = true;
        try {
            new RegExp(annotationText);
        } catch (e) {
            valid = false;
            await vscode.window.showErrorMessage(`Error interpreting input as a valid regular expression: ${e.toString()}`);
        }
        if (valid) {
            // Its a valid RegEx, now check its not a duplicate
            const config = getNotesDb();
            if (config.customTODO.includes(annotationText)) {
                await vscode.window.showErrorMessage('You\'ve already added this regular expression');
            } else {
                config.customTODO.push(annotationText);
                saveDb(config);
                await vscode.window.showInformationMessage(`Added the regular expression ${annotationText} successfully`);
            }
        }
    }
};

export const removeCustomTODO = async () => {
    const annotationText = await vscode.window.showInputBox({ placeHolder: 'Enter a regular expression to remove from your custom TODO comments'});
    if (annotationText) {
        // No need to check the validity of the RegEx here, simply check if it was already set
        const customExisting = getNotesDb();
        const index = customExisting.customTODO.indexOf(annotationText);
        if (index > -1) {
            customExisting.customTODO.splice(index, 1);
            saveDb(customExisting);
            await vscode.window.showInformationMessage(`Regular expression ${annotationText} removed successfuly`);
        } else {
            await vscode.window.showErrorMessage('There was no regular expression matching your entry saved');
        }
    }
};

export const showCustomTODO = async () => {
    await vscode.window.showQuickPick(getNotesDb().customTODO || ['None set']);
};