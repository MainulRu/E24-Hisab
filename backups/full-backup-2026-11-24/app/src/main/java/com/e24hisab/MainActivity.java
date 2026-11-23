package com.e24hisab;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.view.Window;
import android.view.WindowInsets;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.JavascriptInterface;
import android.content.Context;
import android.print.PrintManager;
import android.print.PrintDocumentAdapter;
import android.os.Build;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import android.provider.ContactsContract;
import org.json.JSONObject;

public class MainActivity extends Activity {
    private WebView webView;
    private FrameLayout rootLayout;
    private View navigationBarBackground;
    private static final int REQUEST_PICK_PHONE = 2401;
    private static final int REQUEST_SAVE_BACKUP = 2402;
    private String pendingBackupJson;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);

        // Draw edge-to-edge, then place the WebView inside the system-bar insets.
        // This keeps the HTML app bar at its original position on Android 15 (targetSdk 35).
        window.getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
        );

        rootLayout = new FrameLayout(this);
        rootLayout.setBackgroundColor(Color.rgb(0, 92, 46));

        webView = new WebView(this);
        // Allow Android Autofill services (including Google Password Manager) to inspect
        // HTML login fields and offer to save/fill credentials in this WebView.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            webView.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_YES);
        }
        webView.setBackgroundColor(Color.rgb(248, 249, 250));
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDefaultTextEncodingName("UTF-8");
        settings.setLoadsImagesAutomatically(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        webView.setWebChromeClient(new WebChromeClient());
        webView.addJavascriptInterface(new AndroidPrintBridge(this, webView), "AndroidPrint");
        webView.addJavascriptInterface(new AndroidContactsBridge(this), "AndroidContacts");
        webView.addJavascriptInterface(new AndroidBackupBridge(this), "AndroidBackup");
        webView.setWebViewClient(new WebViewClient());

        FrameLayout.LayoutParams webParams = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        );
        rootLayout.addView(webView, webParams);

        navigationBarBackground = new View(this);
        navigationBarBackground.setBackgroundColor(Color.WHITE);
        FrameLayout.LayoutParams navParams = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, 0, Gravity.BOTTOM
        );
        rootLayout.addView(navigationBarBackground, navParams);

        rootLayout.setOnApplyWindowInsetsListener((view, insets) -> {
            int topInset;
            int bottomInset;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                android.graphics.Insets bars = insets.getInsets(
                    WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars()
                );
                topInset = bars.top;
                bottomInset = bars.bottom;
            } else {
                topInset = insets.getSystemWindowInsetTop();
                bottomInset = insets.getSystemWindowInsetBottom();
            }

            FrameLayout.LayoutParams contentParams =
                (FrameLayout.LayoutParams) webView.getLayoutParams();
            contentParams.topMargin = topInset;
            contentParams.bottomMargin = bottomInset;
            webView.setLayoutParams(contentParams);

            FrameLayout.LayoutParams bottomParams =
                (FrameLayout.LayoutParams) navigationBarBackground.getLayoutParams();
            bottomParams.height = bottomInset;
            navigationBarBackground.setLayoutParams(bottomParams);

            return insets;
        });

        setContentView(rootLayout);
        rootLayout.requestApplyInsets();
        webView.loadUrl("file:///android_asset/index.html");
    }

    private void openPhoneBook() {
        try {
            Intent intent = new Intent(Intent.ACTION_PICK, ContactsContract.CommonDataKinds.Phone.CONTENT_URI);
            startActivityForResult(intent, REQUEST_PICK_PHONE);
        } catch (Exception e) {
            if (webView != null) webView.evaluateJavascript("showToast('ফোনবুক খোলা যায়নি')", null);
        }
    }

    private void createBackupFile(String json, String filename) {
        pendingBackupJson = json;
        try {
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("application/json");
            intent.putExtra(Intent.EXTRA_TITLE, filename);
            startActivityForResult(intent, REQUEST_SAVE_BACKUP);
        } catch (Exception e) {
            pendingBackupJson = null;
            if (webView != null) webView.evaluateJavascript("showToast('Backup সংরক্ষণের জায়গা খোলা যায়নি')", null);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_SAVE_BACKUP) {
            String json = pendingBackupJson;
            pendingBackupJson = null;
            if (resultCode != RESULT_OK || data == null || data.getData() == null) {
                if (webView != null) webView.evaluateJavascript("showToast('Backup সংরক্ষণ বাতিল হয়েছে')", null);
                return;
            }
            try (OutputStream output = getContentResolver().openOutputStream(data.getData())) {
                if (output == null || json == null) throw new IllegalStateException("Backup output unavailable");
                output.write(json.getBytes(StandardCharsets.UTF_8));
                output.flush();
                if (webView != null) webView.evaluateJavascript("showToast('Backup ফাইল সফলভাবে সংরক্ষিত হয়েছে')", null);
            } catch (Exception e) {
                if (webView != null) webView.evaluateJavascript("showToast('Backup ফাইল সংরক্ষণ করা যায়নি')", null);
            }
            return;
        }
        if (requestCode != REQUEST_PICK_PHONE || resultCode != RESULT_OK || data == null) return;
        Uri contactUri = data.getData();
        if (contactUri == null) return;
        String name = "";
        String phone = "";
        Cursor cursor = null;
        try {
            cursor = getContentResolver().query(
                contactUri,
                new String[] {
                    ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                    ContactsContract.CommonDataKinds.Phone.NUMBER
                },
                null, null, null
            );
            if (cursor != null && cursor.moveToFirst()) {
                int nameIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME);
                int phoneIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER);
                if (nameIndex >= 0) name = cursor.getString(nameIndex);
                if (phoneIndex >= 0) phone = cursor.getString(phoneIndex);
            }
        } catch (Exception e) {
            if (webView != null) webView.evaluateJavascript("showToast('কন্টাক্ট পড়া যায়নি')", null);
            return;
        } finally {
            if (cursor != null) cursor.close();
        }
        if (webView != null) {
            final String pickedName = name;
            final String pickedPhone = phone;
            webView.post(() -> webView.evaluateJavascript(
                "(function(){var n=" + JSONObject.quote(pickedName) + ";var p=" + JSONObject.quote(pickedPhone) + ";" +
                "if(typeof window.e24SetPhoneBookContact==='function'){window.e24SetPhoneBookContact(n,p);}" +
                "else{var f=document.getElementById('sms-test-phone');if(f){f.value=p;f.dispatchEvent(new Event('input',{bubbles:true}));f.dispatchEvent(new Event('change',{bubbles:true}));}}" +
                "})()",
                null
            ));
        }
    }

    public static class AndroidBackupBridge {
        private final MainActivity activity;
        AndroidBackupBridge(MainActivity activity) { this.activity = activity; }
        @JavascriptInterface
        public void saveBackup(String json, String filename) {
            activity.runOnUiThread(() -> activity.createBackupFile(json, filename));
        }
    }

    public static class AndroidContactsBridge {
        private final MainActivity activity;
        AndroidContactsBridge(MainActivity activity) { this.activity = activity; }
        @JavascriptInterface
        public void pickPhoneNumber() {
            activity.runOnUiThread(activity::openPhoneBook);
        }
    }

    public static class AndroidPrintBridge {
        private final Activity activity;
        private final WebView webView;
        AndroidPrintBridge(Activity activity, WebView webView) {
            this.activity = activity;
            this.webView = webView;
        }
        @JavascriptInterface
        public void printLedger() {
            activity.runOnUiThread(() -> {
                PrintManager printManager = (PrintManager) activity.getSystemService(Context.PRINT_SERVICE);
                if (printManager != null) {
                    PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter("E24-Hisab-Khata");
                    printManager.print("E24 Hisab - Khata", adapter, null);
                }
            });
        }

        @JavascriptInterface
        public void printReport() {
            activity.runOnUiThread(() -> {
                PrintManager printManager = (PrintManager) activity.getSystemService(Context.PRINT_SERVICE);
                if (printManager != null) {
                    PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter("E24-Hisab-Report");
                    printManager.print("E24 Hisab - Report", adapter, null);
                }
            });
        }
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (webView != null) {
            webView.evaluateJavascript(
                "(function(){var active=document.querySelector('.app-page.active-page');" +
                "if(active && active.id !== 'page-1'){switchPage('1');return 'handled';}" +
                "return 'home';})()",
                value -> { if ("\"home\"".equals(value)) finish(); }
            );
        } else {
            super.onBackPressed();
        }
    }
}
