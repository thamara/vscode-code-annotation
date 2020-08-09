import * as vscode from 'vscode';
import * as path from "path";
import * as fs from "fs";

export const getAnnotationsFile = (): string => {
	const workspaceFolder = vscode.workspace.rootPath;
	if (workspaceFolder) {
		const extensionDirPath = path.join(workspaceFolder, ".vscode", "code-annotation");
		if (!fs.existsSync(extensionDirPath)) {
			fs.mkdirSync(extensionDirPath, { recursive: true });
		}
		const extensionFilePath = path.join(extensionDirPath, "annotations.json");
		if (!fs.existsSync(extensionFilePath)) {
			fs.writeFileSync(extensionFilePath, '{"notes":[], "nextId":1}');
		}
		return extensionFilePath;
	} else {
	  	throw new Error("workspace not found");
	}
};