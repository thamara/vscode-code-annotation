import * as vscode from 'vscode';
import * as path from 'path';
import fetch from 'node-fetch';
import { 
    getNotesDb, getNotes, saveNotes, getTimeSpaces, getGeom1DSpaces, 
    Note, Interpretation, Space, 
    Duration, Time, Scalar, TimeTransform, Position1D, Displacement1D, Geom1DTransform,
    TimeCoordinateSpace, Geom1DCoordinateSpace, getConstructors, Constructor,
    getConstructorFromId, getNoteFromId, saveConstructor, saveNote, SuccessResponse,
    saveDb
} from './note-db';
import {
    PopulateAPIReponse
} from './peirce'
import { getConfiguration } from './configuration';
import { getRelativePathForFileName } from './utils';
import { setDecorations } from './decoration/decoration';
import { Position, TextEditor, WebviewPanel } from 'vscode';
import { privateEncrypt } from 'crypto';

const getIconPathFromType = (type: string, theme: string): string => {
    return path.join(__filename, '..', '..', 'resources', theme, type.toLowerCase() + '.svg');
};

const getIconPath = (status: string): any => {
    const noteType = (status === 'pending') ? 'todo' : 'check';
    return {
        light: getIconPathFromType(noteType, 'light'),
        dark: getIconPathFromType(noteType, 'dark')
    };
};

const getContextValue = (status: string): string => {
    return (status === 'pending') ? '$PendingNote' : '$CompleteNote';
};

const createNoteItem = (note: Note): NoteItem => {

    let details : NoteItem[] = [];
    if (note.interpretation != null)
        details = [new NoteItem(`Current interpretation: ${note.interpretation.label}`)]; 
    else
        details = [new NoteItem(`Current interpretation: No interpretation provided`)];
    details.push(new NoteItem(`Checked interpretation: ${note.text}`));
    details.push(new NoteItem(`Type: ${note.type}`));
    details.push(new NoteItem(`Error Message: ${note.error}`));
    let noteItem = new NoteItem(`${note.codeSnippet}`, details, note.id.toString());
    console.log('NOTE ITEM ID : ' + note.id.toString())
    if (noteItem.id) {
        noteItem.command = new OpenNoteCommand(noteItem.id);
    }
    if (details) {
        // If details isn't undefined, set the command to the same as the parent
        details[0].command = noteItem.command;
    }
    noteItem.tooltip = note.text;
    noteItem.contextValue = getContextValue(note.status);
    noteItem.iconPath = getIconPath(note.status);

    return noteItem;
};

const createConsNoteItem = (cons: Constructor): NoteItem => {
    console.log(cons.interpretation)
    let details : NoteItem[] = [];
    if (cons.interpretation != null)
        details = [new NoteItem(`Current interpretation: ${cons.interpretation.label}`)]; 
    else
        details = [new NoteItem(`Current interpretation: No interpretation provided`)];
    details.push(new NoteItem(`Type: ${cons.type}`));
    details.push(new NoteItem(`Name: ${cons.name}`));
    let noteItem = new NoteItem(`${cons.name}`, details, cons.id.toString());
    if (noteItem.id) {
        noteItem.command = new OpenNoteCommand(noteItem.id);
    }
    if (details) {
        // If details isn't undefined, set the command to the same as the parent
        details[0].command = noteItem.command;
    }
    noteItem.tooltip = cons.name;
    noteItem.contextValue = getContextValue(cons.status);
    noteItem.iconPath = getIconPath(cons.status);

    return noteItem;
};

export class InfoView {
    private webviewPanel!: WebviewPanel;

    private getActiveCursorLocation(): Position | null {
        if (vscode.window.activeTextEditor)
            return vscode.window.activeTextEditor.selection.active;
        else
            return null;
    }

