/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package my_package;
import java.io.IOException;
import org.apache.lucene.analysis.Analyzer;
import org.apache.lucene.analysis.core.WhitespaceAnalyzer;
import org.apache.lucene.document.*;
import org.apache.lucene.index.*;
import org.apache.lucene.queryparser.classic.ParseException;
import org.apache.lucene.queryparser.classic.QueryParser;
import org.apache.lucene.search.IndexSearcher;
import org.apache.lucene.search.Query;
import org.apache.lucene.search.ScoreDoc;
import org.apache.lucene.search.TopDocs;
import org.apache.lucene.store.Directory;
import org.apache.lucene.store.RAMDirectory;
import org.apache.lucene.util.Version;
/**
 *
 * @author tilak
 */
public class Indexer {
   public static void main(String[] args) throws IOException, ParseException{
       Analyzer analyzer=new WhitespaceAnalyzer(Version.LUCENE_CURRENT);
       Directory dir=new RAMDirectory();
      IndexWriterConfig config = new IndexWriterConfig(Version.LUCENE_CURRENT, analyzer);
IndexWriter indexWriter = new IndexWriter(dir, config);
Document doc = new Document();
String text = "Lucene is an Information Retrieval library written in Java";
doc.add(new TextField("fieldname", text, Field.Store.YES));
indexWriter.addDocument(doc);
indexWriter.close();
IndexReader indexReader = DirectoryReader.open(dir);
IndexSearcher indexSearcher = new IndexSearcher(indexReader);

QueryParser parser = new QueryParser(Version.LUCENE_CURRENT,"fieldname", analyzer);
Query query = parser.parse("Information Retrieval");
int hitsPerPage = 10;
TopDocs docs = indexSearcher.search(query, hitsPerPage);
ScoreDoc[] hits = docs.scoreDocs;
int end = Math.min(docs.totalHits, hitsPerPage);
System.out.print("Total Hits: " + docs.totalHits);
System.out.print("Results: ");
for (int i = 0; i < end; i++) {
Document d = indexSearcher.doc(hits[i].doc);
System.out.println("Content: " + d.get("fieldname"));
}
   }
}
