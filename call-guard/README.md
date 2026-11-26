# Call Guard（香港來電欄截）

專為香港：欄截喺香港收到嘅騷擾、疑似騙案、推銷同財務借貸來電。

## 產品優先（相對 Whoscall／Call Defender）

核心唔係「响咗先知」，而係：

1. **共享攔截庫**：會員舉報號碼 → 即入香港庫  
2. **全員受惠**：其他已付費會員下次同步後預先攔（唔使每人自己 block 一次）  
3. **極簡 UI**：只顯示已欄截紀錄  
4. **HK$1／月** 開通

會員：香港 +852 登記 → 候選名單 → 付 HK$1／月開通 → 同步封鎖名單 → 系統層欄截。

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
