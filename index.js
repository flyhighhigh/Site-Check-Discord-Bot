import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const TARGET_URL = process.env.TARGET_URL;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const MAX_FAILURE_COUNT = parseInt(process.env.MAX_FAILURE_COUNT || '3', 10);
const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL || '60000', 10);

let failureCount = 0;
let isMonitoring = false;
let lastAlertTime = null;
const ALERT_COOLDOWN = 5 * 60 * 1000; // 5 分鐘內不重複發送警告

// 檢查網站狀態
async function checkWebsite() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 秒超時

  try {
    const response = await fetch(TARGET_URL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Website-Health-Check-Bot/1.0'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      // 網站正常，重置失敗計數
      if (failureCount > 0) {
        console.log(`[${new Date().toLocaleString('zh-TW')}] 網站恢復正常`);
        failureCount = 0;
      }
      return true;
    } else {
      // HTTP 狀態碼錯誤
      failureCount++;
      console.log(`[${new Date().toLocaleString('zh-TW')}] 網站回應異常 (狀態碼: ${response.status}), 失敗次數: ${failureCount}`);
      return false;
    }
  } catch (error) {
    clearTimeout(timeoutId);
    // 連線失敗或超時
    failureCount++;
    if (error.name === 'AbortError') {
      console.log(`[${new Date().toLocaleString('zh-TW')}] 網站連線超時, 失敗次數: ${failureCount}`);
    } else {
      console.log(`[${new Date().toLocaleString('zh-TW')}] 網站連線失敗: ${error.message}, 失敗次數: ${failureCount}`);
    }
    return false;
  }
}

// 發送警告訊息到 Discord Webhook
async function sendAlert() {
  const now = Date.now();
  
  // 冷卻時間檢查：避免短時間內重複發送
  if (lastAlertTime && (now - lastAlertTime) < ALERT_COOLDOWN) {
    console.log(`[${new Date().toLocaleString('zh-TW')}] 警告訊息在冷卻期間，跳過發送`);
    return;
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: `網站掛了：${TARGET_URL}`,
      }),
    });

    if (response.ok) {
      lastAlertTime = now;
      console.log(`[${new Date().toLocaleString('zh-TW')}] 已發送警告訊息到 Discord Webhook`);
    } else {
      const errorText = await response.text();
      console.error(`發送訊息失敗: HTTP ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error(`發送訊息時發生錯誤: ${error.message}`);
  }
}

// 開始監控
function startMonitoring() {
  if (isMonitoring) {
    return;
  }

  isMonitoring = true;
  console.log(`[${new Date().toLocaleString('zh-TW')}] 開始監控網站: ${TARGET_URL}`);
  console.log(`檢查間隔: ${CHECK_INTERVAL / 1000} 秒, 最大失敗次數: ${MAX_FAILURE_COUNT}`);

  setInterval(async () => {
    const isOnline = await checkWebsite();

    if (!isOnline && failureCount >= MAX_FAILURE_COUNT) {
      await sendAlert();
    }
  }, CHECK_INTERVAL);
}

// 驗證必要環境變數
if (!TARGET_URL || !WEBHOOK_URL) {
  console.error('錯誤: 請設定 TARGET_URL 和 WEBHOOK_URL 環境變數');
  process.exit(1);
}

console.log(`[${new Date().toLocaleString('zh-TW')}] 網站監控服務啟動`);

// 立即執行一次檢查
checkWebsite();

// 開始定期監控
startMonitoring();

// 處理錯誤
process.on('unhandledRejection', (error) => {
  console.error(`未處理的 Promise 拒絕: ${error.message}`);
});
