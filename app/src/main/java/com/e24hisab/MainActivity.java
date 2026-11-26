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
import android.webkit.ValueCallback;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.SslErrorHandler;
import android.net.http.SslError;
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
import android.provider.MediaStore;
import android.content.ContentValues;
import org.json.JSONObject;

public class MainActivity extends Activity {
    private WebView webView;
    private FrameLayout rootLayout;
    private View navigationBarBackground;
    private static final int REQUEST_PICK_PHONE = 2401;
    private static final int REQUEST_SAVE_BACKUP = 2402;
    private static final int REQUEST_TRANSACTION_IMAGE = 2403;
    private ValueCallback<Uri[]> transactionImageCallback;
    private Uri transactionCameraUri;
    private String pendingBackupJson;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.rgb(237, 243, 239));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setNavigationBarContrastEnforced(false);
        }

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
        // Disable Android system Autofill services (including Google Autofill)
        // for this WebView so saved names, phone numbers and addresses are not suggested.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            webView.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
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
        // File access is needed only to load the bundled app asset. Prevent file-origin
        // JavaScript from reading other file URLs or reaching arbitrary network origins.
        settings.setAllowFileAccess(true);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.setSafeBrowsingEnabled(true);
        }

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams) {
                if (transactionImageCallback != null) transactionImageCallback.onReceiveValue(null);
                transactionImageCallback = filePathCallback;
                openTransactionImagePicker();
                return true;
            }
        });
        installAppJavascriptInterfaces();
        webView.setWebViewClient(new E24SecureWebViewClient());

        FrameLayout.LayoutParams webParams = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        );
        rootLayout.addView(webView, webParams);

        navigationBarBackground = new View(this);
        // Match the Android system navigation area to the app's light-mode body background.
        navigationBarBackground.setBackgroundColor(Color.rgb(237, 243, 239));
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

    private boolean isTrustedAppAsset(Uri uri) {
        return uri != null
            && "file".equalsIgnoreCase(uri.getScheme())
            && uri.getHost() == null
            && "/android_asset/index.html".equals(uri.getPath());
    }

    private void installAppJavascriptInterfaces() {
        if (webView == null) return;
        webView.addJavascriptInterface(new AndroidPrintBridge(this, webView), "AndroidPrint");
        webView.addJavascriptInterface(new AndroidContactsBridge(this), "AndroidContacts");
        webView.addJavascriptInterface(new AndroidBackupBridge(this), "AndroidBackup");
        webView.addJavascriptInterface(new AndroidNavBarBridge(this), "AndroidNavBar");
    }

    private void removeAppJavascriptInterfaces() {
        if (webView == null) return;
        webView.removeJavascriptInterface("AndroidPrint");
        webView.removeJavascriptInterface("AndroidContacts");
        webView.removeJavascriptInterface("AndroidBackup");
        webView.removeJavascriptInterface("AndroidNavBar");
    }

    private boolean openExternalOrBlock(Uri uri) {
        if (uri == null) return true;
        String scheme = uri.getScheme();
        if ("tel".equalsIgnoreCase(scheme) || "mailto".equalsIgnoreCase(scheme)) {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
            } catch (Exception ignored) {
                // Block unsupported external destinations.
            }
        }
        return true;
    }

    private final class E24SecureWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (!request.isForMainFrame()) {
                // App pages cannot embed frames. Frames on external HTTPS pages are allowed
                // only after the native JavaScript bridges have been removed.
                return isTrustedAppAsset(Uri.parse(view.getUrl()))
                    || !"https".equalsIgnoreCase(uri.getScheme());
            }
            if (isTrustedAppAsset(uri)) return false;
            if ("https".equalsIgnoreCase(uri.getScheme())) {
                // Keep hosted payment pages in the WebView, but never expose app bridges there.
                removeAppJavascriptInterfaces();
                return false;
            }
            return openExternalOrBlock(uri);
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            Uri uri = Uri.parse(url);
            if (isTrustedAppAsset(uri)) return false;
            if ("https".equalsIgnoreCase(uri.getScheme())) {
                removeAppJavascriptInterfaces();
                return false;
            }
            return openExternalOrBlock(uri);
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            if (isTrustedAppAsset(Uri.parse(url))) {
                installAppJavascriptInterfaces();
                view.evaluateJavascript(
                    "(function(){" +
                    "function sync(){var n=document.querySelector('.bottom-nav');if(!n||!window.AndroidNavBar)return;" +
                    "var c=getComputedStyle(n).backgroundColor,m=c.match(/[0-9.]+/g);if(!m||m.length<3)return;" +
                    "var h='#'+m.slice(0,3).map(function(v){return Math.round(Number(v)).toString(16).padStart(2,'0')}).join('');" +
                    "window.AndroidNavBar.setColor(h);}" +
                    "sync();var root=document.querySelector('.phone-screen')||document.documentElement;" +
                    "if(window.__e24NavColorObserver)window.__e24NavColorObserver.disconnect();" +
                    "window.__e24NavColorObserver=new MutationObserver(sync);" +
                    "window.__e24NavColorObserver.observe(root,{attributes:true,attributeFilter:['class','style'],subtree:true});" +
                    "var nav=document.querySelector('.bottom-nav');if(nav)window.__e24NavColorObserver.observe(nav,{attributes:true,attributeFilter:['class','style']});" +
                    "return true;})()",
                    null
                );
            } else {
                removeAppJavascriptInterfaces();
            }
        }

        @Override
        public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
            // Never bypass TLS certificate errors.
            handler.cancel();
        }
    }

    private void openTransactionImagePicker() {
        try {
            ContentValues values = new ContentValues();
            values.put(MediaStore.Images.Media.DISPLAY_NAME, "e24-transaction-" + System.currentTimeMillis() + ".jpg");
            values.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                values.put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/E24 Hisab");
            }
            transactionCameraUri = getContentResolver().insert(
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values
            );

            Intent camera = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            if (transactionCameraUri != null) {
                camera.putExtra(MediaStore.EXTRA_OUTPUT, transactionCameraUri);
                camera.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            }

            Intent gallery = new Intent(Intent.ACTION_GET_CONTENT);
            gallery.setType("image/*");
            gallery.addCategory(Intent.CATEGORY_OPENABLE);
            Intent chooser = Intent.createChooser(gallery, "ছবি নির্বাচন করুন");
            if (camera.resolveActivity(getPackageManager()) != null) {
                chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[] { camera });
            }
            startActivityForResult(chooser, REQUEST_TRANSACTION_IMAGE);
        } catch (Exception e) {
            if (transactionCameraUri != null) {
                getContentResolver().delete(transactionCameraUri, null, null);
                transactionCameraUri = null;
            }
            if (transactionImageCallback != null) {
                transactionImageCallback.onReceiveValue(null);
                transactionImageCallback = null;
            }
            if (webView != null) webView.evaluateJavascript("showToast('ক্যামেরা বা গ্যালারি খোলা যায়নি')", null);
        }
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
        if (requestCode == REQUEST_TRANSACTION_IMAGE) {
            Uri selected = resultCode == RESULT_OK && data != null ? data.getData() : null;
            if (selected == null && resultCode == RESULT_OK) selected = transactionCameraUri;
            if (transactionImageCallback != null) {
                transactionImageCallback.onReceiveValue(
                    selected == null ? null : new Uri[] { selected }
                );
                transactionImageCallback = null;
            }
            if (transactionCameraUri != null && !transactionCameraUri.equals(selected)) {
                getContentResolver().delete(transactionCameraUri, null, null);
            }
            transactionCameraUri = null;
            return;
        }
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

    public static class AndroidNavBarBridge {
        private final MainActivity activity;
        AndroidNavBarBridge(MainActivity activity) { this.activity = activity; }
        @JavascriptInterface
        public void setColor(String color) {
            activity.runOnUiThread(() -> {
                try {
                    int parsedColor = Color.parseColor(color);
                    if (activity.navigationBarBackground != null) {
                        activity.navigationBarBackground.setBackgroundColor(parsedColor);
                    }
                    activity.rootLayout.setBackgroundColor(parsedColor);
                    Window window = activity.getWindow();
                    window.setNavigationBarColor(parsedColor);
                    boolean lightIcons = (Color.red(parsedColor) * 299
                        + Color.green(parsedColor) * 587
                        + Color.blue(parsedColor) * 114) / 1000 > 150;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        android.view.WindowInsetsController controller = window.getInsetsController();
                        if (controller != null) {
                            int appearance = lightIcons
                                ? android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS : 0;
                            controller.setSystemBarsAppearance(
                                appearance,
                                android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
                            );
                        }
                    } else {
                        View decor = window.getDecorView();
                        int flags = decor.getSystemUiVisibility();
                        if (lightIcons) flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                        else flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                        decor.setSystemUiVisibility(flags);
                    }
                } catch (IllegalArgumentException ignored) {
                    // Ignore invalid colors from the WebView.
                }
            });
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
            if (!isTrustedAppAsset(Uri.parse(webView.getUrl())) && webView.canGoBack()) {
                webView.goBack();
                return;
            }
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
