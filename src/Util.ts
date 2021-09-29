/**
 * Replace any symbol that is not alpha-numeric with the one given
 * @param {string} text text to clean
 * @param {string} symbol symbol to use as replacement for non alpha num symbols
 * @return string with only alpha numeric symbols
 */
export function replaceNonAlphaNumSymbolsWith(text: string, symbol: string): string {
  const specialSymbolsRegex = /[a-z0-9]+/giu;
  const alphaNumMatches = text.match(specialSymbolsRegex);
  return alphaNumMatches?.join(symbol) ?? "";
}

export function normalizeString(str: string): string {
  return replaceNonAlphaNumSymbolsWith(str, "_").replaceAll(/_+/gui, "_");
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
