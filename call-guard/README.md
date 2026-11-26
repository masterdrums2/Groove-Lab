# Call Guard（來電欄截 MVP）

**香港限定**：淨係欄截**喺香港收到**嘅來電（本地 +852，以及打入香港嘅境外／偽冒號碼）。唔覆蓋其他地區。

會員制 App：香港號碼登記 → 候選名單 → 付 HK$1／月開通 → 同步香港滋擾／騙案／推銷／借貸號碼庫 → 系統層欄截。用戶介面**只顯示已欄截紀錄**。

本專案喺 `call-guard/`（已同 Groove-Lab 網站脫鈎，待獨立 repo）。

## 點樣做到「真正欄截」

詳見 [`docs/NATIVE_CALL_INTERCEPTION.md`](./docs/NATIVE_CALL_INTERCEPTION.md)。

簡短版：

1. **Android**：`CallScreeningService` 喺響鈴前收到來電 → 查本地 blocklist → `rejectCall` → POST 紀錄到 API。  
   程式：`mobile/modules/call-screening/android/.../CallGuardScreeningService.kt`
2. **iOS**：Call Directory Extension 預先上載封鎖號碼；系統代擋。幾乎冇「每次被擋」callback。  
   程式：`mobile/modules/call-screening/ios/CallDirectoryHandler.swift`
3. Expo Go **唔得**；要用 `npx expo prebuild` + development / release build。

## 目錄

```
call-guard/
  server/     # Express + SQLite API
  mobile/     # Expo (React Native) App
  docs/       # 原生欄截說明
```

## 後端

```bash
cd call-guard/server
npm install
npm run seed
npm start          # http://127.0.0.1:8787
```

主要 API：

| Method | Path | 說明 |
|--------|------|------|
| POST | `/api/register` | 註冊 → `candidate` |
| POST | `/api/users/:id/pay` | 模擬 HK$1 付款 → `active` |
| GET | `/api/lists/candidates` | 候選名單 |
| GET | `/api/lists/active` | 已開通名單 |
| GET | `/api/blocklist?userId=` | 下載封鎖號碼（僅 active） |
| GET | `/api/users/:id/blocked-calls` | 已欄截紀錄（App UI） |
| POST | `/api/blocked-calls` | 裝置上報欄截 |

## 手機 App

```bash
cd call-guard/mobile
npm install
npx expo start
```

- 模擬器／Expo Go：可走註冊、付費、模擬欄截、睇紀錄。
- 真欄截：

```bash
npx expo prebuild
npx expo run:android   # 實機批准「來電過濾」角色
```

實體裝置請設 `EXPO_PUBLIC_API_URL=http://<你電腦LAN IP>:8787`。

## 會員狀態機

```
register → candidate → pay($1) → active → sync blocklist → native screening ON
```
