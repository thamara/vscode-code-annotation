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
    space: Space | null;
    measurement_system: MeasurementSystem | null;
}
export interface MeasurementSystem extends vscode.QuickPickItem{
    label: string;
}
export interface Vector extends vscode.QuickPickItem {
    label: string;
    magnitude: number | null;
    space: Space | null;
}
export interface Point extends vscode.QuickPickItem {
    label: string;
    magnitude: number | null;
    space: Space | null;
}
export interface Frame extends vscode.QuickPickItem { 
    label: string;
    point: Point | null;
    vector: Vector | null;
}
export interface Space extends vscode.QuickPickItem {
    label: string;
    frame: Frame | null;
}

export interface NotesDb {
    notes: Note[];
    measurement_systems: MeasurementSystem[];
    vectors: Vector[];
    points: Point[];
    frames: Frame[];
    spaces: Space[];
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

export const getMeasurementSystems = (): MeasurementSystem[] => {
    return getNotesDb().measurement_systems;
};

export const getVectors = (): Vector[] => {
    return getNotesDb().vectors;
};

export const getPoints = (): Point[] => {
    return getNotesDb().points;
};

export const getFrames = (): Frame[] => {
    return getNotesDb().frames;
};

export const getSpaces = (): Space[] => {
    return getNotesDb().spaces;
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
        space: null,
        measurement_system: null,
    };
    return note;
};

const createPeirceNote = (annotationText: string, editor : vscode.TextEditor, range : vscode.Range) => {
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
        space: null,
        measurement_system: null,
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

export const addMeasurementSystem = async () => {
    console.log('ADD MEASUREMENT SYSTEM')
    let annotationText = await vscode.window.showInputBox({ placeHolder: 'Measurement System?'});
    if (annotationText) {
        const new_ms: MeasurementSystem = {
            label : annotationText,
        }
        let db = getNotesDb();
        db.measurement_systems.push(new_ms);
        saveDb(db);
        vscode.window.showInformationMessage('Annotation saved!');
    }
};

export const addVector = async () => {
    console.log('ADD VECTOR')
    let spaces = getSpaces();
    console.log(spaces);
    let i = 0;
    let options : Space[] = spaces;
    let createNewFrame : Space = {
        label: "Create new Space",
        frame: null,
    };
    options.push(createNewFrame);
    const quickPick = await vscode.window.showQuickPick(options, {
        placeHolder: 'Select a Space for your Vector'
    });
    console.log("quick pick")
    console.log(quickPick);
    if (quickPick === undefined)
        return;
    if (quickPick.label == "Create new Space") {
        console.log("creating new space")
        await addSpace();
        await addVector();
        return;
    }
    let annotationText = await vscode.window.showInputBox({ placeHolder: 'Name of vector?'});
    let magnitude = await vscode.window.showInputBox({ placeHolder: 'Magnitude of vector?', value: "1"});
    if (annotationText && magnitude && quickPick != undefined) {
        const new_vector : Vector = {
            label : annotationText,
            magnitude : +magnitude,
            space : quickPick,
        }
        let db = getNotesDb();
        db.vectors.push(new_vector);
        saveDb(db);
        vscode.window.showInformationMessage('Annotation saved!');
    }
};

export const addPoint = async () => {
    console.log('ADD POINT')
    let spaces = getSpaces();
    console.log(spaces);
    let i = 0;
    let options : Space[] = spaces;
    let createNewSpace : Space = {
        label: "Create new Space",
        frame: null,
    };
    options.push(createNewSpace);
    const quickPick = await vscode.window.showQuickPick(options, {
        placeHolder: 'Select a Space for your Point'
    });
    console.log("quick pick")
    console.log(quickPick);
    if (quickPick === undefined)
        return;
    if (quickPick.label == "Create new Space") {
        console.log("creating new space")
        await addSpace();
        await addPoint();
        return;
    }
    let annotationText = await vscode.window.showInputBox({ placeHolder: 'Name of point?'});
    let magnitude = await vscode.window.showInputBox({ placeHolder: 'Magnitude of point?', value: "1"});
    if (annotationText && magnitude && quickPick != undefined) {
        const new_point : Point = {
            label : annotationText,
            magnitude : +magnitude,
            space : quickPick,
        }
        let db = getNotesDb();
        db.points.push(new_point);
        saveDb(db);
        vscode.window.showInformationMessage('Annotation saved!');
    }
};
export const addFrame = async () => {
    console.log('ADD FRAME')
    let vectors = getVectors();
    console.log(vectors);
    let points = getPoints();
    console.log(points);
    let i = 0;
    let vector_options : Vector[] = vectors;
    let createNewVector : Vector = {
        label: "Create new Vector",
        magnitude: null,
        space: null,
    };
    vector_options.push(createNewVector);
    const quickPickVector = await vscode.window.showQuickPick(vector_options, {
        placeHolder: 'Select a Vector for your Frame'
    });
    if (quickPickVector === undefined)
        return;
    if (quickPickVector.label == "Create new Vector") {
        await addVector();
        await addFrame();
        return;
    }
    let point_options : Point[] = points;
    let createNewPoint : Point = {
        label: "Create new Point",
        magnitude: null,
        space: null,
    };
    point_options.push(createNewPoint);
    const quickPickPoint = await vscode.window.showQuickPick(point_options, {
        placeHolder: 'Select a Point for your Frame'
    });
    console.log("quick pick")
    console.log(quickPickPoint);
    if (quickPickPoint === undefined)
        return;
    if (quickPickPoint.label == "Create new Point") {
        await addPoint();
        await addFrame();
        return;
    }
    let annotationText = await vscode.window.showInputBox({ placeHolder: 'Name of frame?', value: "new frame"});
    if (annotationText) {
        const new_frame : Frame = {
            label : annotationText,
            vector: quickPickVector,
            point : quickPickPoint,
        }
        let db = getNotesDb();
        db.frames.push(new_frame);
        saveDb(db);
        vscode.window.showInformationMessage('Annotation saved!');
    }
};
export const addSpace = async () => {
    console.log('ADD SPACE')
    let frames = getFrames();
    console.log(frames);
    let i = 0;
    let options : Frame[] = frames;
    let createNewFrame : Frame = {
        label: "Create new Frame",
        point: null,
        vector: null,
    };
    options.push(createNewFrame);
    const quickPick = await vscode.window.showQuickPick(options, {
        placeHolder: 'Select a Frame for your Space'
    });
    console.log("quick pick")
    console.log(quickPick);
    if (quickPick === undefined)
        return;
    if (quickPick.label == "Create new Frame") {
        console.log("creating new frame")
        await addFrame();
        await addSpace();
        return;
    }
    let annotationText = await vscode.window.showInputBox({ placeHolder: 'Name of space?', value: "new space"});
    if (annotationText && quickPick != undefined) {
        const new_space : Space = {
            label : annotationText,
            frame: quickPick,
        }
        let db = getNotesDb();
        db.spaces.push(new_space);
        saveDb(db);
        vscode.window.showInformationMessage('Annotation saved!');
    }
};

export const addPeirceNote = async (annotationText : string, editor : vscode.TextEditor, range : vscode.Range) => {
    if (editor) {
        addNoteToDb(createPeirceNote(annotationText, editor, range))
    }
    setDecorations();
};

export const addPlainNote = async () => {
    const annotationText = await vscode.window.showInputBox({ placeHolder: 'Give the annotation some text...' });
    if (annotationText) {
        addNoteToDb(createPlainNote(annotationText));
    }
};