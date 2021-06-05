import * as vscode from 'vscode';
import * as fs from 'fs';

import { getAnnotationFilePath, getConfiguration } from './configuration';
import { setDecorations } from './decoration/decoration';
import { CustomInspectFunction } from 'util';

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
    error : string | null;
    type: string;
}

export interface Constructor {
    id: number;
    name: string;
    interpretation: Interpretation | null;
    type: string;
    status: 'pending' | 'done';
}

export interface MeasurementSystem extends vscode.QuickPickItem{
    label: string;
}
export interface TimeCoordinateSpace extends vscode.QuickPickItem {
    label: string; // interpX
    space: string; // Always "Classical Time Coordinate Space"
    parent: TimeCoordinateSpace | null;
    origin: number | null;
    basis: number | null;
}

export interface Geom1DCoordinateSpace extends vscode.QuickPickItem {
    label: string; // interpX
    space: string; // Always "Classical Time Coordinate Space"
    parent: TimeCoordinateSpace | null;
    origin: number | null;
    basis: number | null;
}

export interface Interpretation extends vscode.QuickPickItem {
    label: string;
    name: string;
    form: string;
    type: string;
}

export interface Duration extends Interpretation {
    value: number;
    space: TimeCoordinateSpace;
}
export interface Time extends Interpretation {
    value: number;
    space: TimeCoordinateSpace;
}
export interface Scalar extends Interpretation {
    value: number;
}
export interface TimeTransform extends Interpretation {
    domain: TimeCoordinateSpace;
    codomain: TimeCoordinateSpace;
}
export interface Displacement1D extends Interpretation {
    value: number;
    space: Geom1DCoordinateSpace;
}
export interface Position1D extends Interpretation {
    value: number;
    space: Geom1DCoordinateSpace;
}
export interface Geom1DTransform extends Interpretation {
    domain: Geom1DCoordinateSpace;
    codomain: Geom1DCoordinateSpace;
}

export interface NotesDb {
    notes: Note[];
    constructors: Constructor[]
    time_coordinate_spaces: TimeCoordinateSpace[];
    geom1d_coordinate_spaces: Geom1DCoordinateSpace[];
    nextId: number;
    nextConsId: number;
}

export const getNotesDb = (): NotesDb => {
    const annotationFile = getAnnotationFilePath();
    const rawdata = fs.readFileSync(annotationFile, 'utf8');
    let annotations = JSON.parse(rawdata);
    //console.log('notes db: ')
    //console.log(annotations)
    return annotations;
};


export const getNotes = (): Note[] => {
    return getNotesDb().notes;
};

export const getConstructors = (): Constructor[] => {
    return getNotesDb().constructors;
}

export const getNoteFromId = (noteId : string) : Note | null => {
    let notes = getNotes();
    let note_ret : Note | null = null
    notes.forEach(note_ => {
        if (note_.id.toString() == noteId)
            note_ret = note_;
        else
            console.log(note_.id.toString() + " IS NOT " + noteId)
    });

    return note_ret;
};

