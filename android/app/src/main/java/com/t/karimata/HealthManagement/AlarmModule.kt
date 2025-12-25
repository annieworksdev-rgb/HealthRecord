package com.t.karimata.HealthManagement

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AlarmModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "AlarmModule"
    }

    @ReactMethod
    fun setAlarm(timestamp: Double, title: String, id: String) {
        val context = reactApplicationContext
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        val intent = Intent(context, AlarmReceiver::class.java).apply {
            putExtra("TITLE", title)
            putExtra("ALARM_ID", id)
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            id.hashCode(), // IDを一意にするためハッシュコード使用
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val triggerTime = timestamp.toLong()

        // 確実に起こす設定
        alarmManager.setAlarmClock(
            AlarmManager.AlarmClockInfo(triggerTime, pendingIntent),
            pendingIntent
        )
    }

    @ReactMethod
    public void cancelAlarm(String id) {
        try {
            Context context = getReactApplicationContext();
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

            Intent intent = new Intent(context, AlarmReceiver.class);

            // セット時と同じルールでID（requestCode）を作る
            int requestCode = id.hashCode();

            // 「存在していれば取得する（なければ何もしない）」というフラグでIntentを取得
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_NO_CREATE
            );

            if (pendingIntent != null && alarmManager != null) {
                alarmManager.cancel(pendingIntent); // 予約を取り消す
                pendingIntent.cancel(); // Intent自体も破棄
                Log.d("AlarmModule", "Cancelled Alarm ID:" + id);
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @ReactMethod
    fun stopAlarm() {
        // サービスを停止する
        val context = reactApplicationContext
        val intent = Intent(context, AlarmService::class.java)
        context.stopService(intent)
    }
}