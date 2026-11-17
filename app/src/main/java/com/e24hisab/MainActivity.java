package com.e24hisab;

import android.app.*;
import android.os.Bundle;
import android.graphics.Typeface;
import android.database.Cursor;
import android.view.Gravity;
import android.view.View;
import android.widget.*;
import android.content.*;
import java.text.SimpleDateFormat;
import java.util.*;

public class MainActivity extends Activity {
    DB db; LinearLayout root, content, nav; String page="হোম";
    int green=0xFF087A35, red=0xFFE53935, blue=0xFF1769C2, bg=0xFFF4F7F5;
    public void onCreate(Bundle b){ super.onCreate(b); db=new DB(this); show("হোম"); }
    TextView text(String s,int size,int color){ TextView t=new TextView(this); t.setText(s); t.setTextSize(size); t.setTextColor(color); t.setPadding(12,10,12,10); return t; }
    Button btn(String s){ Button b=new Button(this); b.setText(s); return b; }
    void show(String p){
        page=p; root=new LinearLayout(this); root.setOrientation(1); root.setBackgroundColor(bg);
        TextView head=text("☰     E24 Hisab                         "+p,20,0xFFFFFFFF); head.setBackgroundColor(green); head.setTypeface(null,Typeface.BOLD); root.addView(head);
        ScrollView sc=new ScrollView(this); content=new LinearLayout(this); content.setPadding(12,12,12,12); content.setOrientation(1); sc.addView(content); root.addView(sc,new LinearLayout.LayoutParams(-1,0,1));
        nav=new LinearLayout(this); nav.setBackgroundColor(0xFFFFFFFF);
        String[] tabs={"হোম","গ্রাহক","নতুন","রিপোর্ট","সেটিংস"};
        for(String tab:tabs){ Button b=btn(tab); b.setTextSize(11); b.setOnClickListener(v->{ if(tab.equals("নতুন")) transactionDialog(); else show(tab); }); nav.addView(b,new LinearLayout.LayoutParams(0,-2,1)); }
        root.addView(nav); setContentView(root);
        if(p.equals("হোম")) dashboard(); else if(p.equals("গ্রাহক")) customers(); else if(p.equals("রিপোর্ট")) reports(); else if(p.equals("সেটিংস")) settings(); else if(p.equals("খাতা")) ledger(); else if(p.equals("পেমেন্ট")) payment(); else if(p.equals("মেসেজ")) messages();
    }
    void card(String title,String value,int color){ TextView t=text(title+"\n"+value,20,0xFFFFFFFF); t.setTypeface(null,Typeface.BOLD); t.setBackgroundColor(color); LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2); lp.setMargins(0,6,0,6); content.addView(t,lp); }
    void dashboard(){
        int[] totals=db.totals(); content.addView(text("আজকের সারাংশ",18,0xFF222222));
        card("মোট জমা","৳ "+totals[0],green); card("মোট বাকি","৳ "+totals[1],red); card("মোট গ্রাহক",""+db.countCustomers(),blue);
        content.addView(text("সাম্প্রতিক লেনদেন",18,0xFF222222));
        Cursor c=db.transactions(); while(c.moveToNext()) content.addView(text(c.getString(1)+" • "+c.getString(2)+" • ৳"+c.getInt(3),16,0xFF333333)); c.close();
        Button add=btn("+ নতুন গ্রাহক"); add.setOnClickListener(v->customerDialog()); content.addView(add);
    }
    void customers(){
        Button add=btn("+ নতুন গ্রাহক যোগ করুন"); add.setOnClickListener(v->customerDialog()); content.addView(add);
        Cursor c=db.customers(); while(c.moveToNext()){ final int id=c.getInt(0); String name=c.getString(1), phone=c.getString(2); Button b=btn(name+"   "+phone+"   ›"); b.setOnClickListener(v->{ selectedId=id; show("খাতা"); }); content.addView(b); } c.close();
    }
    int selectedId=-1;
    void ledger(){
        Cursor c=db.customer(selectedId); String name="গ্রাহক"; if(c.moveToFirst()) name=c.getString(1); c.close();
        content.addView(text(name+"-এর হিসাব",22,green));
        Button add=btn("+ নতুন লেনদেন"); add.setOnClickListener(v->transactionDialog()); content.addView(add);
        Cursor tx=db.customerTransactions(selectedId); while(tx.moveToNext()) content.addView(text(tx.getString(1)+" • "+tx.getString(2)+" • ৳"+tx.getInt(3),16,0xFF222222)); tx.close();
    }
    void reports(){ int[] t=db.totals(); card("মোট জমা","৳ "+t[0],green); card("মোট বাকি","৳ "+t[1],red); content.addView(text("লেনদেনের হিসাব ডিভাইসেই সংরক্ষিত থাকে।",15,0xFF333333)); }
    void settings(){
        content.addView(text("E24 Hisab • Version 1.0",20,green));
        for(String s:new String[]{"ডেটা ব্যাকআপ (পরবর্তী সংস্করণ)","পেমেন্ট সেটিংস","SMS ও WhatsApp","PIN নিরাপত্তা","ভাষা: বাংলা","অ্যাপ সম্পর্কে"}){ Button b=btn(s); b.setOnClickListener(v->new AlertDialog.Builder(this).setMessage("এই সুবিধাটি পরবর্তী সংস্করণে যুক্ত হবে।").setPositiveButton("ঠিক আছে",null).show()); content.addView(b); }
    }
    void payment(){ content.addView(text("পেমেন্ট রেকর্ড",22,green)); content.addView(text("এই সংস্করণে জমা/বাকি লেনদেন রেকর্ড করা যাবে। সরাসরি অনলাইন পেমেন্ট পরবর্তী সংস্করণে যুক্ত হবে।",16,0xFF333333)); }
    void messages(){ content.addView(text("মেসেজ সেন্টার",22,green)); content.addView(text("SMS ও WhatsApp মেসেজ পাঠানোর সংযোগ পরবর্তী সংস্করণে যুক্ত হবে।",16,0xFF333333)); }
    void customerDialog(){
        LinearLayout box=new LinearLayout(this); box.setPadding(20,5,20,5); box.setOrientation(1);
        EditText n=new EditText(this); n.setHint("গ্রাহকের নাম"); box.addView(n);
        EditText ph=new EditText(this); ph.setHint("মোবাইল নম্বর"); box.addView(ph);
        new AlertDialog.Builder(this).setTitle("নতুন গ্রাহক").setView(box).setNegativeButton("বাতিল",null).setPositiveButton("সংরক্ষণ",(d,w)->{ if(n.getText().length()>0){ db.addCustomer(n.getText().toString(),ph.getText().toString()); show("গ্রাহক"); } }).show();
    }
    void transactionDialog(){
        if(db.countCustomers()==0){ new AlertDialog.Builder(this).setMessage("আগে একজন গ্রাহক যোগ করুন।").setPositiveButton("ঠিক আছে",null).show(); return; }
        Cursor c=db.customers(); ArrayList<String> names=new ArrayList<>(); ArrayList<Integer> ids=new ArrayList<>(); while(c.moveToNext()){ids.add(c.getInt(0)); names.add(c.getString(1));} c.close();
        LinearLayout box=new LinearLayout(this); box.setPadding(20,5,20,5); box.setOrientation(1);
        Spinner sp=new Spinner(this); sp.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,names)); box.addView(sp);
        Spinner type=new Spinner(this); type.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,new String[]{"জমা","বাকি","খরচ"})); box.addView(type);
        EditText amount=new EditText(this); amount.setHint("টাকার পরিমাণ"); amount.setInputType(2); box.addView(amount);
        EditText note=new EditText(this); note.setHint("বিবরণ"); box.addView(note);
        new AlertDialog.Builder(this).setTitle("নতুন লেনদেন").setView(box).setNegativeButton("বাতিল",null).setPositiveButton("সংরক্ষণ",(d,w)->{ try{db.addTx(ids.get(sp.getSelectedItemPosition()),type.getSelectedItem().toString(),Integer.parseInt(amount.getText().toString()),note.getText().toString()); show(page.equals("খাতা")?"খাতা":"হোম");}catch(Exception e){Toast.makeText(this,"সঠিক টাকার পরিমাণ লিখুন",Toast.LENGTH_SHORT).show();} }).show();
    }
    static class DB extends android.database.sqlite.SQLiteOpenHelper{
        DB(Context c){super(c,"e24hisab.db",null,1);}
        public void onCreate(android.database.sqlite.SQLiteDatabase d){d.execSQL("CREATE TABLE customers(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT,phone TEXT)"); d.execSQL("CREATE TABLE tx(id INTEGER PRIMARY KEY AUTOINCREMENT,cid INTEGER,type TEXT,amount INTEGER,note TEXT,day TEXT)");}
        public void onUpgrade(android.database.sqlite.SQLiteDatabase d,int o,int n){}
        void addCustomer(String n,String p){android.content.ContentValues v=new android.content.ContentValues();v.put("name",n);v.put("phone",p);getWritableDatabase().insert("customers",null,v);}
        int countCustomers(){Cursor c=getReadableDatabase().rawQuery("SELECT COUNT(*) FROM customers",null);c.moveToFirst();int x=c.getInt(0);c.close();return x;}
        Cursor customers(){return getReadableDatabase().rawQuery("SELECT id,name,phone FROM customers ORDER BY name",null);}
        Cursor customer(int id){return getReadableDatabase().rawQuery("SELECT * FROM customers WHERE id="+id,null);}
        void addTx(int id,String type,int amount,String note){android.content.ContentValues v=new android.content.ContentValues();v.put("cid",id);v.put("type",type);v.put("amount",amount);v.put("note",note);v.put("day",new SimpleDateFormat("dd-MM-yyyy",Locale.getDefault()).format(new Date()));getWritableDatabase().insert("tx",null,v);}
        Cursor transactions(){return getReadableDatabase().rawQuery("SELECT tx.id,customers.name,tx.type,tx.amount FROM tx JOIN customers ON customers.id=tx.cid ORDER BY tx.id DESC LIMIT 30",null);}
        Cursor customerTransactions(int id){return getReadableDatabase().rawQuery("SELECT id,type,type,amount FROM tx WHERE cid="+id+" ORDER BY id DESC",null);}
        int[] totals(){int a=0,b=0;Cursor c=getReadableDatabase().rawQuery("SELECT type,SUM(amount) FROM tx GROUP BY type",null);while(c.moveToNext()){if(c.getString(0).equals("জমা"))a=c.getInt(1);else if(c.getString(0).equals("বাকি"))b=c.getInt(1);}c.close();return new int[]{a,b};}
    }
}
