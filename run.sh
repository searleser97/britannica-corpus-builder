# bcb gen_raw "2"
# echo "gen_raw done"

# bcb gen_corpus
# echo "gen_corpus done"

# bcb split_train_test labeled_sents_preprocessed.txt
# echo "split done"

# ./fasttext supervised -input labeled_sents_preprocessed.txt -output labeled_sents_preprocessed -autotune-validation labeled_sents_preprocessed.test -autotune-duration 600

./fasttext supervised -input labeled_sents_preprocessed.txt -output labeled_sents_preprocessed -lr 0.8 -epoch 30 -wordNgrams 2 -bucket 200000 -dim 300 -thread 8

# ./fasttext test labeled_sents_preprocessed.bin labeled_sents_preprocessed.test 1 0.1

# bcb train labeled_sents_preprocessed.train

# bcb test labeled_sents_preprocessed.test labeled_sents_preprocessed.bin

# bcb predict "i love captain america comics" labeled_sents_preprocessed.bin
# bcb predict "iron man was fighting with thor agains captain america" labeled_sents_preprocessed.bin
# bcb predict "my favorite singer of country is taylor swift" labeled_sents_preprocessed.bin
# bcb predict "kobe bryant had almost the same style as michael jordan" labeled_sents_preprocessed.bin

