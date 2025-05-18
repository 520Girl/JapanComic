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

var args = engines.myEngine().execArgv;
console.log("传递的参数:---- " + JSON.stringify(args));

// 监听配置变更
if (typeof events !== 'undefined' && events.broadcast) {
    events.broadcast.on("config_updated", function (updatedConfig) {
        console.log("rhino.js 检测到配置更新:=============== ", updatedConfig)
        appConfig.debugMode = updatedConfig.debugMode;
        appConfig.autoTurnPage = updatedConfig.autoTurnPage;
        appConfig.autoNextChapter = updatedConfig.autoNextChapter;
        appConfig.readSpeed = updatedConfig.readSpeed;
        appConfig.scrollSpeedIndex = updatedConfig.scrollSpeedIndex;
        appConfig.scrollParams = updatedConfig.scrollParams;
        // logger.info("rhino.js 检测到配置更新: " + JSON.stringify({
        //     debugMode: appConfig.debugMode,
        //     autoTurnPage: appConfig.autoTurnPage,
        //     autoNextChapter: appConfig.autoNextChapter,
        //     scrollSpeedIndex: appConfig.scrollSpeedIndex
        // }));
    });
}
console.log("检查并确保无障碍服务正常运行22222222222", appConfig);
console.log("检查并确保无障碍服务正常运行3333", appConfig.scrollParams["1"]);
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

        // 检查后台启动权限（仅在Android 10及以上）
        if (device.sdkInt >= 29) { // Android 10 = API 29
            logger.info("Android 10或更高版本，可能需要特殊权限");
            toast("高版本Android系统中，在后台启动应用可能需要特殊权限");

            // 提示用户手动打开应用
            toast("将在5秒内尝试启动应用，如果失败请手动打开应用");
            sleep(5000);
        }

        // 尝试直接启动
        if (app.launch(packageName)) {
            logger.info("应用启动成功");
            toast("应用启动成功");
            return true;
        }

        // 如果直接启动失败，尝试通过主屏幕图标启动
        home();
        sleep(1000);

        // 查找并点击应用图标
        var appIcon = text(app.getAppName(packageName)).findOne(3000);
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
    sleep(1500);

    //todo 检测是否登录成功 并点击第二个nav
    try {
        var contentWrapperElements = id("contentWrapper").find();
        logger.info("找到 " + contentWrapperElements.size() + " 个contentWrapper元素");

        if (contentWrapperElements.size() >= 4) {
            // 获取第四个元素（索引为3）
            var fourthElement = contentWrapperElements.get(3);
            // 执行点击操作
            logger.info("点击第四个元素");
            fourthElement.clickCenter();
            sleep(1500);  // 点击后等待，让界面反应
        } else {
            logger.error('导航元素发生变化,未达到预期');
            toast("导航元素与预期不符，尝试继续...");
        }

        //todo 点击第二个nav
        sleep(1000);
        if (contentWrapperElements.size() >= 2) {
            var twoElement = contentWrapperElements.get(1);
            logger.info("点击第二个元素(返回首页)");
            twoElement.clickCenter();
            sleep(1000);
        } else {
            logger.error("无法找到足够的导航元素");
            toast("导航元素不足，请手动操作");
        }

        return true;
    } catch (e) {
        logger.error("检测登录过程中出错: " + e);
        toast("检测登录出错: " + e.message);
        return false;
    }
}

//!? 3. 点击漫画进入漫画章节页面
function startWatchComic() {
    // 尝试点击视图
    try {
        var mainView = className("android.view.View").findOne(3000);
        if (mainView) {
            logger.info("点击主视图");
            mainView.clickCenter();
            return true;
        } else {
            logger.warn("未找到主视图元素");
            return false;
        }
    } catch (e) {
        logger.error("点击主视图时出错: " + e);
        return false;
    }
}

