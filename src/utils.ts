import * as vscode from 'vscode';
import * as path from "path";
import * as fs from "fs";

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
}

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

export const getNotesDb = (): NotesDb => {
    const annotationFile = getAnnotationsFile();
    const rawdata = fs.readFileSync(annotationFile, "utf8");
    let annotations = JSON.parse(rawdata);
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
    fs.writeFileSync(getAnnotationsFile(), data);
    vscode.commands.executeCommand('code-annotation.refreshEntry');
};

export const saveNotes = (notes: Note[]) => {
    let db = getNotesDb();

    // Replace notes by the one passed
    db.notes = notes;

    // Save Db in JSON file
    saveDb(db);
};

export const addNote = (note: Note) => {
    let db = getNotesDb();

    db.notes.push(note);
    db.nextId++;

    saveDb(db);
};