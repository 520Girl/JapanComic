/**
 * 漫画阅读器日志系统
 * 负责记录程序运行状态、错误信息，并支持日志文件管理和远程错误诊断
 */

// 使用AutoJS的文件系统API
var fs = files;
var utils = require("./utils.js");

/**
 * 日志管理器类
 * @param {Object} options 配置选项
 */
function Logger(options) {
    // 获取可靠的日志目录
    var defaultLogDir = utils.getReliableStorageDir("logs");

    this.options = Object.assign({
        // 默认配置
        logLevel: "info",        // 日志级别: debug, info, warn, error, none
        logToFile: true,         // 是否将日志写入文件
        logToConsole: true,      // 是否在控制台显示日志
        maxFileSize: 1024 * 1024, // 单个日志文件最大大小 (1MB)
        maxFiles: 5,             // 最大保留日志文件数
        logDir: defaultLogDir,   // 使用可靠的日志目录
        fileNamePattern: "comic_reader_{date}.log", // 日志文件名模式
        timestampFormat: "yyyy-MM-dd HH:mm:ss.SSS", // 时间戳格式
        errorReport: false,      // 是否启用错误上报
        reportUrl: "",           // 错误上报地址
        deviceInfo: true,        // 是否收集设备信息
        sourceModule: "unknown", // 日志来源模块
        debugMode: true          // 是否启用调试模式
    }, options || {});

    // 日志级别映射
    this.levels = {
        "debug": 0,
        "info": 1,
        "warn": 2,
        "error": 3,
        "none": 100
    };

    // 当前日志级别
    this.currentLevel = this.levels[this.options.logLevel] || this.levels.info;

    // 日志文件路径
    this.logFilePath = null;

    // 初始化日志系统
    this.init();
}

/**
 * 初始化日志系统
 */
Logger.prototype.init = function () {
    // 创建日志目录（如果不存在）
    if (this.options.logToFile && this.options.debugMode) {
        try {

            // 生成当前日志文件名
            this.refreshLogFile();

            // 清理旧日志文件
            this.cleanupOldLogs();

            // 记录初始日志
            this.info("日志系统初始化完成");

            // 记录设备信息
            if (this.options.deviceInfo) {
                this.logDeviceInfo();
            }

            // 在 init 方法中，成功创建目录后添加
            console.log("日志目录的绝对路径: " + new java.io.File(this.options.logDir).getAbsolutePath());
            console.log("当前工作目录: " + files.cwd());
            console.log("外部存储目录: " + files.getSdcardPath());
        } catch (e) {
            console.error("初始化日志系统失败: " + e);
            // 禁用文件日志
            this.options.logToFile = false;
        }
    } else {
        console.log("文件日志已禁用 (logToFile: " + this.options.logToFile + ", debugMode: " + this.options.debugMode + ")");
    }
};

/**
 * 更新日志文件路径
 */
Logger.prototype.refreshLogFile = function () {
    var now = new Date();
    var dateStr = this.formatDate(now, "yyyy-MM-dd");
    var fileName = this.options.fileNamePattern.replace("{date}", dateStr);
    this.logFilePath = this.options.logDir + "/" + fileName;
    console.log("defaultLogDir: 2" + this.logFilePath);
    console.log("日志文件路径: " + this.logFilePath);
};

/**
 * 清理旧日志文件
 */
Logger.prototype.cleanupOldLogs = function () {
    try {
        var logFiles = fs.listDir(this.options.logDir, function (file) {
            return file.endsWith(".log");
        });

        // 如果超过最大文件数，则删除旧文件
        if (logFiles.length > this.options.maxFiles) {
            // 按修改时间排序
            logFiles.sort(function (a, b) {
                var timeA = 0;
                var timeB = 0;

                try {
                    // 方法1: 尝试使用 getModificationTime
                    timeA = fs.getModificationTime(this.options.logDir + "/" + a);
                    timeB = fs.getModificationTime(this.options.logDir + "/" + b);
                } catch (e) {
                    try {
                        // 方法2: 使用 Java File 对象
                        var fileA = new java.io.File(this.options.logDir + "/" + a);
                        var fileB = new java.io.File(this.options.logDir + "/" + b);
                        timeA = fileA.lastModified();
                        timeB = fileB.lastModified();
                    } catch (e2) {
                        // 无法获取修改时间，返回0表示相等
                        return 0;
                    }
                }

                return timeA - timeB;
            }.bind(this));

            // 删除最旧的文件
            for (var i = 0; i < logFiles.length - this.options.maxFiles; i++) {
                var fileToDelete = this.options.logDir + "/" + logFiles[i];
                fs.remove(fileToDelete);
                if (this.currentLevel <= this.levels.debug) {
                    console.log("已删除旧日志文件: " + fileToDelete);
                }
            }
        }
    } catch (e) {
        console.error("清理旧日志文件失败: " + e);
    }
};

