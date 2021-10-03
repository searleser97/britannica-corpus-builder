bcb gen_raw "2"
# echo "gen_raw done"

bcb gen_corpus
# echo "gen_corpus done"

bcb split_train_test labeled_sents_preprocessed.txt
# echo "split done"

./fasttext supervised -input labeled_sents_preprocessed.train -output labeled_sents_preprocessed -autotune-validation labeled_sents_preprocessed.test -autotune-duration 6000

# ./fasttext supervised -input labeled_sents_preprocessed.txt -output labeled_sents_preprocessed -lr 0.8 -epoch 30 -wordNgrams 2 -bucket 200000 -dim 300 -thread 8

./fasttext test labeled_sents_preprocessed.bin labeled_sents_preprocessed.test 1 0.1

./fasttext predict-prob labeled_sents_preprocessed.bin mytests.txt 3 0.1
