package art.lazying.clearpair.audio;

import android.Manifest;
import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@CapacitorPlugin(name="ClearPairAudio", permissions={@Permission(alias="microphone",strings={Manifest.permission.RECORD_AUDIO})})
public class ClearPairAudioPlugin extends Plugin {
    private static final int RATE=16000;
    private volatile boolean recording=false;
    private AudioRecord recorder;
    private Thread captureThread;
    private ByteArrayOutputStream pcm;
    private TextToSpeech tts;
    private boolean ttsReady=false;
    private PluginCall speechCall;
    private String speechId;
    private LocalReferenceVoice referenceVoice;
    private final AtomicInteger captureGeneration=new AtomicInteger();
    private final ConcurrentHashMap<String,Integer> permissionRequests=new ConcurrentHashMap<>();

    @PluginMethod public void start(PluginCall call) {
        getActivity().runOnUiThread(()->{if(referenceVoice!=null)referenceVoice.cancel();});
        if (recorder!=null) { call.reject("A recording is already active.");return; }
        int token=captureGeneration.incrementAndGet();
        if(getPermissionState("microphone")!=PermissionState.GRANTED){
            permissionRequests.put(call.getCallbackId(),token);
            requestPermissionForAlias("microphone",call,"permissionDone");return;
        }
        begin(call);
    }
    @PermissionCallback private void permissionDone(PluginCall call){
        Integer token=permissionRequests.remove(call.getCallbackId());
        if(token==null||token!=captureGeneration.get()){call.reject("Recording cancelled.");return;}
        if(getPermissionState("microphone")==PermissionState.GRANTED)begin(call);
        else call.reject("Microphone permission is required. Enable it in Android Settings.");
    }
    private synchronized void begin(PluginCall call){
        if(recorder!=null){call.reject("A recording is already active.");return;}
        try{
            int size=Math.max(AudioRecord.getMinBufferSize(RATE,AudioFormat.CHANNEL_IN_MONO,AudioFormat.ENCODING_PCM_16BIT),RATE/2);
            recorder=new AudioRecord(MediaRecorder.AudioSource.VOICE_RECOGNITION,RATE,AudioFormat.CHANNEL_IN_MONO,AudioFormat.ENCODING_PCM_16BIT,size);
            if(recorder.getState()!=AudioRecord.STATE_INITIALIZED)throw new IllegalStateException("Microphone unavailable.");
            pcm=new ByteArrayOutputStream();recording=true;recorder.startRecording();
            final AudioRecord input=recorder;
            captureThread=new Thread(()->{
                short[] samples=new short[800];
                while(recording&&pcm.size()<RATE*2*13){
                    int count=input.read(samples,0,samples.length);if(count<=0)break;
                    double sum=0;byte[] bytes=new byte[count*2];
                    for(int i=0;i<count;i++){bytes[i*2]=(byte)samples[i];bytes[i*2+1]=(byte)(samples[i]>>8);double v=samples[i]/32768.0;sum+=v*v;}
                    synchronized(this){pcm.write(bytes,0,bytes.length);}
                    JSObject event=new JSObject();event.put("rms",Math.sqrt(sum/count));notifyListeners("meter",event);
                }
                recording=false;
            },"clearpair-capture");
            captureThread.start();call.resolve();
        }catch(Exception error){recording=false;if(recorder!=null){recorder.release();recorder=null;}call.reject("Unable to start the microphone.",error);}
    }
    private byte[] endCapture(){
        recording=false;
        if(recorder!=null){try{recorder.stop();}catch(Exception ignored){}}
        if(captureThread!=null){try{captureThread.join(1000);}catch(InterruptedException e){Thread.currentThread().interrupt();}captureThread=null;}
        if(recorder!=null){recorder.release();recorder=null;}
        return pcm==null?new byte[0]:pcm.toByteArray();
    }
    @PluginMethod public void stop(PluginCall call){
        byte[] data=endCapture();pcm=null;
        if(data.length<320){call.reject("No microphone audio was captured.");return;}
        ByteBuffer wav=ByteBuffer.allocate(44+data.length).order(ByteOrder.LITTLE_ENDIAN);
        wav.put(new byte[]{'R','I','F','F'}).putInt(36+data.length).put(new byte[]{'W','A','V','E','f','m','t',' '});
        wav.putInt(16).putShort((short)1).putShort((short)1).putInt(RATE).putInt(RATE*2).putShort((short)2).putShort((short)16);
        wav.put(new byte[]{'d','a','t','a'}).putInt(data.length).put(data);
        JSObject result=new JSObject();result.put("base64",Base64.encodeToString(wav.array(),Base64.NO_WRAP));result.put("mimeType","audio/wav");call.resolve(result);
    }
    @PluginMethod public void cancel(PluginCall call){captureGeneration.incrementAndGet();endCapture();pcm=null;call.resolve();}
    @PluginMethod public void shareRecording(PluginCall call){
        String filename=call.getString("filename",""),mime=call.getString("mimeType",""),encoded=call.getString("base64","");
        if(filename.length()>120||!filename.matches("clearpair-[A-Za-z0-9._-]+\\.(wav|m4a|webm)")||
           !(mime.equals("audio/wav")||mime.equals("audio/x-wav")||mime.equals("audio/mp4")||mime.equals("audio/webm"))||encoded.length()>24*1024*1024){
            call.reject("Unsupported recording export.");return;
        }
        try{
            byte[] data=Base64.decode(encoded,Base64.DEFAULT);
            if(data.length==0||data.length>16*1024*1024)throw new IllegalArgumentException("Invalid recording size.");
            File directory=new File(getContext().getCacheDir(),"clearpair-exports");
            if(!directory.isDirectory()&&!directory.mkdirs())throw new IllegalStateException("Export storage unavailable.");
            File[] older=directory.listFiles();
            if(older!=null)for(File file:older)if(file.isFile()&&file.getName().startsWith("clearpair-export-")&&file.lastModified()<System.currentTimeMillis()-86400000L)file.delete();
            File file=new File(directory,"clearpair-export-"+UUID.randomUUID()+"-"+filename);
            try(FileOutputStream output=new FileOutputStream(file)){output.write(data);}
            Uri uri=RecordingFileProvider.getUriForFile(getContext(),getContext().getPackageName()+".clearpair.recordings",file);
            getActivity().runOnUiThread(()->{
                try{
                    Intent intent=new Intent(Intent.ACTION_SEND);
                    intent.setType(mime);intent.putExtra(Intent.EXTRA_STREAM,uri);
                    intent.setClipData(ClipData.newRawUri("ClearPair recording",uri));
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    getActivity().startActivity(Intent.createChooser(intent,"Export recording"));
                    call.resolve(); // Presented, not a claim the user sent/saved it.
                }catch(Exception error){file.delete();call.reject("Unable to open the share sheet.",error);}
            });
        }catch(Exception error){call.reject("Unable to prepare the recording for export.",error);}
    }
    @PluginMethod public void speak(PluginCall call){getActivity().runOnUiThread(()->{
        if(referenceVoice!=null)referenceVoice.cancel();
        stopVoice();speechCall=call;
        if(tts==null){tts=new TextToSpeech(getContext(),status->{ttsReady=status==TextToSpeech.SUCCESS;if(!ttsReady){failSpeech("Android text-to-speech is unavailable.");return;}installSpeechListener();startVoice();});}
        else if(ttsReady)startVoice();
        else failSpeech("The voice engine is starting. Please retry.");
    });}
    private void installSpeechListener(){tts.setOnUtteranceProgressListener(new UtteranceProgressListener(){
        @Override public void onStart(String id){}
        @Override public void onDone(String id){getActivity().runOnUiThread(()->{if(id.equals(speechId)&&speechCall!=null){speechCall.resolve();speechCall=null;speechId=null;}});}
        @Override public void onError(String id){getActivity().runOnUiThread(()->{if(id.equals(speechId))failSpeech("Voice playback failed. Check the installed voice.");});}
    });}
    private void startVoice(){
        if(speechCall==null)return;
        String language=speechCall.getString("language","en-US");
        android.speech.tts.Voice selected=null;
        int selectedRank=Integer.MIN_VALUE;
        if(tts.getVoices()!=null)for(android.speech.tts.Voice voice:tts.getVoices()){
            String tag=voice.getLocale().toLanguageTag();
            if(!PracticeVoicePolicy.matches(tag,language))continue;
            if(voice.getFeatures()!=null&&voice.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED))continue;
            int rank=voice.getQuality()+(PracticeVoicePolicy.tag(tag).equals(PracticeVoicePolicy.tag(language))?10000:0);
            if(selected==null||rank>selectedRank||(rank==selectedRank&&voice.getName().compareTo(selected.getName())<0)){
                selected=voice;selectedRank=rank;
            }
        }
        if(selected==null||tts.setVoice(selected)==TextToSpeech.ERROR||tts.getVoice()==null||
           !PracticeVoicePolicy.matches(tts.getVoice().getLocale().toLanguageTag(),language)){
            failSpeech("Install the practice language in Android text-to-speech settings. Mandarin and Cantonese voices are not interchangeable.");return;
        }
        tts.setSpeechRate(speechCall.getFloat("rate",1.0f));speechId=UUID.randomUUID().toString();
        if(tts.speak(speechCall.getString("text",""),TextToSpeech.QUEUE_FLUSH,null,speechId)==TextToSpeech.ERROR)failSpeech("Voice playback could not start.");
    }
    private void failSpeech(String message){if(speechCall!=null){speechCall.reject(message);speechCall=null;}speechId=null;}
    private void stopVoice(){speechId=null;if(tts!=null)tts.stop();if(speechCall!=null){speechCall.resolve();speechCall=null;}}
    @PluginMethod public void stopSpeech(PluginCall call){getActivity().runOnUiThread(()->{stopVoice();call.resolve();});}
    @PluginMethod public void reference(PluginCall call){getActivity().runOnUiThread(()->{
        if(recording||recorder!=null){call.reject("Stop recording before local assessment.");return;}
        if(referenceVoice==null)referenceVoice=new LocalReferenceVoice(getContext());
        referenceVoice.render(call);
    });}
    @PluginMethod public void cancelReference(PluginCall call){getActivity().runOnUiThread(()->{
        if(referenceVoice!=null)referenceVoice.cancel();call.resolve();
    });}
    @Override protected void handleOnStop(){if(referenceVoice!=null)referenceVoice.cancel();super.handleOnStop();}
    @Override protected void handleOnDestroy(){if(referenceVoice!=null)referenceVoice.close();captureGeneration.incrementAndGet();permissionRequests.clear();endCapture();stopVoice();if(tts!=null){tts.shutdown();tts=null;}super.handleOnDestroy();}
}
