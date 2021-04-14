import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

let storageLocation : string = '';
const annotationFile : string = 'annotations.json';

export const getAnnotationFilePath = (): string => {
    return path.join(storageLocation, annotationFile);
};

export const initializeStorageLocation = (location: string) => {
    if (location) {
        storageLocation = location;
        console.log("exists? " + fs.existsSync(storageLocation))
        if (!fs.existsSync(storageLocation)) {
            fs.mkdirSync(storageLocation, { recursive: true });
        }
        const extensionFilePath = getAnnotationFilePath();
        console.log("ext exists? " + !fs.existsSync(extensionFilePath))
        if (!fs.existsSync(extensionFilePath)) {
            console.log("writing json to " + extensionFilePath)
            fs.writeFileSync(extensionFilePath, '{"notes":[], "nextId":1, "spaces":[{"label": "time_std_space", "frame": null}], "frames":[], "points":[], "vectors":[], "measurement_systems":[]}');
        }
    } else {
	  	throw new Error('Error loading Storage for Extension');
    }
};

export interface Color {
    dark: string,
    light: string,
}

export interface Configuration {
    showFileName: boolean;
    customTODO: string[];
    enableDecoration: boolean;
    decorationColors: Color;
}

export const getConfiguration = (): Configuration => {
    const configuration = vscode.workspace.getConfiguration('code-annotation');
    const showFileName = configuration.get('showFileName');
    const customTODO: string[] = configuration.get('customTODO') || [];
    const enableDecoration : boolean = configuration.get('annotationBG.enableDecoration') || false;
    const decorationDarkColor: string = configuration.get('annotationBG.color.dark') || '';
    const decorationLightColor: string = configuration.get('annotationBG.color.light') || '';
    const config: Configuration = {
        showFileName: typeof showFileName === 'boolean' ? showFileName : false,
        customTODO: customTODO,
        enableDecoration: enableDecoration,
        decorationColors: {
            dark: decorationDarkColor,
            light: decorationLightColor,
        }
    };

    return config;
};