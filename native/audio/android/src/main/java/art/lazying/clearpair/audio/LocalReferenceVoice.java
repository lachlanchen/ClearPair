package art.lazying.clearpair.audio;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import java.io.File;
import java.io.FileInputStream;
import java.io.ByteArrayOutputStream;
import java.util.Arrays;
import java.util.UUID;
import java.util.HashSet;

/** Offline-only TTS references, isolated from playback and captured microphone
 * audio. A private temporary WAV is erased on success, timeout or cancellation. */
final class LocalReferenceVoice {
    private final Context context;
    private final Handler main=new Handler(Looper.getMainLooper());
    private TextToSpeech engine;
    private boolean ready;
    private PluginCall call;
    private String token,voiceId;
    private File file;
    private Runnable deadline;
    private long engineEpoch;
    private final HashSet<String> triedEngines=new HashSet<>();
    LocalReferenceVoice(Context context){this.context=context;}
    void render(PluginCall next){
        cancel();
        String text=next.getString("text",""),language=next.getString("language","");
        if(text.isEmpty()||text.length()>500||!Arrays.asList("en-US","zh-CN","zh-HK","ja-JP","ko-KR","ar-SA").contains(language)){
            next.reject("Invalid practice reference.");return;
        }
        call=next;token=UUID.randomUUID().toString();triedEngines.clear();
        final String current=token;
        deadline=()->{if(current.equals(token))cancel();};main.postDelayed(deadline,20000);
        if(engine==null)initialize(null);
        else if(ready)start();
    }
    private void initialize(String packageName){
        if(engine!=null)engine.shutdown();ready=false;
        final long epoch=++engineEpoch;
        if(packageName!=null)triedEngines.add(packageName);
        TextToSpeech.OnInitListener listener=status->main.post(()->{
                if(epoch!=engineEpoch||engine==null)return;
                ready=status==TextToSpeech.SUCCESS;
                if(!ready){cancel();return;}
                triedEngines.add(engine.getDefaultEngine());
                engine.setOnUtteranceProgressListener(new UtteranceProgressListener(){
                    @Override public void onStart(String id){}
                    @Override public void onDone(String id){main.post(()->complete(id));}
                    @Override public void onError(String id){main.post(()->{if(id.equals(token))cancel();});}
                });
                if(call!=null)start();
            });
        engine=packageName==null?new TextToSpeech(context,listener):new TextToSpeech(context,listener,packageName);
    }
    private void start(){
        if(call==null)return;
        String language=call.getString("language","");
        Voice selected=null;int rank=Integer.MIN_VALUE;
        if(engine.getVoices()!=null)for(Voice voice:engine.getVoices()){
            if(voice.isNetworkConnectionRequired()||!PracticeVoicePolicy.matches(voice.getLocale().toLanguageTag(),language))continue;
            if(voice.getFeatures()!=null&&voice.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED))continue;
            int value=voice.getQuality()+(PracticeVoicePolicy.tag(voice.getLocale().toLanguageTag()).equals(PracticeVoicePolicy.tag(language))?10000:0);
            if(selected==null||value>rank||(value==rank&&voice.getName().compareTo(selected.getName())<0)){selected=voice;rank=value;}
        }
        if(selected==null){
            // Some OEM defaults expose only English/Mandarin even with another
            // multilingual engine installed. Try existing engines privately;
            // never change the phone's default or permit network-only voices.
            if(triedEngines.size()<4)for(TextToSpeech.EngineInfo candidate:engine.getEngines()){
                if(!triedEngines.contains(candidate.name)){initialize(candidate.name);return;}
            }
            cancel();return;
        }
        if(engine.setVoice(selected)==TextToSpeech.ERROR||engine.getVoice()==null||engine.getVoice().isNetworkConnectionRequired()){
            cancel();return;
        }
        voiceId=selected.getName();engine.setSpeechRate(1f);engine.setPitch(1f);
        try{
            file=File.createTempFile("clearpair-reference-",".wav",context.getCacheDir());
            if(engine.synthesizeToFile(call.getString("text",""),null,file,token)==TextToSpeech.ERROR)cancel();
        }catch(Exception error){cancel();}
    }
    private void complete(String id){
        if(!id.equals(token)||call==null||file==null)return;
        try{
            if(file.length()<44||file.length()>3_000_000)throw new IllegalStateException("Reference size");
            ByteArrayOutputStream bytes=new ByteArrayOutputStream();
            try(FileInputStream input=new FileInputStream(file)){
                byte[] buffer=new byte[8192];int n;while((n=input.read(buffer))!=-1){bytes.write(buffer,0,n);if(bytes.size()>3_000_000)throw new IllegalStateException("Reference size");}
            }
            JSObject result=new JSObject();result.put("base64",Base64.encodeToString(bytes.toByteArray(),Base64.NO_WRAP));
            result.put("mimeType","audio/wav");result.put("voice",voiceId);
            PluginCall done=call;call=null;clear();done.resolve(result);
        }catch(Exception error){cancel();}
    }
    private void clear(){token=null;if(deadline!=null)main.removeCallbacks(deadline);deadline=null;if(file!=null)file.delete();file=null;}
    void cancel(){if(engine!=null)engine.stop();PluginCall pending=call;call=null;clear();if(pending!=null)pending.reject("Install an offline voice for the practice language in Android text-to-speech settings, then retry.");}
    void close(){engineEpoch++;cancel();if(engine!=null)engine.shutdown();engine=null;ready=false;}
}