    getHoveredNotes() : Note[] {            
        let hovered_notes : Note[] = [];
        let notes = getNotes();
        notes.forEach(note => {
            if (this.isHoveredNote(note)) 
                hovered_notes.push(note);
        });
        return hovered_notes;
    }

    
    async createInterpretation(noteIsIdentifier : boolean) : Promise<Interpretation | null> {


        let interpretations : vscode.QuickPickItem[] = [
            { label: "Duration" },
            { label: "Time" },
            { label: "Scalar"},
            { label: "Time Transform"},
            { label: "Displacement1D"},
            { label: "Position1D"},
            { label: "Geom1D Transform"}
        ];
        const interp = await vscode.window.showQuickPick(interpretations);
        if (interp === undefined) {
            return null
        }
        let name = "<identifier>";

        // If the following is true (the AST node is an identifier)
        // Peirce will not prompt for a name, so we won't ask for one.
        if (!noteIsIdentifier) {
            let pickedName = await vscode.window.showInputBox({ placeHolder: 'Name of interpretation?' });
            if (pickedName === undefined || pickedName == "")  {
                return null
            }
            name = pickedName;
        }

        if(interp.label == "Duration"){

            let spaces = getTimeSpaces();
            console.log(spaces);
            let i = 0;
            const space = await vscode.window.showQuickPick(spaces, {
                placeHolder: 'Select a coordinate space'
            });
            console.log("space quick pick")
            console.log(space);
            if (space === undefined) {
                return null
            }

            let value = await vscode.window.showInputBox({ placeHolder: 'Value?' });
            if (value === undefined || Number(value) == NaN)  {
                return null
            }

            let label = `${name} ${interp.label}(${space.label},${value})`
            if (noteIsIdentifier) {
                label = `${interp.label}(${space.label},${value})`
            }

            let interpretation : Duration = {
                label: label,
                name: name,
                form: interp.label,
                space: space,
                value: +value,
                type: "undefined"//note.type,
            }
            return interpretation
            
        }
        else if(interp.label == "Time"){

            let spaces = getTimeSpaces();
            console.log(spaces);
            let i = 0;
            const space = await vscode.window.showQuickPick(spaces, {
                placeHolder: 'Select a coordinate space'
            });
            console.log("space quick pick")
            console.log(space);
            if (space === undefined) {
                return null;
            }

            let value = await vscode.window.showInputBox({ placeHolder: 'Value?' });
            if (value === undefined || Number(value) == NaN)  {
                return null;
            }

            let label = `${name} ${interp.label}(${space.label},${value})`
            if (noteIsIdentifier) {
                label = `${interp.label}(${space.label},${value})`
            }

            let interpretation : Time = {
                label: label,
                name: name,
                form: interp.label,
                space: space,
                value: +value,
                type: "note.type",
            }
            return interpretation
        }
        else if(interp.label == "Scalar"){

            let value = await vscode.window.showInputBox({ placeHolder: 'Value?' });
            if (value === undefined || Number(value) == NaN)  {
                return null;
            }

            let label = `${name} ${interp.label}(${value})`
            if (noteIsIdentifier) {
                label = `${interp.label}(${value})`
            }

            let interpretation : Scalar = {
                label: label,
                name: name,
                form: interp.label,
                value: +value,
                type: "note.type",
            }
            return interpretation
        }
        else if(interp.label == "Time Transform"){

            let spaces = getTimeSpaces();
            console.log(spaces);
            let i = 0;
            const domain = await vscode.window.showQuickPick(spaces, {
                placeHolder: 'Select a time coordinate space'
            });
            console.log("space quick pick")
            console.log(domain);
            if (domain === undefined) {
                return null;
            }
            console.log(spaces);
            const codomain = await vscode.window.showQuickPick(spaces, {
                placeHolder: 'Select a time coordinate space'
            });
            console.log("space quick pick")
            console.log(codomain);
            if (codomain === undefined) {
                return null;
            }
            let label = `${name} ${interp.label}(${domain.label},${codomain.label})`
            if (noteIsIdentifier) {
                label = `${interp.label}(${domain.label},${codomain.label})`
            }


            let interpretation : TimeTransform = {
                label: label,
                name: name,
                form: interp.label,
                domain: domain,
                codomain: codomain,
                type: "note.type",
            }
            return interpretation
        }
        else if(interp.label == "Displacement1D"){

            let spaces = getGeom1DSpaces();
            console.log(spaces);
            let i = 0;
            const space = await vscode.window.showQuickPick(spaces, {
                placeHolder: 'Select a coordinate space'
            });
            console.log("space quick pick")
            console.log(space);
            if (space === undefined) {
                return null;
            }

            let value = await vscode.window.showInputBox({ placeHolder: 'Value?' });
            if (value === undefined || Number(value) == NaN)  {
                return null;
            }

            let label = `${name} ${interp.label}(${space.label},${value})`
            if (noteIsIdentifier) {
                label = `${interp.label}(${space.label},${value})`
            }

            let interpretation : Displacement1D = {
                label: label,
                name: name,
                form: interp.label,
                space: space,
                value: +value,
                type: "note.type",
            }
            return interpretation
        }
        else if(interp.label == "Position1D"){

            let spaces = getGeom1DSpaces();
            console.log(spaces);
            let i = 0;
            const space = await vscode.window.showQuickPick(spaces, {
                placeHolder: 'Select a coordinate space'
            });
            console.log("space quick pick")
            console.log(space);
            if (space === undefined) {
                return null;
            }

            let value = await vscode.window.showInputBox({ placeHolder: 'Value?' });
            if (value === undefined || Number(value) == NaN)  {
                return null;
            }

            let label = `${name} ${interp.label}(${space.label},${value})`
            if (noteIsIdentifier) {
                label = `${interp.label}(${space.label},${value})`
            }

            let interpretation : Position1D = {
                label: label,
                name: name,
                form: interp.label,
                space: space,
                value: +value,
                type: "note.type",
            }
            return interpretation
        }
        else if(interp.label == "Geom1D Transform"){
            
            let spaces = getGeom1DSpaces();
            console.log(spaces);
            let i = 0;
            const domain = await vscode.window.showQuickPick(spaces, {
                placeHolder: 'Select a time coordinate space'
            });
            console.log("space quick pick")
            console.log(domain);
            if (domain === undefined) {
                return null;
            }
            console.log(spaces);
            const codomain = await vscode.window.showQuickPick(spaces, {
                placeHolder: 'Select a time coordinate space'
            });
            console.log("space quick pick")
            console.log(codomain);
            if (codomain === undefined) {
                return null;
            }
            let label = `${name} ${interp.label}(${domain.label},${codomain.label})`
            if (noteIsIdentifier) {
                label = `${interp.label}(${domain.label},${codomain.label})`
            }


            let interpretation : Geom1DTransform = {
                label: label,
                name: name,
                form: interp.label,
                domain: domain,
                codomain: codomain,
                type: "note.type",
            }
            return interpretation
        }
        else return null;
        
    }

