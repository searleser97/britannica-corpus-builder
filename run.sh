bcb gen_raw "2"

bcb gen_corpus

bcb split_train_test labeled_sents_preprocessed.txt

./FastTextBin/fasttext supervised -input labeled_sents_preprocessed.train -output labeled_sents_preprocessed -autotune-validation labeled_sents_preprocessed.test -autotune-duration 6000

# ./FastTextBin/fasttext supervised -input labeled_sents_preprocessed.txt -output labeled_sents_preprocessed -epoch 100 -minCount 1 -neg 5 -wordNgrams 2 -bucket 1812606 -dim 116 -ws 5 -thread 8 -loss softmax -minn 0 -maxn 0 -lrUpdateRate 100 -t 0.0001

./FastTextBin/fasttext test labeled_sents_preprocessed.bin labeled_sents_preprocessed.test 1 0.1

bcb predict mytests.txt labeled_sents_preprocessed.bin
