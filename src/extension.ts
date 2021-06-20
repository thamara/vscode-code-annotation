import * as vscode from 'vscode';
import * as fs from 'fs';

import { addNote, addPlainNote,  getNoteFromId, getNotes } from './note-db';
import { generateMarkdownReport } from './reporting';
import { populate } from './peirce';
import { InfoView, NotesTree, TreeActions, NoteItem } from './notes-tree';
import { initializeStorageLocation, getAnnotationFilePath } from './configuration';
import { updateDecorations } from './decoration/decoration';

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "code-annotation" is now active!');
    initializeStorageLocation(context.globalStoragePath);

    const tree = new NotesTree();
    const infoView = new InfoView();
    const treeActions = new TreeActions(tree, infoView);

    vscode.window.registerTreeDataProvider('codeAnnotationView', tree);
    vscode.commands.registerCommand('code-annotation.removeNote', treeActions.removeNote.bind(treeActions));
    vscode.commands.registerCommand('code-annotation.checkAllNotes', treeActions.checkAllNotes.bind(treeActions));
    vscode.commands.registerCommand('code-annotation.uncheckAllNotes', treeActions.uncheckAllNotes.bind(treeActions));
    vscode.commands.registerCommand('code-annotation.removeAllNotes', treeActions.removeAllNotes.bind(treeActions));
    vscode.commands.registerCommand('code-annotation.checkNote', treeActions.checkNote.bind(treeActions));
    vscode.commands.registerCommand('code-annotation.uncheckNote', treeActions.uncheckNote.bind(treeActions));
    vscode.commands.registerCommand('code-annotation.openNote', treeActions.openNote.bind(treeActions));
    vscode.commands.registerCommand('code-annotation.copyNote', treeActions.copyNote.bind(treeActions));
    vscode.commands.registerCommand('code-annotation.openNoteFromId', (id: string) => {
        treeActions.openNoteFromId(id);
    });

    vscode.commands.registerCommand('code-annotation.summary', () => {
        generateMarkdownReport();
    });
    /*
    vscode.commands.registerCommand('code-annotation.editNote', () => {
        console.log("edit note!");
       // let note = getNoteFromId();
    });*/
    vscode.commands.registerCommand('code-annotation.editNote', treeActions.editNote.bind(treeActions));
    vscode.commands.registerCommand('code-annotation.editHoveredNotes', async () => {
        console.log("EDIT HOVERED NOTES??");
        infoView.editHoveredNotes();
    });

    vscode.commands.registerCommand('code-annotation.populate', async () => {
        vscode.window.showInformationMessage("Populating...");
        populate();
    });

    vscode.commands.registerCommand('code-annotation.clearAllNotes', async () => {
        const message = 'Are you sure you want to clear all notes? This cannot be reverted.';
        const enableAction = 'I\'m sure';
        const cancelAction = 'Cancel';
        const userResponse = await vscode.window.showInformationMessage(message, enableAction, cancelAction);
        const clearAllNotes = userResponse === enableAction ? true : false;

        if (clearAllNotes) {
            const annotationFile = getAnnotationFilePath();
            fs.unlinkSync(annotationFile);
            vscode.commands.executeCommand('code-annotation.refreshEntry');
            vscode.window.showInformationMessage('All notes cleared!');
        }
    });

    vscode.commands.registerCommand('code-annotation.clearAllNotesHeadless', async () => {
        vscode.commands.executeCommand('code-annotation.refreshEntry');
    });

    vscode.commands.registerCommand('code-annotation.openPreview', async () => {
        infoView.openPreview();
    });

    vscode.commands.registerCommand('code-annotation.addPlainNote', async () => {
        addPlainNote();
    });

    let disposable = vscode.commands.registerCommand('code-annotation.addNote', async () => {
        addNote();
    });

    vscode.commands.registerCommand('code-annotation.addSpace', treeActions.addSpace.bind(treeActions));//async () => {
    //    addSpace();
    //});
    // potentially makes hovers work idk
    // right now, will only work with cpp files, in future, can we extend to general peirce-acceptable file types?

    console.log("Registering hover provider");
    disposable = vscode.languages.registerHoverProvider('cpp', {
        // hover provider for cpp files
        provideHover(document, position, token) {
            /*
            THIS IS VERY IMPORTANT NOTE!!!

            Right now, this is an imperfect way to do this. We have a couple of options for fixing:
            1. Fix the issue of note snippets overlapping (this is probably very hard, but if you're already working on it,
            more power to you)
            2. Completely rework this, this may end up being the only way to do this if fixing overlapping notes is diff.
            */

            const notesList = getNotes();

            // check to see if the hovered word is within the range of each note
            for (let i = 0; i < notesList.length; i++){
                let note = notesList[i];
                // only consider this note if it exists on the same line as the hover
                // if it does, set word to the interp of the note and break from loop
                let hoverPos = position.character;
                console.log(`Hovering over ${i}`);
                // if you are hovering on the same line as the note we are looking at
                if (note.positionStart.line === position.line){
                    console.log(`Right line @ ${position.line}`);
                    // check to see if this is the right note, and if it is, return a hover with the note's intepretation's label
                    let start = note.positionStart.character;
                    let end = note.positionEnd.character;
                    if (start <= hoverPos && end >= hoverPos && note.interpretation?.label){
                        let word = note.interpretation?.label;
                        console.log("WE FOUND AN INTERP");
                        console.log(note);
                        // TODO: Make this markdown string better, more human readable
                        return {
                            contents: [`\`Interpretation\`: ${word}`]
                        };
                    }
                }
            }
            // if the above yielded nothing, return a null hover, as we don't want anything to appear
            return null;
        }
    })

    context.subscriptions.push(disposable);
    console.log("The disposbales have been pushed");
    console.log("Hover regsitered :)");
    vscode.workspace.onDidChangeConfiguration(() => updateDecorations(context) );

    updateDecorations(context);

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }
