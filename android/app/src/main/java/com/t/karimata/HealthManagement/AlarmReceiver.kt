package com.t.karimata.HealthManagement

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        Log.d("AlarmTest", "📩 Receiver着信: システムから通知を受け取りました")
        val serviceIntent = Intent(context, AlarmService::class.java).apply {
            // JSから受け取ったタイトルなどの情報をServiceに引き継ぐ
            putExtra("TITLE", intent.getStringExtra("TITLE"))
            putExtra("ALARM_ID", intent.getStringExtra("ALARM_ID"))
        }

        // Android 8.0以上はフォアグラウンドサービスとして起動必須
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent)
        } else {
            context.startService(serviceIntent)
        }
    }
}