# Call Guard（香港來電欄截）

專為香港：欄截喺香港收到嘅騷擾、疑似騙案、推銷同財務借貸來電。

## 產品定位（打破「响咗先知／先中一刀」）

**主路徑（必須做到）：**

1. Call Guard **預先查好**會打入香港嘅騷擾／騙案／推銷／借貸號碼，建成攔截庫  
2. 用戶付 **HK$1／月** → 開通 → 下載呢份預建名單  
3. 名單入面嘅號碼 **一律唔會响到／call 到** 付費會員（唔使等人親自中過先 block）

**輔助路徑（補漏）：**  
全新號碼總有第一個受害者；會員舉報只係幫庫持續更新，**唔係**主要賣點。

極簡 UI：只顯示已欄截紀錄。

會員：香港 +852 登記 → 候選 → 付 $1 → 同步**預建**封鎖名單 → 系統層欄截。

Repo：https://github.com/Pordanpordan/Call-Guard

## 預建名單點嚟（營運，唔係等用戶中招）

合法來源優先（唔抄 Whoscall 私有庫）：

- 公開／社群舉報彙整（如 HKJunkCall 類公開紀錄、新聞披露號碼）  
- 用戶舉報經審核後入庫（輔助）  
- 日後正式合作 API（Whoscall Asi／同類）  
- 人工維護四類：`harassment` / `scam` / `telemarketing` / `loan`

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
