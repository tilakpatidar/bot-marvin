/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package my_package;

import java.io.IOException;
import org.apache.lucene.analysis.TokenFilter;
import org.apache.lucene.analysis.TokenStream;
import org.apache.lucene.analysis.core.StopAnalyzer;
import org.apache.lucene.analysis.tokenattributes.CharTermAttribute;
import org.apache.lucene.analysis.tokenattributes.PositionIncrementAttribute;

public class MyStopWordFilter extends TokenFilter {

    private CharTermAttribute charTermAtt;
    private PositionIncrementAttribute posIncrAtt;

    public MyStopWordFilter(TokenStream input) {
        super(input);
        charTermAtt = addAttribute(CharTermAttribute.class);
        posIncrAtt = addAttribute(PositionIncrementAttribute.class);
    }

    @Override
    public boolean incrementToken() throws IOException {
        int extraIncrement = 0;
        boolean returnValue = false;
        while (input.incrementToken()) {
            if (StopAnalyzer.ENGLISH_STOP_WORDS_SET.contains(charTermAtt.toString())) {
                extraIncrement++;// filter this word
                continue;
            }
            returnValue = true;
            break;
        }
        if (extraIncrement > 0) {
            posIncrAtt.setPositionIncrement(posIncrAtt.getPositionIncrement() + extraIncrement);
        }
        return returnValue;
    }
}
