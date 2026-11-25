package expo.modules.callscreening

import android.content.Context
import org.json.JSONArray

/**
 * Local copy of the server blocklist used by CallGuardScreeningService.
 * Keys are normalized digits-only forms of E.164 numbers.
 */
object BlocklistStore {
  private const val PREFS = "call_guard_blocklist"
  private const val KEY_NUMBERS = "numbers_json"

  data class Entry(
    val e164: String,
    val category: String,
    val labelZh: String,
  )

  fun save(context: Context, numbersJson: String): Int {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    prefs.edit().putString(KEY_NUMBERS, numbersJson).apply()
    return JSONArray(numbersJson).length()
  }

  fun clear(context: Context) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .remove(KEY_NUMBERS)
      .apply()
  }

  fun find(context: Context, incoming: String?): Entry? {
    if (incoming.isNullOrBlank()) return null
    val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .getString(KEY_NUMBERS, null) ?: return null

    val needle = normalize(incoming)
    val arr = JSONArray(raw)
    for (i in 0 until arr.length()) {
      val obj = arr.getJSONObject(i)
      val e164 = obj.optString("e164")
      if (normalize(e164) == needle) {
        return Entry(
          e164 = e164,
          category = obj.optString("category"),
          labelZh = obj.optString("labelZh", "已欄截來電"),
        )
      }
    }
    return null
  }

  private fun normalize(value: String): String =
    value.filter { it.isDigit() }
}
