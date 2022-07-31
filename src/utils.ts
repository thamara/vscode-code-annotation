import * as vscode from 'vscode';

export const getRelativePathForFileName = (fullPathFileName: string): string => {
    const workspacePath = vscode.workspace.rootPath;
    if (workspacePath) {
        let relativePath = fullPathFileName.replace(workspacePath, '');
        if (relativePath && (relativePath.charAt(0) === '/' || relativePath.charAt(0) === '\\')) {
            relativePath = relativePath.substr(1);
            return relativePath;
        }
    }
    return fullPathFileName;
};

export const getTimeStampsString = (date: Date): string => {
    return date.toLocaleString().substr(0, 16).replace('T', ' ');
};