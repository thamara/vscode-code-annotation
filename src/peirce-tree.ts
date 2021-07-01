import * as vscode from 'vscode';
import * as path from 'path';
import fetch from 'node-fetch';
import peircedb = require("./peircedb")
import models = require("./models")


import {
    PopulateAPIReponse
} from './peirce_api_calls'
import { getConfiguration } from './configuration';
import { getRelativePathForFileName } from './utils';
import { setDecorations } from './decoration/decoration';
import { Position, TextEditor, WebviewPanel } from 'vscode';
import { privateEncrypt } from 'crypto';

const getIconPathFromType = (type: string, theme: string): string => {
    return path.join(__filename, '..', '..', 'resources', theme, type.toLowerCase() + '.svg');
};

const getIconPath = (status: string): any => {
    const termType = (status === 'pending') ? 'todo' : 'check';
    return {
        light: getIconPathFromType(termType, 'light'),
        dark: getIconPathFromType(termType, 'dark')
    };
};

const getContextValue = (status: string): string => {
    return (status === 'pending') ? '$PendingTerm' : '$CompleteTerm';
};

const createTermItem = (term: models.Term): TermItem => {

    let details : TermItem[] = [];
    if (term.interpretation != null)
        details = [new TermItem(`Current interpretation: ${term.interpretation.label}`)]; 
    else
        details = [new TermItem(`Current interpretation: No interpretation provided`)];
    details.push(new TermItem(`Checked interpretation: ${term.text}`));
    details.push(new TermItem(`Type: ${term.node_type}`));
    details.push(new TermItem(`Error Message: ${term.error}`));
    let termItem = new TermItem(`${term.codeSnippet}`, details, term.id.toString());
    console.log('NOTE ITEM ID : ' + term.id.toString())
    if (termItem.id) {
        termItem.command = new OpenTermCommand(termItem.id);
    }
    if (details) {
        // If details isn't undefined, set the command to the same as the parent
        details[0].command = termItem.command;
    }
    termItem.tooltip = term.text;
    termItem.contextValue = getContextValue(term.status);
    termItem.iconPath = getIconPath(term.status);

    return termItem;
};

const createConsTermItem = (cons: models.Constructor): TermItem => {
    console.log(cons.interpretation)
    let details : TermItem[] = [];
    if (cons.interpretation != null)
        details = [new TermItem(`Current interpretation: ${cons.interpretation.label}`)]; 
    else
        details = [new TermItem(`Current interpretation: No interpretation provided`)];
    details.push(new TermItem(`Type: ${cons.node_type}`));
    details.push(new TermItem(`Name: ${cons.name}`));
    let termItem = new TermItem(`${cons.name}`, details, cons.id.toString());
    if (termItem.id) {
        termItem.command = new OpenTermCommand(termItem.id);
    }
    if (details) {
        // If details isn't undefined, set the command to the same as the parent
        details[0].command = termItem.command;
    }
    termItem.tooltip = cons.name;
    termItem.contextValue = getContextValue(cons.status);
    termItem.iconPath = getIconPath(cons.status);

    return termItem;
};

export class InfoView {
    private webviewPanel!: WebviewPanel;

    private getActiveCursorLocation(): Position | null {
        if (vscode.window.activeTextEditor)
            return vscode.window.activeTextEditor.selection.active;
        else
            return null;
    }

