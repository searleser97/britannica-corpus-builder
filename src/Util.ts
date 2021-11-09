import { assert } from "console";
import * as fs from "fs";
import * as Path from "path";

export type labeledSent_t = { readonly label: string; readonly sent: string };
export type Range = {
  left: number;
  right: number;
};

/**
 * Inclusive random in the range [min, max]
 */
export function random(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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

/**
 * Does lower bound binary seach over given array
 * @param {number[]} array non-decreasingly sorted array
 * @param {number} target number to search for
 * @param {number} left left boundary
 * @param {number} right right boundary
 * @return index of the item which compares greater or equal than `target`
 */
export function lowerBound(
  array: number[],
  target: number,
  left: number,
  right: number
): number {
  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    if (target <= array[mid]) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }
  return left;
}

/**
 * Create a map representing the inclusive ranges where a label
 * is continuous.
 * @param {labeledSent_t} sentsList Sentences labeled
 * @returns Return a map<string, Range[]> where the key is
 * the label and the array Ranges represents the inclusive [] range of
 * indexes where a label is continuous.
 */
export function createArrayOfLabeledSentencesByRange(
  sentsList: labeledSent_t[]
): Map<string, Range[]> {
  const labelsByRange = new Map<string, Range[]>();

  if (sentsList.length == 0) return labelsByRange;

  let lastLabel = sentsList[0].label,
    left = 0;
  for (let i = 1; i < sentsList.length; i++) {
    if (lastLabel != sentsList[i].label) {
      const currentArray = labelsByRange.get(lastLabel) ?? [];
      currentArray.push({ left: left, right: i - 1 });
      labelsByRange.set(lastLabel, currentArray);

      left = i;
      lastLabel = sentsList[i].label;
    }
  }

  const currentArray = labelsByRange.get(lastLabel) ?? [];
  currentArray.push({ left: left, right: sentsList.length - 1 });
  labelsByRange.set(lastLabel, currentArray);

  return labelsByRange;
}

/**
 * Loads labeled sentences from a given file
 * @param {string} filePath Path to the file containing labeled sentences in Fasttext format
 * @param {RegExp} regex Pattern that must be followed by a sentence to be added to the result
 * - default: sentences must contain at least one word formed with just alphabet letters
 * @returns An array of `LabeledSent`
 */
export function load(
  filePath: string,
  regex = /([^a-z]*(?<![a-z])[a-z]+){1,}.*/iu
): labeledSent_t[] {
  const rawSents = fs
    .readFileSync(filePath)
    .toString()
    .split(/\r\n|\n/giu);
  const labeledSents: labeledSent_t[] = [];
  for (const labeledSent of rawSents) {
    const firstSpacePos = labeledSent.indexOf(" ");
    const rawLabel = labeledSent.substring(0, firstSpacePos);
    const label = rawLabel.replace(/__label__/iu, "");
    const rawSent = labeledSent.substring(firstSpacePos + 1);
    const sentWithoutTags = rawSent.replace(/,?"<.+>"?\.?/iu, "");
    const sentWithoutFinalDot =
      sentWithoutTags[sentWithoutTags.length - 1] === "."
        ? sentWithoutTags.substring(0, sentWithoutTags.length - 1)
        : sentWithoutTags;
    const sentWithoutSurroundingQuotes =
      sentWithoutFinalDot.startsWith('"') && sentWithoutFinalDot.endsWith('"')
        ? sentWithoutFinalDot.substring(1, sentWithoutFinalDot.length - 1)
        : sentWithoutFinalDot;
    if (!regex || (regex && regex.test(sentWithoutSurroundingQuotes))) {
      labeledSents.push({
        label,
        sent: sentWithoutSurroundingQuotes,
      });
    }
  }
  return labeledSents;
}

export function split_into_train_and_test(
  datasetPath: string,
  trainProportion: number
): [string[], string[]] {
  const l_ranges = createArrayOfLabeledSentencesByRange(
    load(datasetPath, undefined)
  );
  const toTestSet = new Set();
  for (const [_label, ranges] of l_ranges) {
    let totalSents = 0;
    const acum = [];
    for (const rng of ranges) {
      totalSents += rng.right - rng.left + 1;
      acum.push(totalSents);
    }
    const sentsCnt = Math.floor(totalSents * (1 - trainProportion));
    const valueInPos = new Map<number, number>();
    let upperLimit = totalSents;
    for (let i = 0; i < sentsCnt; i++) {
      const rand = random(1, upperLimit);
      let index = rand;
      if (valueInPos.has(rand)) {
        index = valueInPos.get(rand);
      }
      const posInAcum = lowerBound(acum, index, 0, acum.length - 1) - 1;
      const origPos =
        (posInAcum < 0 ? ranges[0].left - 1 : ranges[posInAcum].right) +
        index -
        (posInAcum < 0 ? 0 : acum[posInAcum]);
      toTestSet.add(origPos);
      valueInPos.set(rand, upperLimit);
      upperLimit--;
    }
  }

  const dataset = fs.readFileSync(datasetPath).toString().trim().split("\n");
  const trainSet = [];
  const testSet = [];
  for (let i = 0; i < dataset.length; i++) {
    if (toTestSet.has(i)) {
      testSet.push(dataset[i]);
    } else {
      trainSet.push(dataset[i]);
    }
  }
  return [trainSet, testSet];
}
