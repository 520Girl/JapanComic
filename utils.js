/**
 * 通用工具函数模块
 * 提供权限管理、文件操作等通用功能
 */

var utils = {}

// 保存所有已初始化的日志实例
utils.loggers = {}

// 保存所有需要更新的配置实例
utils.configInstances = []

/**
 * 管理悬浮窗的全局注册表
 * 用于跟踪所有创建的悬浮窗，确保能够在应用退出时关闭它们
 */
utils.floatyWindows = []

// 添加截图权限状态标记
utils.captureRequestInProgress = false
utils.hasCapturePermission = false

/**
 * 注册配置实例以便在配置更新时自动更新
 * @param {Object} configInstance 配置对象实例
 */
utils.registerConfigInstance = function (configInstance) {
  if (configInstance && typeof configInstance === 'object') {
    // 检查是否已经注册过
    var alreadyRegistered = false
    for (var i = 0; i < utils.configInstances.length; i++) {
      if (utils.configInstances[i] === configInstance) {
        alreadyRegistered = true
        break
      }
    }

    if (!alreadyRegistered) {
      utils.configInstances.push(configInstance)
      console.log('已注册配置实例，当前共有 ' + utils.configInstances.length + ' 个实例')
    }
  }
}

/**
 * 日志系统初始化
 * @param {string} moduleName 模块名称
 * @param {Object} appConfig 应用配置
 * @returns {Object} 日志实例
 */
utils.initLogger = function (moduleName, appConfig) {
  try {
    // 先尝试加载日志模块
    var loggerModule = require('./logger.js')

    // 注册配置实例以便自动更新
    utils.registerConfigInstance(appConfig)

    // 创建日志记录器
    var logger = loggerModule.createLogger(moduleName, {
      logToFile: appConfig.logging.logToFile,
      debugMode: appConfig.debugMode,
      logLevel: appConfig.logging.logLevel,
      logToConsole: appConfig.logging.logToConsole,
      errorReport: appConfig.logging.errorReport,
      reportUrl: appConfig.logging.reportUrl,
      deviceInfo: appConfig.logging.deviceInfo,
    })

    // 保存日志实例以便配置更新时更新
    utils.loggers[moduleName] = logger

    logger.info('日志系统初始化成功')
    logger.info('模块: ' + moduleName + ', 日志级别: ' + appConfig.logging.logLevel)

    // 设置全局异常捕获
    logger.catchUnhandledErrors()

    return logger
  } catch (e) {
    console.error('初始化日志系统失败: ' + e)
    console.error('错误堆栈: ' + e.stack)
    // 创建一个简单的日志对象作为备用
    var fallbackLogger = {
      debug: function (msg) {
        console.verbose(msg)
      },
      info: function (msg) {
        console.info(msg)
      },
      warn: function (msg) {
        console.warn(msg)
      },
      error: function (msg, err) {
        console.error(msg)
        if (err && err.stack) console.error(err.stack)
      },
    }

    return fallbackLogger
  }
}

/**
 * 请求必要的权限
 * @param {Array} permissions 需要请求的权限数组，默认为存储权限
 * @returns {boolean} 是否获取了所有权限
 */
utils.requestPermissions = function (permissions) {
  // 默认请求存储权限
  permissions = permissions || ['android.permission.WRITE_EXTERNAL_STORAGE']

  console.log('请求权限: ' + permissions.join(', '))
  var granted = false

  try {
    // 检查是否已有权限
    var hasPermission = true
    for (var i = 0; i < permissions.length; i++) {
      if (!context.checkPermission(permissions[i], android.os.Process.myUid(), android.os.Process.myPid())) {
        hasPermission = false
        break
      }
    }

    if (hasPermission) {
      console.log('已有所需权限')
      return true
    }

    // 请求权限
    granted = runtime.requestPermissions(permissions)
    console.log('权限请求结果: ' + (granted ? '成功' : '失败'))

    if (!granted) {
      toast('需要相关权限才能正常运行')
    }
  } catch (e) {
    console.error('请求权限出错: ' + e)
  }

  return granted
}

