/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package my_package;

import java.io.StringReader;
import org.apache.lucene.analysis.TokenStream;
import org.apache.lucene.analysis.standard.StandardAnalyzer;
import org.apache.lucene.analysis.tokenattributes.CharTermAttribute;
import org.apache.lucene.analysis.tokenattributes.OffsetAttribute;
import org.apache.lucene.util.Version;

/**
 *
 * @author tilak
 */
public class TokenReader {
    public static void main(String[] args){
        StringReader reader = new StringReader("Lucene is mainly used for information retrieval and you can read more about it at lucene.apache.org.");
        StandardAnalyzer wa = new StandardAnalyzer(Version.LUCENE_CURRENT);
        TokenStream ts = null;
        try {
            ts = wa.tokenStream("field", reader);
            OffsetAttribute offsetAtt = ts.addAttribute(OffsetAttribute.class);
            CharTermAttribute termAtt = ts.addAttribute(CharTermAttribute.class);
            ts.reset();
            while (ts.incrementToken()) {
                    String token = termAtt.toString();
                    System.out.println("[" + token + "]");
                    System.out.println("Token starting offset: " + offsetAtt.startOffset());
                    System.out.println(" Token ending offset: " + offsetAtt.endOffset());
                    System.out.println("");
                }
            ts.end();
        }
        catch(Exception e){
            
            
        }
    }
}
