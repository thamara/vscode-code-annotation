import * as vscode from 'vscode';
import * as fs from 'fs';

//import { addTerm, addPlainTerm,  getTermFromId } from './peircedb';
import peircedb = require('./peircedb')
import { generateMarkdownReport } from './unused/reporting';
import peirce = require("./peirce_api_calls") //from './peirce';
//import { InfoView, TermsTree, TreeActions, TermItem } from './terms-tree';
import peircetree = require("./peirce-tree")

import { initializeStorageLocation, getAnnotationFilePath } from './configuration';
import { updateDecorations } from './decoration/decoration';

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "code-annotation" is now active!');

    initializeStorageLocation(context.globalStoragePath);

    const tree = new peircetree.PeirceTree();
    const infoView = new peircetree.InfoView();
    const treeActions = new peircetree.TreeActions(tree, infoView);

    vscode.window.registerTreeDataProvider('codeAnnotationView', tree);
    vscode.commands.registerCommand('code-annotation.removeTerm', treeActions.removeTerm.bind(treeActions));
    vscode.commands.registerCommand('code-annotation.checkAllTerms', treeActions.checkAllTerms.bind(treeActions));
    vscode.commands.registerCommand('code-annotation.uncheckAllTerms', treeActions.uncheckAllTerms.bind(treeActions));
    vscode.commands.registerCommand('code-annotation.removeAllTerms', treeActions.removeAllTerms.bind(treeActions));
    vscode.commands.registerCommand('code-annotation.checkTerm', treeActions.checkTerm.bind(treeActions));
    vscode.commands.registerCommand('code-annotation.uncheckTerm', treeActions.uncheckTerm.bind(treeActions));
    vscode.commands.registerCommand('code-annotation.openTerm', treeActions.openTerm.bind(treeActions));
    vscode.commands.registerCommand('code-annotation.copyTerm', treeActions.copyTerm.bind(treeActions));
    vscode.commands.registerCommand('code-annotation.openTermFromId', (id: string) => {
        treeActions.openTermFromId(id);
    });

    vscode.commands.registerCommand('code-annotation.summary', () => {
        generateMarkdownReport();
    });
    /*
    vscode.commands.registerCommand('code-annotation.editTerm', () => {
        console.log("edit term!");
       // let term = getTermFromId();
    });*/
    vscode.commands.registerCommand('code-annotation.editTerm', treeActions.editTerm.bind(treeActions));
    vscode.commands.registerCommand('code-annotation.editHoveredTerms', async () => {
        console.log("EDIT HOVERED NOTES??");
        infoView.editHoveredTerms();
    });

    vscode.commands.registerCommand('code-annotation.populate', async () => {
        vscode.window.showInformationMessage("Populating...");
        peirce.populate();
    });

    vscode.commands.registerCommand('code-annotation.clearAllTerms', async () => {
        const message = 'Are you sure you want to clear all terms? This cannot be reverted.';
        const enableAction = 'I\'m sure';
        const cancelAction = 'Cancel';
        const userResponse = await vscode.window.showInformationMessage(message, enableAction, cancelAction);
        const clearAllTerms = userResponse === enableAction ? true : false;

        if (clearAllTerms) {
            const annotationFile = getAnnotationFilePath();
            fs.unlinkSync(annotationFile);
            vscode.commands.executeCommand('code-annotation.refreshEntry');
            vscode.window.showInformationMessage('All terms cleared!');
        }
    });

    vscode.commands.registerCommand('code-annotation.clearAllTermsHeadless', async () => {
        vscode.commands.executeCommand('code-annotation.refreshEntry');
    });

    vscode.commands.registerCommand('code-annotation.openPreview', async () => {
        infoView.openPreview();
    });

    vscode.commands.registerCommand('code-annotation.addPlainTerm', async () => {
        //addPlainTerm();
    });

    let disposable = vscode.commands.registerCommand('code-annotation.addTerm', async () => {
        //addTerm();
    });

    vscode.commands.registerCommand('code-annotation.addSpace', treeActions.addSpace.bind(treeActions));//async () => {
    //    addSpace();
    //});

    vscode.workspace.onDidChangeConfiguration(() => updateDecorations(context) );

    updateDecorations(context);

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }
