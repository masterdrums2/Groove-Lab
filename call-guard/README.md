# Call Guard（香港來電欄截）

專為香港：欄截喺香港收到嘅騷擾、疑似騙案、推銷同財務借貸來電。

會員：香港 +852 登記 → 候選名單 → 付 HK$1／月開通 → 同步封鎖名單 → 系統層欄截。  
App 只顯示已欄截紀錄。

Repo：https://github.com/Pordanpordan/Call-Guard

## 目錄

```
server/     # API（Express + SQLite）
mobile/     # Expo App
docs/       # 原生欄截說明
```

## 快速開始

```bash
cd server && npm install && npm run seed && npm start
```

另一個 terminal：

```bash
cd mobile && npm install && npx expo start
```

真欄截（唔係 Expo Go）：

```bash
cd mobile && npx expo prebuild && npx expo run:android
```

詳見 `docs/NATIVE_CALL_INTERCEPTION.md`。
