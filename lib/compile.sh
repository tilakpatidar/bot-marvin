for i in jars/*.jar; do
    CLASSPATH=$CLASSPATH:$i
done
CLASSPATH=`echo $CLASSPATH | cut -c2-`

javac -cp ".":"./jars/":$CLASSPATH Lucene_Indexer.java