/**
 * 检查存储权限
 * @returns {boolean} 是否有存储权限
 */
utils.hasStoragePermission = function () {
  try {
    return files.isDir(files.getSdcardPath())
  } catch (e) {
    return false
  }
}

/**
 * 获取可靠的存储目录
 * 根据权限情况返回合适的存储目录
 * @param {string} subDir 子目录名称
 * @returns {string} 存储目录路径
 */
utils.getReliableStorageDir = function (subDir) {
  subDir = subDir || 'logs'
  var dir

  try {
    // 首先尝试使用外部存储
    if (utils.hasStoragePermission()) {
      dir = files.getSdcardPath() + '/Pictures/' + subDir
    } else {
      // 回退到应用专用目录
      try {
        dir = context.getExternalFilesDir(null).getAbsolutePath() + '/' + subDir
      } catch (e) {
        dir = context.getFilesDir().getAbsolutePath() + '/' + subDir
      }
    }

    // 确保目录存在
    var dirFile = new java.io.File(dir)
    if (!dirFile.exists()) {
      dirFile.mkdirs()
    }
    // console.log('dir日志存放地址：',dir)
    return dir
  } catch (e) {
    console.error('获取存储目录失败: ' + e)
    // 最后的备用方案
    return files.cwd() + '/' + subDir
  }
}

/**
 * 确保目录存在
 * @param {string} dirPath 目录路径
 * @returns {boolean} 是否成功创建或已存在
 */
utils.ensureDir = function (dirPath) {
  try {
    if (files.exists(dirPath) && files.isDir(dirPath)) {
      return true
    }

    var dir = new java.io.File(dirPath)
    return dir.mkdirs()
  } catch (e) {
    console.error('创建目录失败: ' + e)
    return false
  }
}

/**
 * 检查是否有悬浮窗权限
 * @returns {boolean} 是否有悬浮窗权限
 */
utils.checkFloatyPermission = function () {
  try {
    // 尝试使用原生方法（如果存在）
    if (typeof floaty !== 'undefined' && floaty.checkPermission) {
      return floaty.checkPermission()
    }

    // 备用方法：使用Android API检查
    let context = context || activity
    if (!context) {
      console.error('无法获取context')
      return false
    }

    // 检查SYSTEM_ALERT_WINDOW权限
    if (android.os.Build.VERSION.SDK_INT >= 23) {
      // Android 6.0+
      return android.provider.Settings.canDrawOverlays(context)
    } else {
      // Android 6.0以下默认授予权限
      return true
    }
  } catch (e) {
    console.error('检查悬浮窗权限时出错: ' + e)
    // 如果出错，假设没有权限
    return false
  }
}

/**
 * 请求悬浮窗权限
 * @returns {boolean} 是否成功发起请求
 */
utils.requestFloatyPermission = function () {
  try {
    // 尝试使用原生方法（如果存在）
    if (typeof floaty !== 'undefined' && floaty.requestPermission) {
      floaty.requestPermission()
      return true
    }

    // 备用方法：使用Android API请求权限
    let context = context || activity
    if (!context) {
      console.error('无法获取context')
      return false
    }

    if (android.os.Build.VERSION.SDK_INT >= 23) {
      // Android 6.0+
      if (!android.provider.Settings.canDrawOverlays(context)) {
        // 创建Intent跳转到悬浮窗权限设置页面
        let intent = new android.content.Intent(android.provider.Settings.ACTION_MANAGE_OVERLAY_PERMISSION, android.net.Uri.parse('package:' + context.getPackageName()))
        intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)

        // 启动Activity
        context.startActivity(intent)
        return true
      }
    }

    // 已有权限或Android 6.0以下
    return true
  } catch (e) {
    console.error('请求悬浮窗权限时出错: ' + e)
    return false
  }
}

/**
 * 检查并请求悬浮窗权限
 * @param {boolean} autoRequest 是否自动请求权限（如果没有）
 * @returns {boolean} 是否有悬浮窗权限
 */