    async editSelectedNoteItem(noteItem:NoteItem)  {
        if(noteItem.id === undefined){
        }
        else {
            const note_ : Note | null = getNoteFromId(noteItem.id)
            console.log(note_)
            if(note_ === null){
                const cons_ : Constructor | null = getConstructorFromId(noteItem.id)

                console.log(cons_)
                if(cons_ === null){
                }
                else {
                    console.log("CREATING INTEPRRETATION")
                    let interpretation = await this.createInterpretation(true)
                    if(interpretation === null){}
                    else{
                        interpretation.type = cons_.type
                        cons_.interpretation = interpretation
                        console.log('attempting api cons save...')
                        let result : boolean = await this.addConstructorInterpretationRequest(cons_)
                        if(result){
                            saveConstructor(cons_)
                            console.log("success cons")
                        }
                        else{
                            console.log("fail cons")
                        }
                    }
                }
            }
            else{
                let noteIsIdentifier : boolean = note_.type.includes("IDENT");
                let interpretation = await this.createInterpretation(noteIsIdentifier)
                if(interpretation === null){}
                else{
                    interpretation.type = note_.type
                    note_.interpretation = interpretation
                    //saveNote(note_)
                    console.log('attempting api term save...')
                    let result : boolean = await this.addTermInterpretationRequest(note_)
                    if(result){
                        saveNote(note_)
                        console.log("success term")
                    }
                    else{
                        console.log("fail term")
                    }
                }
            }
        }

        await this.check()

    }
    
    async check() {
        let notes = getNotes()
        let constructors = getConstructors()

        let editor = vscode.window.activeTextEditor;
        if (editor === undefined)
            return;
        const fileText = vscode.window.activeTextEditor?.document.getText();

        //console.log(notes);
        //console.log(JSON.stringify(notes));
        //console.log(fileText);
        //console.log(JSON.stringify(fileText));
        let request = {
            file: fileText,
            fileName: vscode.window.activeTextEditor?.document.fileName,
            notes: notes,
            spaces: getNotesDb().time_coordinate_spaces.concat(getNotesDb().geom1d_coordinate_spaces),
            constructors: constructors
        }
       // console.log('SENDING REQUEST')
        //console.log(request)
        //console.log(JSON.stringify(request));
        let login = {
            method: "POST",
            body: JSON.stringify(request),
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            credentials: "include",
        };
        const apiUrl = "http://0.0.0.0:8080/api/check2";
        const response = await fetch(apiUrl, login);
        const data : Note[] = await response.json();
        //let data = resp.data
        for (let i = 0; i < data.length; i++) {
            notes[i] = data[i]
        }
        let i = 0;
        let all_notes = getNotes();
        for (let j = 0; j < all_notes.length; j++) {
            if (all_notes[j].fileName != notes[i].fileName){
                continue;
            }
            all_notes[j].text = notes[i].text;
            all_notes[j].error = notes[i].error;
            i++;
        }
        saveNotes(all_notes);
        setDecorations();
    }

    async addSpaceRequest(space_:Space) : Promise<boolean> {
        console.log('sending space')
        let request = {
            space:space_
        }
        console.log('SENDING CREATE SPACE REQUEST')
        console.log(request)
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
        const apiUrl = "http://0.0.0.0:8080/api/createSpace";
        const response = await fetch(apiUrl, login);
        console.log(response)
        const data : SuccessResponse = await response.json();
        return data.success
        
    }
    
    async addTermInterpretationRequest(note: Note) : Promise <boolean> {
        console.log('sending term')
        let request = {
            term:note
        }
        console.log('SENDING TERM INTERP REQUEST')
        console.log(request)
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
        const apiUrl = "http://0.0.0.0:8080/api/createTermInterpretation";
        const response = await fetch(apiUrl, login);
        console.log(response)
        const data : SuccessResponse = await response.json();
        return data.success

    };
    
    async addConstructorInterpretationRequest(cons: Constructor) : Promise <boolean> {
        console.log('sending cons')
        let request = {
            constructor:cons
        }
        console.log('SENDING CONS INTERP REQUEST')
        console.log(request)
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
        const apiUrl = "http://0.0.0.0:8080/api/createConstructorInterpretation";
        const response = await fetch(apiUrl, login);
        console.log(response)
        const data : SuccessResponse = await response.json();
        return data.success

    };
    
