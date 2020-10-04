import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { getNotes, Note } from './note-db';
import { getRelativePathForFileName } from './utils';

const getCodeSnippetString = (note: Note): string => {
    const moreThanOneLine = note.positionEnd.line !== note.positionStart.line;
    const firstLineOffset = moreThanOneLine ? note.positionStart.character : 0;
    let codeSnippet = note.codeSnippet;
    if (moreThanOneLine && firstLineOffset) {
        const offsetSpace = Array(firstLineOffset + 1).join(' ');
        codeSnippet = offsetSpace + codeSnippet;
    }
    return codeSnippet;
};

// TODO: We should use Jinja or something like this to generate these markdown files
export const getNoteInMarkdown = (note: Note): string => {
    let result = `### - ${note.text}\n\n`;
    if (note.fileName.length > 0) {
        result += `\`${getRelativePathForFileName(note.fileName)}\`\n\n`;
        result += '```\n';
        result += `${getCodeSnippetString(note)}\n`;
        result += '```\n';
    }
    return result;
};

export const getNotesInMarkdown = (): string => {
    const notes = getNotes();

    let result = '# Code Annotator - Summary\n';
    result += '\n---\n';
    result += '## Pending\n';

    for (let i in notes) {
        const note = notes[i];
        if (note.status === 'pending') {
            result += getNoteInMarkdown(note);
        }
    }

    result += '\n---\n';
    result += '## Done\n';

    for (let i in notes) {
        const note = notes[i];
        if (note.status !== 'pending') {
            result += getNoteInMarkdown(note);
        }
    }

    return result;
};

export const generateMarkdownReport = (): void => {
    const workspaceFolder = vscode.workspace.rootPath;
    // TODO: What if there's no workspace?
    if (workspaceFolder) {
        // TODO: Remove this hardcoded string, it should be a configuration
        const extensionDirPath = path.join(workspaceFolder, '.vscode', 'code-annotation');
        const extensionFilePath = path.join(extensionDirPath, 'summary.md');
        let content = getNotesInMarkdown();
        fs.writeFileSync(extensionFilePath, content);
        var openPath = vscode.Uri.file(extensionFilePath);
        vscode.workspace.openTextDocument(openPath).then(doc => {
            vscode.window.showTextDocument(doc).then(editor => {
            });
        });
    }
};