package com.fraudguard.companion
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
class FraudNotificationListener:NotificationListenerService() {
 private val channelId="fraud_alerts"
 override fun onCreate() {
  super.onCreate()
  if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.O) getSystemService(NotificationManager::class.java).createNotificationChannel(NotificationChannel(channelId,"Scam warnings",NotificationManager.IMPORTANCE_HIGH))
 }
 override fun onNotificationPosted(sbn:StatusBarNotification) {
  if(sbn.packageName==packageName) return
  val e=sbn.notification?.extras ?: return
  val title=e.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
  val body=e.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: e.getCharSequence(Notification.EXTRA_TEXT)?.toString().orEmpty()
  val message="$title $body".trim()
  if(message.length<8) return
  val result=ScamRules.inspect(message)
  if(result.score<25) return
  val b=if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.O) Notification.Builder(this,channelId) else @Suppress("DEPRECATION") Notification.Builder(this)
  b.setSmallIcon(android.R.drawable.ic_dialog_alert).setContentTitle("FraudSafe: suspicious message")
   .setContentText(result.reasons.take(2).joinToString("; ").take(160))
   .setStyle(Notification.BigTextStyle().bigText("Possible scam indicators: "+result.reasons.joinToString("; ")+". Verify the sender independently before paying or sharing codes."))
   .setAutoCancel(true)
  getSystemService(NotificationManager::class.java).notify((sbn.packageName+sbn.id).hashCode(),b.build())
 }
}
