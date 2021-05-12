# Code Annotation - Visual Studio Code Extension

Annotate and check physically relevant C++ ROS code segments.

## Features

- Highlight physically relevant code segments (`Ctrl/Cmd + alt + p`)
- Annotate identified code segments with extra physical type information (`Ctrl/Cmd + alt + e`)
- Create new spaces derived from the standard frame or from other spaces (`Ctrl/Cmd + alt + s`)
- Check annotations for type errors and infer interpretations for other code segments (`Ctrl/Cmd + alt + c`)
- Open the Peirce Infoview with annotation information for the code segments on the current line (`Ctrl/Cmd + alt + t`)
- All interpretations and code segments are saved to a JSON file and wiil persist if VSCode is closed.

## Development

- For the development you'll need to use VSCode
- Install Node/Npm
- After forking/cloning the repository, run:
```
npm install
npm run compile
```
- And to run/test the extension, open VSCode on this directory. Go the the Run pane and hit the green button on `Run Extension` or press F5. This will open a new VSCode window with the extension enabled.

## API Setup

- This extension uses the API interacts with Peirce VSCode API repository.
- If the API must be running somewhere in order to use most of the extension's features.
- Currently, the API is only set to run locally on 0.0.0.0. This will work for development. When deploying, host the API on a node with a globally resolvable IP address and change the IP in this extension to point to the node hosting the API in the file src/peirce.ts.

### Creating a VSIX file for instalation

- "Compile" the extension as usual
  - `npm install`
- Install vsce
  - `npm install -g vsce`
- Create the VSIX file
  - `vsce package`

### To Install a Compiled VSIX file

1. Go to the "Extensions" pane
2. Click on the ... on the top right of the "Extensions" pane
3. Select "Install from VSIX"
4. Select the VSIX file you downloaded and click install

The "Code Annotation" can be found in the Activity pane.
