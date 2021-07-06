import fetch from 'node-fetch';
import * as vscode from 'vscode';

import peircedb = require('./peircedb')


import { setDecorations } from
 './decoration/decoration'

interface APIPosition {
    line: number;
    character: number;
}
// attempting to manage global state lol
let activePeirceFile : string | undefined = '';

export const getActivePeirceFile = () : string | undefined => {
    return activePeirceFile;
}

export const setActivePeircefile = ( newFile : string | undefined) : void => {
    activePeirceFile = newFile;
}
interface APICoordinates {
    begin: APIPosition;
    end: APIPosition;
}
export interface PopulateAPIData{
    coords : APICoordinates;
    interp: string;
    node_type: string;
    error: string;
}

export interface PopulateAPIConstructorData{
    interp: string;
    type: string;
    name: string;
}
export interface PopulateAPIReponse {
    data:PopulateAPIData[];
    cdata:PopulateAPIConstructorData[];
}

export const populate = async (): Promise<void> => {
    if (vscode.window.activeTextEditor) {
        console.log("The open text file:")
        console.log(vscode.window.activeTextEditor.document)
        //console.log(vscode.window.activeTextEditor.document.getText())
    }
    let editor = vscode.window.activeTextEditor;
    if (editor === undefined)
        return;
    const fileText = vscode.window.activeTextEditor?.document.getText();
    const fileName = vscode.window.activeTextEditor?.document.fileName;
    for(let i = 0;i<10;i++)
        console.log('PRINT FILE NAME')
        console.log(fileName);
    let terms = peircedb.getTerms();
    //console.log(terms);
    //console.log(JSON.stringify(terms));
    //console.log(fileText);
    //console.log(JSON.stringify(fileText));
    let request = {
        fileName: fileName,
        file: fileText,
        terms: terms,
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
    const apiUrl = "http://0.0.0.0:8080/api/getState";
    const response = await fetch(apiUrl, login);
    const respdata : PopulateAPIReponse = await response.json();
    let data = respdata.data;
    let cdata = respdata.cdata;
    console.log('ptingint data')
    console.log(data);
    console.log('printing cdata')
    console.log(cdata)
    let termsSummary = JSON.stringify(data); 
    peircedb.deleteFilesTerms(fileName);
    // to fix this, we need to have a well-defined JSON response object
    // and change data : any -> data : well-defined-object[]
    
    data.forEach(element => {
        let range = new vscode.Range(
            new vscode.Position(element.coords.begin.line, element.coords.begin.character), 
            new vscode.Position(element.coords.end.line, element.coords.end.character), 
        );
        // Might be able to clean this up
        // Set the vscode.editor.selection position,
        if (editor)
            peircedb.addPeirceTerm(element.interp, element.node_type, element.error, editor, range);
    });

    cdata.forEach(element => {
        if (editor)
            peircedb.addPeirceConstructor(element.interp, element.type, element.name, editor);
    });

    setDecorations();
    return;
};