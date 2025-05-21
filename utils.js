/**
 * 通用工具函数模块
 * 提供权限管理、文件操作等通用功能
 */

var utils = {};

// 保存所有已初始化的日志实例
utils.loggers = {};

// 保存所有需要更新的配置实例
utils.configInstances = [];

/**
 * 管理悬浮窗的全局注册表
 * 用于跟踪所有创建的悬浮窗，确保能够在应用退出时关闭它们
 */
utils.floatyWindows = [];

/**
 * 监听配置更新事件
 * 当配置更新时，自动更新所有已注册的日志实例和配置实例
 */
utils.setupConfigListener = function () {
    if (typeof events !== 'undefined' && events.broadcast) {
        events.broadcast.on("config_updated", function (updatedConfig) {
            console.log("收到配置更新广播");

            // 更新所有已注册的日志实例
            for (var moduleName in utils.loggers) {
                var logger = utils.loggers[moduleName];
                if (logger && logger.options) {
                    logger.options.logToFile = updatedConfig.logging.logToFile;
                    logger.options.debugMode = updatedConfig.debugMode;
                    if (logger.setLogLevel) {
                        logger.setLogLevel(updatedConfig.logging.logLevel);
                    }
                    console.log("已更新 " + moduleName + " 模块的日志配置");
                }
            }

            // 更新所有已注册的配置实例
            for (var i = 0; i < utils.configInstances.length; i++) {
                var configRef = utils.configInstances[i];
                if (configRef && typeof configRef === 'object') {
                    // 更新配置对象的所有属性
                    for (var key in updatedConfig) {
                        if (updatedConfig.hasOwnProperty(key)) {
                            configRef[key] = updatedConfig[key];
                        }
                    }
                    console.log("已更新配置实例 #" + i);
                }
            }
        });
        console.log("已设置配置更新监听器");
    } else {
        console.warn("事件广播系统不可用，无法设置配置监听器");
    }
};

// 尝试设置配置监听器
try {
    utils.setupConfigListener();
} catch (e) {
    console.error("设置配置监听器失败: " + e);
}

/**
 * 注册配置实例以便在配置更新时自动更新
 * @param {Object} configInstance 配置对象实例
 */
utils.registerConfigInstance = function (configInstance) {
    if (configInstance && typeof configInstance === 'object') {
        // 检查是否已经注册过
        var alreadyRegistered = false;
        for (var i = 0; i < utils.configInstances.length; i++) {
            if (utils.configInstances[i] === configInstance) {
                alreadyRegistered = true;
                break;
            }
        }

        if (!alreadyRegistered) {
            utils.configInstances.push(configInstance);
            console.log("已注册配置实例，当前共有 " + utils.configInstances.length + " 个实例");
        }
    }
};

/**
 * 日志系统初始化
 * @param {string} moduleName 模块名称
 * @param {Object} appConfig 应用配置
 * @returns {Object} 日志实例
 */
utils.initLogger = function (moduleName, appConfig) {
    try {
        // 先尝试加载日志模块
        var loggerModule = require("./logger.js");

        // 注册配置实例以便自动更新
        utils.registerConfigInstance(appConfig);

        // 创建日志记录器
        var logger = loggerModule.createLogger(moduleName, {
            logToFile: appConfig.logging.logToFile,
            debugMode: appConfig.debugMode,
            logLevel: appConfig.logging.logLevel,
            logToConsole: appConfig.logging.logToConsole,
            errorReport: appConfig.logging.errorReport,
            reportUrl: appConfig.logging.reportUrl,
            deviceInfo: appConfig.logging.deviceInfo
        });

        // 保存日志实例以便配置更新时更新
        utils.loggers[moduleName] = logger;

        logger.info("日志系统初始化成功");
        logger.info("模块: " + moduleName + ", 日志级别: " + appConfig.logging.logLevel);

        // 设置全局异常捕获
        logger.catchUnhandledErrors();

        return logger;
    } catch (e) {
        console.error("初始化日志系统失败: " + e);
        console.error("错误堆栈: " + e.stack);
        // 创建一个简单的日志对象作为备用
        var fallbackLogger = {
            debug: function (msg) { console.verbose(msg); },
            info: function (msg) { console.info(msg); },
            warn: function (msg) { console.warn(msg); },
            error: function (msg, err) {
                console.error(msg);
                if (err && err.stack) console.error(err.stack);
            }
        };

        return fallbackLogger;
    }
};

/**
 * 请求必要的权限
 * @param {Array} permissions 需要请求的权限数组，默认为存储权限
 * @returns {boolean} 是否获取了所有权限
 */