utils.ensureFloatyPermission = function (autoRequest) {
  let hasPermission = this.checkFloatyPermission()

  if (!hasPermission && autoRequest) {
    this.requestFloatyPermission()
    // 注意：权限请求是异步的，这里不能立即返回true
    return false
  }

  return hasPermission
}

/**
 * 尝试解决无障碍服务"已启用但未运行"问题
 * @returns {boolean} 是否成功修复
 */
utils.fixAccessibilityNotRunning = function () {
  try {
    console.log('尝试修复无障碍服务未运行问题...')

    if (!auto.service) {
      // 使用 Promise 处理异步操作
      return new Promise((resolve, reject) => {
        log('无障碍服务未启用，尝试启用...')
        auto.waitFor()

        // 使用 setTimeout 检查服务状态
        setTimeout(() => {
          try {
            let testResult = id('test_nonexistent_id').exists()
            log('无障碍服务已成功启用')
            resolve(true)
          } catch (e) {
            log('启用无障碍服务失败: ' + e)
            reject(e)
          }
        }, 3000)
      })
    }

    // 方法1: 尝试重启无障碍服务
    toast('尝试方法1: 重启无障碍服务')
    auto.service = false
    sleep(1000)
    auto.service = true
    sleep(2000)

    // 检查是否修复
    try {
      let testResult = id('test_nonexistent_id').exists()
      console.log('无障碍服务已修复')
      toast('无障碍服务已修复')
      return true
    } catch (e) {
      if (e.toString().indexOf('无障碍服务已启用但并未运行') != -1) {
        console.log('方法1失败，尝试方法2')

        // 方法2: 尝试使用无障碍设置页面
        toast('尝试方法2: 打开无障碍设置')
        app.startActivity({
          action: 'android.settings.ACCESSIBILITY_SETTINGS',
        })
        toast('请在设置中找到Auto.js，先关闭再重新打开无障碍服务')

        // 等待用户操作
        sleep(5000)

        return false
      }
    }
  } catch (e) {
    console.error('修复无障碍服务出错: ' + e)
    toast('修复无障碍服务出错: ' + e.message)
    return false
  }

  return false
}

/**
 * 返回到主屏幕
 */
utils.returnHome = function () {
  try {
    // 尝试使用Intent方式
    let intent = new android.content.Intent(android.content.Intent.ACTION_MAIN)
    intent.addCategory(android.content.Intent.CATEGORY_HOME)
    intent.setFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(intent)
  } catch (e) {
    // 如果Intent方式失败，使用home()函数
    try {
      home()
    } catch (e2) {
      console.error('返回主屏幕出错: ' + e2)
    }
  }
}

/**
 * 注册悬浮窗实例
 * @param {Object} window 悬浮窗实例
 */
utils.registerFloatyWindow = function (window) {
  if (window) {
    // 检查是否已经注册
    var exists = false
    for (var i = 0; i < utils.floatyWindows.length; i++) {
      if (utils.floatyWindows[i] === window) {
        exists = true
        break
      }
    }

    if (!exists) {
      utils.floatyWindows.push(window)
      console.log('已注册悬浮窗，当前共有 ' + utils.floatyWindows.length + ' 个悬浮窗')
    }
  }
}

/**
 * 注销悬浮窗实例
 * @param {Object} window 悬浮窗实例
 */
utils.unregisterFloatyWindow = function (window) {
  if (window) {
    var index = utils.floatyWindows.indexOf(window)
    if (index !== -1) {
      utils.floatyWindows.splice(index, 1)
      console.log('已注销悬浮窗，当前剩余 ' + utils.floatyWindows.length + ' 个悬浮窗')
    }
  }
}

/**
 * 关闭所有注册的悬浮窗
 */
