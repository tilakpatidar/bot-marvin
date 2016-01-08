import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import org.json.JSONObject;
import org.json.JSONArray;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import java.net.URLDecoder;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.Map;
import java.util.Arrays;
import java.util.Iterator;
import java.util.HashSet;
import java.util.concurrent.ConcurrentMap;
import com.mongodb.util.JSON;
import com.mongodb.*;
import com.github.mongoutils.lucene.*;
import com.github.mongoutils.collections.*;
import java.util.Set;
import java.util.List;
import org.json.JSONException;
import java.util.ArrayList;
import java.util.LinkedList;
import java.util.LinkedHashMap;
import java.util.HashMap;
import org.apache.lucene.search.TopScoreDocCollector;
import org.apache.lucene.analysis.standard.StandardAnalyzer;
import org.apache.lucene.document.Document;
import org.apache.lucene.document.Field;
import org.apache.lucene.index.IndexableField;
import org.apache.lucene.document.StringField;
import org.apache.lucene.document.TextField;
import org.apache.lucene.document.DoubleField;
import org.apache.lucene.document.LongField;
import org.apache.lucene.util.Version;
import org.apache.lucene.index.DirectoryReader;
import org.apache.lucene.index.IndexReader;
import org.apache.lucene.index.IndexWriter;
import org.apache.lucene.index.IndexWriterConfig;
import org.apache.lucene.queryparser.classic.ParseException;
import org.apache.lucene.queryparser.classic.QueryParser;
import org.apache.lucene.search.IndexSearcher;
import org.apache.lucene.search.Query;
import org.apache.lucene.search.ScoreDoc;
import org.apache.lucene.search.TopDocs;
import org.apache.lucene.store.Directory;
import java.net.URL;
public class Lucene_Indexer {

    public static void main(String[] args) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(8000), 0);
        server.createContext("/init",new InitHandler());
        server.createContext("/index", new IndexHandler());
        server.createContext("/search", new SearchHandler());
        server.createContext("/reset",new ResetHandler());
        server.setExecutor(null); // creates a default executor
        server.start();
        MyIndexer.createMongodbConnection();
        MyReader.createMongodbConnection();

    }
    static class InitHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange t) throws IOException{
            System.out.println("[INFO] /init requested");
            JSONObject obj = new JSONObject();
            obj.put("init",true);
            String response=obj.toString();
            t.sendResponseHeaders(200,response.length());
            OutputStream os=t.getResponseBody();
            os.write(response.getBytes());
            os.close();

        }
    }
    static class IndexHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange t) throws IOException {
            System.out.println("[INFO] /index requested");
            try{
                MyIndexer indexer=new MyIndexer(getPostData(t));
            }catch(Exception e){
                System.out.println(e);
            }
            
            String response = "This is the response";
            t.sendResponseHeaders(200, response.length());
            OutputStream os = t.getResponseBody();
            os.write(response.getBytes());
            os.close();
        }
    }
    static class SearchHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange t) throws IOException {
            System.out.println("[INFO] /search requested "+t.getRequestURI().toString() );
            List<String> query=getQueryParams(t.getRequestURI().toString()).get("q");
            List<String> type=getQueryParams(t.getRequestURI().toString()).get("field");
            MyReader read =new MyReader();
            String response = query.get(0)+" "+type.get(0);
            //System.out.println(response);
            try{
                read.searchDocument(query.get(0),type.get(0).replaceAll("\\.","#dot#"));
                t.sendResponseHeaders(200, response.length());
            }catch(Exception e){
                System.out.println(e);
                t.sendResponseHeaders(404, response.length());
            }
            finally{

                OutputStream os = t.getResponseBody();
                os.write(response.getBytes());
                os.close();
            }
            
        }
    }
    static class ResetHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange t) throws IOException {
            System.out.println("[INFO] /reset requested");
            String response ="";
            try{
                MyIndexer.resetIndex();
                t.sendResponseHeaders(200, response.length());
            }catch(Exception e){
                System.out.println(e);  
                t.sendResponseHeaders(404, response.length());
            }finally{
                OutputStream os = t.getResponseBody();
                os.write(response.getBytes());
                os.close();
            }
            
            
            
            
        }
    }
    public static Map<String, List<String>> getQueryParams(String url) {
        //System.out.println(URLDecoder.decode(url));
        try {
            Map<String, List<String>> params = new HashMap<String, List<String>>();
            String[] urlParts = url.split("\\?");
            if (urlParts.length > 1) {
                String query = urlParts[1];
                for (String param : query.split("&")) {
                    String[] pair = param.split("=");
                    String key = URLDecoder.decode(pair[0], "UTF-8");
                    String value = "";
                    if (pair.length > 1) {
                        value = URLDecoder.decode(pair[1], "UTF-8");
                    }

                    List<String> values = params.get(key);
                    if (values == null) {
                        values = new ArrayList<String>();
                        params.put(key, values);
                    }
                    values.add(value);
                }
            }

            return params;
        } catch (Exception ex) {
            throw new AssertionError(ex);
        }
}
    public static JSONArray getPostData(HttpExchange exchange) throws IOException{
        JSONArray js=null;
        if ("post".equalsIgnoreCase(exchange.getRequestMethod())) {
            Map<String, Object> parameters =(Map<String, Object>)exchange.getAttribute("parameters");
            InputStreamReader isr =new InputStreamReader(exchange.getRequestBody(),"utf-8");
            BufferedReader br = new BufferedReader(isr);
            StringBuilder builder = new StringBuilder();
            String aux = "";
            while ((aux = br.readLine()) != null) {
                builder.append(aux);
            }
            String text = builder.toString();
            js=new JSONArray(URLDecoder.decode(text));
            
               
        }
        return js;
        
    }

}
class MyReader{

