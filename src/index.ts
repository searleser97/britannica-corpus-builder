#!/usr/bin/env node

import CorpusBuilder from "./CorpusBuilder";
import axios from "axios";
import fs from "fs";
import path from "path";
import { buildFastTextFormattedFilePreprocessed, buildFastTextFormattedFileRaw } from "./FastTextFormatBuilder";

async function main() {
  let cb = new CorpusBuilder();
  await cb.crawlThroughTopicsSitesAndDownloadData();
  // await cb.quickTest();
}

// main();

buildFastTextFormattedFilePreprocessed("corpus_raw", 3);
