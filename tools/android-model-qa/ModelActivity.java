package art.lazying.clearpair.qa.model;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.ByteArrayInputStream;
import java.util.Collections;

/** Permission-free offline QA only, never a release app or microphone substitute. */
public final class ModelActivity extends Activity {
    private WebView web;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        if (getIntent().getBooleanExtra("native",false)) {
            android.widget.TextView label=new android.widget.TextView(this);
            label.setText("Loading native offline model…\nNot a pronunciation grade.");
            label.setPadding(24,48,24,24);setContentView(label);
            NativeProbe.start(this,label,getIntent().getBooleanExtra("xnnpack",false));
            return;
        }
        web = new WebView(this);
        WebView.setWebContentsDebuggingEnabled(true);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(false);
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String path = request.getUrl().getPath();
                try {
                    if (!"https".equals(request.getUrl().getScheme()) ||
                        !"qa.clearpair.invalid".equals(request.getUrl().getHost()) ||
                        !"GET".equals(request.getMethod()) || path == null || path.contains("..") ||
                        !path.matches("/[A-Za-z0-9_./-]+")) throw new Exception("Blocked origin/path");
                    String type = path.endsWith(".html") ? "text/html" :
                        path.endsWith(".js") || path.endsWith(".mjs") ? "text/javascript" :
                        path.endsWith(".wasm") ? "application/wasm" :
                        path.endsWith(".json") ? "application/json" : "application/octet-stream";
                    return new WebResourceResponse(type, null, 200, "OK", Collections.emptyMap(),
                        getAssets().open("www"+path));
                } catch (Exception error) {
                    android.util.Log.e("ClearPairModelQA", "Blocked or absent asset: " + request.getUrl());
                    return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", Collections.emptyMap(),
                        new ByteArrayInputStream(new byte[0]));
                }
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onConsoleMessage(ConsoleMessage message) {
                android.util.Log.i("ClearPairModelQA", message.message());
                return true;
            }
        });
        setContentView(web);
        web.loadUrl("https://qa.clearpair.invalid/index.html");
    }
    @Override protected void onDestroy() {
        if (web != null) { web.stopLoading(); web.destroy(); web = null; }
        super.onDestroy();
    }
}
