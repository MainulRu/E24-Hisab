package com.e24hisab;

import android.app.*;
import android.os.Bundle;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.database.Cursor;
import android.content.*;
import android.view.*;
import android.widget.*;
import java.text.SimpleDateFormat;
import java.util.*;

public class MainActivity extends Activity {
    DB db; LinearLayout root, content, nav; String page="হোম"; int selectedId=-1;
    final int GREEN=0xFF087A35, DARK=0xFF075C2B, RED=0xFFE53935, BLUE=0xFF1769C2, PURPLE=0xFF7138C8, BG=0xFFF3F7F4, INK=0xFF202A24, MUTED=0xFF718078;
    int dp(float n){return (int)(n*getResources().getDisplayMetrics().density+0.5f);}
    public void onCreate(Bundle b){super.onCreate(b); db=new DB(this); show("হোম");}
    GradientDrawable shape(int color,int radius){GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(dp(radius));return d;}
    TextView label(String s,int size,int color){TextView t=new TextView(this);t.setText(s);t.setTextSize(size);t.setTextColor(color);t.setPadding(dp(4),dp(4),dp(4),dp(4));return t;}
    TextView bold(String s,int size,int color){TextView t=label(s,size,color);t.setTypeface(Typeface.DEFAULT,Typeface.BOLD);return t;}
    LinearLayout column(){LinearLayout l=new LinearLayout(this);l.setOrientation(1);return l;}
    LinearLayout row(){LinearLayout l=new LinearLayout(this);l.setOrientation(0);l.setGravity(Gravity.CENTER_VERTICAL);return l;}
    void gap(LinearLayout parent,int h){View v=new View(this);parent.addView(v,new LinearLayout.LayoutParams(1,dp(h)));}
    void pad(View v,int a){v.setPadding(dp(a),dp(a),dp(a),dp(a));}
    TextView action(String title,int color){TextView t=bold(title,14,Color.WHITE);t.setGravity(Gravity.CENTER);t.setBackground(shape(color,12));t.setPadding(dp(12),dp(13),dp(12),dp(13));return t;}
    TextView screenTitle(String s){TextView t=bold(s,19,INK);t.setPadding(0,dp(5),0,dp(10));return t;}
    LinearLayout card(){LinearLayout c=column();c.setBackground(shape(Color.WHITE,14));c.setPadding(dp(12),dp(11),dp(12),dp(11));return c;}
    void show(String p){
        page=p; root=column();root.setBackgroundColor(BG);
        LinearLayout header=row();header.setBackgroundColor(GREEN);header.setPadding(dp(14),dp(13),dp(14),dp(13));
        TextView menu=bold(p.equals("হোম")?"☰":"‹",26,Color.WHITE);header.addView(menu);menu.setOnClickListener(v->{if(!page.equals("হোম"))show("হোম");});
        String title=p.equals("খাতা")?"গ্রাহকের হিসাব":p.equals("নতুন")?"নতুন লেনদেন":p;
        TextView brand=bold("  "+title,19,Color.WHITE);header.addView(brand,new LinearLayout.LayoutParams(0,-2,1));
        TextView bell=bold(p.equals("হোম")?"♟":"⋮",22,Color.WHITE);header.addView(bell);root.addView(header);
        ScrollView sc=new ScrollView(this);sc.setFillViewport(true);content=column();content.setPadding(dp(13),dp(13),dp(13),dp(18));sc.addView(content);root.addView(sc,new LinearLayout.LayoutParams(-1,0,1));
        nav=row();nav.setBackgroundColor(Color.WHITE);String[] tabs={"⌂\nহোম","♟\nগ্রাহক","＋\nনতুন","▥\nরিপোর্ট","⚙\nসেটিংস"};
        String[] names={"হোম","গ্রাহক","নতুন","রিপোর্ট","সেটিংস"};
        for(int i=0;i<tabs.length;i++){final String tab=names[i];TextView b=label(tabs[i],12,tab.equals(page)?GREEN:0xFF58645D);b.setGravity(Gravity.CENTER);b.setTypeface(null,tab.equals(page)?Typeface.BOLD:Typeface.NORMAL);b.setPadding(0,dp(8),0,dp(8));nav.addView(b,new LinearLayout.LayoutParams(0,-2,1));b.setOnClickListener(v->{show(tab);});}
        root.addView(nav);setContentView(root);
        if(p.equals("হোম"))dashboard();else if(p.equals("গ্রাহক"))customers();else if(p.equals("খাতা"))ledger();else if(p.equals("রিপোর্ট"))reports();else if(p.equals("সেটিংস"))settings();else if(p.equals("নতুন"))newTransactionPage();else if(p.equals("পেমেন্ট"))payment();else if(p.equals("মেসেজ"))messages();
    }
    void section(String s){content.addView(bold(s,17,INK));gap(content,8);}
    void metric(String icon,String title,String value,int color,LinearLayout parent){
        LinearLayout c=column();c.setPadding(dp(13),dp(12),dp(13),dp(12));c.setBackground(shape(color,14));
        c.addView(bold(icon,22,Color.WHITE));c.addView(bold(title,13,Color.WHITE));c.addView(bold("৳ "+value,21,Color.WHITE));
        LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(0,-2,1);lp.setMargins(dp(3),dp(3),dp(3),dp(3));parent.addView(c,lp);
    }
    void dashboard(){
        TextView today=bold("☀  আজকের সারাংশ",17,INK);content.addView(today);gap(content,8);
        int[] t=db.totals();LinearLayout r1=row();metric("৳","মোট জমা",String.valueOf(t[0]),0xFF08A83B,r1);metric("↘","মোট বাকি",String.valueOf(t[1]),0xFFE51E24,r1);content.addView(r1);
        gap(content,5);LinearLayout r2=row();metric("▣","মোট খরচ",String.valueOf(db.expenses()),0xFF1769D2,r2);metric("♟","মোট গ্রাহক",String.valueOf(db.countCustomers()),0xFF7138D8,r2);content.addView(r2);
        gap(content,16);LinearLayout band=row();band.setBackground(shape(0xFF087A35,9));band.setPadding(dp(10),dp(8),dp(10),dp(8));band.addView(bold("▥  সাম্প্রতিক লেনদেন",16,Color.WHITE));content.addView(band);gap(content,5);
        Cursor c=db.transactions();int count=0;while(c.moveToNext()&&count++<12){transactionRow(c.getString(1),c.getString(2),c.getInt(3),c.getString(4));}c.close();
        gap(content,10);TextView add=action("＋  নতুন গ্রাহক যোগ করুন",GREEN);content.addView(add);add.setOnClickListener(v->customerDialog());
    }
    void transactionRow(String name,String type,int amount,String date){
        LinearLayout r=row();r.setBackground(shape(Color.WHITE,11));r.setPadding(dp(9),dp(8),dp(9),dp(8));
        TextView ic=bold(type.equals("জমা")?"⬆":type.equals("বাকি")?"⬇":"▣",21,type.equals("জমা")?GREEN:type.equals("বাকি")?RED:BLUE);r.addView(ic);
        LinearLayout info=column();info.addView(bold(name,14,INK));info.addView(label(type+"  •  "+(date==null?"":date),12,MUTED));r.addView(info,new LinearLayout.LayoutParams(0,-2,1));
        r.addView(bold((type.equals("জমা")?"+ ":"− ")+"৳ "+amount,14,type.equals("জমা")?GREEN:type.equals("বাকি")?RED:BLUE));
        LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);lp.setMargins(0,dp(3),0,dp(3));content.addView(r,lp);
    }
    void customers(){
        content.addView(screenTitle("♟  গ্রাহক তালিকা"));
        EditText search=new EditText(this);search.setSingleLine(true);search.setHint("⌕  নাম দিয়ে খুঁজুন...");search.setTextSize(14);search.setBackground(shape(Color.WHITE,10));content.addView(search);
        TextView add=action("＋  নতুন গ্রাহক যোগ করুন",GREEN);content.addView(add);add.setOnClickListener(v->customerDialog());gap(content,8);
        LinearLayout list=column();content.addView(list);Cursor c=db.customers();while(c.moveToNext()){final int id=c.getInt(0);String name=c.getString(1),phone=c.getString(2);customerRow(list,id,name,phone);}c.close();
        search.addTextChangedListener(new android.text.TextWatcher(){public void beforeTextChanged(CharSequence s,int st,int count,int after){}public void onTextChanged(CharSequence q,int st,int before,int count){list.removeAllViews();Cursor x=db.customers();while(x.moveToNext()){String n=x.getString(1),ph=x.getString(2);if(n.toLowerCase().contains(q.toString().toLowerCase())||(ph!=null&&ph.contains(q))){customerRow(list,x.getInt(0),n,ph);}}x.close();}public void afterTextChanged(android.text.Editable e){}});
    }
    void customerRow(LinearLayout list,int id,String name,String phone){
        LinearLayout r=row();r.setBackground(shape(Color.WHITE,12));r.setPadding(dp(10),dp(10),dp(10),dp(10));
        TextView avatar=bold("●",25,0xFF1769C2);avatar.setBackground(shape(0xFFE3F0FF,50));r.addView(avatar);
        LinearLayout info=column();info.addView(bold(name,15,INK));info.addView(label(phone==null?"":phone,12,MUTED));r.addView(info,new LinearLayout.LayoutParams(0,-2,1));
        int due=db.customerDue(id);r.addView(bold((due>0?"বাকি: ":"জমা: ")+"৳ "+Math.abs(due),12,due>0?RED:GREEN));r.addView(bold("›",24,MUTED));
        LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);lp.setMargins(0,dp(4),0,dp(4));list.addView(r,lp);r.setOnClickListener(v->{selectedId=id;show("খাতা");});
    }
    void ledger(){
        Cursor c=db.customer(selectedId);String name="গ্রাহক",phone="";if(c.moveToFirst()){name=c.getString(1);phone=c.getString(2);}c.close();
        LinearLayout profile=card();profile.setOrientation(0);TextView av=bold("●",34,BLUE);av.setBackground(shape(0xFFE2F0FF,60));profile.addView(av);LinearLayout who=column();who.setPadding(dp(10),0,0,0);who.addView(bold(name,19,INK));who.addView(label("☎  "+phone,13,MUTED));profile.addView(who);content.addView(profile);
        gap(content,8);int[] sums=db.customerTotals(selectedId);LinearLayout totals=row();metric("৳","মোট জমা",String.valueOf(sums[0]),0xFF08A83B,totals);metric("↘","মোট বাকি",String.valueOf(sums[1]),0xFFE51E24,totals);content.addView(totals);
        gap(content,12);LinearLayout band=row();band.setBackground(shape(0xFF075C2B,9));band.setPadding(dp(10),dp(9),dp(10),dp(9));band.addView(bold("▤  লেনদেনের ইতিহাস",16,Color.WHITE));content.addView(band);
        Cursor tx=db.customerTransactions(selectedId);while(tx.moveToNext())transactionRow(name,tx.getString(1),tx.getInt(3),tx.getString(4));tx.close();
        gap(content,8);TextView add=action("＋  নতুন লেনদেন",BLUE);content.addView(add);add.setOnClickListener(v->show("নতুন"));
        TextView msg=action("✉  মেসেজ পাঠান",PURPLE);content.addView(msg);msg.setOnClickListener(v->show("মেসেজ"));
    }
    void newTransactionPage(){
        content.addView(screenTitle("＋  নতুন লেনদেন"));
        LinearLayout types=row();TextView dep=action("⬆  জমা",GREEN),due=action("⬇  বাকি",RED);types.addView(dep,new LinearLayout.LayoutParams(0,-2,1));types.addView(due,new LinearLayout.LayoutParams(0,-2,1));content.addView(types);dep.setOnClickListener(v->transactionDialog());due.setOnClickListener(v->transactionDialog());
        LinearLayout form=card();form.addView(bold("লেনদেন সংরক্ষণ",16,INK));form.addView(label("গ্রাহক, পরিমাণ ও বিবরণ যোগ করতে নিচের বাটনে চাপ দিন।",13,MUTED));content.addView(form);
        TextView save=action("▣  লেনদেন লিখুন",GREEN);content.addView(save);save.setOnClickListener(v->transactionDialog());
    }
    void reports(){content.addView(screenTitle("▥  হিসাব রিপোর্ট"));int[] t=db.totals();LinearLayout r=row();metric("৳","মোট জমা",String.valueOf(t[0]),0xFF08A83B,r);metric("↘","মোট বাকি",String.valueOf(t[1]),0xFFE51E24,r);content.addView(r);gap(content,5);LinearLayout r2=row();metric("▣","মোট খরচ",String.valueOf(db.expenses()),BLUE,r2);metric("♟","মোট গ্রাহক",String.valueOf(db.countCustomers()),PURPLE,r2);content.addView(r2);gap(content,12);section("লেনদেনের সারাংশ");Cursor c=db.transactions();while(c.moveToNext())transactionRow(c.getString(1),c.getString(2),c.getInt(3),c.getString(4));c.close();}
    void settings(){content.addView(screenTitle("⚙  সেটিংস"));String[] items={"▣  ডেটা ব্যাকআপ ও রিস্টোর","৳  পেমেন্ট সেটিংস","☏  SMS ও WhatsApp","♙  নিরাপত্তা (PIN Lock)","◎  ভাষা নির্বাচন (বাংলা)","ⓘ  অ্যাপ সম্পর্কে"};for(String s:items){TextView v=label(s+"                         ›",15,INK);v.setBackground(shape(Color.WHITE,11));v.setPadding(dp(12),dp(14),dp(12),dp(14));LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);lp.setMargins(0,dp(4),0,dp(4));content.addView(v,lp);v.setOnClickListener(x->new AlertDialog.Builder(this).setMessage("এই সুবিধাটি পরবর্তী সংস্করণে যুক্ত হবে।").setPositiveButton("ঠিক আছে",null).show());}}
    void payment(){content.addView(screenTitle("৳  পেমেন্ট করুন"));content.addView(label("এই সংস্করণে জমা/বাকি লেনদেন রেকর্ড করা যাবে।",15,INK));TextView b=action("＋  পেমেন্ট রেকর্ড",GREEN);content.addView(b);b.setOnClickListener(v->transactionDialog());}
    void messages(){content.addView(screenTitle("✉  মেসেজ সেন্টার"));TextView sms=action("SMS",GREEN),wa=action("WhatsApp",0xFF159B55);content.addView(sms);content.addView(wa);content.addView(label("SMS ও WhatsApp সংযোগ পরবর্তী সংস্করণে যুক্ত হবে।",14,MUTED));}
    void customerDialog(){LinearLayout box=column();box.setPadding(dp(16),0,dp(16),0);EditText n=new EditText(this);n.setHint("গ্রাহকের নাম");box.addView(n);EditText ph=new EditText(this);ph.setHint("মোবাইল নম্বর");box.addView(ph);new AlertDialog.Builder(this).setTitle("নতুন গ্রাহক").setView(box).setNegativeButton("বাতিল",null).setPositiveButton("সংরক্ষণ",(d,w)->{if(n.getText().length()>0){db.addCustomer(n.getText().toString(),ph.getText().toString());show("গ্রাহক");}}).show();}
    void transactionDialog(){
        if(db.countCustomers()==0){new AlertDialog.Builder(this).setMessage("আগে একজন গ্রাহক যোগ করুন।").setPositiveButton("ঠিক আছে",null).show();return;}
        Cursor c=db.customers();ArrayList<String> names=new ArrayList<>();ArrayList<Integer> ids=new ArrayList<>();while(c.moveToNext()){ids.add(c.getInt(0));names.add(c.getString(1));}c.close();
        LinearLayout box=column();box.setPadding(dp(16),0,dp(16),0);Spinner sp=new Spinner(this);sp.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,names));box.addView(sp);
        Spinner type=new Spinner(this);type.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,new String[]{"জমা","বাকি","খরচ"}));box.addView(type);
        EditText amount=new EditText(this);amount.setHint("টাকার পরিমাণ");amount.setInputType(2);box.addView(amount);EditText note=new EditText(this);note.setHint("বিবরণ");box.addView(note);
        new AlertDialog.Builder(this).setTitle("নতুন লেনদেন").setView(box).setNegativeButton("বাতিল",null).setPositiveButton("সংরক্ষণ",(d,w)->{try{db.addTx(ids.get(sp.getSelectedItemPosition()),type.getSelectedItem().toString(),Integer.parseInt(amount.getText().toString()),note.getText().toString());show(page.equals("খাতা")?"খাতা":"হোম");}catch(Exception e){Toast.makeText(this,"সঠিক টাকার পরিমাণ লিখুন",Toast.LENGTH_SHORT).show();}}).show();
    }
    static class DB extends android.database.sqlite.SQLiteOpenHelper{
        DB(Context c){super(c,"e24hisab.db",null,1);}
        public void onCreate(android.database.sqlite.SQLiteDatabase d){d.execSQL("CREATE TABLE customers(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT,phone TEXT)");d.execSQL("CREATE TABLE tx(id INTEGER PRIMARY KEY AUTOINCREMENT,cid INTEGER,type TEXT,amount INTEGER,note TEXT,day TEXT)");}
        public void onUpgrade(android.database.sqlite.SQLiteDatabase d,int o,int n){}
        void addCustomer(String n,String p){android.content.ContentValues v=new android.content.ContentValues();v.put("name",n);v.put("phone",p);getWritableDatabase().insert("customers",null,v);}
        int countCustomers(){Cursor c=getReadableDatabase().rawQuery("SELECT COUNT(*) FROM customers",null);c.moveToFirst();int x=c.getInt(0);c.close();return x;}
        Cursor customers(){return getReadableDatabase().rawQuery("SELECT id,name,phone FROM customers ORDER BY name",null);}
        Cursor customer(int id){return getReadableDatabase().rawQuery("SELECT * FROM customers WHERE id="+id,null);}
        void addTx(int id,String type,int amount,String note){android.content.ContentValues v=new android.content.ContentValues();v.put("cid",id);v.put("type",type);v.put("amount",amount);v.put("note",note);v.put("day",new SimpleDateFormat("dd-MM-yyyy",Locale.getDefault()).format(new Date()));getWritableDatabase().insert("tx",null,v);}
        Cursor transactions(){return getReadableDatabase().rawQuery("SELECT tx.id,customers.name,tx.type,tx.amount,tx.day FROM tx JOIN customers ON customers.id=tx.cid ORDER BY tx.id DESC LIMIT 30",null);}
        Cursor customerTransactions(int id){return getReadableDatabase().rawQuery("SELECT id,type,note,amount,day FROM tx WHERE cid="+id+" ORDER BY id DESC",null);}
        int[] totals(){int a=0,b=0;Cursor c=getReadableDatabase().rawQuery("SELECT type,SUM(amount) FROM tx GROUP BY type",null);while(c.moveToNext()){if(c.getString(0).equals("জমা"))a=c.getInt(1);else if(c.getString(0).equals("বাকি"))b=c.getInt(1);}c.close();return new int[]{a,b};}
        int expenses(){Cursor c=getReadableDatabase().rawQuery("SELECT SUM(amount) FROM tx WHERE type='খরচ'",null);c.moveToFirst();int v=c.isNull(0)?0:c.getInt(0);c.close();return v;}
        int customerDue(int id){Cursor c=getReadableDatabase().rawQuery("SELECT SUM(CASE WHEN type='বাকি' THEN amount WHEN type='জমা' THEN -amount ELSE 0 END) FROM tx WHERE cid="+id,null);c.moveToFirst();int v=c.isNull(0)?0:c.getInt(0);c.close();return v;}
        int[] customerTotals(int id){int a=0,b=0;Cursor c=getReadableDatabase().rawQuery("SELECT type,SUM(amount) FROM tx WHERE cid="+id+" GROUP BY type",null);while(c.moveToNext()){if(c.getString(0).equals("জমা"))a=c.getInt(1);if(c.getString(0).equals("বাকি"))b=c.getInt(1);}c.close();return new int[]{a,b};}
    }
}
