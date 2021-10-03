import { listOfFilesInDir, listOfUniqueFilesInDir } from "./Util";
import {
  extractSents,
  getAllParagraphs,
  isProbablyName,
  normalizeString,
  preprocessText,
  removeDiacritics,
} from "./Util_NLP";
import * as Path from "path";
import * as fs from "fs";

const labeled_sents_raw_path = "labeled_sents_raw.txt";
const labeled_sents_preprocessed_path = "labeled_sents_preprocessed.txt";

export async function buildFastTextFormattedFileRaw(
  rootDir: string,
  whichLabels: number[]
): Promise<void> {
  const mymap = new Map();
  const files = listOfUniqueFilesInDir(
    rootDir,
    true,
    new Set([
      "Businesspeople_Entrepreneurs",
      "Nobility",
      "Classical_Music",
      "Dance",
      "Entertainment_Awards",
      "Music_Theory",
      "Theater",
      "Geography_Travel",
      "Sculpture"
    ])
  );
  let sentencesCnt = 0;
  let formattedOutput = "";
  for (const file of files) {
    const paragraphs = getAllParagraphs(file);
    const sentences: string[] = [];
    for (const par of paragraphs) {
      sentences.push(...extractSents(par));
    }
    const labels = file.split(Path.sep); // ignore position [0]
    let articleTitle = Path.basename(labels[labels.length - 1], ".txt");
    labels[labels.length - 1] = articleTitle;
    for (let i = 1; i < labels.length; i++) {
      labels[i] = normalizeString(labels[i]).toLowerCase();
    }
    let formattedLabels = "";
    for (let i = 0; i < whichLabels.length; i++) {
      if (whichLabels[i] >= labels.length || whichLabels[i] < 1) {
        throw new Error(
          "Selected labels are out of range (must be at most the dept of your file tree)"
        );
      }
      formattedLabels += `__label__${labels[whichLabels[i]]} `;
    }
    sentencesCnt += sentences.length;

    articleTitle = articleTitle.replace(/_+/giu, " ");
    const isName = isProbablyName(articleTitle);
    const articleNameSplitted = articleTitle.split(/\s+/giu);
    const lastName = articleNameSplitted[articleNameSplitted.length - 1];
    const maybeFirstName = articleNameSplitted[articleNameSplitted.length - 2];
    const lastNameReplaceRegex = new RegExp(
      `(?<!(\\w|${maybeFirstName}\\s+))${lastName}(?!\\w)`,
      "gui"
    );
    for (let sent of sentences) {
      if (isName) {
        sent = removeDiacritics(sent);
        sent = sent.replace(lastNameReplaceRegex, articleTitle);
      }
      formattedOutput += formattedLabels + sent + "\n";
    }
  }
  console.log("number of sentences:", sentencesCnt);
  fs.writeFileSync(labeled_sents_raw_path, formattedOutput);
}

export async function buildFastTextFormattedFilePreprocessed(): Promise<void> {
  if (!fs.existsSync(labeled_sents_raw_path)) {
    throw new Error(`${labeled_sents_raw_path} does not exist`);
  }
  // buildFastTextFormattedFileRaw(rootDir, numOfLabels);
  // preprocessText("Wee Willie Keeler, byname of William Henry Keeler,  (born March 3, 1872, Brooklyn, New York, U.S.—died January 1, 1923, Brooklyn, N.B.A.), American professional baseball player nicknamed because his height was only 5 feet 41/2 inches (about 1.6 metres), whose place-hitting ability (“Hit ’em where they ain’t”) made up for his lack of power.");
  // preprocessText("Jhon F. Kennedy was good. I saw you yesterday at the park");
  // preprocessText("i am using the saw to cut the wood");
  // preprocessText("Thomas Johnson,(born Nov. 4, 1732, Calvert county, Md. [U.S.]—died  A. Oct. 26, 1819, Rose Hill, near Frederick, Md.), American Revolutionary War leader, first governor of Maryland (1777–79), and associate justice of the United States Supreme Court (1792–93).")
  // preprocessText("By far Britain’s largest metropolis, it is also the country’s economic, transportation, and cultural centre.");
  // preprocessText("David Starr Jordan,  (born Jan. 19, 1851, Gainesville, N.Y., U.S.—died  Sept. 19, 1931, Stanford, Calif.), naturalist, educator, and the foremost American ichthyologist of his time.")
  // preprocessText("Édouard Armand Isidore Hippolyte Lartet,  (born April 1801, Saint Guiraud, near Castelnau-Barbarens, Fr.—died  January 1871, Seissan), French geologist, archaeologist, and a principal founder of paleontology, who is chiefly credited with discovering man’s earliest art and with establishing a date for the Upper Paleolithic Period of the Stone Age.")
  // preprocessText("Ibn Waḥshīyah,  (flourished c. 900), Middle Eastern agriculturist and toxicologist alleged to have written al-Fillāḥah an-Nabaṭīyah (“Nabatean Agriculture”), a major treatise dealing with plants, water sources and quality, weather conditions, the causes of deforestation, soils and their improvement, crop cultivation, and other similar subjects.")
  // preprocessText("__label__biology__label__agriculture__label__ibn_wahshiyah Ibn Waḥshīyah,  (flourished c. 900), Middle Eastern agriculturist and toxicologist alleged to have written al-Fillāḥah an-Nabaṭīyah (“Nabatean Agriculture”), a major treatise dealing with plants, water sources and quality, weather conditions, the causes of deforestation, soils and their improvement, crop cultivation, and other similar subjects.",
  // /(__label__[a-z_]+)+\s/gui)
  const lines = fs
    .readFileSync(labeled_sents_raw_path)
    .toString()
    .trim()
    .split("\n");

  let processedFile = "";
  let cnt = 0;
  for (const line of lines) {
    const processedLine = preprocessText(line, /(__label__[a-z_0-9]+\s)+/giu);
    if (processedLine.length > 0) {
      processedFile += processedLine + "\n";
    }
    cnt++;
    if (cnt % 50000 === 0) {
      console.log("number of processed sentences:", cnt, "/", lines.length);
    }
  }
  fs.writeFileSync(labeled_sents_preprocessed_path, processedFile);
}
