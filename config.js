/** 问题联系：uglygirlvip@gmail.com GallopingSteak
 * 全局配置文件
 * 负责管理应用的全局设置
 */
//! 1. 定义默认配置
// 初始化日志系统
var logger = null;
var utils = require("./utils.js");


var defaultConfig = {
    readSpeed: 900,            // 默认阅读速度，单位毫秒
    autoScroll: true,         // 自动滚动
    autoNextChapter: true,      // 自动进入下一章
    debugMode: false,           // 调试模式
    scrollSpeedIndex: "1",        // 速度索引
    // moreScrollTop:0, // 记录更多页面滚动到顶部的位置
    //duration 表示等待时间，comicLoading表示漫画加载时间，appStart表示应用启动时间, interval 表示检测数据更改的评率
    scrollParams: { // 这个控制的整个自动化流程的速度
        "0": { duration: 3200, comicLoading: 20000, appStart: 6000, interval: 1500 }, // 慢速 
        "1": { duration: 1000, comicLoading: 10000, appStart: 4000, interval: 800 }, // 中速
        "2": { duration: 500, comicLoading: 5000, appStart: 2000, interval: 200 }   // 快速
    },
    //激活码配置
    activation: {
        isActivated: false,
        lastCheckTime: null, // 上次检查时间
        checkInterval: 5 * 60 * 1000, // 检查间隔，默认5分钟
        // apiKey: "aikmh123", 
        // apiUrl: "http://192.168.31.47:8088"
        apiUrl: "https://linedme.org",
        apiKey: "HSAErHykQ3aFCsZxeYGw"
    },
    // UI设置
    floatyOpacity: 0.8,         // 悬浮窗透明度
    floatyTheme: "#00dc64",        // 悬浮窗主题 (dark/light)
    theme: "#2196F3",        // 悬浮窗主题 (dark/light)
    floatyPosition: {           // 悬浮窗默认位置
        x: -1,                  // -1 表示屏幕右侧
        y: 300                  // 距离屏幕顶部的位置
    },



    // 应用设置
    firstRun: true,             // 首次运行标志
    activationKey: "nidUNL915ub86f2",          // 激活码

    // 权限设置
    permissions: {
        accessibility: true,    // 无障碍服务
        floatingWindow: true,   // 悬浮窗
        screenCapture: true,    // 截图权限
        storage: true          // 存储权限
    },
    // 阅读历史设置
    readHistory: {
        enabled: true,         // 是否启用阅读历史
        maxItems: 100,         // 最大保存历史记录数
        syncWithCloud: false,  // 是否与云端同步
        autoClean: true       // 自动清理超过限制的历史记录
    },
    // 用户信息
    userInfo: {
        userId: "",           // 用户ID
        username: "",         // 用户名
        isLoggedIn: false    // 登录状态
    },

    // 日志系统设置
    logging: {
        enabled: true,           // 是否启用日志系统
        logLevel: "info",        // 日志级别: debug, info, warn, error, none
        logToFile: true,         // 是否将日志写入文件
        logToConsole: true,      // 是否在控制台显示日志
        logToast: true,         // 是否在悬浮窗显示日志
        maxFileSize: 1024 * 1024 * 5, // 单个日志文件最大大小 (1MB)
        maxFiles: 5,             // 最大保留日志文件数
        errorReport: false,      // 是否启用错误上报
        reportUrl: "问题联系：uglygirlvip@gmail.com",           // 错误上报地址
        deviceInfo: true         // 是否收集设备信息
    },
    // 阅读漫画设置
    readComic: {
        running: false,    // 控制是否在阅读（停止按钮控制），停止从头开始
        isPaused: false,   // 控制是否暂停（暂停按钮控制） ，停止可继续
        // shouldExit: false,  // 控制是否退出程序（退出按钮控制），true 为退出，false 为不退出
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
            var mergedConfig = Object.assign({}, userConfig, defaultConfig);

            // 检查版本更新，可能需要更新配置结构
            if (mergedConfig.version !== defaultConfig.version) {
                logger.reportError("error", "配置文件版本不匹配，将进行升级");
                // 这里可以添加版本迁移代码
                mergedConfig.version = defaultConfig.version;
            }
            // logger = utils.initLogger("config", mergedConfig);
            logger = require('./logger.js').initLogger('config', mergedConfig);
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
