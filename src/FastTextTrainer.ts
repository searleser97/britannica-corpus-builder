import * as fs from "fs";
import FastText from "fasttext.js";
import { preprocessText } from "./Util_NLP";
import train_test_split from "train-test-split";

export async function splitIntoTrainAndText(datasetPath: string): Promise<void> {
  const dataset = fs.readFileSync(datasetPath).toString().trim().split("\n");
  const [train, test] = train_test_split(dataset, 0.8, 1322);
  datasetPath = datasetPath.replace(/(\.[a-z0-9]+)+/gui, "");
  fs.writeFileSync(`${datasetPath}.train`, train.join("\n"));
  fs.writeFileSync(`${datasetPath}.test`, test.join("\n"));
}

export async function trainFastText(trainDS: string): Promise<void> {
  const modelFilePath = trainDS.replace(/(\.[a-z0-9]+)+/gui, "");
  const fasttext = new FastText({
    thread: 1,
    loss: "hs",
    dim: 300,
    lr: 0.5,
    epoch: 25,
    wordNgrams: 1,
    serializeTo: modelFilePath,
    trainFile: trainDS,
    bucket: 200000,
    trainCallback: (res) => console.log("\t" + JSON.stringify(res)),
  });
  
  await fasttext.train();
  console.log("done training");
}

export async function testFastText(testDS: string, modelPath: string): Promise<void> {
  const fasttext = new FastText({
    loadModel: modelPath,
    testFile: testDS,
  });
  
  const result = await fasttext.test();
  console.log(result);
  const result2 = await fasttext.testLabels();
  console.log(result2);
  console.log("done testing");
}

export async function predictFastText(text: string, modelPath: string): Promise<void> {
  const fasttext = new FastText({
    loadModel: modelPath,
  });
  await fasttext.load();
  const result = await fasttext.predict(preprocessText(text));
  console.log(result);
}
