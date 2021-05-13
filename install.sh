cd /peirce/Peirce-vscode-api
pip install -r requirements.txt

nvm install node
nvm use node
npm install
npm install -g vsce
vsce package
code --install-extension /peirce/Peirce-vscode/code-annotation-0.0.1.vsix