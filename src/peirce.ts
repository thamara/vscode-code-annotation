import fetch from 'node-fetch';
import * as vscode from 'vscode';

import { addPeirceNote, getNotes, Note } from './note-db';

import { setDecorations } from './decoration/decoration'

export const runPeirce = async (): Promise<void> => {
    if (vscode.window.activeTextEditor) {
        console.log("The open text file:")
        console.log(vscode.window.activeTextEditor.document)
        console.log(vscode.window.activeTextEditor.document.getText())
    }
    let editor = vscode.window.activeTextEditor;
    if (editor === undefined)
        return;
    const fileText = vscode.window.activeTextEditor?.document.getText();
    let notes = getNotes();
    console.log(notes);
    console.log(JSON.stringify(notes));
    console.log(fileText);
    console.log(JSON.stringify(fileText));
    let request = {
        file: fileText,
        notes: notes,
    }
    console.log(JSON.stringify(request));
    let login = {
        method: "POST",
        body: JSON.stringify(request),
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        credentials: "include",
    };
    const apiUrl = "http://0.0.0.0:8080/api/peirce";
    const response = await fetch(apiUrl, login);
    const data = await response.json();
    console.log(data);
    let notesSummary = JSON.stringify(data); 
    vscode.commands.executeCommand('code-annotation.clearAllNotesHeadless');
    data.forEach(element => {
        let range = new vscode.Range(
            new vscode.Position(element.coords.begin.line, element.coords.begin.character), 
            new vscode.Position(element.coords.end.line, element.coords.end.character), 
        );
        // Might be able to clean this up
        // Set the vscode.editor.selection position,
        // and let the prebuilt addNote functions do the rest.
        if (editor)
            addPeirceNote(element.interp, editor, range);
    });
    setDecorations();
    return;
};