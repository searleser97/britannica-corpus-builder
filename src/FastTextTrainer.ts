import * as fs from "fs";
import * as Path from "path";
import FastText from "fasttext.js";
import { preprocessText } from "./Util_NLP";
import { split_into_train_and_test } from "./Util";

export async function splitIntoTrainAndTest(datasetPath: string, trainProportion: number): Promise<void> {
  const dataset = fs.readFileSync(datasetPath).toString().trim().split("\n");
  const [train, test] = split_into_train_and_test(datasetPath, trainProportion);
  // const [train, test] = train_test_split(dataset, trainProportion, 1322);
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

export async function predictFastText(filePath: string, modelPath: string): Promise<void> {
  const fasttextBin = Path.join(__dirname, "FastTextBin/fasttext");
  const fasttext = new FastText({
    bin: fasttextBin,
    loadModel: modelPath,
    predict: { precisionRecall: 3 }
  });
  await fasttext.load();
  const lines = fs.readFileSync(filePath).toString().trim().split("\n");
  for (const line of lines) {
    const processedText = preprocessText(line)
    const result = await fasttext.predict(processedText);
    console.log(processedText);
    console.log(JSON.stringify(result));
  }
  await fasttext.unload();
}
