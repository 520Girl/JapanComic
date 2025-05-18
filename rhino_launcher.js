/**
 * rhino启动器 - 专门用于正确加载rhino.js和相关模块
 */

// 获取传入的参数
var args = engines.myEngine().execArgv;
console.log("rhino启动器收到参数: " + JSON.stringify(args));

try {
    // 记录当前环境
    console.log("当前工作目录: " + files.cwd());
    console.log("当前脚本路径: " + engines.myEngine().getSource());
    
    // 定义模块路径
    var currentDir = files.cwd();
    var configPath = files.join(currentDir, "config.js");
    var utilsPath = files.join(currentDir, "utils.js");
    var rhinoPath = files.join(currentDir, "rhino.js");
    
    console.log("配置文件路径: " + configPath);
    console.log("工具文件路径: " + utilsPath);
    console.log("Rhino脚本路径: " + rhinoPath);
    
    // 检查文件是否存在
    if (!files.exists(configPath)) {
        throw new Error("config.js 不存在: " + configPath);
    }
    if (!files.exists(utilsPath)) {
        throw new Error("utils.js 不存在: " + utilsPath);
    }
    if (!files.exists(rhinoPath)) {
        throw new Error("rhino.js 不存在: " + rhinoPath);
    }
    
    // 加载配置和工具模块
    var config = require(configPath);
    var utils = require(utilsPath);
    
    if (!config || !config.appConfig) {
        throw new Error("配置模块加载失败或配置对象为空");
    }
    
    // 初始化日志
    var appConfig = config.appConfig;
    var logger = utils.initLogger("rhino_launcher", appConfig);
    
    logger.info("模块加载成功，参数: " + JSON.stringify(args));
    
    // 合并传入的参数到配置
    if (args) {
        for (var key in args) {
            if (args.hasOwnProperty(key)) {
                appConfig[key] = args[key];
            }
        }
        logger.info("已合并参数到配置");
    }
    
    // 读取rhino.js的内容
    var rhinoContent = files.read(rhinoPath);
    
    // 移除首行的"rhino"标记
    rhinoContent = rhinoContent.replace(/^"rhino";/, "");
    
    // 将rhino内容包装到函数中
    var rhinoFunction = 
        "function rhinoMain(config, utils, appConfig, logger) {\n" +
        "try {\n" +
        rhinoContent + "\n" +
        "return true;\n" +
        "} catch(e) {\n" +
        "  logger.error('rhino执行出错', e);\n" +
        "  return false;\n" +
        "}\n" +
        "}";
    
    // 执行rhino函数
    eval(rhinoFunction);
    var result = rhinoMain(config, utils, appConfig, logger);
    
    logger.info("rhino执行结果: " + result);
    
    // 发送执行状态
    toast(result ? "脚本执行成功" : "脚本执行失败");
    
} catch (e) {
    console.error("启动器执行失败: " + e);
    console.error("堆栈: " + (e.stack || "无堆栈"));
    
    toast("启动器执行失败: " + e.message);
    
    // 记录错误
    try {
        files.ensureDir("./logs");
        var errorLog = "./logs/launcher_error_" + new Date().getTime() + ".log";
        files.write(errorLog, 
            "错误: " + e + "\n" +
            "堆栈: " + (e.stack || "无堆栈信息") + "\n" +
            "时间: " + new Date() + "\n" +
            "参数: " + JSON.stringify(args)
        );
    } catch (logError) {
        console.error("写入错误日志失败: " + logError);
    }
}

// 返回执行状态
"done"; 