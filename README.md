# Code Annotation - Visual Studio Code Extension

Create and track annotations from your source code without actually committing comments on your code.

![](https://github.com/thamara/vscode-code-annotation/blob/main/demo/Code%20Annotation.png)

### Attention

This is still **work in progress**. You are welcome to test and give feedback on the extension, but we cannot guarantee compatibility with upcoming releases.

To test the extension download the [VSIX file](https://github.com/thamara/vscode-code-annotation/blob/master/code-annotation-0.0.1.vsix) and follow the steps on your VSCode:

1. Go to the "Extensions" pane
2. Click on the ... on the top right of the "Extensions" pane
3. Select "Install from VSIX"
4. Select the VSIX file you download and click install

The "Code Annotation" can be found in the Activity pane.
Feel free to open [issues](https://github.com/thamara/vscode-code-annotation/issues) and suggest [new features](https://github.com/thamara/vscode-code-annotation/projects/1) for the extension.

## Features

- Create an annotation from the source code, selecting the portion of code, right-clicking and adding an annotation
- Keybinds for creating a new note from selection (`Ctrl/Cmd + alt + n)`, or without selection, aka Plain note (`Ctrl/Cmd + alt + p`)
- Track annotations on its own pane
- Check/Uncheck items as you complete them
- Generate a report in Markdown with the pending and complete items

## Development

- For the development you'll need to use VSCode
- Install Node/Npm
- After forking/cloning the repository, run:
```
npm install
npm run compile
```
- And to run/test the extension, go the the Run view and hit the green button on `Run Extension`. This will open a new VSCode window with the extension enabled.

## Requirements

TODO

## Extension Settings

TODO

-----------------------------------------------------------------------------------------------------------

