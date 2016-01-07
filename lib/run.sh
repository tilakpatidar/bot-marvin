for i in jars/*.jar; do
    CLASSPATH=$CLASSPATH:$i
done
CLASSPATH=`echo $CLASSPATH | cut -c2-`

java -cp ".":$CLASSPATH Lucene_Indexer
