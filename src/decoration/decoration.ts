import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getNotes } from '../note-db';

const decorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: new vscode.ThemeColor('codeAnnotaion.mainColor')
});

export const setDecorations = (): void => {
    const openEditor = vscode.window.visibleTextEditors[0];

    const ranges: vscode.Range[] = [];
    getNotes().forEach( note => {
        if (note.fileName === openEditor.document.fileName){
            const positionStart = new vscode.Position(note.positionStart.line, note.positionStart.character);
            const positionEnd = new vscode.Position(note.positionEnd.line, note.positionEnd.character);
            ranges.push(new vscode.Range(positionStart, positionEnd));
        }
    }); 
    vscode.window.visibleTextEditors[0]?.setDecorations(decorationType, ranges);
};

export function updateDecorations (context: vscode.ExtensionContext) {
    setDecorations();

    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            setDecorations();
        }
    }, null, context.subscriptions);

}