/**
 * 检查并轮换日志文件
 */
Logger.prototype.checkRotation = function () {
    if (!this.options.logToFile || !this.logFilePath) return;

    try {
        // 检查日期是否变化
        var now = new Date();
        var dateStr = this.formatDate(now, "yyyy-MM-dd");
        var currentDateLog = this.options.fileNamePattern.replace("{date}", dateStr);
        var currentDatePath = this.options.logDir + "/" + currentDateLog;

        if (this.logFilePath !== currentDatePath) {
            this.refreshLogFile();
            this.info("日志文件已轮换到: " + this.logFilePath);
        }

        // 检查文件大小 - 使用更通用的方法获取文件大小
        if (fs.exists(this.logFilePath)) {
            var fileSize = 0;
            try {
                // 方法1: 尝试使用 getSize
                fileSize = fs.getSize(this.logFilePath);
            } catch (e) {
                try {
                    // 方法2: 尝试使用 size 属性
                    var file = new java.io.File(this.logFilePath);
                    fileSize = file.length();
                } catch (e2) {
                    // 方法3: 读取文件内容来获取大小
                    try {
                        var content = fs.read(this.logFilePath);
                        fileSize = content.length;
                    } catch (e3) {
                        console.error("无法获取文件大小: " + e3);
                    }
                }
            }

            if (fileSize > this.options.maxFileSize) {
                var backupFile = this.logFilePath + "." + now.getTime();
                fs.rename(this.logFilePath, backupFile);
                this.info("日志文件过大，已备份到: " + backupFile);
            }
        }
    } catch (e) {
        console.error("检查日志轮换失败: " + e);
    }
};

/**
 * 记录设备信息
 */
Logger.prototype.logDeviceInfo = function () {
    try {
        var deviceInfo = {
            brand: device.brand,
            model: device.model,
            product: device.product,
            fingerprint: device.fingerprint,
            release: device.release,
            sdkInt: device.sdkInt,
            incremental: device.incremental,
            width: device.width,
            height: device.height,
            buildId: device.buildId,
            broad: device.broad
        };

        this.info("设备信息: " + JSON.stringify(deviceInfo));

        // 记录应用版本信息
        if (app) {
            try {
                // 简化版本 - 只记录可用的信息
                var appInfo = {
                    autojs: "已安装"
                };

                // 尝试获取更多信息
                if (typeof app.getAppName === 'function') {
                    appInfo.name = app.getAppName("org.autojs.autojspro");
                } else {
                    appInfo.name = app.versionName;
                }

                if (typeof app.getVersionName === 'function') {
                    appInfo.versionName = app.getVersionName("org.autojs.autojspro");
                } else {
                    appInfo.versionName = app.autojs.versionName;
                }

                if (typeof app.getVersionCode === 'function') {
                    appInfo.versionCode = app.getVersionCode("org.autojs.autojspro");
                } else {
                    appInfo.versionCode = app.autojs.versionCode;
                }

                this.info("应用信息: " + JSON.stringify(appInfo));
            } catch (e) {
                this.error("获取应用信息失败: " + e);
            }
        }
    } catch (e) {
        this.error("记录设备信息失败: " + e);
    }
};

/**
 * 写入日志到文件
 * @param {string} message 日志消息
 */
Logger.prototype.writeToFile = function (message) {
    if (!this.options.logToFile || !this.logFilePath) return;

    try {
        // 检查日志轮换
        this.checkRotation();

        // 写入日志 - 使用文件流追加内容
        message += "\n"; // 添加换行符

        // 尝试使用不同的方法追加内容
        try {
            // 方法1: 使用 open 和 append 模式
            var fw = files.open(this.logFilePath, "a");
            fw.write(message);
            fw.close();
        } catch (e1) {
            try {
                // 方法2: 使用 append 函数
                files.append(this.logFilePath, message);
            } catch (e2) {
                // 方法3: 最基本的读写方式
                if (!files.exists(this.logFilePath)) {
                    files.write(this.logFilePath, message);
                } else {
                    var content = files.read(this.logFilePath);
                    content += message;
                    files.write(this.logFilePath, content);
                }
            }
        }

        if (fs.exists(this.logFilePath)) {
            console.log("日志文件确实存在: " + this.logFilePath);
            console.log("日志文件大小: " + new java.io.File(this.logFilePath).length() + " 字节");
        }
    } catch (e) {
        console.error("写入日志文件失败: " + e);
    }
};

