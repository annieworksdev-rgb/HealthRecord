package com.t.karimata.HealthManagement

import android.app.*
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import android.util.Log

class AlarmService : Service() {

    private var mediaPlayer: MediaPlayer? = null
    private val handler = Handler(Looper.getMainLooper())
    private var currentTitle: String = "アラーム"

    private val AUTO_SNOOZE_DELAY_MS = 60 * 1000L
    private val SNOOZE_DURATION_MS = 5 * 60 * 1000L
    private val NOTIFICATION_ID = 1001
    private val CHANNEL_ID = "ALARM_CHANNEL_ID"

    private val autoSnoozeRunnable = Runnable {
        Log.d("AlarmTest", "⏰ 自動スヌーズ発動！音を止めます")
        stopRinging()

        val baseTitle = currentTitle.replace(" (再通知)", "")
        val nextTitle = "$baseTitle (再通知)"

        Log.d("AlarmTest", "⏰ 次のアラームをセットします: 5分後 タイトル:$nextTitle")
        scheduleNextAlarm(System.currentTimeMillis() + SNOOZE_DURATION_MS, nextTitle)

        stopForeground(true)
        val manager = getSystemService(NotificationManager::class.java)
        val notification = createNotification(currentTitle, true)
        manager.notify(NOTIFICATION_ID, notification)

        stopSelf()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d("AlarmTest", "🚀 Service開始")

        val title = intent?.getStringExtra("TITLE") ?: "アラーム"
        currentTitle = title

        createNotificationChannel()
        // 最初は音ありで作成（false）
        val notification = createNotification(title, false)
        startForeground(NOTIFICATION_ID, notification)

        startRinging()

        handler.removeCallbacks(autoSnoozeRunnable)
        handler.postDelayed(autoSnoozeRunnable, AUTO_SNOOZE_DELAY_MS)

        return START_NOT_STICKY
    }

    private fun scheduleNextAlarm(triggerAtMillis: Long, nextTitle: String) {
        val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(this, AlarmReceiver::class.java).apply {
            putExtra("TITLE", nextTitle)
        }
        val pendingIntent = PendingIntent.getBroadcast(
            this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        alarmManager.setAlarmClock(
            AlarmManager.AlarmClockInfo(triggerAtMillis, pendingIntent),
            pendingIntent
        )
    }

    private fun startRinging() {
        if (mediaPlayer?.isPlaying == true) return

        val resId = resources.getIdentifier("alarm_sound", "raw", packageName)
        val uri = if (resId != 0) {
            android.net.Uri.parse("android.resource://${packageName}/${resId}")
        } else {
            RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
        }

        mediaPlayer = MediaPlayer().apply {
            setDataSource(applicationContext, uri)
            setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            )
            isLooping = false
            prepare()
            start()
        }
    }

    private fun stopRinging() {
        try {
            mediaPlayer?.stop()
            mediaPlayer?.release()
        } catch (e: Exception) {
            e.printStackTrace()
        }
        mediaPlayer = null
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Alarm Channel",
                NotificationManager.IMPORTANCE_HIGH
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(title: String, isSilent: Boolean): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText("タップしてアプリを開く")
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)

        if (isSilent) {
            builder.setSilent(true)
        }

        return builder.build()
    }

    override fun onDestroy() {
        stopRinging()
        handler.removeCallbacks(autoSnoozeRunnable)
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}