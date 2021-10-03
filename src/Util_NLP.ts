import winkNLP from "wink-nlp";
import model from "wink-eng-lite-web-model";
import * as fs from "fs";
import contractions from "expand-contractions";

const nlp = winkNLP(model);
const myContractions = new contractions.Contractions({
  "'em": "them",
  "'s": "",
});

const abbreviationExpansionOf = new Map<string, string | undefined>([
  ["u.s.", "USA"],
  ["n.y.", "New York"],
  ["calif.", "California"],
  ["jan.", "January"],
  ["feb.", "February"],
  ["mar.", "March"],
  ["apr.", "April"],
  ["jun.", "June"],
  ["jul.", "July"],
  ["aug.", "August"],
  ["sep.", "September"],
  ["sept.", "September"],
  ["oct.", "October"],
  ["nov.", "November"],
  ["dec.", "December"],
]);

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
  return replaceNonAlphaNumSymbolsWith(str, "_").replace(/_+/giu, "_");
}

/**
 * transform words to its lemma
 * @param {string} text text to transform to lemmas
 * @return string with words replaced by its lemmas
 */
export function lemmatize(text: string): string {
  const doc = nlp.readDoc(text);
  return doc.tokens().out(nlp.its.lemma).join(" ");
}

export function extractSents(text: string): string[] {
  const doc = nlp.readDoc(text);
  return doc.sentences().out();
}

export function getFirstParagraph(filePath: string): string {
  return getAllParagraphs(filePath)[0];
}

export function getAllParagraphs(filePath: string): string[] {
  return fs.readFileSync(filePath).toString().trim().split(/\n+/gui);
}

export function removeNumbers(text: string): string {
  return text
    .replace(/[^ ]*\d+[^ ]*/giu, "")
    .replace(/ +/giu, " ")
    .trim();
}

export function removeNonAlphaNumSymbols(
  text: string,
  symbolsToKeep: string[] = []
): string {
  return replaceNonAlphaNumSymbolsWith(text, " ", symbolsToKeep)
    .replace(/ +/giu, " ")
    .trim();
}

export function removeStopWords(text: string): string {
  const doc = nlp.readDoc(text);
  return doc
    .tokens()
    .filter((tkn) => tkn.out(nlp.its.stopWordFlag) === false)
    .out(nlp.as.array)
    .join(" ");
}

export function expandContractions(text: string): string {
  text = text.replace(/[`’]/giu, "'");
  return myContractions.expand(contractions.expand(text));
}

export function removeDiacritics(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/giu, "");
}

export function removeSingleCharacters(text: string): string {
  return text.replace(/(^|(?<!\w))\w($|(?!\w))/gui, "");
}

export function removeExtraWhiteSpaces(text: string): string {
  return text.replace(/\s+/gui, " ");
}

export function preprocessText(text: string, labelsRegex?: RegExp): string {
  let processedText = text;
  let labels = "";

  if (labelsRegex) {
    labels = (text.match(labelsRegex) ?? [""])[0];
    processedText = text.replace(labels, "");
    if (labels === "") {
      throw new Error(
        "Labels for the following text couldn't be extracted: " + text
      );
    }
  }
  processedText = removeDiacritics(processedText);
  processedText = normalizeAbbreviations(processedText);
  processedText = expandContractions(processedText);
  processedText = removeNumbers(processedText);
  processedText = removeNonAlphaNumSymbols(processedText);
  processedText = lemmatize(processedText);
  processedText = removeStopWords(processedText);
  processedText = removeSingleCharacters(processedText);
  processedText = removeExtraWhiteSpaces(processedText);
  processedText = processedText.toLowerCase();
  // console.log(processedText + "\n");
  if (processedText.length > 0) {
    return labels + processedText;
  } else {
    return "";
  }
}

export const escapeRegexExpChars = (str: string) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
};

export function normalizeAbbreviations(text: string): string {
  const abbRegex = new RegExp(
    `${Array.from(abbreviationExpansionOf.keys())
      .map((abb) => escapeRegexExpChars(abb))
      .join("|")}|(?<![a-z])(([a-z]\\.){2,})(?![a-z])`,
    "gui"
  );
  const abbreviations = text.match(abbRegex) ?? [];
  const regex = new RegExp(abbreviations.join("|"), "gui");
  const result = text.replace(regex, (abb) => expandAbbreviation(abb));
  return result;
}

export function expandAbbreviation(abbreviation: string): string {
  return (
    abbreviationExpansionOf.get(abbreviation.toLowerCase()) ??
    abbreviation.replace(/\./giu, "")
  );
}

export function isProbablyName(text: string): boolean {
  text = removeDiacritics(text);
  return text.match(/^\w+((_+|\s+)\w+){1,2}$/gui) !== undefined;
}
