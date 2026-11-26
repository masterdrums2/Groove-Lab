# 點樣做到「真正欄截」來電

**範圍：香港。** 只保護喺香港收到嘅來電；blocklist 係「會打入香港」嘅號碼（+852 本地 + 境外／偽冒打入），會員電話必須係 +852。

純 Web / 純 JS **唔可以**斷來電。一定要經手機系統提供嘅原生 API，由系統喺來電響之前問你個 App：「呢個號碼要唔要擋？」

Call Guard 用兩套原生機制：

| 平台 | API | 能力 |
|------|-----|------|
| Android | `CallScreeningService` | 即時檢查號碼 → 拒接 / 靜音 / 唔顯示 → 可寫「已欄截」紀錄 |
| iOS | CallKit `Call Directory` Extension | 預先上載封鎖名單 → 系統自動擋／標示；**幾乎攞唔到每次被擋嘅 callback** |

---

## Android（真正即時欄截）

### 流程

1. 用戶付費開通後，App 向系統申請 **Call Screening 角色**（`ROLE_CALL_SCREENING`）。
2. App 下載 blocklist，存喺裝置本地（SQLite / SharedPreferences）。
3. 有來電時，系統呼叫你註冊嘅 `CallScreeningService.onScreenCall()`。
4. Service 用來電號碼查本地名單：
   - 命中 → `setDisallowCall(true)` + `setRejectCall(true)`（或只靜音）
   - 同時寫入本地 log，再 POST 去 `/api/blocked-calls`
5. 用戶 App UI 只顯示呢啲已欄截紀錄。

### 關鍵程式（本專案）

- `mobile/modules/call-screening/android/.../CallGuardScreeningService.kt`
- Expo module：`CallScreeningModule`（請求角色、同步名單、讀本地 log）

### 權限 / 限制

- 用戶必須手動批准「來電過濾」角色（系統設定頁）。
- 部份OEM（小米／華為）可能加額外電池／自動啟動限制。
- 未開通會員：唔同步名單、Service 全部放行。

---

## iOS（Call Directory Extension）

### 流程

1. Xcode 加入 **Call Directory Extension** target（同主 App 分開嘅細 process）。
2. 主 App 下載 blocklist 後，寫入 App Group 共用 container。
3. 呼叫 `CXCallDirectoryManager.sharedInstance.reloadExtension(...)`。
4. Extension 嘅 `beginRequest` 按**已排序**嘅號碼列表，逐個 `addBlockingEntry(withNextSequentialPhoneNumber:)`。
5. 之後系統會自行擋呢啲號碼；**Extension 唔會每次來電都醒你**，所以「已欄截紀錄」喺 iOS 好難做到同 Android 一樣準。

### 限制（重要）

- 號碼必須數字排序、E.164 轉成整數格式。
- 列表有大小上限；更新要整批 reload。
- 冇穩定 API 攞「邊個號碼啱啱被擋」。
- MVP 建議：**Android 先做完整欄截 + 紀錄；iOS 先做封鎖／標示，紀錄標明「系統已封鎖（無詳細 log）」**。

---

## 點解要「候選 list → 付費 → active list」

1. 註冊成功 → `status = candidate`（未開通，唔發 blocklist）。
2. 付 HK$1/月成功 → `status = active`，裝置先可以 `GET /api/blocklist`。
3. 原生層只對 `active` 會員寫入系統封鎖名單。
4. 取消／欠費 → 清本地名單、停 screening（或 reload 空 list）。

呢個設計避免未付費用戶佔用同步同原生配額。

---

## 測試方法（Android）

1. 跑 API：`cd call-guard/server && npm run seed && npm start`
2. `npx expo prebuild` 後用 development build（Expo Go **唔支援**自訂 CallScreeningService）。
3. 實機批准 Call Screening 角色。
4. 用第二部電話打一個已 seed 嘅號碼（例如改 SIM 來電顯示做 `+85261230001` 較難；可用 Android emulator 輔助／手動 `adb` 模擬需視 API 版本）。
5. 較實用嘅整合測試：喺 App 內「模擬欄截」按鈕，走同一條 `reportBlockedCall` 路徑驗證 UI／API。
