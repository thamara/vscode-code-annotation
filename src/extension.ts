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

// activates our extension
export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "code-annotation" is now active!');
    initializeStorageLocation(context.globalStoragePath);

    const tree = new peircetree.PeirceTree();
    const infoView = new peircetree.InfoView();
    const treeActions = new peircetree.TreeActions(tree, infoView);
    // testing this lol
    let activePeirceFile : string | undefined = '';

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
    // register summary command (this needs to be implemented, no? -- Jacob 6-23-21)
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
    // registers the populate command
    vscode.commands.registerCommand('code-annotation.populate', async () => {
        // delete below line if break-y
        peirce.setActivePeircefile(vscode.window.activeTextEditor?.document.fileName);
        vscode.window.showInformationMessage("Populating...")
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

    // preliminary version of hovers implemented below

    disposable = vscode.languages.registerHoverProvider('cpp', {
        // hover provider for cpp files
        provideHover(document, position, token) {
            /*
            THIS IS VERY IMPORTANT NOTE!!!

            Right now, this is an imperfect way to do this. We have a couple of options for fixing:
            1. Fix the issue of note snippets overlapping (this is probably very hard, but if you're already working on it,
            more power to you)
            2. Completely rework this, this may end up being the only way to do this if fixing overlapping notes is difficult.
            */
            const notesList = peircedb.getTerms();

            // check to see if the hovered word is within the range of each note
            for (let i = 0; i < notesList.length; i++){
                let note = notesList[i];
                // only consider this note if it exists on the same line as the hover
                // if it does, set word to the interp of the note and break from loop
                let hoverPos = position.character;
                // if you are hovering on the same line as the note we are looking at
                if (note.positionStart.line === position.line){
                    // check to see if this is the right note, and if it is, return a hover with the note's intepretation's label
                    let start = note.positionStart.character;
                    let end = note.positionEnd.character;
                    if (start <= hoverPos && end >= hoverPos && note.interpretation?.label){
                        let word = note.interpretation?.label;
                        let error = note.error ? note.error : "";
                        // TODO: Make this markdown string better, more human readable
                        return {
                            contents: [`**Interpretation**: ${word}`,`**Error**: ${error}`]
                        };
                    }
                }
            }
            // if the above yielded nothing, return a null hover, as we don't want anything to appear
            return null;
        }
    })

    context.subscriptions.push(disposable);

    vscode.workspace.onDidChangeConfiguration(() => updateDecorations(context) );

    updateDecorations(context);

    context.subscriptions.push(disposable);

    vscode.window.onDidChangeActiveTextEditor( () => {
        // vscode.commands.executeCommand('code-annotation.refreshEntry');
        // use regex to determine if the activeTextEditor is a valid Peirce File (.cpp)
        let re = new RegExp('...*.cpp');
        let fileName = vscode.window.activeTextEditor?.document.fileName;
        if (fileName != undefined){
            console.log(fileName.match(re));
            if (fileName.match(re)){
                // make an info window here and prompt user to populate if they want to change file
                vscode.window.showInformationMessage(
                    `You've changed windows! If you want to annotate this file, please populate it! The current file is ${peirce.getActivePeirceFile()}`,
                    'Dismiss'
                );
            }
        }
    })

}

// this method is called when your extension is deactivated
export function deactivate() { }
