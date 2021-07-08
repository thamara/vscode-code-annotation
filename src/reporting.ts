import * as vscode from 'vscode';

import { getNotes, Note } from './note-db';
import { getRelativePathForFileName,
         getTimeStampsString } from './utils';

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
    if (note.createdAt)
        result += `Created at ${getTimeStampsString(note.createdAt)}\n`;
    if (note.resolvedAt)
        result += `Resolved at ${getTimeStampsString(note.resolvedAt)}\n`;

    result += '```\n';
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
    const newFile = vscode.Uri.parse('untitled:summary.md');

    vscode.workspace.openTextDocument(newFile).then(summaryFile => {
        const edit = new vscode.WorkspaceEdit();
        let notesSummary = getNotesInMarkdown();

        const existingContentRange = new vscode.Range(new vscode.Position(0, 0),
                                     new vscode.Position(summaryFile.lineCount + 1, 0));
        edit.replace(newFile, existingContentRange, notesSummary);

        return vscode.workspace.applyEdit(edit).then(success => {
            if (success) {
                vscode.window.showTextDocument(summaryFile, /*column=*/undefined, /*preserveFocus=*/false);
            } else {
                vscode.window.showInformationMessage('Error: Code Annotation could not generate a summary');
            }
        });
    });
};
