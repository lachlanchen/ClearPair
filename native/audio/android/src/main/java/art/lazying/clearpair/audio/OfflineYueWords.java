package art.lazying.clearpair.audio;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.k2fsa.sherpa.onnx.OfflineRecognizer;
import com.k2fsa.sherpa.onnx.OfflineRecognizerConfig;
import com.k2fsa.sherpa.onnx.OfflineModelConfig;
import com.k2fsa.sherpa.onnx.OfflineSenseVoiceModelConfig;
import com.k2fsa.sherpa.onnx.OfflineStream;
import org.json.JSONArray;
import java.io.InputStream;

/** Called only on OfflinePairWords' single worker. No recorder or network. */
final class OfflineYueWords {
 private final Context context;
 private OfflineRecognizer model;
 OfflineYueWords(Context context){this.context=context;}
 JSObject decode(byte[] pcm)throws Exception{
  long sum=0,squared=0;int count=pcm.length/2;
  for(int i=0;i<count;i++){int sample=(short)((pcm[2*i]&255)|((pcm[2*i+1]&255)<<8));sum+=sample;squared+=(long)sample*sample;}
  double mean=(double)sum/count;
  // A generative recognizer may hallucinate on digital silence/DC. Do not
  // initialize it for <= one PCM-bit AC variation; quiet speech is untouched.
  if((double)squared/count-mean*mean<=1)return result("");
  if(model==null){
   String root="public/models/pair-native/yue/";
   // Fail before JNI construction if the explicitly bundled language is absent.
   try(InputStream m=context.getAssets().open(root+"model.int8.onnx");InputStream t=context.getAssets().open(root+"tokens.txt")){
    if(m.available()<200000000||t.available()<300000)throw new java.io.IOException();
   }
   OfflineSenseVoiceModelConfig sense=new OfflineSenseVoiceModelConfig();
   sense.setModel(root+"model.int8.onnx");sense.setLanguage("yue");sense.setUseInverseTextNormalization(false);
   OfflineModelConfig nativeModel=new OfflineModelConfig();nativeModel.setSenseVoice(sense);
   nativeModel.setTokens(root+"tokens.txt");nativeModel.setNumThreads(2);nativeModel.setDebug(false);
   nativeModel.setProvider("cpu");nativeModel.setModelType("sense_voice");nativeModel.setModelingUnit("cjkchar");
   OfflineRecognizerConfig config=new OfflineRecognizerConfig();config.setModelConfig(nativeModel);config.setDecodingMethod("greedy_search");
   model=new OfflineRecognizer(context.getAssets(),config);
  }
  float[] audio=new float[pcm.length/2+13120];
  for(int i=0;i<pcm.length/2;i++)audio[i+5120]=(short)((pcm[2*i]&255)|((pcm[2*i+1]&255)<<8))/32767f;
  OfflineStream stream=model.createStream();
  try{
   stream.acceptWaveform(audio,16000);model.decode(stream);
   String text=model.getResult(stream).getText();if(text.length()>500)throw new IllegalArgumentException();
   // SenseVoice does not provide Vosk-style confidence/timing. Leave them
   // absent, with explicit provenance; acoustics still measures the contrast.
   return result(text);
  }finally{stream.release();}
 }
 private static JSObject result(String text){
  JSObject value=new JSObject();value.put("engine","pair-sensevoice-native:v1/zh-HK");
  value.put("text",text);value.put("words",new JSONArray());value.put("final",true);value.put("untimed",true);return value;
 }
 void release(){if(model!=null)model.release();model=null;}
}
