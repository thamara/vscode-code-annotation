import * as vscode from 'vscode';
import * as fs from 'fs';

import { addNote, addPlainNote, addCustomTODO, showCustomTODO, removeCustomTODO } from './note-db';
import { generateMarkdownReport } from './reporting';
import { NotesTree, TreeActions } from './notes-tree';
import { initializeStorageLocation, getAnnotationFilePath } from './configuration';

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "code-annotation" is now active!');

    initializeStorageLocation(context.globalStoragePath);

    const tree = new NotesTree();
    const treeActions = new TreeActions(tree);

    vscode.window.registerTreeDataProvider('codeAnnotationView', tree);
    vscode.commands.registerCommand('code-annotation.removeNote', treeActions.removeNote.bind(treeActions));
    vscode.commands.registerCommand('code-annotation.checkNote', treeActions.checkNote.bind(treeActions));
    vscode.commands.registerCommand('code-annotation.uncheckNote', treeActions.uncheckNote.bind(treeActions));
    vscode.commands.registerCommand('code-annotation.openNote', treeActions.openNote.bind(treeActions));
    vscode.commands.registerCommand('code-annotation.editNote', treeActions.editNote.bind(treeActions));
    vscode.commands.registerCommand('code-annotation.copyNote', treeActions.copyNote.bind(treeActions));
    vscode.commands.registerCommand('code-annotation.openNoteFromId', (id: string) => {
        treeActions.openNoteFromId(id);
    });

    vscode.commands.registerCommand('code-annotation.addCustomTODO', async () => {
        addCustomTODO();
    });

    vscode.commands.registerCommand('code-annotation.showCustomTODO', async () => {
        showCustomTODO();
    });

    vscode.commands.registerCommand('code-annotation.removeCustomTODO', async () => {
        removeCustomTODO();
    });

    vscode.commands.registerCommand('code-annotation.summary', async () => {
        generateMarkdownReport();
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

    vscode.commands.registerCommand('code-annotation.addPlainNote', async () => {
        addPlainNote();
    });

    let disposable = vscode.commands.registerCommand('code-annotation.addNote', async () => {
        addNote();
    });

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }
