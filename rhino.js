"rhino";
// 本文件以rhino引擎(第一代API)模式运行
// This file runs in rhino engine (API v1) mode

// 初始化日志系统
var logger = null;
var config = require("./config.js");
var utils = require("./utils.js");
appConfig = config.appConfig;
logger = utils.initLogger("rhino", appConfig);
var packageName = "uni.UNIE701BEA";
var scrollParams = appConfig.scrollParams[appConfig.scrollSpeedIndex];
console.log('scrollParams',scrollParams);

var args = engines.myEngine().execArgv;

// 添加控制命令的事件监听器

// 监听配置变更     
threads.start(function () {
    let filePath = files.path("./config.json");
    // let lastContent = files.read(filePath);
    // 定期检查配置文件变化
    setInterval(() => {
        try {

            let currentContent = JSON.parse(files.read(filePath));
            if (appConfig.readComic.isPaused != currentContent.readComic.isPaused) {
                appConfig.readComic.running = currentContent.readComic.running;
                appConfig.readComic.shouldExit = currentContent.readComic.shouldExit;
                appConfig.readComic.isPaused = currentContent.readComic.isPaused;
                console.log("newConfig: 是否暂停 ", currentContent.readComic.isPaused);
            }

            // appConfig.debugMode = updatedConfig.debugMode;
            // appConfig.autoScroll = updatedConfig.autoScroll;
            // appConfig.autoNextChapter = updatedConfig.autoNextChapter;
            // appConfig.readSpeed = updatedConfig.readSpeed;
            // appConfig.scrollSpeedIndex = updatedConfig.scrollSpeedIndex;
            // appConfig.scrollParams = updatedConfig.scrollParams;
            // appConfig.readComic.running = updatedConfig.readComic.running;
            // appConfig.readComic.shouldExit = updatedConfig.readComic.shouldExit;
            // appConfig.readComic.isPaused = updatedConfig.readComic.isPaused;
        } catch (e) {
            console.error("读取配置文件失败:", e);
        }
    }, scrollParams.interval);
});
//! 0. 检查并确保无障碍服务正常运行
function ensureAccessibilityService() {
    // 检查无障碍服务是否启用
    if (!auto.service) {
        logger.info("无障碍服务未启用，尝试启用...");

        // 如果无障碍服务未启用，尝试启用它
        auto.waitFor();

        // 等待5秒钟，确保服务有时间启动
        let timeout = 5000;
        let startTime = new Date().getTime();
        while (!auto.service && new Date().getTime() - startTime < timeout) {
            sleep(200);
        }

        // 再次检查无障碍服务状态
        if (!auto.service) {
            // 尝试使用备用方法启动
            try {
                app.startActivity({
                    action: "android.settings.ACCESSIBILITY_SETTINGS"
                });
                toast("请在设置中启用Auto.js的无障碍服务，然后返回应用");
                // 等待用户操作
                sleep(3000);
                return false;
            } catch (e) {
                logger.error("打开无障碍设置失败: " + e);
                toast("打开无障碍设置失败，请手动开启无障碍服务");
                return false;
            }
        } else {
            logger.info("成功启用无障碍服务");
            toast("成功启用无障碍服务");
        }
    } else {
        logger.info("无障碍服务已启用");
    }

    // 在某些设备上，即使auto.service=true，实际服务可能未完全启动
    try {
        // 执行一个简单的无障碍操作，验证服务是否正常工作
        let testResult = id("test_nonexistent_id").exists(); // 这个ID不存在也没关系，我们只是测试无障碍服务
        logger.info("无障碍服务工作正常");
        return true;
    } catch (e) {
        if (e.toString().indexOf("无障碍服务已启用但并未运行") != -1) {
            logger.warn("检测到无障碍服务未正常运行，尝试重启...");
            toast("尝试重启无障碍服务...");

            // 尝试关闭再打开无障碍服务
            try {
                auto.service = false;
                sleep(1000);
                auto.service = true;
                sleep(2000);

                if (!auto.service) {
                    logger.error("重启无障碍服务失败");
                    toast("请手动重启无障碍服务后重试");
                    return false;
                }

                logger.info("无障碍服务已重启");
                toast("无障碍服务已重启");
                return true;
            } catch (e2) {
                logger.error("重启无障碍服务时出错: " + e2);
                toast("请手动重启无障碍服务");
                return false;
            }
        } else {
            logger.error("测试无障碍服务时出错: " + e);
            return false;
        }
    }
}

//!? 1.  打开漫画
function safeStartApp(packageName) {
    try {
        // 先确保无障碍服务正常
        if (!ensureAccessibilityService()) {
            toast("请确保无障碍服务已启用并正常运行");
            return false;
        }

        // 检查控制状态
        if (!checkControlStatus()) return false;

        // 尝试解锁屏幕（如果锁定状态）
        try {
            device.wakeUp();
            sleep(500);
            if (device.isScreenOn()) {
                // 如果屏幕有锁屏密码，可能需要用户手动解锁
                if (device.keepScreenOn(3600 * 1000)) { // 保持屏幕常亮1小时
                    logger.info("已设置屏幕常亮");
                }
            }
        } catch (e) {
            logger.warn("处理屏幕唤醒时出错: " + e);
        }

        // 再次检查控制状态
        if (!checkControlStatus()) return false;

        // 检查后台启动权限（仅在Android 10及以上）
        if (device.sdkInt >= 29) { // Android 10 = API 29
            logger.info("Android 10或更高版本，可能需要特殊权限");
            toast("高版本Android系统中，在后台启动应用可能需要特殊权限");

            // 提示用户手动打开应用
            toast("将在5秒内尝试启动应用，如果失败请手动打开应用");
            sleep(scrollParams.appStart);
            return true;
        }

        // 再次检查控制状态
        if (!checkControlStatus()) return false;

        // 尝试直接启动
        if (app.launch(packageName)) {
            logger.info("应用启动成功");
            toast("应用启动成功");
            return true;
        }

        // 再次检查控制状态
        if (!checkControlStatus()) return false;

        // 如果直接启动失败，尝试通过主屏幕图标启动
        home();
        sleep(1000);

        // 检查控制状态
        if (!checkControlStatus()) return false;

        // 查找并点击应用图标
        var appIcon = text(app.getAppName(packageName)).findOne(scrollParams.appStart);
        if (appIcon) {
            appIcon.clickCenter();
            logger.info("通过图标启动应用");
            toast("通过图标启动应用");
            return true;
        }

        logger.error("无法启动应用，请手动打开应用后再次尝试");
        toast("无法启动应用，请手动打开应用后再次尝试");
        return false;
    } catch (e) {
        logger.error("启动应用出错: " + e);
        toast("启动应用出错: " + e);
        return false;
    }
}

//!? 2. 检测是否登录
function checkLogin() {
    // 确保无障碍服务正常运行
    if (!ensureAccessibilityService()) {
        throw new Error("无障碍服务未正常运行，无法进行自动化操作");
    }

    var timeout = 20000;
    var startTime = new Date().getTime();

    // 等待应用启动并加载内容
    toast("等待应用加载...");
    while (new Date().getTime() - startTime < timeout) {
        // 检查控制状态
        if (!checkControlStatus()) return false;

        if (id("contentWrapper").exists()) {
            logger.info('检测成功');
            break;
        }
        sleep(500);  // 增加等待时间，减少CPU占用
    }

    if (!id("contentWrapper").exists()) {
        toast('未检测成功,请重启尝试')
        logger.error('未检测成功,请重启尝试');
        return false;
    }

    // 休眠短暂时间，确保UI完全加载
    sleep(scrollParams.duration);

    // 检查控制状态
    if (!checkControlStatus()) return false;

    //todo 检测是否登录成功 并点击第二个nav
    try {
        var contentWrapperElements = id("contentWrapper").find();
        logger.info("找到 " + contentWrapperElements.size() + " 个contentWrapper元素",userLogin());

        if (contentWrapperElements.size() >= 4) {
            // 获取第四个元素（索引为3）
            var fourthElement = contentWrapperElements.get(3);
            fourthElement.clickCenter();
            sleep(300)
            // 执行登录查看
            if(!userLogin()){
                toast("用户未登录，停止脚本");
                engines.stopAll(); 
                return false
            }
        } else {
            logger.error('导航元素发生变化,未达到预期');
            return false;
        }

        // 检查控制状态
        if (!checkControlStatus()) return false;

        //todo 点击第二个nav
        sleep(300);
        if (contentWrapperElements.size() >= 2) {
            var twoElement = contentWrapperElements.get(0);
            logger.info("点击第一个元素(返回首页)");
            twoElement.clickCenter();
        } else {
            logger.error("无法找到足够的导航元素");
            return false;
        }

        return true;
    } catch (e) {
        logger.error("检测登录过程中出错: " + e);
        return false;
    }
}

