package expo.modules.callscreening

import android.telecom.Call
import android.telecom.CallScreeningService
import android.util.Log
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/**
 * System entry point for real call interception on Android.
 *
 * When the user grants ROLE_CALL_SCREENING to this app, Telecom invokes
 * [onScreenCall] for every incoming call *before* the phone rings.
 */
class CallGuardScreeningService : CallScreeningService() {
  private val io = Executors.newSingleThreadExecutor()

  override fun onScreenCall(callDetails: Call.Details) {
    val handle = callDetails.handle?.schemeSpecificPart
    val hit = BlocklistStore.find(applicationContext, handle)

    if (hit == null) {
      // Allow the call through.
      respondToCall(callDetails, CallResponse.Builder().build())
      return
    }

    val response = CallResponse.Builder()
      .setDisallowCall(true)
      .setRejectCall(true)
      .setSkipCallLog(false)
      .setSkipNotification(true)
      .build()

    respondToCall(callDetails, response)
    Log.i(TAG, "Blocked ${hit.e164} (${hit.category})")

    io.execute {
      reportBlockedCall(hit)
    }
  }

  private fun reportBlockedCall(hit: BlocklistStore.Entry) {
    try {
      val prefs = applicationContext.getSharedPreferences("call_guard_session", MODE_PRIVATE)
      val userId = prefs.getString("user_id", null) ?: return
      val apiBase = prefs.getString("api_base", null) ?: return

      val body = JSONObject()
        .put("userId", userId)
        .put("e164", hit.e164)
        .put("category", hit.category)
        .put("labelZh", hit.labelZh)

      val conn = (URL("$apiBase/api/blocked-calls").openConnection() as HttpURLConnection)
      conn.requestMethod = "POST"
      conn.setRequestProperty("Content-Type", "application/json")
      conn.doOutput = true
      conn.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
      conn.responseCode
      conn.disconnect()
    } catch (e: Exception) {
      Log.w(TAG, "Failed to report blocked call", e)
    }
  }

  companion object {
    private const val TAG = "CallGuardScreening"
  }
}
