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
        if (!fs.existsSync(storageLocation)) {
            fs.mkdirSync(storageLocation, { recursive: true });
        }
        const extensionFilePath = getAnnotationFilePath();
        if (!fs.existsSync(extensionFilePath)) {
            fs.writeFileSync(extensionFilePath, '{"notes":[], "nextId":1}');
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
    showCreatedAtTimestamp: boolean;
    showResolvedAtTimestamp: boolean;
    customTODO: string[];
    enableDecoration: boolean;
    decorationColors: Color;
}

export const getConfiguration = (): Configuration => {
    const configuration = vscode.workspace.getConfiguration('code-annotation');
    const showFileName : boolean = configuration.get('showFileName') || false;
    const showCreatedAtTimestamp : boolean = configuration.get('showTimeStampForNoteCreation') || false;
    const showResolvedAtTimestamp : boolean = configuration.get('showTimeStampForNoteResolution') || false;
    const customTODO: string[] = configuration.get('customTODO') || [];
    const enableDecoration : boolean = configuration.get('annotationBG.enableDecoration') || false;
    const decorationDarkColor: string = configuration.get('annotationBG.color.dark') || '';
    const decorationLightColor: string = configuration.get('annotationBG.color.light') || '';
    const config: Configuration = {
        showFileName: showFileName,
        showCreatedAtTimestamp: showCreatedAtTimestamp,
        showResolvedAtTimestamp: showResolvedAtTimestamp,
        customTODO: customTODO,
        enableDecoration: enableDecoration,
        decorationColors: {
            dark: decorationDarkColor,
            light: decorationLightColor,
        }
    };

    return config;
};