//!? 1.1 用户登录
function userLogin() {
    // 点击登录按钮
    if(textContains('今すぐログイン').exists() || textContains('観光客').exists()){
        return false;
    }
    return true;
}

//!? 3. 点击漫画进入漫画章节页面
function startWatchComic() {
    // 尝试点击视图
    try {
        var mainView = text("もっと見る").findOne(scrollParams.duration);
        if (mainView) {
            logger.info("点击进入最近更新");
            mainView.clickCenter();
            return true;
        } else {
            logger.warn("未找到最近更新元素");
            return false;
        }
    } catch (e) {
        logger.error("点击最近更新时出错: " + e);
        return false;
    }
}

//!? 3.1 滚动最近更新页面
function scrollRecentUpdate() {
    var mainView = text("もっと見る").findOne(scrollParams.duration);
    if (mainView) {
        logger.info("点击进入最近更新");
        mainView.clickCenter();
        return true;
    }
}

//!? 等待函数，带倒计时
function waitWithCountdown(seconds, message) {
    if (!message) {
        message = "等待中";
    }

    logger.info("开始等待: " + message + ", " + seconds + "秒");

    for (var i = seconds; i > 0; i--) {
        // 使用统一的控制状态检查
        if (!checkControlStatus()) return false;

        toast(message + ": " + i + "秒");
        sleep(1000);
    }

    return true;
}

//!? 点击获取章节信息并观看漫画
function chapterAndStartLook() {
    // 使用正则表达式匹配"更新"和"言葉"之间的数字
    var textElements = null;
    var number = 5;

    try {
        textElements = textMatches("更新\\d+言葉").find();
        if (textElements.size() > 0) {
            var element = textElements.get(0);
            var fullText = element.text();
            logger.info("找到元素文本: " + fullText);

            // 使用正则表达式提取数字
            var match = fullText.match(/更新(\d+)言葉/);
            if (match && match[1]) {
                number = parseInt(match[1]);
                logger.info("提取到章节: " + number);
            } else {
                logger.info("未能从文本中提取数字");
            }
        } else {
            logger.info("未找到匹配的文本元素");
        }
    } catch (e) {
        logger.error("获取章节信息出错: " + e);
    } finally {
        // 释放资源
        if (textElements) {
            textElements = null;
        }
        utils.performGC();
    }


    // 点击观看漫画
    try {
        var continueButton = text('続きを読む').findOne(5000);
        var continueButton2 = text('読み始める').findOne(5000);
        if (continueButton) {
            continueButton.clickCenter();
        } else if (continueButton2) {
            continueButton2.clickCenter();
        } else {
            toast("未找到观看按钮");
            return false;
        }
    } catch (e) {
        logger.error("点击按钮出错: " + e);
        return false;
    }
    return number;
}