utils.closeAllFloatyWindows = function () {
  logger.info('正在关闭所有悬浮窗，数量: ' + utils.floatyWindows.length)

  // 复制数组，因为在关闭过程中可能会修改原数组
  var windows = utils.floatyWindows.slice()

  for (var i = 0; i < windows.length; i++) {
    try {
      var window = windows[i]
      if (window && typeof window.close === 'function') {
        window.close()
        logger.info('已关闭悬浮窗 #' + i)
      }
    } catch (e) {
      logger.error('关闭悬浮窗 #' + i + ' 时出错: ' + e)
    }
  }

  // 清空数组
  utils.floatyWindows = []
  logger.info('所有悬浮窗已关闭')
}

// 执行内存回收
utils.performGC = function () {
  runtime.gc()
  logger.info('执行内存回收')
  // toast("执行内存回收");
}

/**
 * 检查图片元素是否包含指定RGB区间的颜色
 * @param {UiObject} element - 要检查的图片元素
 * @param {Object} targetColor - 目标颜色值，格式：{r: number, g: number, b: number}
 * @param {number} threshold - 颜色匹配的阈值（0-255），默认为20
 * @returns {boolean} 是否包含目标颜色
 */
utils.checkImageContainsColor = function (element, targetColor, threshold) {
  if (!element) {
    console.error('元素不存在')
    return false
  }

  threshold = threshold || 20 // 默认阈值为20

  try {
    // 获取元素的位置信息
    var bounds = element.bounds()
    if (!bounds) {
      console.error('无法获取元素位置')
      return false
    }

    // 截取元素区域的图片
    var img = captureScreen()
    if (!img) {
      console.error('截图失败')
      return false
    }

    // 获取元素区域的边界
    var left = bounds.left
    var top = bounds.top
    var right = bounds.right
    var bottom = bounds.bottom

    // 遍历元素区域的所有像素
    for (var x = left; x < right; x++) {
      for (var y = top; y < bottom; y++) {
        var color = images.pixel(img, x, y)

        // 提取RGB分量
        var r = colors.red(color)
        var g = colors.green(color)
        var b = colors.blue(color)

        // 检查是否在阈值范围内
        if (Math.abs(r - targetColor.r) <= threshold && Math.abs(g - targetColor.g) <= threshold && Math.abs(b - targetColor.b) <= threshold) {
          // 找到匹配的颜色，释放资源并返回true
          img.recycle()
          return true
        }
      }
    }

    // 释放图片资源
    img.recycle()
    return false
  } catch (e) {
    console.error('检查图片颜色时出错: ' + e)
    return false
  }
}

/**
 * 检查是否有截屏权限
 * @returns {boolean} 是否有截屏权限
 */
utils.checkCapturePermission = function () {
  // 如果已经确认有权限，直接返回true
  // if (utils.hasCapturePermission) {
  //     return true;
  // }

  try {
    // 尝试进行一次截图测试
    var img = captureScreen()
    if (img) {
      img.recycle()
      utils.hasCapturePermission = true
      return true
    }
    return false
  } catch (e) {
    return false
  }
}

/**
 * 请求截屏权限
 * @returns {Promise} 返回一个Promise，resolve为boolean表示是否成功获取权限
 */
utils.requestCapturePermission = function () {
  return new Promise((resolve, reject) => {
    // 如果已经有权限，直接返回true
    if (utils.hasCapturePermission) {
      resolve(true)
      return
    }

    // 如果正在请求权限，返回false
    if (utils.captureRequestInProgress) {
      console.log('截图权限正在请求中...')
      resolve(false)
      return
    }

    try {
      utils.captureRequestInProgress = true
      // 使用异步方法请求权限
      requestScreenCaptureAsync()
        .then((result) => {
          if (result) {
            utils.hasCapturePermission = true
            console.log('成功获取截图权限')
          } else {
            console.log('用户拒绝了截图权限')
          }
          utils.captureRequestInProgress = false
          resolve(result)
        })
        .catch((e) => {
          utils.captureRequestInProgress = false
          console.error('请求截图权限失败: ' + e)
          reject(e)
        })
    } catch (e) {
      utils.captureRequestInProgress = false
      console.error('发起权限请求失败: ' + e)
      reject(e)
    }
  })
}

/**
 * 确保有截屏权限
 * @returns {boolean} 是否有截屏权限
 */
