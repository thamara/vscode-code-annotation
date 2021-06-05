import * as vscode from 'vscode';
import { getConfiguration } from '../configuration';
import { getNotes } from '../note-db';

const decorationType = () : vscode.TextEditorDecorationType => {
    return vscode.window.createTextEditorDecorationType({
        dark: {
            backgroundColor: getConfiguration().decorationColors?.dark
        },
        light: {
            backgroundColor: getConfiguration().decorationColors?.light
        }
    });
};
const decorationOption = (has_error : boolean) : vscode.TextEditorDecorationType => {
    return vscode.window.createTextEditorDecorationType({
        dark: {
            backgroundColor: 
                has_error ? getConfiguration().decorationColors?.error :
                getConfiguration().decorationColors?.dark
        },
        light: {
            backgroundColor: 
            has_error ? getConfiguration().decorationColors?.light :
            getConfiguration().decorationColors?.dark
        }
    });
};

export const setDecorations = (): void => {
    if (!getConfiguration().enableDecoration)
    { return; }

    const openEditors = vscode.window.visibleTextEditors;

    openEditors.forEach( editor => {
        const ranges: vscode.Range[] = [];
        const has_error: boolean[] = [];
        getNotes().forEach( note => {
            const temprange : vscode.Range[] = [];
            const temp_error : boolean[] = [];
            let temp_error_ : boolean = false;
            if (note.fileName === editor.document.fileName) {
                const positionStart = new vscode.Position(note.positionStart.line, note.positionStart.character);
                const positionEnd = new vscode.Position(note.positionEnd.line, note.positionEnd.character);
                ranges.push(new vscode.Range(positionStart, positionEnd));
                if(note.error == "Not checked" || note.error == "No Error Detected"){
                    has_error.push(false);
                    temp_error.push(false);
                    temp_error_ = false;
                }
                else {
                    has_error.push(true);
                    temp_error.push(true);
                    temp_error_ = true;
                }
                console.log(note.error)
                console.log(temp_error_)
                temprange.push(new vscode.Range(positionStart, positionEnd));
                editor.setDecorations(decorationOption(temp_error_), temprange);
            }
        });
        //editor.setDecorations(decorationType(), ranges);
    });
};

export function updateDecorations (context: vscode.ExtensionContext) {
    setDecorations();

    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            setDecorations();
        }
    }, null, context.subscriptions);

}
