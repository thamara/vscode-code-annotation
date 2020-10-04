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
        storageLocation = path.resolve(location);
        console.log('Save location is: ' + storageLocation);
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

export interface Configuration {
    showFileName: boolean;
    saveLocation: string;
}

export const getConfiguration = (): Configuration => {
    const configuration = vscode.workspace.getConfiguration();
    const showFileName = configuration.get('showFileName');
    const saveLocation = configuration.get('saveLocation');

    const config: Configuration = {
        showFileName: typeof showFileName === 'boolean' ? showFileName : false,
        saveLocation: typeof saveLocation === 'string' ? saveLocation : ''
    };

    return config;
};