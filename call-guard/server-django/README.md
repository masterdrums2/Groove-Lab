# Call Guard API — Django / Python 版

同原本 **Node／Express** 版並行，**唔會改動** `../server`。

API 路徑對齊 Express，方便學習對照；預設埠 **8788**（Express 用 8787）。

## 快速開始

```bash
cd call-guard/server-django
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py import_csv        # 共用 ../server/data/prebuilt-hk-blocklist.csv
python manage.py runserver 8788
```

Health：http://127.0.0.1:8788/health  
Admin：http://127.0.0.1:8788/admin/（先 `createsuperuser`）

## 同 Express 一齊用時

| 後端 | 埠 | App 設定 |
|------|-----|----------|
| Express（原本） | 8787 | `EXPO_PUBLIC_API_URL=http://127.0.0.1:8787` |
| Django（本目錄） | 8788 | `EXPO_PUBLIC_API_URL=http://127.0.0.1:8788` |

一次只開一個畀 App 連，或者開兩個分別測試。

## 學到咩

- Django models／migrations／admin  
- DRF `@api_view` JSON API  
- 同 React Native App 對接同一合約  
- management command 匯入 CSV  