    async addSpace(){
        let space_ : Space | undefined = undefined
        let spaceOptions : vscode.QuickPickItem[] = [];
        let time_space : vscode.QuickPickItem = {
            label: "Time Coordinate Space",
        };
        let geom1d_space : vscode.QuickPickItem = {
            label: "Geom1D Coordinate Space",
        };
        spaceOptions.push(time_space);
        spaceOptions.push(geom1d_space);
        const spaceTypePick = await vscode.window.showQuickPick(spaceOptions);
        console.log("quick pick")
        console.log(spaceTypePick);
        if (spaceTypePick === undefined)
            return;
        else if(spaceTypePick.label == "Time Coordinate Space"){
            let annotationText = await vscode.window.showInputBox({ placeHolder: 'Name of Time Coordinate Space?', value: "new space"});
            if (annotationText === undefined) 
                return;
            let stdder : vscode.QuickPickItem[] = [];
            let std : vscode.QuickPickItem = {
                label: "Standard Time Coordinate Space",
            };
            let der : vscode.QuickPickItem = {
                label: "Derived Time Coordinate Space",
            };
            stdder.push(std);
            stdder.push(der);
            const stdderPick = await vscode.window.showQuickPick(stdder);
            console.log(stdderPick);
            if(stdderPick === undefined){
                return;
            }
            else if(stdderPick.label == "Standard Time Coordinate Space"){
                const new_space : TimeCoordinateSpace = {
                    label: annotationText,
                    space: "Classical Time Coordinate Space", 
                    parent: null, 
                    origin: null, 
                    basis: null 
                }
                let resp : boolean = await this.addSpaceRequest(new_space)
                if(!resp){
                    console.log("FAILED TO SAVE SPACE TO PEIRCE")
                    return
                }
                let db = getNotesDb();
                db.time_coordinate_spaces.push(new_space);
                saveDb(db);
                space_ = new_space
            }
            else if(stdderPick.label == "Derived Time Coordinate Space"){
                const spaces = getTimeSpaces();
                const parent = await vscode.window.showQuickPick(spaces, {
                    placeHolder: 'Select a Parent Space'
                });
                console.log("quick pick")
                console.log(parent);
                if (parent === undefined)
                    return;

                const vec_magnitude = await vscode.window.showInputBox({ placeHolder: 'Coordinate of Basis?' });
                if (vec_magnitude === undefined || vec_magnitude == "" || Number(vec_magnitude) == NaN)
                    return;
                const point_magnitude = await vscode.window.showInputBox({ placeHolder: 'Coordinate of Origin?'});
                if (point_magnitude === undefined || point_magnitude == "" || Number(point_magnitude) == NaN)
                    return;
                const new_space : TimeCoordinateSpace = {
                    label: annotationText, 
                    space: "Classical Time Coordinate Space", 
                    parent: parent, 
                    origin: +point_magnitude, 
                    basis: +vec_magnitude
                }
                let resp : boolean = await this.addSpaceRequest(new_space)
                if(!resp){
                    console.log("FAILED TO SAVE SPACE TO PEIRCE")
                    return
                }
                let db = getNotesDb();
                db.time_coordinate_spaces.push(new_space);
                saveDb(db);
                space_ = new_space
            }
            else 
                console.log(stdderPick.label)
        }
        else if(spaceTypePick.label == "Geom1D Coordinate Space"){
            let annotationText = await vscode.window.showInputBox({ placeHolder: 'Name of Geom1D Coordinate Space?', value: "new space"});
            if (annotationText === undefined) 
                return;
            let stdder : vscode.QuickPickItem[] = [];
            let std : vscode.QuickPickItem = {
                label: "Standard Geom1D Coordinate Space",
            };
            let der : vscode.QuickPickItem = {
                label: "Derived Geom1D Coordinate Space",
            };
            stdder.push(std);
            stdder.push(der);
            const stdderPick = await vscode.window.showQuickPick(stdder);
            if(stdderPick === undefined)
                return;
            else if(stdderPick.label == "Standard Geom1D Coordinate Space"){
                const new_space : Geom1DCoordinateSpace = {
                    label: annotationText,
                    space: "Classical Geom1D Coordinate Space", 
                    parent: null, 
                    origin: null, 
                    basis: null 
                }
                let resp : boolean = await this.addSpaceRequest(new_space)
                if(!resp){
                    console.log("FAILED TO SAVE SPACE TO PEIRCE")
                    return
                }
                let db = getNotesDb();
                db.geom1d_coordinate_spaces.push(new_space);
                saveDb(db);
                space_ = new_space
                
            }
            else if(stdderPick.label == "Derived Geom1D Coordinate Space"){
                const spaces = getGeom1DSpaces();
                const parent = await vscode.window.showQuickPick(spaces, {
                    placeHolder: 'Select a Parent Space'
                });
                console.log("quick pick")
                console.log(parent);
                if (parent === undefined)
                    return;

                const vec_magnitude = await vscode.window.showInputBox({ placeHolder: 'Coordinate of Basis?' });
                if (vec_magnitude === undefined || vec_magnitude == "" || Number(vec_magnitude) == NaN)
                    return;
                const point_magnitude = await vscode.window.showInputBox({ placeHolder: 'Coordinate of Origin?'});
                if (point_magnitude === undefined || point_magnitude == "" || Number(point_magnitude) == NaN)
                    return;
                const new_space : Geom1DCoordinateSpace = {
                    label: annotationText, 
                    space: "Classical Geom1D Coordinate Space", 
                    parent: parent, 
                    origin: +point_magnitude, 
                    basis: +vec_magnitude
                }
                let resp : boolean = await this.addSpaceRequest(new_space)
                if(!resp){
                    console.log("FAILED TO SAVE SPACE TO PEIRCE")
                    return
                }
                let db = getNotesDb();
                db.geom1d_coordinate_spaces.push(new_space);
                saveDb(db);
                space_ = new_space
            }
        }
    }