    getHoveredTerms() : models.Term[] {            
        let hovered_terms : models.Term[] = [];
        let terms = peircedb.getTerms();
        terms.forEach(term => {
            if (this.isHoveredTerm(term)) 
                hovered_terms.push(term);
        });
        return hovered_terms;
    }

    
    async createInterpretation(termIsIdentifier : boolean) : Promise<models.Interpretation | null> {

        console.log('going?')
        let interpretations : vscode.QuickPickItem[] = [
            { label: "Duration" },
            { label: "Time" },
            { label: "Scalar"},
            { label: "Time Transform"},
            { label: "Displacement1D"},
            { label: "Position1D"},
            { label: "Geom1D Transform"},
            { label: "Displacement3D"},
            { label: "Position3D"},
            { label: "Geom3D Transform"}
        ];
        const interp = await vscode.window.showQuickPick(interpretations);
        if (interp === undefined) {
            return null
        }
        let name = "<identifier>";

        // If the following is true (the AST node is an identifier)
        // Peirce will not prompt for a name, so we won't ask for one.
        if (!termIsIdentifier) {
            let pickedName = await vscode.window.showInputBox({ placeHolder: 'Name of interpretation?' });
            if (pickedName === undefined || pickedName == "")  {
                return null
            }
            name = pickedName;
        }

        if(interp.label == "Duration"){

            let spaces = peircedb.getTimeSpaces();
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
            if (termIsIdentifier) {
                label = `${interp.label}(${space.label},${value})`
            }

            let interpretation : models.Duration = {
                label: label,
                name: name,
                interp_type: interp.label,
                space: space,
                value: [+value],
                node_type: "undefined"//term.node_type,
            }
            return interpretation
            
        }
        else if(interp.label == "Time"){

            let spaces = peircedb.getTimeSpaces();
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
            if (termIsIdentifier) {
                label = `${interp.label}(${space.label},${value})`
            }

            let interpretation : models.Time = {
                label: label,
                name: name,
                interp_type: interp.label,
                space: space,
                value: [+value],
                node_type: "term.node_type",
            }
            return interpretation
        }
        else if(interp.label == "Scalar"){

            let value = await vscode.window.showInputBox({ placeHolder: 'Value?' });
            if (value === undefined || Number(value) == NaN)  {
                return null;
            }

            let label = `${name} ${interp.label}(${value})`
            if (termIsIdentifier) {
                label = `${interp.label}(${value})`
            }

            let interpretation : models.Scalar = {
                label: label,
                name: name,
                interp_type: interp.label,
                value: [+value],
                node_type: "term.node_type",
            }
            return interpretation
        }
        else if(interp.label == "Time Transform"){

            let spaces = peircedb.getTimeSpaces();
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
            if (termIsIdentifier) {
                label = `${interp.label}(${domain.label},${codomain.label})`
            }


            let interpretation : models.TimeTransform = {
                label: label,
                name: name,
                interp_type: interp.label,
                domain: domain,
                codomain: codomain,
                node_type: "term.node_type",
            }
            return interpretation
        }
        else if(interp.label == "Displacement1D"){

            let spaces = peircedb.getGeom1DSpaces();
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
            if (termIsIdentifier) {
                label = `${interp.label}(${space.label},${value})`
            }

            let interpretation : models.Displacement1D = {
                label: label,
                name: name,
                interp_type: interp.label,
                space: space,
                value: [+value],
                node_type: "term.node_type",
            }
            return interpretation
        }
        else if(interp.label == "Position1D"){

            let spaces = peircedb.getGeom1DSpaces();
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
            if (termIsIdentifier) {
                label = `${interp.label}(${space.label},${value})`
            }

            let interpretation : models.Position1D = {
                label: label,
                name: name,
                interp_type: interp.label,
                space: space,
                value: [+value],
                node_type: "term.node_type",
            }
            return interpretation
        }
        else if(interp.label == "Geom1D Transform"){
            
            let spaces = peircedb.getGeom1DSpaces();
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
            if (termIsIdentifier) {
                label = `${interp.label}(${domain.label},${codomain.label})`
            }


            let interpretation : models.Geom1DTransform = {
                label: label,
                name: name,
                interp_type: interp.label,
                domain: domain,
                codomain: codomain,
                node_type: "term.node_type",
            }
            return interpretation
        }
        else if(interp.label == "Displacement3D"){

            let spaces = peircedb.getGeom3DSpaces();
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

            let value0 = await vscode.window.showInputBox({ placeHolder: 'Value at index 0?' });
            if (value0 === undefined || Number(value0) == NaN)  {
                return null;
            }
            let value1 = await vscode.window.showInputBox({ placeHolder: 'Value at index 1?' });
            if (value1 === undefined || Number(value1) == NaN)  {
                return null;
            }
            let value2 = await vscode.window.showInputBox({ placeHolder: 'Value at index 2?' });
            if (value2 === undefined || Number(value2) == NaN)  {
                return null;
            }

            let label = `${name} ${interp.label}(${space.label},${value0},${value1},${value2})`
            if (termIsIdentifier) {
                label = `${interp.label}(${space.label},${value0},${value1},${value2})`
            }

            let interpretation : models.Displacement3D = {
                label: label,
                name: name,
                interp_type: interp.label,
                space: space,
                value: [+value0,+value1,+value2],
                node_type: "term.node_type",
            }
            return interpretation
        }
        else if(interp.label == "Position3D"){

            let spaces = peircedb.getGeom3DSpaces();
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


            let value0 = await vscode.window.showInputBox({ placeHolder: 'Value at index 0?' });
            if (value0 === undefined || Number(value0) == NaN)  {
                return null;
            }
            let value1 = await vscode.window.showInputBox({ placeHolder: 'Value at index 1?' });
            if (value1 === undefined || Number(value1) == NaN)  {
                return null;
            }
            let value2 = await vscode.window.showInputBox({ placeHolder: 'Value at index 2?' });
            if (value2 === undefined || Number(value2) == NaN)  {
                return null;
            }

            let label = `${name} ${interp.label}(${space.label},${value0},${value1},${value2})`
            if (termIsIdentifier) {
                label = `${interp.label}(${space.label},${value0},${value1},${value2})`
            }

            let interpretation : models.Position3D = {
                label: label,
                name: name,
                interp_type: interp.label,
                space: space,
                value: [+value0,+value1,+value2],
                node_type: "term.node_type",
            }
            return interpretation
        }
        else if(interp.label == "Geom3D Transform"){
            
            let spaces = peircedb.getGeom3DSpaces();
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
            if (termIsIdentifier) {
                label = `${interp.label}(${domain.label},${codomain.label})`
            }


            let interpretation : models.Geom3DTransform = {
                label: label,
                name: name,
                interp_type: interp.label,
                domain: domain,
                codomain: codomain,
                node_type: "term.node_type",
            }
            return interpretation
        }
        else return null;
        
    }

