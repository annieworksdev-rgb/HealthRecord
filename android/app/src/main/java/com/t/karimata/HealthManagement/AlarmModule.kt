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
    fun cancelAlarm(id: String) {
        try {
            val context = reactApplicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager

            val intent = Intent(context, AlarmReceiver::class.java)

            // セット時と同じルールでID（requestCode）を作る
            val requestCode = id.hashCode()

            // 「存在していれば取得する（なければ何もしない）」フラグ
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_NO_CREATE
            )

            if (pendingIntent != null && alarmManager != null) {
                alarmManager.cancel(pendingIntent) // 予約を取り消す
                pendingIntent.cancel() // Intent自体も破棄
                // Logはimportが必要ですが、一旦削除かandroid.util.Logを使う
                android.util.Log.d("AlarmModule", "Cancelled Alarm ID:$id")
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun stopAlarm() {
        val context = reactApplicationContext

        // 1. 鳴っているサービスを止める
        val intent = Intent(context, AlarmService::class.java)
        context.stopService(intent)

        // 2. スヌーズ待ち（AlarmManagerにセットされた予約）があればキャンセルする
        // AlarmService.kt内で scheduleNextAlarm の requestCode は 0 になっています
        val snoozeIntent = Intent(context, AlarmReceiver::class.java)
        val pendingSnoozeIntent = PendingIntent.getBroadcast(
            context,
            0, // Service側で指定しているrequestCodeと合わせる
            snoozeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_NO_CREATE
        )

        if (pendingSnoozeIntent != null) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
            alarmManager?.cancel(pendingSnoozeIntent)
            pendingSnoozeIntent.cancel()
            android.util.Log.d("AlarmModule", "Canceled pending snooze alarm")
        }
    }
}