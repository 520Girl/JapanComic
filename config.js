/**
 * 全局配置文件
 * 负责管理应用的全局设置
 */
//! 1. 定义默认配置
// 初始化日志系统
var logger = null;
var utils = require("./utils.js");


var defaultConfig = {
    readSpeed: 300,            // 默认阅读速度，单位毫秒
    autoScroll: true,         // 自动滚动
    autoNextChapter: true,      // 自动进入下一章
    debugMode: false,           // 调试模式
    scrollSpeedIndex: "1",        // 速度索引
    //duration 表示等待时间，comicLoading表示漫画加载时间，appStart表示应用启动时间, interval 表示检测数据更改的评率
    scrollParams: { // 这个控制的整个自动化流程的速度
        "0": { duration: 3200, comicLoading: 100000,appStart: 6000, interval: 1500 }, // 慢速 
        "1": { duration: 1000, comicLoading: 50000,appStart: 4000, interval: 800 }, // 中速
        "2": { duration: 500, comicLoading: 5000,appStart: 2000, interval: 200 }   // 快速
    },
    // UI设置
    floatyOpacity: 0.8,         // 悬浮窗透明度
    floatyTheme: "#2196F3",        // 悬浮窗主题 (dark/light)
    theme: "#2196F3",        // 悬浮窗主题 (dark/light)
    floatyPosition: {           // 悬浮窗默认位置
        x: -1,                  // -1 表示屏幕右侧
        y: 300                  // 距离屏幕顶部的位置
    },

    // 高级设置
    useAccessibilityService: true,  // 使用无障碍服务
    tryAlternateMethod: true,       // 尝试备用方法

    // 应用设置
    firstRun: true,             // 首次运行标志
    activationKey: "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiSm9obiIsImFkbWluIjp0cnVlfQ.HyGqUXiIrB2gcSs7o-7ejNFwF2hmgSEMQ-KVMMliltwXkYOh_Mib0GX2kSJZUdqyPrtpaMEIhEY6t24x7MJDNQ",          // 激活码


    // 日志系统设置
    logging: {
        enabled: true,           // 是否启用日志系统
        logLevel: "info",        // 日志级别: debug, info, warn, error, none
        logToFile: true,         // 是否将日志写入文件
        logToConsole: true,      // 是否在控制台显示日志
        logToast: true,         // 是否在悬浮窗显示日志
        maxFileSize: 1024 * 1024, // 单个日志文件最大大小 (1MB)
        maxFiles: 5,             // 最大保留日志文件数
        errorReport: false,      // 是否启用错误上报
        reportUrl: "",           // 错误上报地址
        deviceInfo: true         // 是否收集设备信息
    },
    // 阅读漫画设置
    readComic: {
        running: true, // 是否正在阅读
        isPaused: false, // 是否暂停
        shouldExit: false, // 是否退出
        currentComicId: 1, // 当前漫画ID
        currentChapterId: 1, // 当前章节ID
        currentPage: 1, // 当前页码
        currentPageCount: 1 // 当前页码总数
    },

    // 版本信息
    version: "1.0.0"
};

//! 2. 加载配置文件
function loadConfig() {
    try {
        var configFile = files.path("./config.json");
        if (files.exists(configFile)) {
            var content = files.read(configFile);
            var userConfig = JSON.parse(content);

            // 合并配置，确保新添加的配置项也存在
            var mergedConfig = Object.assign({}, defaultConfig, userConfig);

            // 检查版本更新，可能需要更新配置结构
            if (mergedConfig.version !== defaultConfig.version) {
                logger.reportError("error", "配置文件版本不匹配，将进行升级");
                // 这里可以添加版本迁移代码
                mergedConfig.version = defaultConfig.version;
            }
            logger = utils.initLogger("config", mergedConfig);
            return mergedConfig;
        } else {
            logger.info("配置文件不存在，使用默认配置");
            saveConfig(defaultConfig);
            return defaultConfig;
        }
    } catch (e) {
        logger.error("加载配置文件失败：", e);
        return defaultConfig;
    }
}

//! 3. 保存配置
function saveConfig(configObj) {
    try {
        var configFile = files.path("./config.json");
        files.write(configFile, JSON.stringify(configObj, null, 4));
        appConfig = configObj;

        logger.info("保存配置文件成功", configFile);
        return true;
    } catch (e) {
        logger.error("保存配置文件失败：", e);
        return false;
    }
}

function deepMerge(target, source) {
    for (let key in source) {
        if (source.hasOwnProperty(key)) {
            if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
                // 如果属性是对象且目标也有该属性，递归合并
                deepMerge(target[key], source[key]);
            } else {
                // 否则直接赋值
                target[key] = source[key];
            }
        }
    }
    return target;
}


//! 4. 更新配置
function updateConfig(newConfig) {
    try {
        var targetConfig = deepMerge(appConfig, newConfig);
        saveConfig(targetConfig);
        return true;
    } catch (e) {
        console.error("更新配置失败: " + e);
        return false;
    }
}

//! 5. 重置配置
function resetConfig() {
    try {
        return saveConfig(defaultConfig);
    } catch (e) {
        logger.error("重置配置失败：", e);
        return false;
    }
}


// 加载配置
var appConfig = loadConfig();


module.exports = {
    appConfig: appConfig,
    loadConfig: loadConfig,
    saveConfig: saveConfig,
    updateConfig: updateConfig,
    resetConfig: resetConfig
}
