import * as vscode from 'vscode';

export interface Configuration {
    showFileName: boolean;
}

export const getConfiguration = (): Configuration => {
    const configuration = vscode.workspace.getConfiguration();
    const showFileName = configuration.get('showFileName');
    const config: Configuration = {
        showFileName: typeof showFileName === 'boolean' ? showFileName : false
    };

    return config;
};