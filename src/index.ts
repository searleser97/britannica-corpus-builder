#!/usr/bin/env node

import CorpusBuilder from "./CorpusBuilder";
import {
  buildFastTextFormattedFilePreprocessed,
  buildFastTextFormattedFileRaw,
} from "./FastTextFormatBuilder";
import {
  predictFastText,
  splitIntoTrainAndText,
  testFastText,
  trainFastText,
} from "./FastTextTrainer";

async function main() {
  const args = process.argv;
  const command = args[2];
  if (command === "pull_corpus") {
    let cb = new CorpusBuilder();
    await cb.crawlThroughTopicsSitesAndDownloadData();
  } else if (command === "gen_raw") {
    const labels = (args[3] ?? "2").trim();
    await buildFastTextFormattedFileRaw(
      "corpus_raw",
      labels.split(/[\s,]/gui).map((lbl) => parseInt(lbl))
    );
  } else if (command === "gen_corpus") {
    await buildFastTextFormattedFilePreprocessed();
  } else if (command === "split_train_test") {
    const DS = args[3];
    if (!DS) {
      console.log("missing datasource file with corpus");
      return;
    }
    splitIntoTrainAndText(DS);
  } else if (command === "train") {
    const trainDS = args[3];
    await trainFastText(trainDS);
  } else if (command === "test") {
    const testDS = args[3];
    const model = args[4];
    await testFastText(testDS, model);
  } else if (command === "predict") {
    const text = args[3];
    const model = args[4];
    await predictFastText(text, model);
  } else {
    let cb = new CorpusBuilder();
    await cb.quickTest();
  }
}

main();
