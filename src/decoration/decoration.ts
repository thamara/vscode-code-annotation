import * as vscode from 'vscode';
import { getConfiguration } from '../configuration';
import { getTerms } from '../peircedb';

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
    //print
    
    return vscode.window.createTextEditorDecorationType({
        // decoration options for dark mode
        // ---- NOTE: THE TEXT UNDERLINES FOR ANNOTATED NOTES WILL BE MADE BETTER IN FUTURE VERSIONS. FOR NOW, THEY WILL EXIST AS PROOF OF CONCEPT ----
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
    console.log("SET DECORATIONS EVENT FIRING OFF")
    if (!getConfiguration().enableDecoration)
    { return; }
    // iterate through open text editors and go through all Notes in each editor
    const openEditors = vscode.window.visibleTextEditors;
    openEditors.forEach( editor => {
        const ranges: vscode.Range[] = [];
        const has_error: boolean[] = [];
        getTerms().forEach( term => {
            const temprange : vscode.Range[] = [];
            const temp_error : boolean[] = [];
            let temp_error_ : boolean = false;
            if (term.fileName === editor.document.fileName) {
                const positionStart = new vscode.Position(term.positionStart.line, term.positionStart.character);
                const positionEnd = new vscode.Position(term.positionEnd.line, term.positionEnd.character);
                ranges.push(new vscode.Range(positionStart, positionEnd));
                if(term.error == "Not checked" || term.error == "No Error Detected"){
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
                if (term.interpretation) {
                    temp_annotated = true;
                }else{
                    temp_annotated = false;
                }
                console.log(term.error)
                console.log(temp_error_)
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
