/**
 * app-detector.js
 * 应用检测工具模块
 * 提供检测当前运行应用、等待应用启动等功能
 */

var appDetector = {}

/**
 * 检测当前前台应用
 * @returns {Object} 应用信息对象
 */
appDetector.getCurrentApp = function () {
  try {
    // 方法1: 使用 currentPackage() 获取当前前台应用包名
    let currentPackageName = currentPackage()

    // 方法2: 使用 currentActivity() 获取当前活动
    let currentActivity = currentActivity()

    // 方法3: 使用系统API获取更详细信息
    let systemInfo = null
    try {
      let activityManager = context.getSystemService(android.content.Context.ACTIVITY_SERVICE)
      let tasks = activityManager.getRunningTasks(1)
      if (tasks.size() > 0) {
        let topActivity = tasks.get(0).topActivity
        systemInfo = {
          packageName: topActivity.getPackageName(),
          className: topActivity.getClassName(),
          taskId: tasks.get(0).id,
        }
      }
    } catch (e) {
      console.warn('获取系统应用信息失败: ' + e)
    }

    return {
      packageName: currentPackageName,
      activity: currentActivity,
      systemInfo: systemInfo,
      timestamp: new Date().getTime(),
    }
  } catch (e) {
    console.error('检测当前应用时出错: ' + e)
    return {
      packageName: 'unknown',
      activity: 'unknown',
      systemInfo: null,
      error: e.toString(),
      timestamp: new Date().getTime(),
    }
  }
}

/**
 * 检查指定应用是否在前台运行
 * @param {string} packageName 要检查的应用包名
 * @returns {boolean} 是否在前台
 */
appDetector.isAppInForeground = function (packageName) {
  try {
    let currentPackageName = currentPackage()
    return currentPackageName === packageName
  } catch (e) {
    console.error('检查应用前台状态时出错: ' + e)
    return false
  }
}

/**
 * 检查应用是否在运行（包括后台）
 * @param {string} packageName 要检查的应用包名
 * @returns {boolean} 是否在运行
 */
appDetector.isAppRunning = function (packageName) {
  try {
    let activityManager = context.getSystemService(android.content.Context.ACTIVITY_SERVICE)
    let runningProcesses = activityManager.getRunningAppProcesses()

    for (let i = 0; i < runningProcesses.size(); i++) {
      let processInfo = runningProcesses.get(i)
      if (processInfo.processName === packageName) {
        return true
      }
    }
    return false
  } catch (e) {
    console.error('检查应用运行状态时出错: ' + e)
    return false
  }
}

/**
 * 获取应用的完整状态信息
 * @param {string} packageName 要检查的应用包名
 * @returns {Object} 应用状态信息
 */
appDetector.getAppStatus = function (packageName) {
  try {
    let currentPackageName = currentPackage()
    let isForeground = currentPackageName === packageName
    let isRunning = this.isAppRunning(packageName)

    return {
      packageName: packageName,
      isForeground: isForeground,
      isRunning: isRunning,
      currentPackage: currentPackageName,
      timestamp: new Date().getTime(),
    }
  } catch (e) {
    console.error('获取应用状态时出错: ' + e)
    return {
      packageName: packageName,
      isForeground: false,
      isRunning: false,
      currentPackage: 'unknown',
      error: e.toString(),
      timestamp: new Date().getTime(),
    }
  }
}

/**
 * 等待指定应用启动并进入前台
 * @param {string} packageName 要等待的应用包名
 * @param {number} timeout 超时时间（毫秒），默认30秒
 * @param {Function} onProgress 进度回调函数
 * @returns {Promise<boolean>} 是否成功启动
 */
appDetector.waitForApp = function (packageName, timeout, onProgress) {
  return new Promise((resolve, reject) => {
    timeout = timeout || 30000
    let startTime = new Date().getTime()

    console.log('等待应用启动: ' + packageName)

    let checkInterval = setInterval(() => {
      try {
        let currentTime = new Date().getTime()
        let elapsed = currentTime - startTime

        // 检查是否超时
        if (elapsed >= timeout) {
          clearInterval(checkInterval)
          console.warn('等待应用启动超时')
          resolve(false)
          return
        }

        // 检查应用状态
        let appStatus = this.getAppStatus(packageName)

        // 调用进度回调
        if (onProgress && typeof onProgress === 'function') {
          onProgress(appStatus, elapsed, timeout)
        }

        // 检查是否已启动
        if (appStatus.isForeground) {
          clearInterval(checkInterval)
          console.log('应用已启动并进入前台')
          resolve(true)
          return
        }

        console.log('当前应用: ' + appStatus.currentPackage + ', 等待中... (' + Math.round(elapsed / 1000) + 's/' + Math.round(timeout / 1000) + 's)')
      } catch (e) {
        clearInterval(checkInterval)
        console.error('等待应用启动时出错: ' + e)
        reject(e)
      }
    }, 1000)
  })
}

/**
 * 启动应用并等待进入前台
 * @param {string} packageName 要启动的应用包名
 * @param {number} timeout 等待超时时间（毫秒），默认30秒
 * @returns {Promise<boolean>} 是否成功启动
 */
appDetector.launchAndWait = function (packageName, timeout) {
  return new Promise((resolve, reject) => {
    try {
      console.log('启动应用: ' + packageName)

      // 尝试启动应用
      let launched = app.launch(packageName)
      if (!launched) {
        console.error('启动应用失败')
        resolve(false)
        return
      }

      // 等待应用进入前台
      this.waitForApp(packageName, timeout, (status, elapsed, total) => {
        console.log('启动进度: ' + Math.round(elapsed / 1000) + 's/' + Math.round(total / 1000) + 's')
      })
        .then((success) => {
          resolve(success)
        })
        .catch((error) => {
          reject(error)
        })
    } catch (e) {
      console.error('启动应用时出错: ' + e)
      reject(e)
    }
  })
}

/**
 * 监听应用切换事件
 * @param {string} targetPackage 目标应用包名
 * @param {Function} onAppSwitch 应用切换回调函数
 * @param {number} checkInterval 检查间隔（毫秒），默认1000ms
 * @returns {Object} 监听器对象，包含stop方法
 */
appDetector.watchAppSwitch = function (targetPackage, onAppSwitch, checkInterval) {
  checkInterval = checkInterval || 1000
  let lastPackage = currentPackage()
  let isWatching = true

  console.log('开始监听应用切换: ' + targetPackage)

  let watchInterval = setInterval(() => {
    if (!isWatching) {
      clearInterval(watchInterval)
      return
    }

    try {
      let currentPackage = currentPackage()

      if (currentPackage !== lastPackage) {
        let isTargetApp = currentPackage === targetPackage
        console.log('应用切换: ' + lastPackage + ' -> ' + currentPackage + ' (目标应用: ' + isTargetApp + ')')

        if (onAppSwitch && typeof onAppSwitch === 'function') {
          onAppSwitch({
            from: lastPackage,
            to: currentPackage,
            isTargetApp: isTargetApp,
            timestamp: new Date().getTime(),
          })
        }

        lastPackage = currentPackage
      }
    } catch (e) {
      console.error('监听应用切换时出错: ' + e)
    }
  }, checkInterval)

  return {
    stop: function () {
      isWatching = false
      clearInterval(watchInterval)
      console.log('停止监听应用切换')
    },
  }
}

// 导出模块
module.exports = appDetector