/**
 * 生成带时间戳的日志消息
 * @param {string} level 日志级别
 * @param {string} message 日志消息
 * @returns {string} 格式化的日志消息
 */
Logger.prototype.formatLogMessage = function (level, message) {
    var timestamp = this.formatDate(new Date(), this.options.timestampFormat);
    return "[" + timestamp + "] [" + level.toUpperCase() + "] [" + this.options.sourceModule + "] " + message;
};

/**
 * 格式化日期
 * @param {Date} date 日期对象
 * @param {string} format 格式字符串
 * @returns {string} 格式化的日期字符串
 */
Logger.prototype.formatDate = function (date, format) {
    var o = {
        "M+": date.getMonth() + 1,
        "d+": date.getDate(),
        "H+": date.getHours(),
        "m+": date.getMinutes(),
        "s+": date.getSeconds(),
        "q+": Math.floor((date.getMonth() + 3) / 3),
        "S": date.getMilliseconds()
    };

    if (/(y+)/.test(format)) {
        format = format.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
    }

    for (var k in o) {
        if (new RegExp("(" + k + ")").test(format)) {
            format = format.replace(
                RegExp.$1,
                RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length)
            );
        }
    }

    return format;
};

/**
 * 上报错误信息
 * @param {string} level 日志级别
 * @param {string} message 日志消息
 */
Logger.prototype.reportError = function (level, message) {
    // 只有启用了错误上报且有URL的情况下才上报
    if (!this.options.errorReport || !this.options.reportUrl || level !== "error") return;

    try {
        var reportData = {
            level: level,
            message: message,
            timestamp: new Date().getTime(),
            sourceModule: this.options.sourceModule
        };

        // 添加设备信息
        if (this.options.deviceInfo) {
            reportData.device = {
                brand: device.brand,
                model: device.model,
                release: device.release,
                sdkInt: device.sdkInt
            };
        }

        // 发送错误报告
        threads.start(function () {
            try {
                var res = http.post(this.options.reportUrl, {
                    contentType: "application/json",
                    body: JSON.stringify(reportData)
                });

                if (res.statusCode === 200) {
                    console.log("错误已成功上报");
                } else {
                    console.error("上报错误失败，状态码: " + res.statusCode);
                }
            } catch (e) {
                console.error("上报错误时发生异常: " + e);
            }
        }.bind(this));
    } catch (e) {
        console.error("准备错误上报数据失败: " + e);
    }
};

/**
 * 记录调试级别日志
 * @param {string} message 日志消息
 */
Logger.prototype.debug = function (message) {
    if (this.currentLevel <= this.levels.debug) {
        if (this.options.logToConsole) {
            console.verbose(message);
        }
        if (this.options.logToFile && this.options.debugMode) {
            this.logToFile("debug", message);
        }
    }
};

/**
 * 记录信息级别日志
 * @param {string} message 日志消息
 */
Logger.prototype.info = function (message) {
    if (this.currentLevel <= this.levels.info) {
        if (this.options.logToConsole) {
            console.info(message);
        }
        if (this.options.logToFile && this.options.debugMode) {
            this.logToFile("info", message);
        }
    }
};

/**
 * 记录警告级别日志
 * @param {string} message 日志消息
 */
Logger.prototype.warn = function (message) {
    if (this.currentLevel <= this.levels.warn) {
        if (this.options.logToConsole) {
            console.warn(message);
        }
        if (this.options.logToFile && this.options.debugMode) {
            this.logToFile("warn", message);
        }
    }
};

/**
 * 记录错误级别日志
 * @param {string} message 日志消息
 * @param {Error} [error] 错误对象
 */
Logger.prototype.error = function (message, error) {
    if (this.currentLevel <= this.levels.error) {
        if (this.options.logToConsole) {
            console.error(message);
            if (error && error.stack) {
                console.error(error.stack);
            }
        }

        if (this.options.logToFile && this.options.debugMode) {
            var fullMessage = message;
            if (error) {
                fullMessage += "\n" + (error.stack || error.toString());
            }
            this.logToFile("error", fullMessage);
        }

        // 如果启用了错误上报，则上报错误
        if (this.options.errorReport && this.options.reportUrl) {
            this.reportError("error", message, error);
        }
    }
};

/**
 * 捕获并记录未处理的异常
 */
