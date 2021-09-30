import * as fs from "fs";
import * as Path from "path";

/**
 * Replace any symbol that is not alpha-numeric with the one given
 * @param {string} text text to clean
 * @param {string} symbol symbol to use as replacement for non alpha num symbols
 * @return string with only alpha numeric symbols
 */
export function replaceNonAlphaNumSymbolsWith(
  text: string,
  symbol: string,
  symbolsToIgnore: string[] = []
): string {
  const specialSymbolsRegex = new RegExp(`[a-z0-9${symbolsToIgnore.join("")}]+`, "gui");
  const alphaNumMatches = text.match(specialSymbolsRegex);
  return alphaNumMatches?.join(symbol) ?? "";
}

export function normalizeString(str: string): string {
  return replaceNonAlphaNumSymbolsWith(str, "_").replaceAll(/_+/giu, "_");
}

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