    async editSelectedTermItem(termItem:TermItem)  {
        console.log('editing TERM ITEM')
        console.log(termItem)
        if(termItem.id === undefined){
        }
        else {
            const term_ : models.Term | null = peircedb.getTermFromId(termItem.id)
            console.log(term_)
            if(term_ === null){
                const cons_ : models.Constructor | null = peircedb.getConstructorFromId(termItem.id)

                console.log(cons_)
                if(cons_ === null){
                }
                else {
                    console.log("CREATING INTEPRRETATION")
                    let interpretation = await this.createInterpretation(true)
                    if(interpretation === null){}
                    else{
                        interpretation.node_type = cons_.node_type
                        cons_.interpretation = interpretation
                        console.log('attempting api cons save...')
                        let result : boolean = await this.addConstructorInterpretationRequest(cons_)
                        if(result){
                            peircedb.saveConstructor(cons_)
                            console.log("success cons")
                        }
                        else{
                            console.log("fail cons")
                        }
                    }
                }
            }
            else{
                console.log("creating!")
                console.log(term_)
                let termIsIdentifier : boolean = term_.node_type.includes("IDENT");
                console.log("creating2!")
                let interpretation = await this.createInterpretation(termIsIdentifier)
                if(interpretation === null){}
                else{
                    interpretation.node_type = term_.node_type
                    term_.interpretation = interpretation
                    //saveTerm(term_)
                    console.log('attempting api term save...')
                    let result : boolean = await this.addTermInterpretationRequest(term_)
                    if(result){
                        peircedb.saveTerm(term_)
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
        let terms = peircedb.getTerms()
        let constructors = peircedb.getConstructors()

        let editor = vscode.window.activeTextEditor;
        if (editor === undefined)
            return;
        const fileText = vscode.window.activeTextEditor?.document.getText();

        //console.log(terms);
        //console.log(JSON.stringify(terms));
        //console.log(fileText);
        //console.log(JSON.stringify(fileText));
        let request = {
            file: fileText,
            fileName: vscode.window.activeTextEditor?.document.fileName,
            terms: terms,
            spaces: peircedb.getPeirceDb().time_coordinate_spaces.concat(peircedb.getPeirceDb().geom1d_coordinate_spaces),
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
        const data : models.Term[] = await response.json();
        //let data = resp.data
        for (let i = 0; i < data.length; i++) {
            terms[i] = data[i]
        }
        let i = 0;
        let all_terms = peircedb.getTerms();
        for (let j = 0; j < all_terms.length; j++) {
            if (all_terms[j].fileName != terms[i].fileName){
                continue;
            }
            all_terms[j].text = terms[i].text;
            all_terms[j].error = terms[i].error;
            i++;
        }
        peircedb.saveTerms(all_terms);
        setDecorations();
    }

    async addSpaceRequest(space_:models.Space) : Promise<boolean> {
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
        console.log('response??')
        console.log(response)
        const data : models.SuccessResponse = await response.json();
        console.log('returning...')
        return data.success
        
    }
    
    async addTermInterpretationRequest(term: models.Term) : Promise <boolean> {
        console.log('sending term')
        let request = {
            term:term
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
        const data : models.SuccessResponse = await response.json();
        return data.success

    };
    
    async addConstructorInterpretationRequest(cons: models.Constructor) : Promise <boolean> {
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
        const data : models.SuccessResponse = await response.json();
        return data.success

    };
    
    async addSpace(){
        let space_ : models.Space | undefined = undefined
        let spaceOptions : vscode.QuickPickItem[] = [];
        let time_space : vscode.QuickPickItem = {
            label: "Time Coordinate Space",
        };
        let geom1d_space : vscode.QuickPickItem = {
            label: "Geom1D Coordinate Space",
        };
        let geom3d_space : vscode.QuickPickItem = {
            label: "Geom3D Coordinate Space",
        };
        spaceOptions.push(time_space);
        spaceOptions.push(geom1d_space);
        spaceOptions.push(geom3d_space);
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
                const new_space : models.TimeCoordinateSpace = {
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
                let db = peircedb.getPeirceDb();
                db.time_coordinate_spaces.push(new_space);
                peircedb.saveDb(db);
                space_ = new_space
            }
            else if(stdderPick.label == "Derived Time Coordinate Space"){
                const spaces = peircedb.getTimeSpaces();
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
                const new_space : models.TimeCoordinateSpace = {
                    label: annotationText, 
                    space: "Classical Time Coordinate Space", 
                    parent: parent, 
                    origin: [+point_magnitude], 
                    basis: [+vec_magnitude]
                }
                let resp : boolean = await this.addSpaceRequest(new_space)
                if(!resp){
                    console.log("FAILED TO SAVE SPACE TO PEIRCE")
                    return
                }
                let db = peircedb.getPeirceDb();
                db.time_coordinate_spaces.push(new_space);
                peircedb.saveDb(db);
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
                const new_space : models.Geom1DCoordinateSpace = {
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
                let db = peircedb.getPeirceDb();
                db.geom1d_coordinate_spaces.push(new_space);
                peircedb.saveDb(db);
                space_ = new_space
                
            }
            else if(stdderPick.label == "Derived Geom1D Coordinate Space"){
                const spaces = peircedb.getGeom1DSpaces();
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
                const new_space : models.Geom1DCoordinateSpace = {
                    label: annotationText, 
                    space: "Classical Geom1D Coordinate Space", 
                    parent: parent, 
                    origin: [+point_magnitude], 
                    basis: [+vec_magnitude]
                }
                let resp : boolean = await this.addSpaceRequest(new_space)
                if(!resp){
                    console.log("FAILED TO SAVE SPACE TO PEIRCE")
                    return
                }
                let db = peircedb.getPeirceDb();
                db.geom1d_coordinate_spaces.push(new_space);
                peircedb.saveDb(db);
                space_ = new_space
            }
        }
        else if(spaceTypePick.label == "Geom3D Coordinate Space"){
            let annotationText = await vscode.window.showInputBox({ placeHolder: 'Name of Geom3D Coordinate Space?', value: "new space"});
            if (annotationText === undefined) 
                return;
            let stdder : vscode.QuickPickItem[] = [];
            let std : vscode.QuickPickItem = {
                label: "Standard Geom3D Coordinate Space",
            };
            let der : vscode.QuickPickItem = {
                label: "Derived Geom3D Coordinate Space",
            };
            stdder.push(std);
            stdder.push(der);
            const stdderPick = await vscode.window.showQuickPick(stdder);
            if(stdderPick === undefined)
                return;
            else if(stdderPick.label == "Standard Geom3D Coordinate Space"){
                const new_space : models.Geom3DCoordinateSpace = {
                    label: annotationText,
                    space: "Classical Geom3D Coordinate Space", 
                    parent: null, 
                    origin: null, 
                    basis: null 
                }
                let resp : boolean = await this.addSpaceRequest(new_space)
                console.log('returned from save space request?')
                if(!resp){
                    console.log("FAILED TO SAVE SPACE TO PEIRCE")
                    return
                }
                else
                    console.log("SAVED")
                let db = peircedb.getPeirceDb();
                console.log('SAVE IT???')
                console.log(new_space)
                db.geom3d_coordinate_spaces.push(new_space);
                peircedb.saveDb(db);
                console.log('SAVED???')
                space_ = new_space
                
            }
            else if(stdderPick.label == "Derived Geom3D Coordinate Space"){
                const spaces = peircedb.getGeom3DSpaces();
                const parent = await vscode.window.showQuickPick(spaces, {
                    placeHolder: 'Select a Parent Space'
                });
                console.log("quick pick")
                console.log(parent);
                if (parent === undefined)
                    return;

                let basis_values : number[] = []
                let origin_values : number[] = []

                for(const i of [0,1,2]){
                    //let basisij : string | undefined = ""
                    for(const j of [0,1,2]){

                        let basisij = await vscode.window.showInputBox({ placeHolder: 'Coordinate of Basis Vector '+i+ ", Column "+j+"?" });
                        
                        if (basisij === undefined || basisij == "" || Number(basisij) == NaN)
                            return;
                        basis_values.push(+basisij)
                    }
                }

                for(const i of [0, 1, 2]){
                    let originij = await vscode.window.showInputBox({ placeHolder: 'Coordinate of Origin at Index '+i+"?" });
                        
                    if (originij === undefined || originij == "" || Number(originij) == NaN)
                        return;
                    origin_values.push(+originij)    
                }

                const new_space : models.Geom3DCoordinateSpace = {
                    label: annotationText, 
                    space: "Classical Geom3D Coordinate Space", 
                    parent: parent, 
                    origin: origin_values, 
                    basis: basis_values
                }
                let resp : boolean = await this.addSpaceRequest(new_space)
                if(!resp){
                    console.log("FAILED TO SAVE SPACE TO PEIRCE")
                    return
                }
                let db = peircedb.getPeirceDb();
                db.geom3d_coordinate_spaces.push(new_space);
                peircedb.saveDb(db);
                space_ = new_space
            }
        }
    }

    async editHoveredTerms() {
        console.log("Editing hovered terms...")
	    let terms = peircedb.getTerms();
        console.log("Got terms...");
        console.log(terms);
        let hover_index = 0;
        for (let index = 0; index < terms.length; index++) {
            let term = terms[index];
            console.log("Trying terms["+index+"]", term);
            if (!this.isHoveredTerm(term)) continue;
            this.updatePreviewIndex(hover_index);
            console.log("GOT IT!["+index+"]", term);

            let termIsIdentifier : boolean = term.node_type.includes("IDENT");


            let interpretations : vscode.QuickPickItem[] = [
                { label: "Duration" },
                { label: "Time" },
                { label: "Scalar"},
                { label: "Time Transform"},
                { label: "Displacement1D"},
                { label: "Position1D"},
                { label: "Geom1D Transform"},
                { label: "Displacement3D"},
                { label: "Position3D"},
                { label: "Geom3D Transform"}
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
            if (!termIsIdentifier) {
                let pickedName = await vscode.window.showInputBox({ placeHolder: 'Name of interpretation?' });
                if (pickedName === undefined || pickedName == "")  {
                    hover_index++;
                    this.updatePreview();
                    continue;
                }
                name = pickedName;
            }

            if(interp.label == "Duration"){

                let spaces = peircedb.getTimeSpaces();
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
                if (termIsIdentifier) {
                    label = `${interp.label}(${space.label},${value})`
                }
    
                let interpretation : models.Duration = {
                    label: label,
                    name: name,
                    interp_type: interp.label,
                    space: space,
                    value: [+value],
                    node_type: term.node_type,
                }
                terms[index].interpretation = interpretation;
                peircedb.saveTerms(terms);
                console.log("Saving terms["+index+"]");
                hover_index++;
                this.updatePreview();
                
            }
            else if(interp.label == "Time"){

                let spaces = peircedb.getTimeSpaces();
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
                if (termIsIdentifier) {
                    label = `${interp.label}(${space.label},${value})`
                }
    
                let interpretation : models.Time = {
                    label: label,
                    name: name,
                    interp_type: interp.label,
                    space: space,
                    value: [+value],
                    node_type: term.node_type,
                }
                terms[index].interpretation = interpretation;
                peircedb.saveTerms(terms);
                console.log("Saving terms["+index+"]");
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
                if (termIsIdentifier) {
                    label = `${interp.label}(${value})`
                }
    
                let interpretation : models.Scalar = {
                    label: label,
                    name: name,
                    interp_type: interp.label,
                    value: [+value],
                    node_type: term.node_type,
                }
                terms[index].interpretation = interpretation;
                peircedb.saveTerms(terms);
                console.log("Saving terms["+index+"]");
                hover_index++;
                this.updatePreview();

            }
            else if(interp.label == "Time Transform"){

                let spaces = peircedb.getTimeSpaces();
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
                if (termIsIdentifier) {
                    label = `${interp.label}(${domain.label},${codomain.label})`
                }
    
    
                let interpretation : models.TimeTransform = {
                    label: label,
                    name: name,
                    interp_type: interp.label,
                    domain: domain,
                    codomain: codomain,
                    node_type: term.node_type,
                }
                terms[index].interpretation = interpretation;
                peircedb.saveTerms(terms);
                console.log("Saving terms["+index+"]");
                hover_index++;
                this.updatePreview();
            }
            else if(interp.label == "Displacement1D"){

                let spaces = peircedb.getGeom1DSpaces();
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
                if (termIsIdentifier) {
                    label = `${interp.label}(${space.label},${value})`
                }
    
                let interpretation : models.Displacement1D = {
                    label: label,
                    name: name,
                    interp_type: interp.label,
                    space: space,
                    value: [+value],
                    node_type: term.node_type,
                }
                terms[index].interpretation = interpretation;
                peircedb.saveTerms(terms);
                console.log("Saving terms["+index+"]");
                hover_index++;
                this.updatePreview();
            }
            else if(interp.label == "Position1D"){

                let spaces = peircedb.getGeom1DSpaces();
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
                if (termIsIdentifier) {
                    label = `${interp.label}(${space.label},${value})`
                }
    
                let interpretation : models.Position1D = {
                    label: label,
                    name: name,
                    interp_type: interp.label,
                    space: space,
                    value: [+value],
                    node_type: term.node_type,
                }
                terms[index].interpretation = interpretation;
                peircedb.saveTerms(terms);
                console.log("Saving terms["+index+"]");
                hover_index++;
                this.updatePreview();
            }
            else if(interp.label == "Geom1D Transform"){
                
                let spaces = peircedb.getGeom1DSpaces();
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
                if (termIsIdentifier) {
                    label = `${interp.label}(${domain.label},${codomain.label})`
                }
    
    
                let interpretation : models.Geom1DTransform = {
                    label: label,
                    name: name,
                    interp_type: interp.label,
                    domain: domain,
                    codomain: codomain,
                    node_type: term.node_type,
                }
                terms[index].interpretation = interpretation;
                peircedb.saveTerms(terms);
                console.log("Saving terms["+index+"]");
                hover_index++;
                this.updatePreview();
            }
        }

        await this.check()
    }

    private isHoveredTerm(term : models.Term) : boolean {
        let loc = this.getActiveCursorLocation();
        let condition = (loc && term.fileName == vscode.window.activeTextEditor?.document.fileName 
            && term.positionStart.line <= loc.line && term.positionEnd.line >= loc.line);
        if (condition == null) return false;
        return condition;
    }

    private displayTerm(term : models.Term, editing: boolean) : string {
        let full : string = "";
        if (term) {
            if (editing)
                full += `<pre style="color: lightgreen">${JSON.stringify(term, undefined, 2)}</pre></b>`
            else
                full += "<pre>" + JSON.stringify(term, undefined, 2) + "</pre>"
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
        let terms = this.getHoveredTerms();
        for (let i = 0; i < terms.length; i++)
            contents += this.displayTerm(terms[i], i == index);
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
    //constructor(private provider: TermsTree) { }
    constructor(private provider: PeirceTree, private iv : InfoView) { }

    removeTerm(item: TermItem) {
        return this.provider.removeItem(item.id);
    }
    checkTerm(item: TermItem) {
        return this.provider.checkItem(item.id, 'done');
    }
    uncheckTerm(item: TermItem) {
        return this.provider.checkItem(item.id, 'pending');
    }
    checkAllTerms(data: any): void {
        const children = data.children;
        if (!children) { return; }

        for (let index = 0; index < children.length; index++) {
            const current = children[index];
            this.checkTerm(current);
        }
    }
    uncheckAllTerms(data: any): void {
        const children = data.children;
		
        if (!children) { return; }

        for (let index = 0; index < children.length; index++) {
            const current = children[index];
            this.uncheckTerm(current);
        }
    }
    removeAllTerms(data: any): void {
        const children = data.children;
		
        if (!children) { return; }

        for (let index = 0; index < children.length; index++) {
            const current = children[index];
            this.removeTerm(current);
        }
    }
    openTerm(item: TermItem) {
        return this.provider.openItem(item.id);
    }
    openTermFromId(id: string) {
        return this.provider.openItem(id);
    }
    copyTerm(item: TermItem) {
        return this.provider.copyItem(item.id);
    }
    editTerm(item: TermItem):void {
        console.log(item.id);
        this.iv.editSelectedTermItem(item)
    }
    addSpace():void{
        console.log('RUNNING IV ADD SPACE')
        this.iv.addSpace()
    }

}
export class PeirceTree implements vscode.TreeDataProvider<TermItem> {

	private _onDidChangeTreeData: vscode.EventEmitter<TermItem | undefined | null | void> = new vscode.EventEmitter<TermItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<TermItem | undefined | null | void> = this._onDidChangeTreeData.event;

	refresh(): void {
        console.log('calling source data')
	    this.sourceData();
        console.log('finished source data?')
	    this._onDidChangeTreeData.fire(null);
	}

	sourceData(): void {
	    this.data = [];
	    this.data = [
            new TermItem('Table of Terms', undefined, undefined, '$menu-pending'),
            new TermItem('Constructors', undefined, undefined, '$menu-pending'),
            new TermItem('Spaces', undefined, undefined, '$Space')
        ];
        console.log("In terms tree")
        console.log('SOURCING DATA')
        console.log('SOURCE THAT DATA')
	    const annotations = peircedb.getTerms();
        console.log('')
        console.log(annotations)
        const fileName = vscode.window.activeTextEditor?.document.fileName;
        let numFileAnnotations = 0;
	    for (let term in annotations) {
            if (annotations[term].fileName != fileName)
                continue;
	        const termItem = createTermItem(annotations[term]);
            numFileAnnotations += 1;
            this.data[0].addChild(termItem);
	    }
        // this needs to be changed s.t. it has the right number of annotations for the file lol
	    this.data[0].label += ` (${numFileAnnotations})`;


	    const constructors = peircedb.getConstructors() || ([]);
        console.log(constructors)
	    for (let term in constructors) {
            //if (constructors[term].fileName != vscode.window.activeTextEditor?.document.fileName)
            //    continue;
	        const termItem = createConsTermItem(constructors[term]);
            this.data[1].addChild(termItem);
	    }
        // same here
	    this.data[1].label += ` (${constructors.length})`;

        const db = peircedb.getPeirceDb()

        console.log('heres my db?')
        console.log(db)

	    const spaces = 
            (peircedb.getTimeSpaces() || [])
            .concat(peircedb.getGeom1DSpaces() || [])
            .concat(peircedb.getGeom3DSpaces() || []);
        console.log("spaces")
        console.log(spaces)
	    for (let s in spaces) {
            const space = spaces[s];
            let termItem : TermItem;
            if (space.space == "Classical Time Coordinate Space"){
                if (space.parent != null){
                    termItem = new TermItem(`${space.label} (Derived from ${space.parent.label}): Origin: ${space.origin} Basis: ${space.basis}`)
                    this.data[2].addChild(termItem);
                }
                else {
                    termItem = new TermItem(`${space.label} : Standard Time Space`);
                    this.data[2].addChild(termItem);
                }
            }
            else if (space.space == "Classical Geom1D Coordinate Space") {
                if (space.parent != null){
                    termItem = new TermItem(`${space.label} (Derived from ${space.parent.label}): Origin: ${space.origin} Basis: ${space.basis}`)
                    const origin = space.origin;
                    this.data[2].addChild(termItem);
                }
                else{
                    termItem = new TermItem(`${space.label} : Standard Geom1D Space`);
                    const origin = space.origin;
                    this.data[2].addChild(termItem);
                }
            }
            else if (space.space == "Classical Geom3D Coordinate Space") {
                if (space.parent != null){
                    termItem = new TermItem(`${space.label} (Derived from ${space.parent.label}): Origin: ${space.origin} Basis: ${space.basis}`)
                    const origin = space.origin;
                    this.data[2].addChild(termItem);
                }
                else{
                    termItem = new TermItem(`${space.label} : Standard Geom3D Space`);
                    const origin = space.origin;
                    this.data[2].addChild(termItem);
                }
            }
            else {
            }
            //const origin = space.origin;
            //this.data[1].addChild(termItem);
	    }
	    this.data[2].label += ` (${spaces.length})`;
	}

	removeItem(id: string | undefined): void {
	    const terms = peircedb.getTerms();
	    const indexToRemove = terms.findIndex((item: { id: Number }) => {
	        return item.id.toString() === id;
	    });

	    if (indexToRemove >= 0) {
	        terms.splice(indexToRemove, 1);
	    }

	    peircedb.saveTerms(terms);
	    setDecorations();
	}

	checkItem(id: string | undefined, status: 'pending' | 'done'): void {
	    const terms = peircedb.getTerms();
	    const index = terms.findIndex((item: { id: Number }) => {
	        return item.id.toString() === id;
	    });

	    if (index >= 0) {
	        terms[index].status = status;
	    }

	    peircedb.saveTerms(terms);
	}

	openItem(id: string | undefined): void {
	    const terms = peircedb.getTerms();
	    const index = terms.findIndex((item: { id: Number }) => {
	        return item.id.toString() === id;
	    });

	    if (index >= 0) {
	        const term = terms[index];
	        const fileName = term.fileName;
	        const fileLine = term.fileLine;

	        if (fileName.length <= 0) {
	            return;
	        }

	        var openPath = vscode.Uri.file(fileName);
	        vscode.workspace.openTextDocument(openPath).then(doc => {
	            vscode.window.showTextDocument(doc).then(editor => {
	                var range = new vscode.Range(fileLine, 0, fileLine, 0);
	                editor.revealRange(range);

	                var start = new vscode.Position(term.positionStart.line, term.positionStart.character);
	                var end = new vscode.Position(term.positionEnd.line, term.positionEnd.character);
	                editor.selection = new vscode.Selection(start, end);

	                var range = new vscode.Range(start, start);
	                editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
	            });
	        });
	    }
	}

	copyItem(id: string | undefined): void {
	    const terms = peircedb.getTerms();
	    const index = terms.findIndex((item: { id: Number }) => {
	        return item.id.toString() === id;
	    });

	    if (index === -1) {
	        return;
	    }

	    const content = terms[index].text;
	    vscode.env.clipboard.writeText(content).then(() => {
	        vscode.window.showInformationMessage('Term copied successfully');
	    });
	}

	data: TermItem[];

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

	getTreeItem(element: TermItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
	    return element;
	}

	getChildren(element?: TermItem | undefined): vscode.ProviderResult<TermItem[]> {
	    if (element === undefined) {
	        return this.data;
	    }
	    return element.children;
	}
}

class OpenTermCommand implements vscode.Command {
	command = 'code-annotation.openTermFromId';
	title = 'Open File';
	arguments?: any[];

	constructor(id: string) {
	    this.arguments = [id];
	}
}

export class TermItem extends vscode.TreeItem {
	children: TermItem[] | undefined;

	constructor(label: string, children?: TermItem[] | undefined, termId?: string | undefined, context?: string | undefined) {
	    super(
	        label,
	        children === undefined ? vscode.TreeItemCollapsibleState.None :
	            vscode.TreeItemCollapsibleState.Expanded);
	    this.children = children;
	    if (termId) {
	        this.id = termId;
	    }
	    if (context) {
	        this.contextValue = context;
	    }
	}

	addChild(element: TermItem) {
	    if (this.children === undefined) {
	        this.children = [];
	        this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
	    }
	    this.children.push(element);
	}
}
