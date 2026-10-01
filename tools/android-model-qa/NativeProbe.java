package art.lazying.clearpair.qa.model;

import android.app.Activity;
import android.content.res.AssetFileDescriptor;
import android.os.SystemClock;
import android.widget.TextView;
import ai.onnxruntime.OnnxTensor;
import ai.onnxruntime.OrtEnvironment;
import ai.onnxruntime.OrtSession;
import java.io.ByteArrayOutputStream;
import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.FloatBuffer;
import java.nio.channels.FileChannel;
import java.security.MessageDigest;
import java.util.Collections;
import org.json.JSONArray;
import org.json.JSONObject;

/** Numerical/performance diagnostic only. No recognition grade, network or mic. */
final class NativeProbe {
    static void start(Activity activity, TextView label, boolean xnnpack) {
        new Thread(new Runnable() { @Override public void run() {
            JSONObject result = new JSONObject();
            try {
                long started = SystemClock.elapsedRealtime();
                // Directly map the uncompressed APK asset: no duplicate model file
                // or pair of large Java byte arrays retained in the app's storage.
                try (AssetFileDescriptor asset = activity.getAssets().openFd("www/models/english-int8.onnx");
                     FileInputStream input = new FileInputStream(asset.getFileDescriptor());
                     FileChannel channel = input.getChannel()) {
                    if (asset.getLength() != 132895651L) throw new IllegalStateException("Model size mismatch");
                    ByteBuffer model = channel.map(FileChannel.MapMode.READ_ONLY, asset.getStartOffset(), asset.getLength());
                    MessageDigest digest = MessageDigest.getInstance("SHA-256");
                    digest.update(model.duplicate());
                    StringBuilder hash = new StringBuilder();
                    for (byte b : digest.digest()) hash.append(String.format(java.util.Locale.ROOT,"%02x",b & 255));
                    if (!hash.toString().equals("2597d1bb1ac649d77abff5469e8a8c461482c667d34fc905513d8f635006a8b5"))
                        throw new IllegalStateException("Model integrity mismatch");
                    long verified = SystemClock.elapsedRealtime();
                    JSONObject reference;
                    try (InputStream stream = activity.getAssets().open("www/reference.json")) {
                        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                        byte[] chunk = new byte[8192]; int count;
                        while ((count = stream.read(chunk)) >= 0) {
                            if (bytes.size() + count > 5*1024*1024) throw new IllegalStateException("Oversized reference");
                            bytes.write(chunk,0,count);
                        }
                        reference = new JSONObject(bytes.toString("UTF-8"));
                    }
                    JSONArray samples = reference.getJSONArray("samples"), expected = reference.getJSONArray("frames");
                    int n = samples.length();
                    if (n < 320 || n > 192000) throw new IllegalStateException("Invalid sample count");
                    double mean=0,variance=0;
                    for (int i=0;i<n;i++) mean += samples.getDouble(i)/n;
                    for (int i=0;i<n;i++) variance += Math.pow(samples.getDouble(i)-mean,2)/n;
                    FloatBuffer normalized = ByteBuffer.allocateDirect(n*4).order(ByteOrder.nativeOrder()).asFloatBuffer();
                    for (int i=0;i<n;i++) normalized.put((float)((samples.getDouble(i)-mean)/Math.sqrt(variance+1e-7)));
                    normalized.rewind();
                    OrtEnvironment environment=OrtEnvironment.getEnvironment();
                    environment.setTelemetry(false);
                    try (OrtSession.SessionOptions options=new OrtSession.SessionOptions()) {
                        options.setIntraOpNumThreads(xnnpack?1:4);
                        options.setInterOpNumThreads(1);
                        options.addConfigEntry("session.intra_op.allow_spinning","0");
                        options.setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT);
                        if (xnnpack) options.addXnnpack(Collections.singletonMap("intra_op_num_threads","4"));
                        long loading=SystemClock.elapsedRealtime();
                        try (OrtSession session=environment.createSession(model,options);
                             OnnxTensor tensor=OnnxTensor.createTensor(environment,normalized,new long[]{1,n})) {
                            long loaded=SystemClock.elapsedRealtime();
                            JSONArray trials=new JSONArray();
                            for(int trial=0;trial<3;trial++){
                                long before=SystemClock.elapsedRealtime();
                                try(OrtSession.Result output=session.run(Collections.singletonMap("input_values",tensor))){
                                    long after=SystemClock.elapsedRealtime();
                                    float[][][] logits=(float[][][])output.get("logits").get().getValue();
                                    if(logits.length!=1||logits[0].length!=expected.length())throw new IllegalStateException("Frame mismatch");
                                    double maximum=0;int agree=0;
                                    for(int t=0;t<expected.length();t++){
                                        float[] row=logits[0][t];JSONArray baseline=expected.getJSONArray(t);
                                        if(row.length!=46)throw new IllegalStateException("Vocabulary mismatch");
                                        double max=Double.NEGATIVE_INFINITY,sum=0;int best=0,expectedBest=0;
                                        for(int v=0;v<46;v++){if(row[v]>max){max=row[v];best=v;}if(baseline.getDouble(v)>baseline.getDouble(expectedBest))expectedBest=v;}
                                        for(float value:row)sum+=Math.exp(value-max);
                                        for(int v=0;v<46;v++){
                                            double difference=Math.abs(row[v]-max-Math.log(sum)-baseline.getDouble(v));
                                            if(!Double.isFinite(difference))throw new IllegalStateException("Invalid posterior");
                                            maximum=Math.max(maximum,difference);
                                        }
                                        if(best==expectedBest)agree++;
                                    }
                                    trials.put(new JSONObject().put("inferMs",after-before).put("maximumLogProbabilityDifference",maximum)
                                        .put("argmaxAgreement",(double)agree/expected.length()).put("compatible",maximum<=.03&&(double)agree/expected.length()>=.98));
                                }
                            }
                            boolean compatible=true;
                            for(int i=0;i<trials.length();i++)compatible &= trials.getJSONObject(i).getBoolean("compatible");
                            result.put("completed",true).put("compatible",compatible).put("frames",expected.length())
                                .put("verifiedMs",verified-started).put("loadMs",loaded-loading).put("trials",trials)
                                .put("runtime",environment.getVersion()).put("provider",xnnpack?"xnnpack4-cpu1":"cpu4")
                                .put("modelSha256",hash.toString());
                        }
                    }
                }
            }catch(Throwable error){
                try{result.put("completed",false).put("error",error.toString());}catch(Exception ignored){}
            }
            try{result.put("approved",false);}catch(Exception ignored){}
            String json=result.toString();
            android.util.Log.i("ClearPairModelQA","CLEARPAIR_MODEL_QA_RESULT "+json);
            activity.runOnUiThread(new Runnable() { @Override public void run() {
                label.setText("Offline native runtime check\nNot a pronunciation grade.\n\n"+json);
            }});
        }},"ClearPairNativeModelQA").start();
    }
}