utils.ensureCapturePermission = function () {
  // 如果已经有权限，直接返回true
  if (utils.hasCapturePermission) {
    return true
  }

  // 如果正在请求权限，返回false
  if (utils.captureRequestInProgress) {
    return false
  }

  // 检查是否已有权限
  if (utils.checkCapturePermission()) {
    return true
  }

  // 尝试请求权限
  return utils.requestCapturePermission()
}

/**
 * 检查元素的状态颜色（通过采样关键点）
 * @param {UiObject} element - 要检查的元素
 * @param {Object} targetColor - 目标颜色值 {r, g, b}
 * @param {number} threshold - 颜色匹配的阈值（0-255），默认为20
 * @returns {boolean} 是否匹配目标颜色
 */
utils.checkElementColorState = function (element, targetColor, threshold) {
  if (!element) {
    console.error('元素不存在')
    return false
  }

  // 首先检查截屏权限
  if (!utils.ensureCapturePermission()) {
    console.error('无法获取截屏权限')
    return false
  }

  threshold = threshold || 20

  try {
    var bounds = element.bounds()
    if (!bounds) {
      console.error('无法获取元素位置')
      return false
    }

    var img = captureScreen()
    if (!img) {
      console.error('截图失败')
      return false
    }

    // 定义采样点位置（相对于元素边界的百分比）
    var samplePoints = [
      { x: 0.5, y: 0.5 }, // 中心点
      { x: 0.2, y: 0.5 }, // 左侧
      { x: 0.2, y: 0.2 }, // 左侧
      { x: 0.2, y: 0.21 }, // 左侧
      { x: 0.3, y: 0.3 }, // 左侧
      { x: 0.3, y: 0.31 }, // 左侧
      { x: 0.4, y: 0.4 }, // 左侧
      { x: 0.6, y: 0.4 }, // 左侧
      { x: 0.8, y: 0.5 }, // 右侧
      { x: 0.5, y: 0.2 }, // 上方
      { x: 0.5, y: 0.8 }, // 下方
    ]

    // 检查采样点的颜色
    var matchCount = 0
    for (var i = 0; i < samplePoints.length; i++) {
      var point = samplePoints[i]
      var x = Math.floor(bounds.left + (bounds.right - bounds.left) * point.x)
      var y = Math.floor(bounds.top + (bounds.bottom - bounds.top) * point.y)

      var color = images.pixel(img, x, y)
      var r = colors.red(color)
      var g = colors.green(color)
      var b = colors.blue(color)

      if (Math.abs(r - targetColor.r) <= threshold && Math.abs(g - targetColor.g) <= threshold && Math.abs(b - targetColor.b) <= threshold) {
        matchCount++
      }
    }

    img.recycle()

    // 如果超过60%的采样点匹配，则认为状态匹配
    return matchCount / samplePoints.length > 0
  } catch (e) {
    console.error('检查元素颜色状态时出错: ' + e)
    return false
  }
}

/**
 * 通过选择器检查元素状态
 * @param {UiSelector} selector - 元素选择器
 * @param {Array} targetRGB - 目标RGB颜色值 [r, g, b]
 * @param {number} threshold - 阈值
 * @returns {boolean|Object|null} 如果成功返回状态对象，失败返回null，无权限返回false
 */
utils.checkElementStateBySelector = function (selector, targetRGB, threshold) {
  try {
    var element = selector.findOne(1000)
    if (!element) {
      console.log('未找到目标元素')
      return null
    }

    // 检查是否有截屏权限
    if (!utils.checkCapturePermission()) {
      console.log('无截屏权限')
      return false
    }

    // 检查元素颜色状态
    return utils.checkElementColorState(
      element,
      {
        r: targetRGB[0],
        g: targetRGB[1],
        b: targetRGB[2],
      },
      threshold
    )
  } catch (e) {
    console.error('检查元素状态失败: ' + e)
    return null
  }
}

/**
 * 检测指定应用是否在前台运行（多种方法组合）
 * @param {string} targetPackageName 目标应用包名
 * @returns {Object} 检测结果对象
 */
