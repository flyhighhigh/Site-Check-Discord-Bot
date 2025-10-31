import { Client, GatewayIntentBits } from 'discord.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ]
});

const TARGET_URL = process.env.TARGET_URL;
const CHANNEL_ID = process.env.CHANNEL_ID;
const MAX_FAILURE_COUNT = parseInt(process.env.MAX_FAILURE_COUNT || '3', 10);
const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL || '60000', 10);

let failureCount = 0;
let isMonitoring = false;
let lastAlertTime = null;
const ALERT_COOLDOWN = 5 * 60 * 1000; // 5 分鐘內不重複發送警告

// 檢查網站狀態
async function checkWebsite() {
  try {
    const response = await fetch(TARGET_URL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Lab-Monitor-Bot/1.0'
      },
      timeout: 10000 // 10 秒超時
    });

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
    // 連線失敗或超時
    failureCount++;
    console.log(`[${new Date().toLocaleString('zh-TW')}] 網站連線失敗: ${error.message}, 失敗次數: ${failureCount}`);
    return false;
  }
}

// 發送警告訊息
async function sendAlert() {
  const now = Date.now();
  
  // 冷卻時間檢查：避免短時間內重複發送
  if (lastAlertTime && (now - lastAlertTime) < ALERT_COOLDOWN) {
    console.log(`[${new Date().toLocaleString('zh-TW')}] 警告訊息在冷卻期間，跳過發送`);
    return;
  }

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (channel && channel.isTextBased()) {
      await channel.send('實驗室網站掛了');
      lastAlertTime = now;
      console.log(`[${new Date().toLocaleString('zh-TW')}] 已發送警告訊息到頻道`);
    } else {
      console.error('無法取得指定的頻道或頻道類型錯誤');
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

// Bot 準備就緒
client.once('ready', () => {
  console.log(`[${new Date().toLocaleString('zh-TW')}] Bot 已登入為 ${client.user.tag}`);
  
  // 驗證必要環境變數
  if (!TARGET_URL || !CHANNEL_ID) {
    console.error('錯誤: 請設定 TARGET_URL 和 CHANNEL_ID 環境變數');
    process.exit(1);
  }

  // 立即執行一次檢查
  checkWebsite();
  
  // 開始定期監控
  startMonitoring();
});

// 處理錯誤
client.on('error', (error) => {
  console.error(`Discord 客戶端錯誤: ${error.message}`);
});

process.on('unhandledRejection', (error) => {
  console.error(`未處理的 Promise 拒絕: ${error.message}`);
});

// 登入 Bot
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('錯誤: 請設定 DISCORD_TOKEN 環境變數');
  process.exit(1);
}

client.login(token);
