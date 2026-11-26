# 預建名單來源說明

## 重要

**沒有**整庫爬取／複製 Whoscall 私有數據庫（服務條款＋資料庫權利問題）。

本批 `server/data/prebuilt-hk-blocklist.csv` 來自**公開網頁上可見的用戶舉報／彙整**，供 Call Guard 作香港預建攔截起點。

## 來源

| 來源 | 用途 | 備註 |
|------|------|------|
| [HKeTIME 詐騙電話黑名單](https://hketime.com/scam/scam-calls/) | 疑似騙案 | 公開彙整；可能有誤報 |
| [junk-call.com 騙案／疑騙案](https://www.junk-call.com/hk/%E9%AA%97%E6%A1%88) | 疑似騙案 | 網友舉報 |
| [junk-call.com 財務借貸](https://www.junk-call.com/hk/%E8%B2%A1%E5%8B%99%E5%80%9F%E8%B2%B8) | 財務借貸推介 | 可能包含銀行外判推銷線 |
| [junk-call.com 財務推銷](https://www.junk-call.com/hk/%E8%B2%A1%E5%8B%99%E6%8E%A8%E9%8A%B7) | 推銷 | 網友舉報 |

## 匯入

```bash
cd server
npm run import:csv
# 或指定檔案：
node src/import-csv.js ./data/prebuilt-hk-blocklist.csv
```

付費會員之後 `GET /api/blocklist` 會拿到整份 `region=HK` 名單。

## 風險

- 公開舉報**未必 100% 準**；可能誤攔正常號碼（尤其銀行推銷線）
- 應持續人工抽樣、接受申訴移除
- 長期應洽談正式數據合作（API），唔好靠刮頁

## 同 Whoscall 關係

若號碼「亦」出現喺 Whoscall，只代表社群／公開場景常見；**唔等於**由 Whoscall 官方匯出。
