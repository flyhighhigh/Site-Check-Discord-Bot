import fetch from 'node-fetch';

const TARGET_URL = process.env.TARGET_URL;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const PING_COUNT = 3; // 固定 ping 3 次

// 單次檢查網站
async function pingWebsite() {
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
      return { success: true, status: response.status, message: 'OK' };
    } else {
      return { success: false, status: response.status, message: `HTTP ${response.status}` };
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return { success: false, status: null, message: '請求超時' };
    }
    return { success: false, status: null, message: error.message };
  }
}

// 執行多次檢查
async function checkMultipleTimes() {
  const results = [];
  
  for (let i = 1; i <= PING_COUNT; i++) {
    console.log(`[${new Date().toLocaleString('zh-TW')}] 第 ${i}/${PING_COUNT} 次檢查...`);
    const result = await pingWebsite();
    results.push(result);
    
    if (result.success) {
      console.log(`[${new Date().toLocaleString('zh-TW')}] ✓ 成功 (狀態碼: ${result.status})`);
    } else {
      console.log(`[${new Date().toLocaleString('zh-TW')}] ✗ 失敗 (${result.message})`);
    }
    
    // 如果不是最後一次，等待一下再進行下一次
    if (i < PING_COUNT) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 等待 2 秒
    }
  }
  
  return results;
}

// 發送警告訊息到 Discord Webhook
async function sendAlert(failureResults) {
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
      console.log(`[${new Date().toLocaleString('zh-TW')}] 已發送警告訊息到 Discord Webhook`);
    } else {
      const errorText = await response.text();
      console.error(`發送訊息失敗: HTTP ${response.status} - ${errorText}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`發送訊息時發生錯誤: ${error.message}`);
    process.exit(1);
  }
}

// 主程式
async function main() {
  // 驗證環境變數
  if (!TARGET_URL || !WEBHOOK_URL) {
    console.error('錯誤: 請設定 TARGET_URL 和 WEBHOOK_URL 環境變數');
    process.exit(1);
  }

  console.log(`[${new Date().toLocaleString('zh-TW')}] 開始檢查網站: ${TARGET_URL}`);
  console.log(`將執行 ${PING_COUNT} 次檢查\n`);

  const results = await checkMultipleTimes();

  // 統計結果
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  console.log(`\n[${new Date().toLocaleString('zh-TW')}] 檢查完成:`);
  console.log(`  成功: ${successCount}/${PING_COUNT}`);
  console.log(`  失敗: ${failureCount}/${PING_COUNT}`);

  // 如果所有檢查都成功，就結束
  if (failureCount === 0) {
    console.log(`[${new Date().toLocaleString('zh-TW')}] 所有檢查都成功，網站正常運作`);
    process.exit(0);
  }

  // 如果有失敗，發送警告訊息
  console.log(`[${new Date().toLocaleString('zh-TW')}] 檢測到網站異常，準備發送警告訊息...`);
  const failureResults = results.filter(r => !r.success);
  await sendAlert(failureResults);
  
  process.exit(0);
}

main().catch((error) => {
  console.error(`執行錯誤: ${error.message}`);
  process.exit(1);
});