//!? 滚动页面到底部
function scrollToBottom() {
    // 如果禁用了自动滚动，则提示用户并返回
    if (!appConfig.autoScroll) {
        toast("自动滚动已禁用，请手动滑动屏幕");
        // 等待用户手动滚动一段时间
        sleep(30000);
        return true;
    }

    var isScrollEnd = false;
    var lastY = -1;
    var count = 0;
    var maxScrollAttempts = 30; // 最大滚动尝试次数，防止无限循环

    toast("开始滚动页面...");

    while (!isScrollEnd && count < maxScrollAttempts && appConfig.readComic.running) {
        // 使用统一的控制状态检查
        if (!checkControlStatus()) return false;

        count++;

        // 每5次滚动执行一次GC
        if (count % 5 === 0) {
            utils.performGC();
        }

        // 获取当前屏幕高度
        var deviceHeight = device.height;
        var deviceWidth = device.width;

        // 检查是否出现了特定文本"次の話を引っ張っています~"
        try {
            var endTextFound = textContains("次の話を引っ張っています").exists() ||
                textContains("マスター、もう終わりだ。~").exists();

            if (endTextFound) {
                logger.info("检测到'次の話を引っ張っています~'文本，点击屏幕");
                console.log("检测到目标文本，点击屏幕");

                isScrollEnd = true;
                toast("当前章节结束,已结束滚动");
                break;
            }
        } catch (e) {
            logger.error("检查文本出错: " + e);
        }

        // 记录滚动前的位置，用于后面比较是否到达底部
        var beforeScrollY = lastY;

        // 从屏幕中间靠下位置滑动到中间靠上位置
        try {
            swipe(
                deviceWidth / 2,  // 起始X坐标（屏幕中间）
                deviceHeight * 0.9,  // 起始Y坐标（屏幕下方）
                deviceWidth / 2,  // 结束X坐标（屏幕中间）
                deviceHeight * 0.1,  // 结束Y坐标（屏幕上方）
                appConfig.readSpeed  // 使用配置的滑动时间
            );
        } catch (e) {
            logger.error("滑动操作出错: " + e);
        }

        // 等待滚动动画完成
        sleep(appConfig.readSpeed);

        // 再次检查控制状态
        if (!checkControlStatus()) return false;

        // 获取滚动后的位置
        // 这里使用一个简单的方法来检测是否到达底部：
        // 如果两次滚动的位置相同，则认为已到达底部
        var currentY = -1;
        try {
            // 尝试获取一个可见元素的位置作为参考点
            var anyElement = textMatches(".*").findOnce();
            if (anyElement) {
                currentY = anyElement.bounds().top;
            }
        } catch (e) {
            logger.log("获取元素位置失败: " + e);
        }

        lastY = currentY;
        logger.info("滚动次数: " + count + ", 当前位置: " + currentY + "");

        // 每次滚动后稍作停顿，模拟真实阅读
        sleep(appConfig.readSpeed * 3);
    }

    if (count >= maxScrollAttempts) {
        toast("达到最大滚动次数，停止滚动");
    }

    // 确保在返回前再次检查运行状态
    return isScrollEnd && appConfig.readComic.running;
}

//!? 点击下一话
function clickNext() {
    // 检查控制状态
    if (!checkControlStatus()) return false;

    try {
        click(250, 250);
        sleep(500);

        // 再次检查控制状态
        if (!checkControlStatus()) return false;

        var nextButton = text('次の言葉').findOne(5000);
        if (nextButton) {
            nextButton.clickCenter();
            return true;
        } else {
            toast("未找到'次の言葉'按钮");
            return false;
        }
    } catch (e) {
        logger.error("点击下一话出错: " + e);
        toast("点击下一话出错");
        return false;
    }
}

// 添加一个全局的检查控制命令状态的函数
function checkControlStatus() {
    console.log("checkControlStatus", appConfig.readComic.running, appConfig.readComic.shouldExit, appConfig.readComic.isPaused);
    // 检查是否应该退出
    if (!appConfig.readComic.running || appConfig.readComic.shouldExit) {
        logger.info("检测到停止或退出信号，终止当前操作");
        return false;
    }

    // 检查是否暂停
    if (appConfig.readComic.isPaused) {
        // 显示暂停状态并等待恢复
        toast("已暂停，等待继续...");
        logger.info("操作已暂停，等待继续命令");

        // 等待直到恢复或退出
        while (appConfig.readComic.isPaused && appConfig.readComic.running && !appConfig.readComic.shouldExit) {
            console.log("检测到暂停状态");
            sleep(300); // 暂停期间每300毫秒检查一次状态
        }
        console.log("检测到暂停状态结束，开始继续执行");
        // 检查退出暂停循环的原因
        if (!appConfig.readComic.running || appConfig.readComic.shouldExit) {
            logger.info("在暂停状态收到停止/退出命令，中断操作");
            return false;
        }

        // 恢复后显示提示
        toast("继续操作...");
        logger.info("操作已继续");
    }

    return true;
}

// 使用 AutoJs Pro 兼容的错误处理方式
try {
    // 创建一个自定义的错误处理函数
    var customErrorHandler = function (err) {
        try {
            logger.error("未捕获的异常: " + err + "\n堆栈: " + (err.stack || ""));
        } catch (error) {
            console.error("处理未捕获异常时出错: " + error);
        }
    };

    // 在AutoJs环境中设置全局错误处理
    if (typeof java !== 'undefined') {
        // 设置Java未捕获异常处理器
        var Thread = java.lang.Thread;
        if (Thread.setDefaultUncaughtExceptionHandler) {
            Thread.setDefaultUncaughtExceptionHandler(new java.lang.Thread.UncaughtExceptionHandler({
                uncaughtException: function (thread, ex) {
                    var error = new Error("Java线程异常: " + ex);
                    error.javaException = ex;
                    customErrorHandler(error);
                }
            }));
            logger.info("已设置Java异常处理器");
        }
    }

    // 覆盖默认的错误事件
    if (typeof engines !== 'undefined') {
        engines.on('uncaughtException', function (err) {
            customErrorHandler(err);
        });
        logger.info("已设置脚本错误处理器");
    }
} catch (e) {
    console.error("设置错误处理器时出错: " + e);
}

// 设置全局状态检查
// setInterval(function () {
//     // 周期性检查状态，确保响应控制命令
//     if (!appConfig.readComic.running || appConfig.readComic.shouldExit) {
//         // 如果检测到停止或退出命令，终止所有操作
//         try {
//             // 确保threads对象存在，避免未定义错误
//             if (typeof threads !== 'undefined' && threads.shutDownAll) {
//                 threads.shutDownAll();
//             }

//             // 确保engines对象存在，可以用于停止当前引擎
//             if (appConfig.readComic.shouldExit) {
//                 try {
//                     // 尝试停止当前引擎
//                     if (engines && engines.myEngine) {
//                         var currentEngine = engines.myEngine();
//                         if (currentEngine && currentEngine.forceStop) {
//                             // 记录退出日志
//                             logger.info("正在强制停止当前引擎");
//                             // 延迟一点时间再退出，确保日志能够写入
//                             setTimeout(function () {
//                                 try {
//                                     currentEngine.forceStop();
//                                 } catch (e) {
//                                     // 忽略退出时的错误
//                                 }
//                             }, 500);
//                         } else {
//                             exit(); // 如果无法使用forceStop则使用exit
//                         }
//                     } else {
//                         exit(); // 如果无法获取当前引擎则使用exit
//                     }
//                 } catch (e) {
//                     logger.error("尝试停止引擎失败: " + e);
//                     exit(); // 如果发生异常，仍然尝试使用exit退出
//                 }
//             }
//         } catch (e) {
//             logger.error("终止操作时出错: " + e);
//             // 尝试使用备用方法终止脚本
//             if (appConfig.readComic.shouldExit) {
//                 toast("正在使用备用方法退出...");
//                 exit();
//             }
//         }
//     }
// }, 1000);

