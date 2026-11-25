import Foundation
import CallKit

/**
 * Drop this file into an Xcode Call Directory Extension target.
 *
 * Setup:
 * 1. Xcode → File → New → Target → Call Directory Extension
 * 2. Enable App Group `group.com.callguard.app` on app + extension
 * 3. Main app writes blocklist JSON via CallScreeningModule.syncBlocklist
 * 4. System calls beginRequest; we add blocking entries in ascending order
 *
 * Limitation: there is no callback when a number is actually blocked,
 * so the in-app "已欄截來電" feed cannot be complete on iOS.
 */
class CallDirectoryHandler: CXCallDirectoryProvider {
  override func beginRequest(with context: CXCallDirectoryExtensionContext) {
    context.delegate = self

    guard let defaults = UserDefaults(suiteName: "group.com.callguard.app"),
          let raw = defaults.string(forKey: "blocklist_json"),
          let data = raw.data(using: .utf8),
          let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]]
    else {
      context.completeRequest()
      return
    }

    let numbers: [Int64] = arr.compactMap { row in
      guard let e164 = row["e164"] as? String else { return nil }
      let digits = e164.filter { $0.isNumber }
      return Int64(digits)
    }.sorted()

    for number in numbers {
      context.addBlockingEntry(withNextSequentialPhoneNumber: number)
    }

    context.completeRequest()
  }
}

extension CallDirectoryHandler: CXCallDirectoryExtensionContextDelegate {
  func requestFailed(for extensionContext: CXCallDirectoryExtensionContext, withError error: Error) {
    NSLog("CallDirectory request failed: \(error.localizedDescription)")
  }
}
