import * as vscode from 'vscode';
import { getConfiguration } from '../configuration';
import { getNotes } from '../note-db';

// Should we get rid of this? Only referenced in the commented code on line 82 (my thoughts say yes, but would like another opinion)
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
/**
 * This function will be used to assign the proper decoration to a particular note
 * 
 * @param has_error whether or not a note (not passed) has an error
 * @returns The DecorationType to apply to a specific annotation
 */
const decorationOption = (has_error : boolean, has_annotation : boolean) : vscode.TextEditorDecorationType => {
    return vscode.window.createTextEditorDecorationType({
        // decoration options for dark mode
        dark: {
            backgroundColor: 
                has_error ? getConfiguration().decorationColors?.error :
                getConfiguration().decorationColors?.dark,
            textDecoration: has_annotation ? '#EE59FF wavy underline' : ''
        },
        // decoration options for light mode
        light: {
            backgroundColor: 
                has_error ? getConfiguration().decorationColors?.light :
                getConfiguration().decorationColors?.dark,
            textDecoration: has_annotation ? '#EE59FF wavy underline' : ''
        }
    });
};

/**
 * Sets the decorations for all active vscode text editors
 */
export const setDecorations = (): void => {
    // if decoration is not enabled, do nothing
    if (!getConfiguration().enableDecoration)
    { return; }
    // iterate through open text editors and go through all Notes in each editor
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
                // check if note has error and update temp_error_
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
                // check to see if note is annotated, setting temp_annotated as necessary
                let temp_annotated : boolean;
                if (note.interpretation) {
                    temp_annotated = true;
                }else{
                    temp_annotated = false;
                }
                console.log(note.error);
                console.log(temp_error_);
                temprange.push(new vscode.Range(positionStart, positionEnd));
                // set the decorations using the decorationOption decoration type over the range indicated by this note
                editor.setDecorations(decorationOption(temp_error_, temp_annotated), temprange);
            }
        });
        //editor.setDecorations(decorationType(), ranges);
    });
};
/**
 * Updates the decorations of the active vscode window
 * @param context Extension context
 */
export function updateDecorations (context: vscode.ExtensionContext) {
    setDecorations();
    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            setDecorations();
        }
    }, null, context.subscriptions);

}
