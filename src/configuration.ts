import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

let storageLocation : string = '';
const annotationFile : string = 'annotations.json';

// gets the file path of the annotation file
export const getAnnotationFilePath = (): string => {
    return path.join(storageLocation, annotationFile);
};

// 
export const initializeStorageLocation = (location: string) => {
    // check to see if the location exists
    if (location) {
        storageLocation = location;
        console.log("exists? " + fs.existsSync(storageLocation))
        // if it doesn't create the location
        if (!fs.existsSync(storageLocation)) {
            fs.mkdirSync(storageLocation, { recursive: true });
        }
        
        const extensionFilePath = getAnnotationFilePath();
        console.log("ext exists? " + !fs.existsSync(extensionFilePath))
        // check to see if extension exists by looking for annotation file, then write to that
        if (true || !fs.existsSync(extensionFilePath)) {
            console.log("writing json to " + extensionFilePath)
            fs.writeFileSync(extensionFilePath, '{"notes":[], "nextId":1, "time_coordinate_spaces":[], "geom1d_coordinate_spaces":[]}');
        }
    } else {
        // throw error f location does not exist
	  	throw new Error('Error loading Storage for Extension');
    }
};
export interface Color {
    dark: string,
    light: string,
    error: string
}

export interface Configuration {
    showFileName: boolean;
    customTODO: string[];
    enableDecoration: boolean;
    decorationColors: Color;
}
/**
 * 
 * @returns Current workspace config
 */
export const getConfiguration = (): Configuration => {
    const configuration = vscode.workspace.getConfiguration('code-annotation');
    const showFileName = configuration.get('showFileName');
    const customTODO: string[] = configuration.get('customTODO') || [];
    const enableDecoration : boolean = configuration.get('annotationBG.enableDecoration') || false;
    const decorationDarkColor: string = configuration.get('annotationBG.color.dark') || '';
    const decorationLightColor: string = configuration.get('annotationBG.color.light') || '';
    const decorationErrorColor: string = configuration.get('annotationBG.color.error') || '';
    const config: Configuration = {
        showFileName: typeof showFileName === 'boolean' ? showFileName : false,
        customTODO: customTODO,
        enableDecoration: enableDecoration,
        decorationColors: {
            dark: decorationDarkColor,
            light: decorationLightColor,
            error: decorationErrorColor
        }
    };

    return config;
};