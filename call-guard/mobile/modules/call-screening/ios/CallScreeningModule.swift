import ExpoModulesCore
import CallKit

/**
 * iOS bridge for Call Directory reload.
 *
 * Real blocking lives in a separate Call Directory Extension target
 * (see `CallDirectoryExtension/CallDirectoryHandler.swift`).
 * This module only stores the blocklist in an App Group and asks the
 * system to reload the extension.
 */
public class CallScreeningModule: Module {
  public func definition() -> ModuleDefinition {
    Name("CallGuardScreening")

    AsyncFunction("requestCallScreeningRole") { () -> Bool in
      // iOS has no ROLE_CALL_SCREENING equivalent; enabling happens in Settings.
      return true
    }

    AsyncFunction("isCallScreeningEnabled") { () -> Bool in
      return true
    }

    AsyncFunction("syncBlocklist") { (numbersJson: String) -> [String: Any] in
      let defaults = UserDefaults(suiteName: "group.com.callguard.app")
      defaults?.set(numbersJson, forKey: "blocklist_json")
      defaults?.synchronize()

      let extensionId = "com.callguard.app.CallDirectory"
      CXCallDirectoryManager.sharedInstance.reloadExtension(withIdentifier: extensionId) { error in
        if let error = error {
          NSLog("CallDirectory reload failed: \(error.localizedDescription)")
        }
      }

      let count = (try? JSONSerialization.jsonObject(with: Data(numbersJson.utf8)) as? [Any])?.count ?? 0
      return ["count": count]
    }

    AsyncFunction("clearBlocklist") { () in
      let defaults = UserDefaults(suiteName: "group.com.callguard.app")
      defaults?.removeObject(forKey: "blocklist_json")
      defaults?.synchronize()
    }

    AsyncFunction("setSession") { (_ userId: String, _ apiBase: String) in
      // iOS Call Directory cannot report per-call blocks to the API.
    }
  }
}