//!? 等待函数，带倒计时
function waitWithCountdown(seconds, message) {
    for (let i = seconds; i > 0; i--) {
        if (typeof appConfig.readComic !== 'undefined' && !appConfig.readComic.running) {
            throw new Error("停止命令已收到");
        }
        toast(message + "，" + i + "秒...");
        sleep(1000);
    }
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
        if (continueButton) {
            continueButton.clickCenter();
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
        // 检查是否应该退出
        if (appConfig.readComic.shouldExit) {
            toast("收到退出命令，正在停止滚动");
            return false;
        }

        // 检查是否暂停
        while (appConfig.readComic.isPaused && appConfig.readComic.running && !appConfig.readComic.shouldExit) {
            sleep(500); // 暂停期间每500毫秒检查一次状态
        }

        // 如果退出循环后不再运行，则直接返回
        if (!appConfig.readComic.running ) {
            return false;
        }

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

    return isScrollEnd && appConfig.readComic.running;
}

//!? 点击下一话
function clickNext() {
    try {
        click(250, 250);
        sleep(500);

        var nextButton = text('次の言葉').findOne(5000);
        if (nextButton) {
            nextButton.clickCenter();
        } else {
            toast("未找到'次の言葉'按钮");
        }
    } catch (e) {
        logger.error("点击下一话出错: " + e);
        toast("点击下一话出错");
    }
}


//! 主程序开始执行
try {
    // 确保无障碍服务正常运行
    if (!ensureAccessibilityService()) {
        throw new Error("无障碍服务未正常运行，脚本终止");
    }

    // 启动应用
    var duration = appConfig.scrollParams["0"]
    if (safeStartApp(packageName)) {
        // 给应用足够时间启动,阅读
        sleep(duration.duration); 
        // 检查登录状态
        var isLogin = checkLogin();
        if(!isLogin) {
            logger.info("未登录成功,脚本终止");
            exit();
        }
        sleep(duration.duration); 
        // 进入章节页面
        var isStartReadComic = startWatchComic();
        if(!isStartReadComic) {
            logger.info("未开始阅读,脚本终止");
            exit();
        }
        sleep(duration.duration); 
        // 点击观看漫画
        var newChapter = chapterAndStartLook();
        if(newChapter === 0) {
            logger.info("未获取到章节信息,使用默认章节信息");
        }
        var currentChapter = 1;
        if (newChapter && currentChapter && newChapter > currentChapter) {
            for (var i = 0; i < newChapter && appConfig.readComic.running && !appConfig.readComic.isPaused; i++) {
                toast("开始阅读第" + currentChapter + "话");
                // 等待加载20s 并在页面中提示出来
                waitWithCountdown(5, "正在加载第" + currentChapter + "话");

                // 如果在等待过程中收到退出命令，则直接退出
                if (!appConfig.readComic.running || appConfig.readComic.isPaused) {
                    toast("收到退出命令，正在停止运行");
                    break;
                }

                var scrollSuccess = scrollToBottom();
                sleep(duration.duration); 

                // 如果在滚动过程中收到退出命令，则直接退出
                if (!appConfig.readComic.running || appConfig.readComic.isPaused) {
                    toast("收到退出命令，正在停止运行");
                    break;
                }

                sleep(1000);
                utils.performGC();

                // 根据设置决定是否自动进入下一章
                if (appConfig.autoNextChapter) {
                    clickNext();
                    currentChapter++;
                    // 等待加载新章节
                    waitWithCountdown(5, "正在加载下一话");
                } else {
                    if (!appConfig.readComic.isPaused) {
                        toast("滚动失败或收到停止命令，不再继续阅读");
                        break;
                    }
                    toast("自动下一章已禁用，请手动进入下一章");
                    // 等待用户手动操作
                    waitWithCountdown(30, "等待用户手动操作");
                    break; // 退出循环，不再自动阅读下一章
                }
            }
        } else {
            logger.info("可能未成功进入下一章");
        }
        sleep(duration.duration); 
    } else {
        throw new Error("应用启动失败，请手动启动应用后重试");
    }

    // 执行其余代码
    logger.info("应用启动并登录完成，继续执行...");

} catch (e) {
    logger.error("执行过程中出错: " + e);
}

logger.info("rhino脚本执行完成");
