/**
 * app-detector-example.js
 * 应用检测功能使用示例
 */

// 引入应用检测模块
var appDetector = require('./app-detector.js')

// 目标应用包名
var targetPackage = 'com.linecorp.linemanga' // LINE漫画

console.log('=== 应用检测功能使用示例 ===')

// 示例1: 检测当前应用
console.log('\n1. 检测当前应用:')
let currentApp = appDetector.getCurrentApp()
console.log('当前应用信息:', JSON.stringify(currentApp, null, 2))

// 示例2: 检查目标应用状态
console.log('\n2. 检查目标应用状态:')
let appStatus = appDetector.getAppStatus(targetPackage)
console.log('应用状态:', JSON.stringify(appStatus, null, 2))

// 示例3: 检查是否在前台
console.log('\n3. 检查是否在前台:')
let isForeground = appDetector.isAppInForeground(targetPackage)
console.log('是否在前台:', isForeground)

// 示例4: 检查是否在运行
console.log('\n4. 检查是否在运行:')
let isRunning = appDetector.isAppRunning(targetPackage)
console.log('是否在运行:', isRunning)

// 示例5: 等待应用启动（如果需要）
if (!isForeground) {
  console.log('\n5. 等待应用启动:')
  appDetector
    .waitForApp(targetPackage, 10000, (status, elapsed, total) => {
      console.log('等待进度:', Math.round(elapsed / 1000) + 's/' + Math.round(total / 1000) + 's')
    })
    .then((success) => {
      console.log('等待结果:', success)
    })
    .catch((error) => {
      console.error('等待出错:', error)
    })
}

// 示例6: 启动应用并等待
console.log('\n6. 启动应用并等待:')
appDetector
  .launchAndWait(targetPackage, 15000)
  .then((success) => {
    console.log('启动结果:', success)
  })
  .catch((error) => {
    console.error('启动出错:', error)
  })

// 示例7: 监听应用切换
console.log('\n7. 开始监听应用切换:')
let watcher = appDetector.watchAppSwitch(
  targetPackage,
  (event) => {
    console.log('应用切换事件:', JSON.stringify(event, null, 2))

    if (event.isTargetApp) {
      console.log('目标应用进入前台')
    } else {
      console.log('目标应用切换到后台')
    }
  },
  2000
) // 每2秒检查一次

// 10秒后停止监听
setTimeout(() => {
  console.log('\n停止监听应用切换')
  watcher.stop()
}, 10000)

console.log('\n=== 示例运行完成 ===')