//! 主程序开始执行
try {
    // 确保无障碍服务正常运行
    if (!ensureAccessibilityService()) {
        throw new Error("无障碍服务未正常运行，脚本终止");
    }

    // 主循环 - 当需要停止时会跳出此循环
    while (appConfig.readComic.running && !appConfig.readComic.shouldExit) {
        // 启动应用
        var duration = appConfig.scrollParams["0"]
        if (safeStartApp(packageName)) {
            // 检查控制状态
            if (!checkControlStatus()) break;

            // 给应用足够时间启动,阅读
            sleep(duration.duration);

            // 检查登录状态
            if (!checkLogin()) break;

            // 检查控制状态
            if (!checkControlStatus()) break;

            sleep(duration.duration);

            // 进入章节页面
            var isStartReadComic = startWatchComic();
            if (!isStartReadComic) {
                logger.info("未开始阅读,脚本终止");
                break;
            }
            break;

            // 检查控制状态
            if (!checkControlStatus()) break;

            sleep(duration.duration);

            // 点击观看漫画
            var newChapter = chapterAndStartLook();
            if (newChapter === 0) {
                logger.info("未获取到章节信息,使用默认章节信息");
                newChapter = 5; // 默认章节数
            }

            var currentChapter = 1;

            // 章节阅读循环
            while (currentChapter <= newChapter && appConfig.readComic.running && !appConfig.readComic.shouldExit) {
                // 检查控制状态
                if (!checkControlStatus()) break;

                toast("开始阅读第" + currentChapter + "话");

                // 等待加载并在页面中提示
                if (!waitWithCountdown(20, "正在加载第" + currentChapter + "话")) {
                    break; // 如果等待被中断，则跳出循环
                }

                // 检查控制状态
                if (!checkControlStatus()) break;

                // 滚动页面
                var scrollSuccess = scrollToBottom();

                // 检查滚动结果
                if (!scrollSuccess || !appConfig.readComic.running || appConfig.readComic.shouldExit) {
                    logger.info("滚动失败或收到停止/退出命令，中断阅读");
                    break;
                }

                sleep(duration.duration);
                utils.performGC();

                // 根据设置决定是否自动进入下一章
                if (appConfig.autoNextChapter) {
                    if (!clickNext()) {
                        logger.info("点击下一话失败");
                        break;
                    }
                    currentChapter++;
                    // 等待加载新章节
                    if (!waitWithCountdown(5, "正在加载下一话")) {
                        break;
                    }
                } else {
                    toast("自动下一章已禁用，请手动进入下一章");
                    // 等待用户手动操作
                    if (!waitWithCountdown(30, "等待用户手动操作")) {
                        break;
                    }
                    break; // 退出循环，不再自动阅读下一章
                }
            }

            // 如果因为控制命令而退出，这里会执行
            if (!appConfig.readComic.running || appConfig.readComic.shouldExit) {
                logger.info("因控制命令退出章节阅读循环");
                break;
            }

            logger.info("章节阅读完成");
            toast("章节阅读完成");

            // 如果需要循环读取，可以在这里添加代码
            // 例如：重新开始或者退出
            if (appConfig.readComic.isPaused) {
                // 如果是暂停状态，则重新开始
                logger.info("检测到暂停状态，将重新开始");
                appConfig.readComic.isPaused = false;
                continue; // 重新开始
            } else {
                // 否则结束循环
                break;
            }

        } else {
            logger.error("应用启动失败，请手动启动应用后重试");
            break;
        }
    }

    logger.info("主循环已退出");

    // 如果是因为暂停而退出的，可以在这里处理重启逻辑
    if (appConfig.readComic.isPaused && appConfig.readComic.running && !appConfig.readComic.shouldExit) {
        logger.info("检测到暂停状态，等待继续命令");
        toast("已暂停，等待继续...");

        // 等待继续命令
        while (appConfig.readComic.isPaused && appConfig.readComic.running && !appConfig.readComic.shouldExit) {
            sleep(500);
        }

        // 如果收到继续命令且不是停止或退出
        if (appConfig.readComic.running && !appConfig.readComic.shouldExit) {
            logger.info("收到继续命令，将重新开始脚本");
            toast("继续执行，重新开始...");

            // 重新执行脚本
            engines.execScriptFile("./rhino.js", {
                arguments: {
                    action: "restart",
                    config: appConfig
                }
            });

            // 退出当前脚本实例
            exit();
        }
    }

} catch (e) {
    logger.error("执行过程中出错: " + e);
    toast("执行出错: " + e.message);
}

logger.info("rhino脚本执行完成");