export const getConstructorFromId = (noteId : string) : Constructor | null => {
    let cons = getConstructors();
    let cons_ret : Constructor | null = null
    cons.forEach(cons_ => {
        if (cons_.id.toString() == noteId){
            cons_ret = cons_
        }
        else {
            console.log(cons_.id.toString() + " IS NOT " + noteId)
        }
    });
    return cons_ret;
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
        console.log(note)
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

export const getTimeSpaces = (): TimeCoordinateSpace[] => {
    return getNotesDb().time_coordinate_spaces;
};

export const getGeom1DSpaces = () : Geom1DCoordinateSpace[] => {
    return getNotesDb().geom1d_coordinate_spaces;
};

export const getNextId = (): number => {
    return getNotesDb().nextId;
};

export const getNextConsId = (): number => {
    return getNotesDb().nextConsId;
};


export const getNoteIndex = (note : Note) :number => {
    let notes = getNotesDb().notes;
    for(let i = 0;i<notes.length;i++)
        if(notes[i].id == note.id)
            return i
    return -1
};

export const getConstructorIndex = (cons : Constructor) :number => {
    let constructors = getNotesDb().constructors;
    for(let i = 0;i<constructors.length;i++)
        if(constructors[i].id == cons.id)
            return i
    return -1
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

export const saveConstructors = (cons : Constructor[]) => {
    let db = getNotesDb();
    db.constructors = cons;
    saveDb(db);
};

export const saveNote = (note : Note) => {
    let db = getNotesDb();
    let index = getNoteIndex(note)
    db.notes[index] = note
    saveNotes(db.notes)
}

export const saveConstructor = (cons : Constructor) => {
    let db = getNotesDb();
    let index = getConstructorIndex(cons)
    db.constructors[index] = cons
    saveConstructors(db.constructors)
}

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

const createPeirceConstructor = (annotationText: string, type: string, name: string, editor : vscode.TextEditor) => {
    
    const nextId = getNextId();

    let fileName = '';
    fileName = editor.document.uri.fsPath;
    const cons: Constructor = {
        name : name,
        //fileName: fileName,
        //text: annotationText,
        status: 'pending',
        id: nextId,
        interpretation: null,
        //error: "Not checked",
        type: type,
    };
    return cons;
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
    let spaceOptions : vscode.QuickPickItem[] = [];
    let time_space : vscode.QuickPickItem = {
        label: "Time Coordinate Space",
    };
    let geom1d_space : vscode.QuickPickItem = {
        label: "Geom1D Coordinate Space",
    };
    spaceOptions.push(time_space);
    spaceOptions.push(geom1d_space);
    const spaceTypePick = await vscode.window.showQuickPick(spaceOptions);
    console.log("quick pick")
    console.log(spaceTypePick);
    if (spaceTypePick === undefined)
        return;
    else if(spaceTypePick.label == "Time Coordinate Space"){
        let annotationText = await vscode.window.showInputBox({ placeHolder: 'Name of Time Coordinate Space?', value: "new space"});
        if (annotationText === undefined) 
            return;
        let stdder : vscode.QuickPickItem[] = [];
        let std : vscode.QuickPickItem = {
            label: "Standard Time Coordinate Space",
        };
        let der : vscode.QuickPickItem = {
            label: "Derived Time Coordinate Space",
        };
        stdder.push(std);
        stdder.push(der);
        const stdderPick = await vscode.window.showQuickPick(stdder);
        console.log(stdderPick);
        if(stdderPick === undefined){
            console.log('not here!');
            return;
        }
        else if(stdderPick.label == "Standard Time Coordinate Space"){
            console.log('here!');
            const new_space : TimeCoordinateSpace = {
                label: annotationText,
                space: "Classical Time Coordinate Space", 
                parent: null, 
                origin: null, 
                basis: null 
            }
            console.log('saving!!')
            let db = getNotesDb();
            console.log('please!!!')
            db.time_coordinate_spaces.push(new_space);
            console.log('saved??')
            saveDb(db);
            console.log('saved!!!!')
        }
        else if(stdderPick.label == "Derived Time Coordinate Space"){
            const spaces = getTimeSpaces();
            const parent = await vscode.window.showQuickPick(spaces, {
                placeHolder: 'Select a Parent Space'
            });
            console.log("quick pick")
            console.log(parent);
            if (parent === undefined)
                return;

            const vec_magnitude = await vscode.window.showInputBox({ placeHolder: 'Coordinate of Basis?' });
            if (vec_magnitude === undefined || vec_magnitude == "" || Number(vec_magnitude) == NaN)
                return;
            const point_magnitude = await vscode.window.showInputBox({ placeHolder: 'Coordinate of Origin?'});
            if (point_magnitude === undefined || point_magnitude == "" || Number(point_magnitude) == NaN)
                return;
            const new_space : TimeCoordinateSpace = {
                label: annotationText, 
                space: "Classical Time Coordinate Space", 
                parent: parent, 
                origin: +point_magnitude, 
                basis: +vec_magnitude
            }
            let db = getNotesDb();
            db.time_coordinate_spaces.push(new_space);
            saveDb(db);
        }
        else 
            console.log(stdderPick.label)
    }
    else if(spaceTypePick.label == "Geom1D Coordinate Space"){
        let annotationText = await vscode.window.showInputBox({ placeHolder: 'Name of Geom1D Coordinate Space?', value: "new space"});
        if (annotationText === undefined) 
            return;
        let stdder : vscode.QuickPickItem[] = [];
        let std : vscode.QuickPickItem = {
            label: "Standard Geom1D Coordinate Space",
        };
        let der : vscode.QuickPickItem = {
            label: "Derived Geom1D Coordinate Space",
        };
        stdder.push(std);
        stdder.push(der);
        const stdderPick = await vscode.window.showQuickPick(stdder);
        if(stdderPick === undefined)
            return;
        else if(stdderPick.label == "Standard Geom1D Coordinate Space"){
            const new_space : Geom1DCoordinateSpace = {
                label: annotationText,
                space: "Classical Geom1D Coordinate Space", 
                parent: null, 
                origin: null, 
                basis: null 
            }
            let db = getNotesDb();
            db.geom1d_coordinate_spaces.push(new_space);
            saveDb(db);
            
        }
        else if(stdderPick.label == "Derived Geom1D Coordinate Space"){
            const spaces = getGeom1DSpaces();
            const parent = await vscode.window.showQuickPick(spaces, {
                placeHolder: 'Select a Parent Space'
            });
            console.log("quick pick")
            console.log(parent);
            if (parent === undefined)
                return;

            const vec_magnitude = await vscode.window.showInputBox({ placeHolder: 'Coordinate of Basis?' });
            if (vec_magnitude === undefined || vec_magnitude == "" || Number(vec_magnitude) == NaN)
                return;
            const point_magnitude = await vscode.window.showInputBox({ placeHolder: 'Coordinate of Origin?'});
            if (point_magnitude === undefined || point_magnitude == "" || Number(point_magnitude) == NaN)
                return;
            const new_space : Geom1DCoordinateSpace = {
                label: annotationText, 
                space: "Classical Geom1D Coordinate Space", 
                parent: parent, 
                origin: +point_magnitude, 
                basis: +vec_magnitude
            }
            let db = getNotesDb();
            db.geom1d_coordinate_spaces.push(new_space);
            saveDb(db);
        }
    }
};

const addConstructorToDb = (cons : Constructor) => {
    let db = getNotesDb();
    db.constructors = db.constructors || [];
    db.constructors.push(cons);
    db.nextId++;
    saveDb(db)
    vscode.window.showInformationMessage('Annotation saved!');
}

export const addPeirceNote = async (annotationText : string, type : string, editor : vscode.TextEditor, range : vscode.Range) => {
    if (editor) {
        addNoteToDb(createPeirceNote(annotationText, type, editor, range))
    }
    setDecorations();
};

export const addPeirceConstructor = async (annotationText : string, type : string, name: string, editor : vscode.TextEditor) => {
    if(editor) {
        console.log('adding peirce constructor..')
        console.log(annotationText)
        console.log(type)
        console.log(name)
        addConstructorToDb(createPeirceConstructor(annotationText, type, name, editor));
    }
    setDecorations();
};
export const addPlainNote = async () => {
    const annotationText = await vscode.window.showInputBox({ placeHolder: 'Give the annotation some text...' });
    if (annotationText) {
        addNoteToDb(createPlainNote(annotationText));
    }
};