utils.checkAppForegroundStatus = function (targetPackageName) {
  try {
    var result = {
      isInForeground: false,
      confidence: 0, // 置信度 0-100
      methods: {},
      currentPackage: 'unknown',
      targetPackage: targetPackageName,
      timestamp: new Date().getTime(),
    }

    // 方法1: 使用 currentPackage() (基础方法)
    try {
      var currentPackage = currentPackage()
      result.currentPackage = currentPackage
      result.methods.method1 = {
        name: 'currentPackage',
        result: currentPackage === targetPackageName,
        value: currentPackage,
      }
      if (currentPackage === targetPackageName) {
        result.confidence += 30
      }
    } catch (e) {
      result.methods.method1 = {
        name: 'currentPackage',
        error: e.toString(),
      }
    }

    // 方法2: 使用 currentActivity() 检查活动
    try {
      var currentActivity = currentActivity()
      result.methods.method2 = {
        name: 'currentActivity',
        result: currentActivity && currentActivity.includes(targetPackageName),
        value: currentActivity,
      }
      if (currentActivity && currentActivity.includes(targetPackageName)) {
        result.confidence += 25
      }
    } catch (e) {
      result.methods.method2 = {
        name: 'currentActivity',
        error: e.toString(),
      }
    }

    // 方法3: 使用系统API获取前台任务
    try {
      var activityManager = context.getSystemService(android.content.Context.ACTIVITY_SERVICE)
      var tasks = activityManager.getRunningTasks(1)
      if (tasks.size() > 0) {
        var topActivity = tasks.get(0).topActivity
        var topPackage = topActivity.getPackageName()
        result.methods.method3 = {
          name: 'getRunningTasks',
          result: topPackage === targetPackageName,
          value: topPackage,
        }
        if (topPackage === targetPackageName) {
          result.confidence += 35
        }
      } else {
        result.methods.method3 = {
          name: 'getRunningTasks',
          result: false,
          value: 'no_tasks',
        }
      }
    } catch (e) {
      result.methods.method3 = {
        name: 'getRunningTasks',
        error: e.toString(),
      }
    }

    // 方法4: 检查应用是否在运行进程列表中
    try {
      var activityManager = context.getSystemService(android.content.Context.ACTIVITY_SERVICE)
      var runningProcesses = activityManager.getRunningAppProcesses()
      var isRunning = false
      var importance = -1

      for (var i = 0; i < runningProcesses.size(); i++) {
        var processInfo = runningProcesses.get(i)
        if (processInfo.processName === targetPackageName) {
          isRunning = true
          importance = processInfo.importance
          break
        }
      }

      result.methods.method4 = {
        name: 'getRunningAppProcesses',
        result: isRunning,
        value: { isRunning: isRunning, importance: importance },
      }
      if (isRunning && importance <= 100) {
        // FOREGROUND_SERVICE = 100
        result.confidence += 10
      }
    } catch (e) {
      result.methods.method4 = {
        name: 'getRunningAppProcesses',
        error: e.toString(),
      }
    }

    // 方法5: 检查目标应用的关键UI元素是否存在
    try {
      var uiElements = []
      var uiCheckResult = false

      // 根据目标应用添加特定的UI元素检查
      if (targetPackageName === 'uni.UNI9BC7DBD') {
        // LINE漫画
        // 检查LINE漫画特有的UI元素
        var elements = ['contentWrapper', 'もっと見る', '読み始める', '続きを読む']

        for (var i = 0; i < elements.length; i++) {
          try {
            if (id(elements[i]).exists() || text(elements[i]).exists()) {
              uiElements.push(elements[i])
            }
          } catch (e) {
            // 忽略单个元素检查错误
          }
        }

        uiCheckResult = uiElements.length > 0
      } else {
        // 通用检查：尝试查找任何可见的UI元素
        try {
          var anyElement = className('android.widget.TextView').findOne(100)
          uiCheckResult = anyElement !== null
        } catch (e) {
          uiCheckResult = false
        }
      }

      result.methods.method5 = {
        name: 'uiElementsCheck',
        result: uiCheckResult,
        value: { foundElements: uiElements, count: uiElements.length },
      }
      if (uiCheckResult) {
        result.confidence += 20
      }
    } catch (e) {
      result.methods.method5 = {
        name: 'uiElementsCheck',
        error: e.toString(),
      }
    }

    // 根据置信度判断是否在前台
    result.isInForeground = result.confidence >= 50 // 置信度阈值设为50

    return result
  } catch (e) {
    console.error('检测应用前台状态时出错: ' + e)
    return {
      isInForeground: false,
      confidence: 0,
      methods: {},
      currentPackage: 'unknown',
      targetPackage: targetPackageName,
      error: e.toString(),
      timestamp: new Date().getTime(),
    }
  }
}