    async editHoveredNotes() {
        console.log("Editing hovered notes...")
	    let notes = getNotes();
        console.log("Got notes...");
        console.log(notes);
        let hover_index = 0;
        for (let index = 0; index < notes.length; index++) {
            let note = notes[index];
            console.log("Trying notes["+index+"]", note);
            if (!this.isHoveredNote(note)) continue;
            this.updatePreviewIndex(hover_index);
            console.log("GOT IT!["+index+"]", note);

            let noteIsIdentifier : boolean = note.type.includes("IDENT");


            let interpretations : vscode.QuickPickItem[] = [
                { label: "Duration" },
                { label: "Time" },
                { label: "Scalar"},
                { label: "Time Transform"},
                { label: "Displacement1D"},
                { label: "Position1D"},
                { label: "Geom1D Transform"}
            ];
            const interp = await vscode.window.showQuickPick(interpretations);
            if (interp === undefined) {
                hover_index++;
                this.updatePreview();
                continue;
            }

            let name = "<identifier>";

            // If the following is true (the AST node is an identifier)
            // Peirce will not prompt for a name, so we won't ask for one.
            if (!noteIsIdentifier) {
                let pickedName = await vscode.window.showInputBox({ placeHolder: 'Name of interpretation?' });
                if (pickedName === undefined || pickedName == "")  {
                    hover_index++;
                    this.updatePreview();
                    continue;
                }
                name = pickedName;
            }

            if(interp.label == "Duration"){

                let spaces = getTimeSpaces();
                console.log(spaces);
                let i = 0;
                const space = await vscode.window.showQuickPick(spaces, {
                    placeHolder: 'Select a coordinate space'
                });
                console.log("space quick pick")
                console.log(space);
                if (space === undefined) {
                    hover_index++;
                    this.updatePreview();
                    continue;
                }
    
                let value = await vscode.window.showInputBox({ placeHolder: 'Value?' });
                if (value === undefined || Number(value) == NaN)  {
                    hover_index++;
                    this.updatePreview();
                    continue;
                }
    
                let label = `${name} ${interp.label}(${space.label},${value})`
                if (noteIsIdentifier) {
                    label = `${interp.label}(${space.label},${value})`
                }
    
                let interpretation : Duration = {
                    label: label,
                    name: name,
                    form: interp.label,
                    space: space,
                    value: +value,
                    type: note.type,
                }
                notes[index].interpretation = interpretation;
                saveNotes(notes);
                console.log("Saving notes["+index+"]");
                hover_index++;
                this.updatePreview();
                
            }
            else if(interp.label == "Time"){

                let spaces = getTimeSpaces();
                console.log(spaces);
                let i = 0;
                const space = await vscode.window.showQuickPick(spaces, {
                    placeHolder: 'Select a coordinate space'
                });
                console.log("space quick pick")
                console.log(space);
                if (space === undefined) {
                    hover_index++;
                    this.updatePreview();
                    continue;
                }
    
                let value = await vscode.window.showInputBox({ placeHolder: 'Value?' });
                if (value === undefined || Number(value) == NaN)  {
                    hover_index++;
                    this.updatePreview();
                    continue;
                }
    
                let label = `${name} ${interp.label}(${space.label},${value})`
                if (noteIsIdentifier) {
                    label = `${interp.label}(${space.label},${value})`
                }
    
                let interpretation : Time = {
                    label: label,
                    name: name,
                    form: interp.label,
                    space: space,
                    value: +value,
                    type: note.type,
                }
                notes[index].interpretation = interpretation;
                saveNotes(notes);
                console.log("Saving notes["+index+"]");
                hover_index++;
                this.updatePreview();
            }
            else if(interp.label == "Scalar"){

                let value = await vscode.window.showInputBox({ placeHolder: 'Value?' });
                if (value === undefined || Number(value) == NaN)  {
                    hover_index++;
                    this.updatePreview();
                    continue;
                }
    
                let label = `${name} ${interp.label}(${value})`
                if (noteIsIdentifier) {
                    label = `${interp.label}(${value})`
                }
    
                let interpretation : Scalar = {
                    label: label,
                    name: name,
                    form: interp.label,
                    value: +value,
                    type: note.type,
                }
                notes[index].interpretation = interpretation;
                saveNotes(notes);
                console.log("Saving notes["+index+"]");
                hover_index++;
                this.updatePreview();

            }
            else if(interp.label == "Time Transform"){

                let spaces = getTimeSpaces();
                console.log(spaces);
                let i = 0;
                const domain = await vscode.window.showQuickPick(spaces, {
                    placeHolder: 'Select a time coordinate space'
                });
                console.log("space quick pick")
                console.log(domain);
                if (domain === undefined) {
                    hover_index++;
                    this.updatePreview();
                    continue;
                }
                console.log(spaces);
                const codomain = await vscode.window.showQuickPick(spaces, {
                    placeHolder: 'Select a time coordinate space'
                });
                console.log("space quick pick")
                console.log(codomain);
                if (codomain === undefined) {
                    hover_index++;
                    this.updatePreview();
                    continue;
                }
                let label = `${name} ${interp.label}(${domain.label},${codomain.label})`
                if (noteIsIdentifier) {
                    label = `${interp.label}(${domain.label},${codomain.label})`
                }
    
    
                let interpretation : TimeTransform = {
                    label: label,
                    name: name,
                    form: interp.label,
                    domain: domain,
                    codomain: codomain,
                    type: note.type,
                }
                notes[index].interpretation = interpretation;
                saveNotes(notes);
                console.log("Saving notes["+index+"]");
                hover_index++;
                this.updatePreview();
            }
            else if(interp.label == "Displacement1D"){

                let spaces = getGeom1DSpaces();
                console.log(spaces);
                let i = 0;
                const space = await vscode.window.showQuickPick(spaces, {
                    placeHolder: 'Select a coordinate space'
                });
                console.log("space quick pick")
                console.log(space);
                if (space === undefined) {
                    hover_index++;
                    this.updatePreview();
                    continue;
                }
    
                let value = await vscode.window.showInputBox({ placeHolder: 'Value?' });
                if (value === undefined || Number(value) == NaN)  {
                    hover_index++;
                    this.updatePreview();
                    continue;
                }
    
                let label = `${name} ${interp.label}(${space.label},${value})`
                if (noteIsIdentifier) {
                    label = `${interp.label}(${space.label},${value})`
                }
    
                let interpretation : Displacement1D = {
                    label: label,
                    name: name,
                    form: interp.label,
                    space: space,
                    value: +value,
                    type: note.type,
                }
                notes[index].interpretation = interpretation;
                saveNotes(notes);
                console.log("Saving notes["+index+"]");
                hover_index++;
                this.updatePreview();
            }
            else if(interp.label == "Position1D"){

                let spaces = getGeom1DSpaces();
                console.log(spaces);
                let i = 0;
                const space = await vscode.window.showQuickPick(spaces, {
                    placeHolder: 'Select a coordinate space'
                });
                console.log("space quick pick")
                console.log(space);
                if (space === undefined) {
                    hover_index++;
                    this.updatePreview();
                    continue;
                }
    
                let value = await vscode.window.showInputBox({ placeHolder: 'Value?' });
                if (value === undefined || Number(value) == NaN)  {
                    hover_index++;
                    this.updatePreview();
                    continue;
                }
    
                let label = `${name} ${interp.label}(${space.label},${value})`
                if (noteIsIdentifier) {
                    label = `${interp.label}(${space.label},${value})`
                }
    
                let interpretation : Position1D = {
                    label: label,
                    name: name,
                    form: interp.label,
                    space: space,
                    value: +value,
                    type: note.type,
                }
                notes[index].interpretation = interpretation;
                saveNotes(notes);
                console.log("Saving notes["+index+"]");
                hover_index++;
                this.updatePreview();
            }
            else if(interp.label == "Geom1D Transform"){
                
                let spaces = getGeom1DSpaces();
                console.log(spaces);
                let i = 0;
                const domain = await vscode.window.showQuickPick(spaces, {
                    placeHolder: 'Select a time coordinate space'
                });
                console.log("space quick pick")
                console.log(domain);
                if (domain === undefined) {
                    hover_index++;
                    this.updatePreview();
                    continue;
                }
                console.log(spaces);
                const codomain = await vscode.window.showQuickPick(spaces, {
                    placeHolder: 'Select a time coordinate space'
                });
                console.log("space quick pick")
                console.log(codomain);
                if (codomain === undefined) {
                    hover_index++;
                    this.updatePreview();
                    continue;
                }
                let label = `${name} ${interp.label}(${domain.label},${codomain.label})`
                if (noteIsIdentifier) {
                    label = `${interp.label}(${domain.label},${codomain.label})`
                }
    
    
                let interpretation : Geom1DTransform = {
                    label: label,
                    name: name,
                    form: interp.label,
                    domain: domain,
                    codomain: codomain,
                    type: note.type,
                }
                notes[index].interpretation = interpretation;
                saveNotes(notes);
                console.log("Saving notes["+index+"]");
                hover_index++;
                this.updatePreview();
            }
        }

        await this.check()
    }

