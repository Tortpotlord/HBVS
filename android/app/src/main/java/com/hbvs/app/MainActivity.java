package com.hbvs.app;

import android.os.Bundle;
import android.print.PrintManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Get Capacitor WebView
        WebView webView = getBridge().getWebView();
        webView.getSettings().setAllowFileAccess(true);
        webView.getSettings().setAllowContentAccess(true);
        webView.getSettings().setJavaScriptEnabled(true);

        // --- OFFLINE PRINT BRIDGE FOR APK SHARED VIA WHATSAPP ---
        // Works anywhere - no need for 192.168.137.1 server
        // Prints to any local WiFi/Bluetooth/USB printer
        webView.addJavascriptInterface(new Object() {
            @android.webkit.JavascriptInterface
            public void print(final String htmlData) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        // Create temporary WebView for printing - 100% offline
                        WebView printWebView = new WebView(MainActivity.this);
                        printWebView.getSettings().setAllowFileAccess(true);
                        printWebView.getSettings().setJavaScriptEnabled(true);

                        printWebView.setWebViewClient(new WebViewClient() {
                            @Override
                            public void onPageFinished(WebView view, String url) {
                                // Trigger Android system print dialog - shows user's local printers
                                PrintManager printManager = (PrintManager) getSystemService(PRINT_SERVICE);
                                String jobName = "HBVS_" + System.currentTimeMillis();
                                printManager.print(jobName, view.createPrintDocumentAdapter(jobName),
                                        new android.print.PrintAttributes.Builder().build());
                            }
                        });

                        // IMPORTANT: baseURL is local file, NOT http://192.168.137.1:8080
                        // This is why APK can print anywhere without server
                        printWebView.loadDataWithBaseURL(
                                "file:///android_asset/public/", // Capacitor public folder - local
                                htmlData,
                                "text/html",
                                "UTF-8",
                                null
                        );
                    }
                });
            }
        }, "AndroidPrint");
    }
}