// 更新配置 完全停止程序
utils.handleActivationExpired = function (appConfig, logger) {
  // 更新配置
  appConfig.activation.isActivated = false
  appConfig.activation.lastCheckTime = null
  appConfig.update({ activation: appConfig.activation })

  // 停止脚本
  appConfig.update({
    readComic: {
      running: false,
      isPaused: false,
    },
  })

  // 关闭所有悬浮窗
  utils.closeAllFloatyWindows(logger)

  // 显示提示
  // ui.run(() => {
  //   toast('已停止...')
  // })

  // 停止所有脚本
  engines.stopAll()
}

/**
 * 通用重试函数
 * @param {Function} operation - 要重试的操作函数
 * @param {Object} options - 重试选项
 * @param {number} options.maxRetries - 最大重试次数，默认3次
 * @param {number} options.retryDelay - 重试延迟时间（毫秒），默认2000ms
 * @param {boolean} options.exponentialBackoff - 是否使用指数退避，默认false
 * @param {Function} options.onRetry - 重试时的回调函数
 * @param {Function} options.onError - 最终失败时的回调函数
 * @returns {Promise} 返回操作结果
 */
function retryOperation(operation, options) {
  options = options || {}
  var maxRetries = options.maxRetries !== undefined ? options.maxRetries : 3
  var retryDelay = options.retryDelay !== undefined ? options.retryDelay : 2000
  var exponentialBackoff = options.exponentialBackoff !== undefined ? options.exponentialBackoff : false
  var onRetry = options.onRetry || null
  var onError = options.onError || null

  let retryCount = 0

  function attempt() {
    return new Promise((resolve, reject) => {
      try {
        const result = operation()
        resolve(result)
      } catch (error) {
        retryCount++

        if (retryCount <= maxRetries) {
          const currentDelay = exponentialBackoff ? retryDelay * Math.pow(2, retryCount - 1) : retryDelay

          if (onRetry) {
            onRetry(error, retryCount, currentDelay)
          }

          setTimeout(() => {
            attempt().then(resolve).catch(reject)
          }, currentDelay)
        } else {
          if (onError) {
            onError(error, retryCount)
          }
          reject(error)
        }
      }
    })
  }

  return attempt()
}

/**
 * 网络请求重试函数
 * @param {Function} requestFn - 网络请求函数
 * @param {Object} options - 重试选项
 * @returns {Promise} 返回请求结果
 */
function retryNetworkRequest(requestFn, options) {
  options = options || {}
  const defaultOptions = {
    maxRetries: 3,
    retryDelay: 2000,
    exponentialBackoff: true,
    onRetry: function (error, retryCount, delay) {
      console.log(`网络请求失败，${delay / 1000}秒后进行第${retryCount}次重试: ${error.message}`)
    },
    onError: function (error) {
      logger.error('请求在' + defaultOptions.maxRetries + '次重试后仍然失败: ' + error.message)
      showToast('网络请求最终失败')
    },
  }

  const finalOptions = Object.assign({}, defaultOptions, options)

  return retryOperation(requestFn, finalOptions)
}

// 导出工具模块
utils.retryOperation = retryOperation
utils.retryNetworkRequest = retryNetworkRequest
module.exports = utils
