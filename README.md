# PlanWith

中文名稱是約定清單。

給情侶與好友的協同任務與願望清單。每個人用自己的帳號登入，只看得到自己加入的空間。可以用邀請碼把人加進來、把卡住的任務標成求救，並在完成後送出電子小獎勵。

## 開始

```bash
npm install
cp .env.example .env.local
npm run dev
```

打開 [http://localhost:3000](http://localhost:3000)。`.env.local` 還沒填上 Supabase 網址與 anon key 時，畫面會停在設定說明，不會進入任何示範資料。

## 接上 Supabase

1. 建立 Supabase 專案，在 SQL Editor 整份執行 `supabase/schema.sql`。若之前跑過舊版，再執行一次即可補上空間顏色、任務標籤、連結、圖片欄位、`task-images` 圖片庫、靈感庫 `reels_ideas`、成員審核狀態、成員管理權限，禮物收集統計 `gift_collections`，以及專案 `projects`。
2. 在 `.env.local` 填上 Project URL 與 anon key。
3. Authentication 開啟 Email。若要讓人用暱稱直接開始，再打開 Anonymous sign-ins。
4. 重新啟動 `npm run dev`。

登入後可以建立空間（名稱、圖示、顏色），系統會產生像 `HUG-888` 的邀請碼，建立者會自動加入。對方輸入同一組邀請碼後，就能看到那份任務看板。

資料表有 `profiles`、`spaces`、`space_members`、`tasks`、`comments`、`reward_catalog`、`rewards`、`reward_unlocks`，並套上 Row Level Security：只有該空間的成員能讀寫裡面的任務。付費禮物先鎖住；之後只要寫入 `reward_unlocks`，對應的人就會解鎖。