utils.requestPermissions = function (permissions) {
    // 默认请求存储权限
    permissions = permissions || ["android.permission.WRITE_EXTERNAL_STORAGE"];

    console.log("请求权限: " + permissions.join(", "));
    var granted = false;

    try {
        // 检查是否已有权限
        var hasPermission = true;
        for (var i = 0; i < permissions.length; i++) {
            if (!context.checkPermission(permissions[i], android.os.Process.myUid(), android.os.Process.myPid())) {
                hasPermission = false;
                break;
            }
        }

        if (hasPermission) {
            console.log("已有所需权限");
            return true;
        }

        // 请求权限
        granted = runtime.requestPermissions(permissions);
        console.log("权限请求结果: " + (granted ? "成功" : "失败"));

        if (!granted) {
            toast("需要相关权限才能正常运行");
        }
    } catch (e) {
        console.error("请求权限出错: " + e);
    }

    return granted;
};

/**
 * 检查存储权限
 * @returns {boolean} 是否有存储权限
 */
utils.hasStoragePermission = function () {
    try {
        return files.isDir(files.getSdcardPath());
    } catch (e) {
        return false;
    }
};

/**
 * 获取可靠的存储目录
 * 根据权限情况返回合适的存储目录
 * @param {string} subDir 子目录名称
 * @returns {string} 存储目录路径
 */
utils.getReliableStorageDir = function (subDir) {
    subDir = subDir || "logs";
    var dir;

    try {
        // 首先尝试使用外部存储
        if (utils.hasStoragePermission()) {
            dir = files.getSdcardPath() + "/AutoJs/" + subDir;
        } else {
            // 回退到应用专用目录
            try {
                dir = context.getExternalFilesDir(null).getAbsolutePath() + "/" + subDir;
            } catch (e) {
                dir = context.getFilesDir().getAbsolutePath() + "/" + subDir;
            }
        }

        // 确保目录存在
        var dirFile = new java.io.File(dir);
        if (!dirFile.exists()) {
            dirFile.mkdirs();
        }

        return dir;
    } catch (e) {
        console.error("获取存储目录失败: " + e);
        // 最后的备用方案
        return files.cwd() + "/" + subDir;
    }
};

/**
 * 确保目录存在
 * @param {string} dirPath 目录路径
 * @returns {boolean} 是否成功创建或已存在
 */
utils.ensureDir = function (dirPath) {
    try {
        if (files.exists(dirPath) && files.isDir(dirPath)) {
            return true;
        }

        var dir = new java.io.File(dirPath);
        return dir.mkdirs();
    } catch (e) {
        console.error("创建目录失败: " + e);
        return false;
    }
};

/**
 * 检查是否有悬浮窗权限
 * @returns {boolean} 是否有悬浮窗权限
 */
utils.checkFloatyPermission = function () {
    try {
        // 尝试使用原生方法（如果存在）
        if (typeof floaty !== 'undefined' && floaty.checkPermission) {
            return floaty.checkPermission();
        }

        // 备用方法：使用Android API检查
        let context = context || activity;
        if (!context) {
            console.error("无法获取context");
            return false;
        }

        // 检查SYSTEM_ALERT_WINDOW权限
        if (android.os.Build.VERSION.SDK_INT >= 23) { // Android 6.0+
            return android.provider.Settings.canDrawOverlays(context);
        } else {
            // Android 6.0以下默认授予权限
            return true;
        }
    } catch (e) {
        console.error("检查悬浮窗权限时出错: " + e);
        // 如果出错，假设没有权限
        return false;
    }
};

/**
 * 请求悬浮窗权限
 * @returns {boolean} 是否成功发起请求
 */
utils.requestFloatyPermission = function () {
    try {
        // 尝试使用原生方法（如果存在）
        if (typeof floaty !== 'undefined' && floaty.requestPermission) {
            floaty.requestPermission();
            return true;
        }

        // 备用方法：使用Android API请求权限
        let context = context || activity;
        if (!context) {
            console.error("无法获取context");
            return false;
        }

        if (android.os.Build.VERSION.SDK_INT >= 23) { // Android 6.0+
            if (!android.provider.Settings.canDrawOverlays(context)) {
                // 创建Intent跳转到悬浮窗权限设置页面
                let intent = new android.content.Intent(
                    android.provider.Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    android.net.Uri.parse("package:" + context.getPackageName())
                );
                intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);

                // 启动Activity
                context.startActivity(intent);
                return true;
            }
        }

        // 已有权限或Android 6.0以下
        return true;
    } catch (e) {
        console.error("请求悬浮窗权限时出错: " + e);
        return false;
    }
};

/**
 * 检查并请求悬浮窗权限
 * @param {boolean} autoRequest 是否自动请求权限（如果没有）
 * @returns {boolean} 是否有悬浮窗权限
 */
utils.ensureFloatyPermission = function (autoRequest) {
    let hasPermission = this.checkFloatyPermission();

    if (!hasPermission && autoRequest) {
        this.requestFloatyPermission();
        // 注意：权限请求是异步的，这里不能立即返回true
        return false;
    }

    return hasPermission;
};

/**
 * 尝试解决无障碍服务"已启用但未运行"问题
 * @returns {boolean} 是否成功修复
 */