    private isHoveredNote(note : Note) : boolean {
        let loc = this.getActiveCursorLocation();
        let condition = (loc && note.fileName == vscode.window.activeTextEditor?.document.fileName 
            && note.positionStart.line <= loc.line && note.positionEnd.line >= loc.line);
        if (condition == null) return false;
        return condition;
    }

    private displayNote(note : Note, editing: boolean) : string {
        let full : string = "";
        if (note) {
            if (editing)
                full += `<pre style="color: lightgreen">${JSON.stringify(note, undefined, 2)}</pre></b>`
            else
                full += "<pre>" + JSON.stringify(note, undefined, 2) + "</pre>"
        }
        return full;
    }

    // <script src="${this.getMediaPath('index.js')}"></script>
    async updatePreview() {
        this.updatePreviewIndex(-1);
    }
    async updatePreviewIndex(index : number) {
        console.log(index);
        let contents : string = "";
        let notes = this.getHoveredNotes();
        for (let i = 0; i < notes.length; i++)
            contents += this.displayNote(notes[i], i == index);
        contents += '<p style="color:lightblue">Key bindings</p>';
        contents += '<p style="color:lightblue"><b>Ctrl+Alt+R</b> to generate unfilled type information annotations</p>';
        contents += '<p style="color:lightblue"><b>Ctrl+Alt+E</b> to edit existing type information annotations</p>';
        contents += '<p style="color:lightblue"><b>Ctrl+Alt+S</b> to add spaces</p>';

        let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8" />
                <meta http-equiv="Content-type" content="text/html;charset=utf-8">
                <title>Infoview</title>
                <style></style>
            </head>
            <body>
                <div id="react_root"></div>
                ${contents}
                <!-- script here -->
            </body>
            </html>`
        this.webviewPanel.webview.html = html;
    }

    async openPreview() {
        vscode.window.onDidChangeTextEditorSelection(() => this.updatePreview());
        let editor = undefined;
        if (vscode.window.activeTextEditor != undefined) {
            editor = vscode.window.activeTextEditor;
        }
        else 
            return;
        let column = (editor && editor.viewColumn) ? editor.viewColumn + 1 : vscode.ViewColumn.Two;
        const loc = this.getActiveCursorLocation();
        console.log(loc);
        if (column === 4) { column = vscode.ViewColumn.Three; }
        this.webviewPanel = vscode.window.createWebviewPanel('Peirce', 'Peirce Infoview',
            { viewColumn: column, preserveFocus: true },
            {
                enableFindWidget: true,
                retainContextWhenHidden: true,
                enableScripts: true,
                enableCommandUris: true,
            });
        this.updatePreview();
        //this.webviewPanel.onDidDispose(() => this.webviewPanel = null);
    }
}

export class TreeActions {
    //constructor(private provider: NotesTree) { }
    constructor(private provider: NotesTree, private iv : InfoView) { }

    removeNote(item: NoteItem) {
        return this.provider.removeItem(item.id);
    }
    checkNote(item: NoteItem) {
        return this.provider.checkItem(item.id, 'done');
    }
    uncheckNote(item: NoteItem) {
        return this.provider.checkItem(item.id, 'pending');
    }
    checkAllNotes(data: any): void {
        const children = data.children;
        if (!children) { return; }

        for (let index = 0; index < children.length; index++) {
            const current = children[index];
            this.checkNote(current);
        }
    }
    uncheckAllNotes(data: any): void {
        const children = data.children;
		
        if (!children) { return; }

        for (let index = 0; index < children.length; index++) {
            const current = children[index];
            this.uncheckNote(current);
        }
    }
    removeAllNotes(data: any): void {
        const children = data.children;
		
        if (!children) { return; }

        for (let index = 0; index < children.length; index++) {
            const current = children[index];
            this.removeNote(current);
        }
    }
    openNote(item: NoteItem) {
        return this.provider.openItem(item.id);
    }
    openNoteFromId(id: string) {
        return this.provider.openItem(id);
    }
    copyNote(item: NoteItem) {
        return this.provider.copyItem(item.id);
    }
    editNote(item: NoteItem):void {
        console.log(item.id);
        this.iv.editSelectedNoteItem(item)
    }
    addSpace():void{
        console.log('RUNNING IV ADD SPACE')
        this.iv.addSpace()
    }

}
export class NotesTree implements vscode.TreeDataProvider<NoteItem> {

	private _onDidChangeTreeData: vscode.EventEmitter<NoteItem | undefined | null | void> = new vscode.EventEmitter<NoteItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<NoteItem | undefined | null | void> = this._onDidChangeTreeData.event;

	refresh(): void {
        console.log('calling source data')
	    this.sourceData();
        console.log('finished source data?')
	    this._onDidChangeTreeData.fire(null);
	}

	sourceData(): void {
	    this.data = [];
	    this.data = [
            new NoteItem('Table of Terms', undefined, undefined, '$menu-pending'),
            new NoteItem('Constructors', undefined, undefined, '$menu-pending'),
            new NoteItem('Spaces', undefined, undefined, '$Space')
        ];
        console.log("In notes tree")
        console.log('SOURCING DATA')
        console.log('SOURCE THAT DATA')
	    const annotations = getNotes();
        console.log('')
        console.log(annotations)
	    for (let note in annotations) {
            if (annotations[note].fileName != vscode.window.activeTextEditor?.document.fileName)
                continue;
	        const noteItem = createNoteItem(annotations[note]);
            this.data[0].addChild(noteItem);
	    }
	    this.data[0].label += ` (${annotations.length})`;


	    const constructors = getConstructors() || ([]);
        console.log(constructors)
	    for (let note in constructors) {
            //if (constructors[note].fileName != vscode.window.activeTextEditor?.document.fileName)
            //    continue;
	        const noteItem = createConsNoteItem(constructors[note]);
            this.data[1].addChild(noteItem);
	    }
	    this.data[1].label += ` (${constructors.length})`;

	    const spaces = (getTimeSpaces() || []).concat(getGeom1DSpaces() || []);
        console.log("spaces")
        console.log(spaces)
	    for (let s in spaces) {
            const space = spaces[s];
            let noteItem : NoteItem;
            if (space.space == "Classical Time Coordinate Space"){
                if (space.parent != null){
                    noteItem = new NoteItem(`${space.label} (Derived from ${space.parent.label}): Origin: ${space.origin} Basis: ${space.basis}`)
                    this.data[2].addChild(noteItem);
                }
                else {
                    noteItem = new NoteItem(`${space.label} : Standard Time Space`);
                    this.data[2].addChild(noteItem);
                }
            }
            else if (space.space == "Classical Geom1D Coordinate Space") {
                if (space.parent != null){
                    noteItem = new NoteItem(`${space.label} (Derived from ${space.parent.label}): Origin: ${space.origin} Basis: ${space.basis}`)
                    const origin = space.origin;
                    this.data[2].addChild(noteItem);
                }
                else{
                    noteItem = new NoteItem(`${space.label} : Standard Geom1D Space`);
                    const origin = space.origin;
                    this.data[2].addChild(noteItem);
                }
            }
            else {
            }
            //const origin = space.origin;
            //this.data[1].addChild(noteItem);
	    }
	    this.data[2].label += ` (${spaces.length})`;
	}

	removeItem(id: string | undefined): void {
	    const notes = getNotes();
	    const indexToRemove = notes.findIndex((item: { id: Number }) => {
	        return item.id.toString() === id;
	    });

	    if (indexToRemove >= 0) {
	        notes.splice(indexToRemove, 1);
	    }

	    saveNotes(notes);
	    setDecorations();
	}

	checkItem(id: string | undefined, status: 'pending' | 'done'): void {
	    const notes = getNotes();
	    const index = notes.findIndex((item: { id: Number }) => {
	        return item.id.toString() === id;
	    });

	    if (index >= 0) {
	        notes[index].status = status;
	    }

	    saveNotes(notes);
	}

	openItem(id: string | undefined): void {
	    const notes = getNotes();
	    const index = notes.findIndex((item: { id: Number }) => {
	        return item.id.toString() === id;
	    });

	    if (index >= 0) {
	        const note = notes[index];
	        const fileName = note.fileName;
	        const fileLine = note.fileLine;

	        if (fileName.length <= 0) {
	            return;
	        }

	        var openPath = vscode.Uri.file(fileName);
	        vscode.workspace.openTextDocument(openPath).then(doc => {
	            vscode.window.showTextDocument(doc).then(editor => {
	                var range = new vscode.Range(fileLine, 0, fileLine, 0);
	                editor.revealRange(range);

	                var start = new vscode.Position(note.positionStart.line, note.positionStart.character);
	                var end = new vscode.Position(note.positionEnd.line, note.positionEnd.character);
	                editor.selection = new vscode.Selection(start, end);

	                var range = new vscode.Range(start, start);
	                editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
	            });
	        });
	    }
	}

	copyItem(id: string | undefined): void {
	    const notes = getNotes();
	    const index = notes.findIndex((item: { id: Number }) => {
	        return item.id.toString() === id;
	    });

	    if (index === -1) {
	        return;
	    }

	    const content = notes[index].text;
	    vscode.env.clipboard.writeText(content).then(() => {
	        vscode.window.showInformationMessage('Note copied successfully');
	    });
	}

	data: NoteItem[];

	constructor() {
	    vscode.commands.registerCommand('code-annotation.refreshEntry', () =>
	        this.refresh()
	    );
        /*
        vscode.commands.registerCommand('code-annotation.addSpace', () => 
            this.addSpace()
        );*/

	    this.data = [];
	    this.sourceData();
	}

	getTreeItem(element: NoteItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
	    return element;
	}

	getChildren(element?: NoteItem | undefined): vscode.ProviderResult<NoteItem[]> {
	    if (element === undefined) {
	        return this.data;
	    }
	    return element.children;
	}
}

class OpenNoteCommand implements vscode.Command {
	command = 'code-annotation.openNoteFromId';
	title = 'Open File';
	arguments?: any[];

	constructor(id: string) {
	    this.arguments = [id];
	}
}

export class NoteItem extends vscode.TreeItem {
	children: NoteItem[] | undefined;

	constructor(label: string, children?: NoteItem[] | undefined, noteId?: string | undefined, context?: string | undefined) {
	    super(
	        label,
	        children === undefined ? vscode.TreeItemCollapsibleState.None :
	            vscode.TreeItemCollapsibleState.Expanded);
	    this.children = children;
	    if (noteId) {
	        this.id = noteId;
	    }
	    if (context) {
	        this.contextValue = context;
	    }
	}

	addChild(element: NoteItem) {
	    if (this.children === undefined) {
	        this.children = [];
	        this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
	    }
	    this.children.push(element);
	}
}
