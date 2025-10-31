# 網站健康檢查工具

這是一個簡易的網站健康檢查工具，使用 Discord Bot 作為通知機制。當監控的網站連續無回應達到設定次數時，會自動發送警告訊息到指定的 Discord 頻道。

## 功能

- 定期檢查網站狀態
- 追蹤連續失敗次數
- 當失敗次數超過閾值時發送警告訊息
- 避免短時間內重複發送警告（冷卻機制）
- **GitHub Actions 整合**：每 8 小時自動檢查一次（可選）

## 安裝步驟

1. **安裝依賴**
   ```bash
   npm install
   ```

2. **設定環境變數**
   - 複製 `.env.example` 為 `.env`
   - 填入必要的設定值：
     - `DISCORD_TOKEN`: Discord Bot Token（從 [Discord Developer Portal](https://discord.com/developers/applications) 取得）
     - `TARGET_URL`: 要監控的網站 URL
     - `CHANNEL_ID`: 要發送訊息的 Discord 頻道 ID
     - `MAX_FAILURE_COUNT`: 允許連續失敗的次數（預設：3）
     - `CHECK_INTERVAL`: 檢查間隔時間，單位為毫秒（預設：60000，即 60 秒）

3. **取得 Discord Bot Token**
   - 前往 [Discord Developer Portal](https://discord.com/developers/applications)
   - 建立新的 Application 或選擇現有的
   - 進入 Bot 頁籤，建立 Bot 並複製 Token
   - 確保開啟以下權限：
     - Send Messages
     - Read Message History
     - View Channels

4. **取得頻道 ID**
   - 在 Discord 中啟用「開發者模式」
   - 右鍵點擊目標頻道 → 複製 ID

5. **邀請 Bot 到伺服器**
   - 在 Developer Portal 的 OAuth2 → URL Generator
   - 選擇 `bot` scope 和所需的權限
   - 使用生成的 URL 邀請 Bot

## 使用方法

```bash
npm start
```

或使用開發模式（自動重載）：

```bash
npm run dev
```

## 環境變數說明

| 變數名稱 | 說明 | 預設值 | 必填 |
|---------|------|--------|------|
| `DISCORD_TOKEN` | Discord Bot Token | - | ✓ |
| `TARGET_URL` | 要監控的網站 URL | - | ✓ |
| `CHANNEL_ID` | Discord 頻道 ID | - | ✓ |
| `MAX_FAILURE_COUNT` | 最大連續失敗次數 | 3 | ✗ |
| `CHECK_INTERVAL` | 檢查間隔（毫秒） | 60000 | ✗ |

## GitHub Actions 自動檢查（可選）

除了本地運行的 Bot 外，也可以使用 GitHub Actions 進行定期檢查。

### 設定步驟

1. **將專案推送到 GitHub**

2. **設定 GitHub Secrets**
   - 進入你的 GitHub Repository
   - 點擊 `Settings` → `Secrets and variables` → `Actions`
   - 新增以下 Secrets：
     - `DISCORD_TOKEN`: Discord Bot Token
     - `TARGET_URL`: 要監控的網站 URL
     - `CHANNEL_ID`: Discord 頻道 ID

3. **Workflow 設定**
   - Workflow 檔案已位於 `.github/workflows/check-website.yml`
   - 預設每 8 小時執行一次（UTC 時間的 00:00, 08:00, 16:00）
   - 每次執行會 ping 網站 3 次
   - 如果 3 次都成功，就不發送訊息
   - 如果有任何失敗，就發送「網站掛了」到 Discord

4. **手動觸發**
   - 你也可以在 GitHub Actions 頁面手動觸發 workflow 進行測試

### 調整執行時間

編輯 `.github/workflows/check-website.yml` 中的 cron 表達式：
```yaml
- cron: '0 */8 * * *'  # 每 8 小時
- cron: '0 0,8,16 * * *'  # 每天 00:00, 08:00, 16:00 (UTC)
- cron: '0 0 * * *'  # 每天 00:00 (UTC)
```

## 注意事項

- Bot 會每 5 分鐘內最多發送一次警告訊息（避免訊息轟炸）
- 網站恢復正常後會自動重置失敗計數
- 建議使用 PM2 或其他進程管理器來確保 Bot 持續運行
- GitHub Actions 版本會在每次失敗時都發送訊息（沒有冷卻機制，因為每 8 小時才執行一次）

## 授權

MIT