utils.fixAccessibilityNotRunning = function () {
    try {
        console.log("尝试修复无障碍服务未运行问题...");

        // 方法1: 尝试重启无障碍服务
        toast("尝试方法1: 重启无障碍服务");
        auto.service = false;
        sleep(1000);
        auto.service = true;
        sleep(2000);

        // 检查是否修复
        try {
            let testResult = id("test_nonexistent_id").exists();
            console.log("无障碍服务已修复");
            toast("无障碍服务已修复");
            return true;
        } catch (e) {
            if (e.toString().indexOf("无障碍服务已启用但并未运行") != -1) {
                console.log("方法1失败，尝试方法2");

                // 方法2: 尝试使用无障碍设置页面
                toast("尝试方法2: 打开无障碍设置");
                app.startActivity({
                    action: "android.settings.ACCESSIBILITY_SETTINGS"
                });
                toast("请在设置中找到Auto.js，先关闭再重新打开无障碍服务");

                // 等待用户操作
                sleep(5000);

                return false;
            }
        }
    } catch (e) {
        console.error("修复无障碍服务出错: " + e);
        toast("修复无障碍服务出错: " + e.message);
        return false;
    }

    return false;
};

/**
 * 返回到主屏幕
 */
utils.returnHome = function () {
    try {
        // 尝试使用Intent方式
        let intent = new android.content.Intent(android.content.Intent.ACTION_MAIN);
        intent.addCategory(android.content.Intent.CATEGORY_HOME);
        intent.setFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
    } catch (e) {
        // 如果Intent方式失败，使用home()函数
        try {
            home();
        } catch (e2) {
            console.error("返回主屏幕出错: " + e2);
        }
    }
};

/**
 * 注册悬浮窗实例
 * @param {Object} window 悬浮窗实例
 */
utils.registerFloatyWindow = function (window) {
    if (window) {
        // 检查是否已经注册
        var exists = false;
        for (var i = 0; i < utils.floatyWindows.length; i++) {
            if (utils.floatyWindows[i] === window) {
                exists = true;
                break;
            }
        }

        if (!exists) {
            utils.floatyWindows.push(window);
            console.log("已注册悬浮窗，当前共有 " + utils.floatyWindows.length + " 个悬浮窗");
        }
    }
};

/**
 * 注销悬浮窗实例
 * @param {Object} window 悬浮窗实例
 */
utils.unregisterFloatyWindow = function (window) {
    if (window) {
        var index = utils.floatyWindows.indexOf(window);
        if (index !== -1) {
            utils.floatyWindows.splice(index, 1);
            console.log("已注销悬浮窗，当前剩余 " + utils.floatyWindows.length + " 个悬浮窗");
        }
    }
};

/**
 * 关闭所有注册的悬浮窗
 */
utils.closeAllFloatyWindows = function () {
    console.log("正在关闭所有悬浮窗，数量: " + utils.floatyWindows.length);

    // 复制数组，因为在关闭过程中可能会修改原数组
    var windows = utils.floatyWindows.slice();

    for (var i = 0; i < windows.length; i++) {
        try {
            var window = windows[i];
            if (window && typeof window.close === 'function') {
                window.close();
                console.log("已关闭悬浮窗 #" + i);
            }
        } catch (e) {
            console.error("关闭悬浮窗 #" + i + " 时出错: " + e);
        }
    }

    // 清空数组
    utils.floatyWindows = [];
    console.log("所有悬浮窗已关闭");
};

/**
 * 设置应用退出监听器
 * 确保在应用退出时关闭所有悬浮窗
 */
utils.setupExitListener = function () {
    // 使用事件系统监听退出事件
    if (typeof events !== 'undefined') {
        // 监听脚本退出事件
        events.on('exit', function () {
            console.log("检测到脚本退出事件，正在清理资源");
            utils.closeAllFloatyWindows();
        });

        // 监听自定义退出事件
        if (events.broadcast) {
            events.broadcast.on("script_exit", function () {
                console.log("检测到广播退出事件，正在清理资源");
                utils.closeAllFloatyWindows();
            });
        }

        console.log("已设置退出事件监听器");
    }

    // 设置进程退出钩子（如果可用）
    try {
        if (java.lang.Runtime && java.lang.Runtime.getRuntime()) {
            java.lang.Runtime.getRuntime().addShutdownHook(new java.lang.Thread(function () {
                console.log("检测到JVM关闭钩子，正在清理资源");
                utils.closeAllFloatyWindows();
            }));
            console.log("已设置JVM关闭钩子");
        }
    } catch (e) {
        console.error("设置JVM关闭钩子失败: " + e);
    }
};

// 尝试设置退出监听器
try {
    utils.setupExitListener();
} catch (e) {
    console.error("设置退出监听器失败: " + e);
}


// 执行内存回收
utils.performGC = function () {
    runtime.gc();
    logger.info("执行内存回收");
    // toast("执行内存回收");
}

// 导出工具模块
module.exports = utils; 