import * as vscode from 'vscode';
import * as path from "path";
import * as fs from "fs";

import { getNotes } from './utils';

// TODO: We should use Jinja or something like this to generate these markdown files
export const getNoteInMarkdown = (text: string, fileName: string, codeSnippet: string): string => {
    let result = `### ${text}\n\n`;
    result += `${fileName}\n`;
    result += `\`\`\`\n`;
    result += `${codeSnippet}\n`;
    result += `\`\`\`\n`;
    return result;
};

export const getNotesInMarkdown = (): string => {
    const notes = getNotes();

    let result = `# Code Annotator - Summary\n`;
    result += `\n---\n`;
    result += `## Pending\n`;

    for (let i in notes) {
        const note = notes[i];
        if (note.status === "pending") {
            result += getNoteInMarkdown(note.text, note.fileName, note.codeSnippet);
        }
    }

    result += `\n---\n`;
    result += `## Done\n`;

    for (let i in notes) {
        const note = notes[i];
        if (note.status !== "pending") {
            result += getNoteInMarkdown(note.text, note.fileName, note.codeSnippet);
        }
    }

    return result;
};

export const generateMarkdownReport = (): void => {
    const workspaceFolder = vscode.workspace.rootPath;
    // TODO: What if there's no workspace?
    if (workspaceFolder) {
        // TODO: Remove this hardcoded string, it should be a configuration
        const extensionDirPath = path.join(workspaceFolder, ".vscode", "code-annotation");
        const extensionFilePath = path.join(extensionDirPath, "summary.md");
        let content = getNotesInMarkdown();
        fs.writeFileSync(extensionFilePath, content);
        var openPath = vscode.Uri.file(extensionFilePath);
        vscode.workspace.openTextDocument(openPath).then(doc => {
            vscode.window.showTextDocument(doc).then(editor => {
            });
        });
    }
};