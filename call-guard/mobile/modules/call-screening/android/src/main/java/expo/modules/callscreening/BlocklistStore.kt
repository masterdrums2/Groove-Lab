package expo.modules.callscreening

import android.content.Context
import org.json.JSONArray

/**
 * Local copy of the HK inbound blocklist used by CallGuardScreeningService.
 *
 * Matching is Hong Kong–aware: 8-digit local display and +852 E.164 both hit
 * the same entry. Overseas numbers that call into HK are stored as full E.164.
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

    val needles = matchKeys(incoming)
    val arr = JSONArray(raw)
    for (i in 0 until arr.length()) {
      val obj = arr.getJSONObject(i)
      val e164 = obj.optString("e164")
      val keys = matchKeys(e164)
      if (needles.any { it in keys }) {
        return Entry(
          e164 = e164,
          category = obj.optString("category"),
          labelZh = obj.optString("labelZh", "已欄截來電（香港）"),
        )
      }
    }
    return null
  }

  /** Digits-only keys covering local 8-digit and +852 forms. */
  private fun matchKeys(value: String): Set<String> {
    val d = value.filter { it.isDigit() }
    if (d.isEmpty()) return emptySet()
    val keys = mutableSetOf(d)
    when {
      d.startsWith("852") && d.length == 11 -> keys.add(d.substring(3))
      d.length == 8 -> keys.add("852$d")
    }
    return keys
  }
}
