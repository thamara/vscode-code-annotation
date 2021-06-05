nvm install node
nvm use node
cd /peirce/Peirce-vscode
npm install
npm install -g vsce
vsce package
code --install-extension /peirce/Peirce-vscode/code-annotation-0.0.1.vsix

cd /peirce/Peirce-vscode-api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cd /peirce