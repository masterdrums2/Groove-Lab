package expo.modules.callscreening

import android.app.Activity
import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.telecom.TelecomManager
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CallScreeningModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CallGuardScreening")

    AsyncFunction("requestCallScreeningRole") { promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.resolve(false)
        return@AsyncFunction
      }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        val roleManager = activity.getSystemService(RoleManager::class.java)
        if (roleManager != null && !roleManager.isRoleHeld(RoleManager.ROLE_CALL_SCREENING)) {
          val intent = roleManager.createRequestRoleIntent(RoleManager.ROLE_CALL_SCREENING)
          activity.startActivityForResult(intent, REQ_ROLE)
          // Result is delivered asynchronously; treat launch as "requested".
          promise.resolve(roleManager.isRoleHeld(RoleManager.ROLE_CALL_SCREENING))
          return@AsyncFunction
        }
        promise.resolve(roleManager?.isRoleHeld(RoleManager.ROLE_CALL_SCREENING) == true)
      } else {
        promise.resolve(false)
      }
    }

    AsyncFunction("isCallScreeningEnabled") { promise: Promise ->
      val context = appContext.reactContext ?: run {
        promise.resolve(false)
        return@AsyncFunction
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        val roleManager = context.getSystemService(RoleManager::class.java)
        promise.resolve(roleManager?.isRoleHeld(RoleManager.ROLE_CALL_SCREENING) == true)
      } else {
        promise.resolve(false)
      }
    }

    AsyncFunction("syncBlocklist") { numbersJson: String, promise: Promise ->
      val context = appContext.reactContext ?: run {
        promise.reject("NO_CONTEXT", "No Android context", null)
        return@AsyncFunction
      }
      val count = BlocklistStore.save(context, numbersJson)
      promise.resolve(mapOf("count" to count))
    }

    AsyncFunction("clearBlocklist") { promise: Promise ->
      val context = appContext.reactContext ?: run {
        promise.resolve(null)
        return@AsyncFunction
      }
      BlocklistStore.clear(context)
      promise.resolve(null)
    }

    AsyncFunction("setSession") { userId: String, apiBase: String, promise: Promise ->
      val context = appContext.reactContext ?: run {
        promise.resolve(null)
        return@AsyncFunction
      }
      context.getSharedPreferences("call_guard_session", Context.MODE_PRIVATE)
        .edit()
        .putString("user_id", userId)
        .putString("api_base", apiBase)
        .apply()
      promise.resolve(null)
    }
  }

  companion object {
    private const val REQ_ROLE = 9911
  }
}
