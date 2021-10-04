import * as fs from "fs";
import * as Path from "path";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function listOfFilesInDirRecursive(
  dirPath: string,
  files: { filesList: string[] },
  excluded: Set<string>,
  included: Set<string>
): void {
  const filesAndDirs = fs.readdirSync(dirPath);
  for (const fileOrDir of filesAndDirs) {
    if (excluded.has(fileOrDir)) {
      continue;
    }
    if (fs.statSync(Path.join(dirPath, fileOrDir)).isFile()) {
      files.filesList.push(Path.join(dirPath, fileOrDir));
    } else {
      if (included.has(fileOrDir)) {
        listOfFilesInDirRecursive(
          Path.join(dirPath, fileOrDir),
          files,
          excluded,
          included
        );
      }
    }
  }
}

export function listOfFilesInDir(
  dirPath: string,
  recursive: boolean,
  excluded: Set<string>,
  included: Set<string>
): string[] {
  const files = { filesList: [] };
  if (recursive) {
    listOfFilesInDirRecursive(dirPath, files, excluded, included);
  } else {
    const filesAndDirs = fs.readdirSync(dirPath);
    for (const fileOrDir of filesAndDirs) {
      if (
        fs.statSync(Path.join(dirPath, fileOrDir)).isFile() &&
        !excluded.has(Path.basename(fileOrDir))
      ) {
        files.filesList.push(Path.join(dirPath, fileOrDir));
      }
    }
  }
  return files.filesList;
}

export function listOfUniqueFilesInDir(
  dirPath: string,
  recursive: boolean,
  excluded: Set<string>,
  included: Set<string>
): string[] {
  const topics = fs.readFileSync("topics.txt").toString().trim().split("\n");
  const priorityForTopic = new Map<string, number>();
  for (let i = 0; i < topics.length; i++) {
    priorityForTopic.set(topics[i], i);
  }
  const files = listOfFilesInDir(dirPath, recursive, excluded, included);
  const sortedFiles = files.sort((a: string, b: string) => {
    const splittedA = a.split(Path.sep);
    const splittedB = b.split(Path.sep);
    const topicA = splittedA[splittedA.length - 2];
    const topicB = splittedB[splittedB.length - 2];
    if (
      (priorityForTopic.get(topicA) ?? 100) <
      (priorityForTopic.get(topicB) ?? 100)
    ) {
      return -1;
    } else {
      return 1;
    }
  });
  const uniqueFiles = new Map<string, string>();
  for (const file of sortedFiles) {
    const basename = Path.basename(file);
    if (!uniqueFiles.has(basename)) {
      uniqueFiles.set(basename, file);
    }
  }
  console.log("total files:", files.length);
  console.log("unique files:", uniqueFiles.size);
  console.log("repeated:", files.length - uniqueFiles.size);
  return Array.from(uniqueFiles.values());
}