    private static DBCollection con;
    public static void createMongodbConnection(){
        try{
            /*
                Create connection and try to insert a dummy JSON object

            */
            Mongo mongo = new Mongo(new DBAddress("127.0.0.1:27017/bot_marvin_lucene_data"));
            DB db = mongo.getDB("bot_marvin_lucene_data");
            DBCollection dbCollection = db.getCollection("testcollection");
            DBObject dbObject = (DBObject) JSON.parse("{'name':'tilak'}");
            dbCollection.insert(dbObject);
            dbCollection = db.getCollection("lucene_data");
            con=dbCollection;
            System.out.println("[SUCCESS] Connection created http://localhost:27017/testdb/testcollection");
        }catch(Exception e){
            System.out.println("[ERROR] Connection failed http://localhost:27017/testdb/testcollection");
        }

    }
private void setProperty(JSONObject js1, String keys, String valueNew) throws JSONException {
  //first create the nested path
  JSONObject j=js1;//new obj
  String[] arr=keys.split("#dot#");
  for(int i=0;i<arr.length;i++){
    try{
        JSONObject k=j.getJSONObject(arr[i]);
        j=k;
    }catch(JSONException e){
        JSONObject jj=new JSONObject();
        if(i==arr.length-1){
            j.put(arr[i],valueNew);
        }else{
            j.put(arr[i],jj);
        }
        j=jj;
    }
  
  }

  
}
    public JSONObject DocToJSON(Document d) throws Exception{
        JSONObject js=new JSONObject();
        List<IndexableField> list=d.getFields();
        Iterator<IndexableField> it=list.iterator();
        while(it.hasNext()){
            IndexableField field=it.next();
            String field_name=field.name();
            System.out.println(field_name);
            CharSequence cs1 = "#dot#";
            if(field_name.contains(cs1)){
               setProperty(js,field_name,field.stringValue());
            }
            else{
                js.put(field_name,field.stringValue());
               // js.put(field_name,d.)
            }
        }
        return js;
    }
    private Document getAdditionalDocument(IndexSearcher searcher,String docId) throws Exception{
        Document d = searcher.doc(Integer.parseInt(docId));
        return d;
    }
    private JSONObject getJSON(Document d){
        Iterator<IndexableField> it=d.iterator();
        while(it.hasNext()){
            IndexableField field=it.next();
            System.out.println(field.fieldType().toString());
        }
        return null;
    }
    public void searchDocument(String query,String field) throws Exception{
        DBObjectSerializer<String> keySerializer = new SimpleFieldDBObjectSerializer<String>("key");
       
        DBObjectSerializer<MapDirectoryEntry> valueSerializer = new MapDirectoryEntrySerializer("value");
      
        ConcurrentMap<String, MapDirectoryEntry> store = new MongoConcurrentMap<String, MapDirectoryEntry>(MyReader.con, keySerializer,valueSerializer);
        // lucene directory
        Directory dir = new MapDirectory(store);
        StandardAnalyzer analyzer = new StandardAnalyzer(Version.LUCENE_4_9);
        System.out.println("[INFO] /search for \""+query+"\" in \""+field+"\"");
        Query q = new QueryParser(Version.LUCENE_4_9,field, analyzer).parse(query);
        IndexReader reader = IndexReader.open(dir);
        IndexSearcher searcher = new IndexSearcher(reader);
        TopDocs docs = searcher.search(q, 10);
        ScoreDoc[] hits = docs.scoreDocs;

        // 4. display results
        JSONArray arr=new JSONArray();
        System.out.println("Found " + hits.length + " hits. for "+query);
        for(int i=0;i<hits.length;++i) {
            int docId = hits[i].doc;
            Document d = searcher.doc(docId);
            JSONObject js=this.DocToJSON(d);
            System.out.println(js);

        }
}
}
class MyIndexer{
    private static DBCollection con;
    public MyIndexer(){

    }
    public MyIndexer(JSONArray arr) throws Exception{
        this.indexDocument(arr);
    }
    public static void resetIndex() throws Exception{
        DBObjectSerializer<String> keySerializer = new SimpleFieldDBObjectSerializer<String>("key");
       
        DBObjectSerializer<MapDirectoryEntry> valueSerializer = new MapDirectoryEntrySerializer("value");
      
        ConcurrentMap<String, MapDirectoryEntry> store = new MongoConcurrentMap<String, MapDirectoryEntry>(MyIndexer.con, keySerializer,valueSerializer);
        // lucene directory
        Directory dir = new MapDirectory(store);

        // index files
        StandardAnalyzer analyzer = new StandardAnalyzer(Version.LUCENE_4_9);
        IndexWriterConfig iwc = new IndexWriterConfig(Version.LUCENE_4_9, analyzer);
        IndexWriter writer = new IndexWriter(dir, iwc);
        writer.deleteAll();
        writer.commit();
        writer.close();
    }
    public static void createMongodbConnection(){
        try{
            /*
                Create connection and try to insert a dummy JSON object

            */
            Mongo mongo = new Mongo(new DBAddress("127.0.0.1:27017/bot_marvin_lucene_data"));
            DB db = mongo.getDB("bot_marvin_lucene_data");
            DBCollection dbCollection = db.getCollection("testcollection");
            DBObject dbObject = (DBObject) JSON.parse("{'name':'tilak'}");
            dbCollection.insert(dbObject);
            dbCollection = db.getCollection("lucene_data");
            con=dbCollection;
            System.out.println("[SUCCESS] Connection created http://localhost:27017/testdb/testcollection");
        }catch(Exception e){
            System.out.println("[ERROR] Connection failed http://localhost:27017/testdb/testcollection");
        }

    }
    private void indexDocument(JSONArray arr) throws Exception{
        DBObjectSerializer<String> keySerializer = new SimpleFieldDBObjectSerializer<String>("key");
       
        DBObjectSerializer<MapDirectoryEntry> valueSerializer = new MapDirectoryEntrySerializer("value");
      
        ConcurrentMap<String, MapDirectoryEntry> store = new MongoConcurrentMap<String, MapDirectoryEntry>(MyIndexer.con, keySerializer,valueSerializer);
        // lucene directory
        Directory dir = new MapDirectory(store);

        // index files
        StandardAnalyzer analyzer = new StandardAnalyzer(Version.LUCENE_4_9);
        IndexWriterConfig iwc = new IndexWriterConfig(Version.LUCENE_4_9, analyzer);
        IndexWriter writer = new IndexWriter(dir, iwc);

        this.addDocuments(arr,writer);
        writer.commit();
        writer.close();

    }
        /**
     * Add documents to the index
     */
    private void addDocuments(JSONArray jsonObjects,IndexWriter indexWriter) throws Exception{
        ArrayList<Document> docs=new ArrayList<Document>();
        for (int i=0;i<jsonObjects.length() ;i++ ) {
            JSONObject object=jsonObjects.getJSONObject(i);
            JSONObject new_js=new JSONObject();
            this.getLinearJSON(object,new_js,"");
            System.out.println(new_js);
            Document doc=this.JSONtoDOC(new_js);
            System.out.println(new_js);
            System.out.println(doc);
            docs.add(doc);

           
        }
        Iterator<Document> it=docs.iterator();
        while(it.hasNext()){
            try {
                System.out.println("indexed");
                indexWriter.addDocument(it.next());
            } catch (IOException ex) {
                System.err.println("Error adding documents to the index. " +  ex.getMessage());
            }
        }
    }
    private Document JSONtoDOC (JSONObject object){
        /*
            Converts nested JSONObjects to Document array 
            providing each an id to map in query later.
        */
        Document doc = new Document();
        String[] indexed_fields=object.get("indexed_fields").toString().split(",");
        HashSet<String> hash=new HashSet<String>(Arrays.asList(indexed_fields));
        System.out.println(Arrays.toString(indexed_fields));
        for(String field : (Set<String>) object.keySet()){
            if(field.equals("indexed_fields")){
                continue;
            }
            if(hash.contains(field)){
                System.out.println("heree s tilak "+field);
                Class type = object.get(field).getClass();
                doc.add(new LongField("_id", (long)object.get(field).toString().hashCode(), Field.Store.YES));
                if(type.equals(String.class)){
                    doc.add(new TextField(field, (String)object.get(field), Field.Store.YES));
                }else if(type.equals(Long.class)){
                    doc.add(new LongField(field, (long)object.get(field), Field.Store.YES));
                }else if(type.equals(Double.class)){
                    doc.add(new DoubleField(field, (double)object.get(field), Field.Store.YES));
                }else if(type.equals(Boolean.class)){
                    doc.add(new StringField(field, object.get(field).toString(), Field.Store.YES));
                }
            }
                
        }
        return doc;

    }
    private void getLinearJSON(JSONObject object,JSONObject new_js,String appender){
  
        for(String field : (Set<String>) object.keySet()){
                Class type = object.get(field).getClass();
                if(type.equals(JSONObject.class)){
                    //recursive
                    this.getLinearJSON((JSONObject) object.get(field),new_js,field+"#dot#");
                }else{
                    new_js.put(appender+field,object.get(field));
                }
        }

    }
}