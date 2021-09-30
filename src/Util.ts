import * as fs from "fs";
import * as Path from "path";


export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function listOfFilesInDirRecursive(
  dirPath: string,
  files: { filesList: string[] }
): void {
  const filesAndDirs = fs.readdirSync(dirPath);
  for (const fileOrDir of filesAndDirs) {
    if (fs.statSync(Path.join(dirPath, fileOrDir)).isFile()) {
      files.filesList.push(Path.join(dirPath, fileOrDir));
    } else {
      listOfFilesInDirRecursive(Path.join(dirPath, fileOrDir), files);
    }
  }
}

export function listOfFilesInDir(
  dirPath: string,
  recursive: boolean
): string[] {
  const files = { filesList: [] };
  if (recursive) {
    listOfFilesInDirRecursive(dirPath, files);
  } else {
    const filesAndDirs = fs.readdirSync(dirPath);
    for (const fileOrDir of filesAndDirs) {
      if (fs.statSync(Path.join(dirPath, fileOrDir)).isFile()) {
        files.filesList.push(Path.join(dirPath, fileOrDir));
      }
    }
  }
  return files.filesList;
}