Logger.prototype.catchUnhandledErrors = function () {
    var logger = this;

    try {
        if (java.lang.Thread.setDefaultUncaughtExceptionHandler) {
            java.lang.Thread.setDefaultUncaughtExceptionHandler(new java.lang.Thread.UncaughtExceptionHandler({
                uncaughtException: function (thread, ex) {
                    logger.error("未捕获的线程异常: " + ex + " 在线程: " + thread.getName(), ex);
                }
            }));
            logger.info("已设置全局异常处理器");
        }
    } catch (e) {
        logger.error("设置全局异常处理器失败: " + e);
    }
};

/**
 * 改变日志级别
 * @param {string} level 新的日志级别
 */
Logger.prototype.setLogLevel = function (level) {
    if (this.levels[level] !== undefined) {
        this.currentLevel = this.levels[level];
        this.info("日志级别已更改为: " + level);
    }
};

/**
 * 创建日志压缩包
 * @returns {string|null} 压缩包路径或null（如果失败）
 */
Logger.prototype.getLogArchive = function () {
    try {
        this.info("正在创建日志压缩包...");

        // 检查日志目录是否存在
        if (!fs.exists(this.options.logDir)) {
            this.warn("日志目录不存在: " + this.options.logDir);
            return null;
        }

        // 检查日志文件是否存在
        var logFiles = fs.listDir(this.options.logDir);
        if (!logFiles || logFiles.length === 0) {
            this.warn("没有找到日志文件");
            return null;
        }

        // 创建一个临时目录来存放日志文件的副本
        var tempDir = files.cwd() + "/temp_logs_" + Date.now();
        files.ensureDir(tempDir);

        // 复制日志文件到临时目录
        for (var i = 0; i < logFiles.length; i++) {
            var srcPath = this.options.logDir + "/" + logFiles[i];
            var destPath = tempDir + "/" + logFiles[i];
            files.copy(srcPath, destPath);
        }

        // 创建一个简单的日志摘要文件
        var summaryPath = tempDir + "/log_summary.txt";
        var summary = "日志摘要\n";
        summary += "创建时间: " + this.formatDate(new Date(), this.options.timestampFormat) + "\n";
        summary += "设备信息: " + JSON.stringify(this.options.deviceInfo) + "\n";
        summary += "日志文件数量: " + logFiles.length + "\n";
        summary += "日志文件列表:\n";
        for (var i = 0; i < logFiles.length; i++) {
            summary += "- " + logFiles[i] + "\n";
        }
        files.write(summaryPath, summary);

        // 创建一个目录来存放最终的日志文件
        var archiveName = "comic_logs_" + this.formatDate(new Date(), "yyyyMMdd_HHmmss");
        var archiveDir = files.cwd() + "/" + archiveName;
        files.ensureDir(archiveDir);

        // 将所有临时文件复制到最终目录
        var tempFiles = files.listDir(tempDir);
        for (var i = 0; i < tempFiles.length; i++) {
            var srcPath = tempDir + "/" + tempFiles[i];
            var destPath = archiveDir + "/" + tempFiles[i];
            files.copy(srcPath, destPath);
        }

        // 清理临时目录
        files.removeDir(tempDir);

        this.info("日志文件已复制到: " + archiveDir);
        return archiveDir;
    } catch (e) {
        this.error("创建日志压缩包失败: " + e);
        return null;
    }
};

/**
 * 创建一个新的Logger实例
 * @param {string} moduleName 模块名称
 * @param {Object} options 配置选项
 * @returns {Logger} 日志记录器实例
 */
function createLogger(moduleName, options) {
    options = options || {};
    options.sourceModule = moduleName;
    options.fileNamePattern = "comic_" + moduleName + "_{date}.log";
    return new Logger(options);
}

/**
 * 记录日志到文件
 * @param {string} level 日志级别
 * @param {string} message 日志消息
 */
Logger.prototype.logToFile = function (level, message) {
    // 检查是否启用了文件日志和调试模式
    if (!this.options.logToFile || !this.options.debugMode) {
        return;
    }

    try {
        // 检查日志文件是否需要轮换
        this.checkRotation();

        // 格式化日志消息
        var timestamp = this.formatDate(new Date(), this.options.timestampFormat);
        var logEntry = "[" + timestamp + "] [" + level.toUpperCase() + "] [" + this.options.sourceModule + "] " + message + "\n";

        // 写入日志文件
        fs.append(this.logFilePath, logEntry);
    } catch (e) {
        console.error("写入日志文件失败: " + e);
    }
};

// 导出Logger类和创建函数
module.exports = {
    Logger: Logger,
    createLogger: createLogger
}; 