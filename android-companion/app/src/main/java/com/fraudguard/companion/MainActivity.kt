package com.fraudguard.companion
import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
class MainActivity : Activity() {
 override fun onCreate(savedInstanceState: Bundle?) {
  super.onCreate(savedInstanceState)
  val layout=LinearLayout(this).apply { orientation=LinearLayout.VERTICAL; setPadding(40,56,40,40) }
  layout.addView(TextView(this).apply { text="FraudSafe protection"; textSize=26f })
  layout.addView(TextView(this).apply { text="Checks visible message previews from notifications. It does not open apps or read private inboxes."; textSize=16f; setPadding(0,24,0,24) })
  layout.addView(Button(this).apply { text="Grant notification access"; setOnClickListener { startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)) } })
  setContentView(layout)
 }
}
