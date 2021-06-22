import * as vscode from 'vscode';

import { getTerms } from '../peircedb';
import { Term } from '../models'
import { getRelativePathForFileName } from '../utils';

const getCodeSnippetString = (term: Term): string => {
    const moreThanOneLine = term.positionEnd.line !== term.positionStart.line;
    const firstLineOffset = moreThanOneLine ? term.positionStart.character : 0;
    let codeSnippet = term.codeSnippet;
    if (moreThanOneLine && firstLineOffset) {
        const offsetSpace = Array(firstLineOffset + 1).join(' ');
        codeSnippet = offsetSpace + codeSnippet;
    }
    return codeSnippet;
};

// TODO: We should use Jinja or something like this to generate these markdown files
export const getNoteInMarkdown = (term: Term): string => {
    let result = `### - ${term.text}\n\n`;
    if (term.fileName.length > 0) {
        result += `\`${getRelativePathForFileName(term.fileName)}\`\n\n`;
        result += '```\n';
        result += `${getCodeSnippetString(term)}\n`;
        result += '```\n';
    }
    return result;
};

export const getNotesInMarkdown = (): string => {
    const terms = getTerms();

    let result = '# Code Annotator - Summary\n';
    result += '\n---\n';
    result += '## Pending\n';

    for (let i in terms) {
        const term = terms[i];
        if (term.status === 'pending') {
            result += getNoteInMarkdown(term);
        }
    }

    result += '\n---\n';
    result += '## Done\n';

    for (let i in terms) {
        const term = terms[i];
        if (term.status !== 'pending') {
            result += getNoteInMarkdown(term);
        }
    }

    return result;
};

export const generateMarkdownReport = (): void => {
    const newFile = vscode.Uri.parse('untitled:summary.md');

    vscode.workspace.openTextDocument(newFile).then(summaryFile => {
        const edit = new vscode.WorkspaceEdit();
        let termsSummary = getNotesInMarkdown();

        const existingContentRange = new vscode.Range(new vscode.Position(0, 0),
                                     new vscode.Position(summaryFile.lineCount + 1, 0));
        edit.replace(newFile, existingContentRange, termsSummary);

        return vscode.workspace.applyEdit(edit).then(success => {
            if (success) {
                vscode.window.showTextDocument(summaryFile, /*column=*/undefined, /*preserveFocus=*/false);
            } else {
                vscode.window.showInformationMessage('Error: Code Annotation could not generate a summary');
            }
        });
    });
};
