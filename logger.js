/**
 * 作者：GallopingSteak
 * 邮箱：uglygirlvip@gmail.com 
 */
/**
 * 漫画阅读器日志系统
 * 负责记录程序运行状态、错误信息，并支持日志文件管理和远程错误诊断
 */

var fs = files;
var utils = require("./utils.js");

// 使用函数式编程方式实现单例
var LoggerManager = (function () {
    var instance = null;

    function createManager() {
        var manager = {
            loggers: new Map(),
            config: null,
            levels: { // debug模式全部显示日志
                "debug": 0,
                "info": 1,
                "warn": 2,
                "error": 3,
                "none": 4
            },
            logDir: utils.getReliableStorageDir("logs"),
            maxFileSize: 1024 * 1024, // 1MB
            maxFiles: 5,

            init: function (config) {
                this.config = config;
                var self = this;
                this.loggers.forEach(function (logger) {
                    self.updateLoggerConfig(logger);
                });
            },

            getLogger: function (name) {
                if (!this.loggers.has(name)) {
                    var logger = this.createLogger(name);
                    this.loggers.set(name, logger);
                }
                return this.loggers.get(name);
            },

            createLogger: function (name) {
                var self = this;
                var logger = {
                    name: name,
                    log: function (message) {
                        if (self.shouldLog('info', self.config.logging && self.config.logging.logLevel || 'info')) {
                            self.outputLog('info', name, message);
                        }
                    },
                    info: function (message) {
                        if (self.shouldLog('info', self.config.logging && self.config.logging.logLevel || 'info')) {
                            self.outputLog('info', name, message);
                        }
                    },
                    error: function (message) {
                        if (self.shouldLog('error', self.config.logging && self.config.logging.logLevel || 'info')) {
                            self.outputLog('error', name, message);
                        }
                    },
                    warn: function (message) {
                        if (self.shouldLog('warn', self.config.logging && self.config.logging.logLevel || 'info')) {
                            self.outputLog('warn', name, message);
                        }
                    },
                    debug: function (message) {
                        if (self.shouldLog('debug', self.config.logging && self.config.logging.logLevel || 'info')) {
                            self.outputLog('debug', name, message);
                        }
                    }
                };
                this.updateLoggerConfig(logger);
                return logger;
            },

            updateLoggerConfig: function (logger) {
                if (!this.config) return;

                var logLevel = this.config.logging && this.config.logging.logLevel || 'info';
                var logToFile = this.config.logging && this.config.logging.logToFile || false;
                var debugMode = this.config.debugMode || false;
                var self = this;

                logger.log = function (message) {
                    if (self.shouldLog('info', logLevel)) {
                        self.outputLog('info', logger.name, message);
                    }
                };

                logger.info = function (message) {
                    if (self.shouldLog('info', logLevel)) {
                        self.outputLog('info', logger.name, message);
                    }
                };

                logger.error = function (message) {
                    if (self.shouldLog('error', logLevel)) {
                        self.outputLog('error', logger.name, message);
                    }
                };

                logger.warn = function (message) {
                    if (self.shouldLog('warn', logLevel)) {
                        self.outputLog('warn', logger.name, message);
                    }
                };

                logger.debug = function (message) {
                    if (self.shouldLog('debug', logLevel)) {
                        self.outputLog('debug', logger.name, message);
                    }
                };
            },

            shouldLog: function (level, configLevel) {
                return this.levels[level] >= this.levels[configLevel];
            },

            outputLog: function (level, name, message) {
                var timestamp = this.formatDate(new Date(), "dd HH:mm:ss.SSS");
                var formattedMessage = "[" + timestamp + "] [" + level.toUpperCase() + "] [" + name + "] " + message;

                switch (level) {
                    case 'error':
                        console.log(formattedMessage);
                        break;
                    case 'warn':
                        console.log(formattedMessage);
                        break;
                    case 'debug':
                        console.log(formattedMessage);
                        break;
                    default:
                        console.log(formattedMessage);
                }

                if (this.config.logging && this.config.logging.logToFile && this.config.debugMode) {
                    this.writeToFile(formattedMessage);
                }
            },

            writeToFile: function (message) {
                try {
                    var dateStr = this.formatDate(new Date(), "yyyy-MM-dd");
                    var logFilePath = this.logDir + "/comic_" + dateStr + ".log";

                    // 确保日志目录存在
                    files.ensureDir(this.logDir);

                    // 追加日志内容
                    files.append(logFilePath, message + "\n");
                    // 检查文件大小并轮换
                    this.checkLogRotation(logFilePath);
                } catch (e) {
                    console.error("写入日志文件失败: " + e);
                }
            },

            checkLogRotation: function (logFilePath) {
                try {
                    // 1. 检查日志文件是否存在
                    if (!files.exists(this.logFilePath)) {
                        return;
                    }

                    // 2. 使用 Java 的 File 类获取文件大小
                    var file = new java.io.File(this.logFilePath);
                    var size = file.length();

                    // 3. 如果文件大小超过限制（默认10MB），执行轮换
                    if (size > this.maxLogSize) {
                        // 4. 创建新的日志文件名（添加时间戳）
                        var timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                        var newPath = this.logFilePath.replace('.log', '_' + timestamp + '.log');

                        // 5. 重命名当前日志文件
                        files.move(this.logFilePath, newPath);

                        // 6. 清理旧的日志文件
                        this.cleanupOldLogs();
                    }
                } catch (e) {
                    console.error("检查日志轮换失败: " + e);
                }
            },

            cleanupOldLogs: function () {
                try {
                    var logFiles = fs.listDir(this.logDir, function (file) {
                        return file.endsWith(".log");
                    });

                    if (logFiles.length > this.maxFiles) {
                        // 按修改时间排序
                        logFiles.sort(function (a, b) {
                            var timeA = fs.getModificationTime(this.logDir + "/" + a);
                            var timeB = fs.getModificationTime(this.logDir + "/" + b);
                            return timeA - timeB;
                        }.bind(this));

                        // 删除最旧的文件
                        for (var i = 0; i < logFiles.length - this.maxFiles; i++) {
                            fs.remove(this.logDir + "/" + logFiles[i]);
                        }
                    }
                } catch (e) {
                    console.error("清理旧日志文件失败: " + e);
                }
            },

            formatDate: function (date, format) {
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
            },

            // 添加导出日志方法
            getLogArchive: function () {
                try {
                    console.info("正在创建日志压缩包...");

                    // 检查日志目录是否存在
                    if (!fs.exists(this.logDir)) {
                        console.warn("日志目录不存在: " + this.logDir);
                        return null;
                    }

                    // 检查日志文件是否存在
                    var logFiles = fs.listDir(this.logDir, function (file) {
                        return file.endsWith(".log");
                    });

                    if (!logFiles || logFiles.length === 0) {
                        console.warn("没有找到日志文件");
                        return null;
                    }

                    // 创建一个临时目录来存放日志文件的副本
                    var tempDir = files.cwd() + "/temp_logs_" + Date.now();
                    files.ensureDir(tempDir);

                    // 复制日志文件到临时目录
                    for (var i = 0; i < logFiles.length; i++) {
                        var srcPath = this.logDir + "/" + logFiles[i];
                        var destPath = tempDir + "/" + logFiles[i];
                        files.copy(srcPath, destPath);
                    }

                    // 创建一个简单的日志摘要文件
                    var summaryPath = tempDir + "/log_summary问题联系：uglygirlvip@gmail.com.txt";
                    var summary = "日志摘要\n";
                    summary += "作者：GallopingSteak\n";
                    summary += "邮箱：uglygirlvip@gmail.com\n";
                    summary += "创建时间: " + this.formatDate(new Date(), "yyyy-MM-dd HH:mm:ss") + "\n";
                    summary += "日志文件数量: " + logFiles.length + "\n";
                    summary += "日志文件列表:\n";
                    for (var i = 0; i < logFiles.length; i++) {
                        summary += "- " + logFiles[i] + "\n";
                    }
                    files.write(summaryPath, summary);

                    // 创建一个目录来存放最终的日志文件
                    var archiveName = "comic_logs_" + this.formatDate(new Date(), "yyyyMMdd_HHmmss");
                    var archiveDir = files.getSdcardPath() + "/Pictures/" + archiveName;
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

                    console.info("日志文件已复制到: " + archiveDir);
                    return archiveDir;
                } catch (e) {
                    console.error("创建日志压缩包失败: " + e);
                    return null;
                }
            },

        };

        return manager;
    }

    return {
        getInstance: function () {
            if (!instance) {
                instance = createManager();
            }
            return instance;
        }
    };
})();

// 导出单例
module.exports = {
    initLogger: function (name, config) {
        var manager = LoggerManager.getInstance();
        manager.init(config);
        return manager.getLogger(name);
    },
    updateConfig: function (config) {
        var manager = LoggerManager.getInstance();
        manager.init(config);
    },
    // 添加导出日志方法到模块导出
    getLogArchive: function () {
        return LoggerManager.getInstance().getLogArchive();
    }
};