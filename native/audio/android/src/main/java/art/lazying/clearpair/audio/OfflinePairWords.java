package art.lazying.clearpair.audio;

import android.content.Context;
import android.content.res.AssetManager;
import android.util.Base64;
import android.os.SystemClock;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import org.json.JSONArray;
import org.json.JSONObject;
import org.vosk.Model;
import org.vosk.Recognizer;
import org.vosk.LibVosk;
import org.vosk.LogLevel;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicReference;

/** Saved PCM only: no microphone, network, grammar or target-word hints. */
final class OfflinePairWords {
 private final Context context;
 private final ExecutorService queue=Executors.newSingleThreadExecutor();
 private final AtomicReference<String> active=new AtomicReference<>();
 private Model model;
 private String modelIdentity;
 private OfflineYueWords cantonese;
 OfflinePairWords(Context context){this.context=context.getApplicationContext();}
 private String expectedLanguage(String language){
  return switch(context.getPackageName()){
   case "art.lazying.clearpair.landr","art.lazying.clearpair.english"->"en-US";
   case "art.lazying.clearpair.chinese"->"zh-CN";
   case "art.lazying.clearpair.japanese"->"ja-JP";
   case "art.lazying.clearpair.korean"->"ko-KR";
   case "art.lazying.clearpair.arabic"->"ar-SA";
   case "art.lazying.clearpair.cantonese"->"zh-HK";
   case "art.lazying.clearpair.qa.reference"->language;
   default->null;};
 }
 /** Separate cold setup from the per-utterance deadline. No PCM or target hints. */
 void warm(PluginCall call){
  final String id=call.getString("id"),language=call.getString("language");
  try{UUID.fromString(id);if(!"ar-SA".equals(language)||!language.equals(expectedLanguage(language)))throw new IllegalArgumentException();}
  catch(Exception error){call.reject("Unsupported offline preparation.","OFFLINE_WORD_INPUT");return;}
  active.set(id);queue.execute(()->{
   long started=SystemClock.elapsedRealtime();
   try{
    ensureModel(language,id);
    if(!id.equals(active.get())){call.reject("Offline preparation cancelled.");return;}
    JSObject value=new JSObject();value.put("ready",true);value.put("preparationMs",SystemClock.elapsedRealtime()-started);call.resolve(value);
   }catch(Exception|LinkageError error){call.reject("Bundled offline preparation unavailable.","OFFLINE_WORD_MODEL");}
   finally{active.compareAndSet(id,null);}
  });
 }
 private void ensureModel(String language,String id)throws Exception{
  if(!id.equals(active.get()))throw new java.io.IOException("Cancelled");
  JSONObject pin=pin(language);String code=pin.getString("code"),identity=code+"-"+pin.getString("zipSha256").substring(0,16);
  if(identity.equals(modelIdentity))return;
  if(cantonese!=null){cantonese.release();cantonese=null;}
  if(model!=null)model.close();model=null;modelIdentity=null;
  File path=prepare(code,identity,id);
  if(!id.equals(active.get()))throw new java.io.IOException("Cancelled");
  LibVosk.setLogLevel(LogLevel.WARNINGS);
  model=new Model(path.getAbsolutePath());modelIdentity=identity;
 }
 void recognize(PluginCall call){
  final String id=call.getString("id"),language=call.getString("language"),encoded=call.getString("pcm16Base64");
  final byte[] pcm;
  try{
   UUID.fromString(id);
   String expected=expectedLanguage(language);
   if(expected==null||!expected.equals(language)||encoded==null||encoded.length()>576000)throw new IllegalArgumentException();
   pcm=Base64.decode(encoded,Base64.NO_WRAP);
   if(pcm.length<3200||pcm.length>432000||pcm.length%2!=0)throw new IllegalArgumentException();
  }catch(Exception error){call.reject("Unsupported offline word input.","OFFLINE_WORD_INPUT");return;}
  active.set(id);
  queue.execute(()->{
   try{
    if(!id.equals(active.get())){call.reject("Offline recognition cancelled.");return;}
    if(language.equals("zh-HK")){
     if(model!=null)model.close();model=null;modelIdentity=null;
     if(cantonese==null)cantonese=new OfflineYueWords(context);
     JSObject value=cantonese.decode(pcm);
     if(!id.equals(active.get())){call.reject("Offline recognition cancelled.");return;}
     call.resolve(value);return;
    }
    ensureModel(language,id);
    JSONObject output=new JSONObject();JSONArray words=new JSONArray();StringBuilder text=new StringBuilder();
    try(Recognizer decoder=new Recognizer(model,16000)){
     decoder.setWords(true);
     byte[] padded=new byte[pcm.length+26240];System.arraycopy(pcm,0,padded,10240,pcm.length);
     for(int offset=0;offset<padded.length;offset+=8000){
      if(!id.equals(active.get())){call.reject("Offline recognition cancelled.");return;}
      byte[] chunk=Arrays.copyOfRange(padded,offset,Math.min(padded.length,offset+8000));
      if(decoder.acceptWaveForm(chunk,chunk.length))collect(decoder.getResult(),text,words);
     }
     collect(decoder.getFinalResult(),text,words);
    }
    if(!id.equals(active.get())){call.reject("Offline recognition cancelled.");return;}
    output.put("engine","pair-vosk-native:v1/"+language);output.put("text",text.toString());output.put("words",words);output.put("final",true);
    call.resolve(JSObject.fromJSONObject(output));
   }catch(Exception|LinkageError error){call.reject("Bundled offline words unavailable.","OFFLINE_WORD_MODEL");}
   finally{active.compareAndSet(id,null);}
  });
 }
 private JSONObject pin(String language)throws Exception{
  try(InputStream input=context.getAssets().open("public/models/pair-words.json")){
   ByteArrayOutputStream bytes=new ByteArrayOutputStream();byte[] buffer=new byte[8192];int size;
   while((size=input.read(buffer))!=-1)bytes.write(buffer,0,size);
   JSONArray pins=new JSONObject(new String(bytes.toByteArray(),StandardCharsets.UTF_8)).getJSONArray("models");
   for(int i=0;i<pins.length();i++)if(language.equals(pins.getJSONObject(i).getString("language")))return pins.getJSONObject(i);
  }
  throw new IllegalArgumentException("No model for language");
 }
 private File prepare(String code,String identity,String id)throws Exception{
  if(!code.matches("en|zh|ja|ko|ar")||!identity.matches("[a-z]{2}-[a-f0-9]{16}"))throw new IllegalArgumentException();
  File root=new File(context.getFilesDir(),"clearpair-word-models"),out=new File(root,identity),marker=new File(out,"clearpair-complete");
  if(marker.isFile()&&new File(out,"am/final.mdl").isFile())return out;
  if(!root.isDirectory()&&!root.mkdirs())throw new java.io.IOException();
  // Only this helper's incomplete, generated model-cache directory is cleaned.
  File stage=new File(root,identity+"-staging");remove(stage);if(!stage.mkdirs())throw new java.io.IOException();
  copy("public/models/hf-native/"+code,stage,id);
  if(!id.equals(active.get()))throw new java.io.IOException("Cancelled");
  if(!new File(stage,"am/final.mdl").isFile())throw new java.io.IOException();
  new File(stage,"clearpair-complete").createNewFile();remove(out);
  if(!stage.renameTo(out))throw new java.io.IOException();return out;
 }
 private void copy(String asset,File destination,String id)throws Exception{
  if(!id.equals(active.get()))throw new java.io.IOException("Cancelled");
  AssetManager assets=context.getAssets();String[] names=assets.list(asset);
  if(names!=null&&names.length>0){
   if(!destination.isDirectory()&&!destination.mkdirs())throw new java.io.IOException();
   for(String name:names){if(!name.matches("[A-Za-z0-9_.-]+"))throw new java.io.IOException();copy(asset+"/"+name,new File(destination,name),id);}
  }else try(InputStream in=assets.open(asset);FileOutputStream out=new FileOutputStream(destination)){
   byte[] buffer=new byte[65536];int n;
   while((n=in.read(buffer))!=-1){if(!id.equals(active.get()))throw new java.io.IOException("Cancelled");out.write(buffer,0,n);}
  }
 }
 private static void collect(String value,StringBuilder text,JSONArray words)throws Exception{
  JSONObject result=new JSONObject(value);String part=result.optString("text","").trim();if(part.isEmpty())return;
  if(text.length()>0)text.append(' ');text.append(part);
  JSONArray tokens=result.optJSONArray("result");if(tokens!=null)for(int i=0;i<tokens.length();i++)words.put(tokens.getJSONObject(i));
  if(text.length()>500||words.length()>150)throw new IllegalArgumentException();
 }
 private static void remove(File file)throws java.io.IOException{
  if(!file.exists())return;File[] children=file.listFiles();if(children!=null)for(File child:children)remove(child);
  if(!file.delete())throw new java.io.IOException();
 }
 void cancel(String id){if(id!=null)active.compareAndSet(id,null);}
 void release(){if(active.get()!=null)return;queue.execute(()->{if(active.get()!=null)return;if(model!=null)model.close();model=null;modelIdentity=null;if(cantonese!=null)cantonese.release();cantonese=null;});}
 void close(){active.set(null);queue.execute(()->{if(model!=null)model.close();model=null;modelIdentity=null;if(cantonese!=null)cantonese.release();cantonese=null;});queue.shutdown();}
}
