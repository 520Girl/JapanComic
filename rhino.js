"rhino";
/**
 * 作者：GallopingSteak
 * 邮箱：uglygirlvip@gmail.com 
 */
// 本文件以rhino引擎(第一代API)模式运行
// This file runs in rhino engine (API v1) mode

//! 测试逻辑 
// maxScrollAttempts = 30 页面滚动
// maxScrolls  = 5 更新页面滚动
// 初始化日志系统
var config = require("./config.js");
var utils = require("./utils.js");
var loggerFile = require('./logger.js');
var filePath = files.path("./config.json");
var appConfig = null;
appConfig = config.appConfig;
appConfig.update = config.updateConfig;
var logger = null;
var packageName = "uni.UNI9BC7DBD";
var appName = "LINE マンガ";
var packageNamess = currentPackage();
var scrollParams = appConfig.scrollParams[appConfig.scrollSpeedIndex];
var setIntervalLookConfig = null;
var moreWatchNum = 0;

var args = engines.myEngine().execArgv;

// 添加控制命令的事件监听器

// 监听配置变更     
threads.start(function () {
    
    // let currentContent = JSON.parse(files.read(filePath));
    // console.log("currentContent: ", currentContent);
    // 定期检查配置文件变化
    setIntervalLookConfig = setInterval(() => {
        try {
            let currentContent = JSON.parse(files.read(filePath));
            appConfig.readComic.running = currentContent.readComic.running;
            appConfig.readComic.isPaused = currentContent.readComic.isPaused;
            appConfig.activation.isActivated = currentContent.activation.isActivated;
            appConfig.activation.lastCheckTime = currentContent.activation.lastCheckTime;
            appConfig.activation.activationKey = currentContent.activation.activationKey;
            console.log("newConfig: 是否暂停和停止 ", currentContent.readComic.isPaused, currentContent.readComic.running);
        } catch (e) {
            logger.error("读取配置文件失败:", e);
        }
    }, scrollParams.interval);

    var activationCheckInterval = setInterval(() => {
        console.log('activationCheckInterval');
        try {
            // 检查是否应该退出
            // if (!appConfig.readComic.running) {
            //     logger.info("检测到停止信号，清除激活检查定时器");
            //     utils.handleActivationExpired();
            //     clearInterval(activationCheckInterval);
            //     return;
            // }

            // 执行激活状态检查
            if (!checkActivationStatus(appConfig)) {
                logger.warn("激活状态检查失败，停止脚本");
                utils.handleActivationExpired(appConfig);
                clearInterval(activationCheckInterval);
                return;
            }

            logger.info("激活状态检查正常");
        } catch (e) {
            logger.error("激活状态检查出错: " + e);
        }
    }, 5000); // 使用配置中的检查间隔
});
//! 0. 检查并确保无障碍服务正常运行
function ensureAccessibilityService() {
    // 检查无障碍服务是否启用
    if (!auto.service) {
        logger.info("无障碍服务未启用，尝试启用...");

        // 如果无障碍服务未启用，尝试启用它
        auto.waitFor();

        // 等待更长时间，确保服务完全启动
        let timeout = 10000; // 增加到10秒
        let startTime = new Date().getTime();
        let serviceStarted = false;

        while (!serviceStarted && new Date().getTime() - startTime < timeout) {
            if (auto.service) {
                // 再次验证服务是否真正运行
                try {
                    let testResult = id("test_nonexistent_id").exists();
                    serviceStarted = true;
                    logger.info("无障碍服务已完全启动");
                    break;
                } catch (e) {
                    if (e.toString().indexOf("无障碍服务已启用但并未运行") != -1) {
                        logger.info("等待无障碍服务完全启动...");
                        sleep(500);
                        continue;
                    }
                }
            }
            sleep(500);
        }

        if (!serviceStarted) {
            logger.error("无障碍服务启动超时");
            toast("无障碍服务启动超时，请手动检查");
            return false;
        }
    }

    // 再次验证服务状态
    try {
        // 多次尝试验证服务是否真正运行
        for (let i = 0; i < 3; i++) {
            try {
                let testResult = id("test_nonexistent_id").exists();
                logger.info("无障碍服务工作正常");
                return true;
            } catch (e) {
                if (e.toString().indexOf("无障碍服务已启用但并未运行") != -1) {
                    logger.warn("无障碍服务未正常运行，尝试重启...");
                    // 尝试重启服务
                    auto.service = false;
                    sleep(1000);
                    auto.service = true;
                    sleep(2000);
                    continue;
                }
            }
        }

        // 如果多次尝试后仍然失败
        logger.error("无障碍服务无法正常运行");
        toast("无障碍服务无法正常运行，请手动重启服务");
        return false;
    } catch (e) {
        logger.error("检查无障碍服务时出错: " + e);
        return false;
    }
}

//!? 1.  打开漫画
function safeStartApp(packageName) {
    try {
        // 等待一秒让状态为最新状态
        sleep(1000);

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
            sleep(scrollParams.appStart);
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
        try {
            var appIcon = text(appName).findOne(scrollParams.appStart);
            if (appIcon) {
                appIcon.clickCenter();
                logger.info("通过图标启动应用");
                toast("通过图标启动应用");
                sleep(scrollParams.appStart);
                return true;
            } else {
                logger.error("未找到应用图标");
                toast("未找到应用图标，请手动打开应用");
                return false;
            }
        } catch (e) {
            logger.error("查找应用图标时出错: " + e);
            toast("查找应用图标失败，请手动打开应用");
            return false;
        }

        logger.error("无法启动应用，请手动打开应用后再次尝试");
        toast("无法启动应用，请手动打开应用后再次尝试");
        return false;
    } catch (e) {
        logger.error("启动应用出错: " + e);
        return false;
    }
}

//!? 2. 检测是否登录
function checkLogin() {

    var timeout = 20000;
    var startTime = new Date().getTime();

    // 等待应用启动并加载内容

    while (new Date().getTime() - startTime < timeout) {
        // 检查控制状态
        if (!checkControlStatus()) return false;

        if (id("contentWrapper").exists()) {
            logger.info('检测成功，当前为首页，开始检测是否登录');
            break;
        }
        sleep(500);  // 增加等待时间，减少CPU占用
    }
    // id("contentWrapper").waitFor();
    if (!id("contentWrapper").exists()) {
        toast('未检测成功,请重启尝试')
        logger.error('未检测成功,请重启尝试');
        return false;
    }

    // 检查控制状态
    if (!checkControlStatus()) return false;

    //todo 检测是否登录成功 并点击第二个nav
    try {
        var contentWrapperElements = id("contentWrapper").find();
        logger.info("找到 " + contentWrapperElements.size() + " 个contentWrapper元素");

        if (contentWrapperElements.size() >= 4) {
            // 获取第四个元素（索引为3）
            var fourthElement = contentWrapperElements.get(3);
            fourthElement.clickCenter();

            sleep(scrollParams.duration)
            // 执行登录查看
            if (!userLogin()) {
                toast("用户未登录，停止脚本");
                logger.info("用户未登录，停止脚本");
                engines.stopAll();
                ui.finish();
                clearInterval(setIntervalLookConfig);
                return false
            }
        } else {
            logger.error('导航元素发生变化,未达到预期');
            return false;
        }

        // 检查控制状态
        if (!checkControlStatus()) return false;

        //todo 点击第一个nav
        sleep(300);
        if (contentWrapperElements.size() >= 2) {
            var twoElement = contentWrapperElements.get(0);
            logger.info("点击第一个元素(返回首页)");
            twoElement.clickCenter();
            sleep(300);
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
    if (text('今すぐログイン').exists() || text('観光客').exists()) {
        return false;
    }
    return true;
}

//!? 3. 点击漫画进入漫画章节页面
function startWatchComic() {
    // 尝试点击视图
    try {

        // 先滚动到顶部
        const screenInfo = defineScreenGrid();
        const startX = screenInfo.screenWidth / 2;
        const startY = screenInfo.screenHeight * 0.2;
        const endX = screenInfo.screenWidth / 2;
        const endY = screenInfo.screenHeight * 0.8;

        // 向上滑动多次以确保到达顶部
        //  for (let i = 0; i < 3; i++) {
        //      swipe(startX, startY, endX, endY, 500);
        //      sleep(500);
        //  }
        if (!checkControlStatus()) return false;
        // 等待页面稳定
        sleep(1000);
        utils.performGC();

        var mainView = text("もっと見る").findOne(scrollParams.duration);
        if (mainView) {
            logger.info("点击进入最近更新");
            mainView.clickCenter();
            sleep(scrollParams.duration);
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


//!? 3.1.1 定义屏幕就宫格
function defineScreenGrid() {
    // 获取屏幕尺寸
    const screenWidth = device.width;
    const screenHeight = device.height;

    // 计算每个格子的尺寸
    const gridWidth = Math.floor(screenWidth / 3);
    const gridHeight = Math.floor(screenHeight / 3);

    // 定义9个区域的边界和中心点
    const grid = [
        // 第一行
        {
            left: 0,
            top: 0,
            right: gridWidth,
            bottom: gridHeight,
            centerX: gridWidth / 2,
            centerY: gridHeight / 2,
            index: 0
        },
        {
            left: gridWidth,
            top: 0,
            right: gridWidth * 2,
            bottom: gridHeight,
            centerX: gridWidth * 1.5,
            centerY: gridHeight / 2,
            index: 1
        },
        {
            left: gridWidth * 2,
            top: 0,
            right: screenWidth,
            bottom: gridHeight,
            centerX: gridWidth * 2.5,
            centerY: gridHeight / 2,
            index: 2
        },
        // 第二行
        {
            left: 0,
            top: gridHeight,
            right: gridWidth,
            bottom: gridHeight * 2,
            centerX: gridWidth / 2,
            centerY: gridHeight * 1.5,
            index: 3
        },
        {
            left: gridWidth,
            top: gridHeight,
            right: gridWidth * 2,
            bottom: gridHeight * 2,
            centerX: gridWidth * 1.5,
            centerY: gridHeight * 1.5,
            index: 4
        },
        {
            left: gridWidth * 2,
            top: gridHeight,
            right: screenWidth,
            bottom: gridHeight * 2,
            centerX: gridWidth * 2.5,
            centerY: gridHeight * 1.5,
            index: 5
        },
        // 第三行
        {
            left: 0,
            top: gridHeight * 2,
            right: gridWidth,
            bottom: screenHeight,
            centerX: gridWidth / 2,
            centerY: gridHeight * 2.5,
            index: 6
        },
        {
            left: gridWidth,
            top: gridHeight * 2,
            right: gridWidth * 2,
            bottom: screenHeight,
            centerX: gridWidth * 1.5,
            centerY: gridHeight * 2.5,
            index: 7
        },
        {
            left: gridWidth * 2,
            top: gridHeight * 2,
            right: screenWidth,
            bottom: screenHeight,
            centerX: gridWidth * 2.5,
            centerY: gridHeight * 2.5,
            index: 8
        }
    ];

    return {
        grid: grid,
        gridWidth: gridWidth,
        gridHeight: gridHeight,
        screenWidth: screenWidth,
        screenHeight: screenHeight
    };
}
//!? 3.1.2 在指定区域查找并点击元素
function clickGridCenter(gridIndex) {
    if (!checkControlStatus()) return false;
    try {
        const screenInfo = defineScreenGrid();
        const targetGrid = screenInfo.grid[gridIndex];

        if (!targetGrid) {
            logger.error(`无效的网格索引: ${gridIndex}`);
            return false;
        }

        // 添加随机偏移，使点击更自然
        const offsetX = random(-20, 20);
        const offsetY = random(-20, 20);

        // 点击区域中心位置
        logger.info(`点击区域 ${gridIndex} 中心位置: (${targetGrid.centerX}, ${targetGrid.centerY})`);
        click(targetGrid.centerX + offsetX, targetGrid.centerY + offsetY);

        sleep(scrollParams.duration); // 随机等待时间
        return true;
    } catch (e) {
        logger.error(`点击区域 ${gridIndex} 失败: ${e}`);
        return false;
    }
}

//!? 3.1.3 滚动屏幕
function scrollScreen() {
    const screenInfo = defineScreenGrid();

    try {
        // 添加随机偏移
        const startX = screenInfo.screenWidth / 2 + random(-50, 50);
        const startY = screenInfo.screenHeight * 0.8 + random(-50, 50);
        const endX = screenInfo.screenWidth / 2 + random(-50, 50);
        const endY = screenInfo.screenHeight * 0.2 + random(-50, 50);

        swipe(
            startX,
            startY,
            endX,
            endY,
            random(500, 800)
        );

        sleep(1000);
        return true;
    } catch (e) {
        logger.error(`滚动失败: ${e}`);
        return false;
    }
}

//!? 3.1 滚动最近更新页面 并点击元素
function controlGridClick() {
    var scrollCount = 0;
    const maxScrolls = 1; // 最大滚动次数

    while (scrollCount < maxScrolls) {
        // 依次点击每个格子的中心
        for (let i = 2; i < 9; i++) {
            if (!checkControlStatus()) return false;

            logger.info(`尝试点击第 ${i} 个区域中心`);
            if (clickGridCenter(i)) {
                // 如果需要返回上一页
                utils.performGC();
                sleep(scrollParams.duration);
                ComicDetailToWatchComic();
            }
        }

        // 滚动到下一屏
        if (scrollScreen()) {
            scrollCount++;
            logger.info(`完成第 ${scrollCount} 次滚动`);
            sleep(1000);
        } else {
            break;
        }
    }
}

// 使用示例
function example() {
    // 初始化屏幕网格
    const screenInfo = defineScreenGrid();
    logger.info(`屏幕尺寸: ${screenInfo.screenWidth}x${screenInfo.screenHeight}`);
    logger.info(`格子尺寸: ${screenInfo.gridWidth}x${screenInfo.gridHeight}`);

    // 开始控制点击
    controlGridClick();
}
// 检查激活码是否过期
function checkActivationStatus() {
    try {
        // 如果未激活，直接返回false
        if (!appConfig.activation.isActivated) {
            console.log('未激活状态');
            return false;
        }
        // 检查是否过期
        let now = new Date().getTime();

        // 检查是否需要更新状态
        //  && (now - appConfig.activation.lastCheckTime) >= appConfig.activation.checkInterval
        if (appConfig.activation.lastCheckTime) {
            console.log('发送请求检测状态');

            // 发送请求检查激活状态
            let deviceid = device.getAndroidId ? device.getAndroidId() : "testss";
            let facility = "script";
            let timestamp = now;
            let CDKEY = appConfig.activationKey;
            let apikey = 'HSAErHykQ3aFCsZxeYGw';
            let baseUrl = 'https://linedme.org';
            let info = `${device.brand}|${device.model}|${device.width}|${device.product}|${device.sdkInt}|${device.release}|${device.buildId}|${device.buildId}|${device.getAndroidId()}|${appConfig.version}`
    console.log(`info:${info}`)

            let sign = generateActivationSign(CDKEY, deviceid, facility,info, timestamp, apikey);
            let url = `${baseUrl}/index.php/appv1/user/card_use?deviceid=${deviceid}&info=${info}&facility=${facility}&timestamp=${timestamp}&CDKEY=${CDKEY}&sign=${sign}`;

            let res = http.get(url);
            if (res && res.body) {
                let result = JSON.parse(res.body.string());
                console.log('激活状态检查响应:', result);
                if (result.code === 1) { // 假设1表示成功
                    // 更新激活信息
                    appConfig.activation.isActivated = true;
                    appConfig.activation.lastCheckTime = now;
                    appConfig.update({ activation: appConfig.activation });
                    console.log('更新后的激活状态:', JSON.stringify(appConfig.activation));
                } else {
                    // 激活无效
                    console.log('激活无效，调用 handleActivationExpired');
                    utils.handleActivationExpired();
                    return false;
                }
            }
        }

        return true;
    } catch (e) {
        logger.error("检查激活状态出错: " + e);
        return false;
    }
};

//加密
function generateActivationSign(cdkey, deviceid, facility,info, timestamp, apikey) {
    var signStr = `CDKEY=${cdkey}&deviceid=${deviceid}&facility=${facility}&info=${info}&timestamp=${timestamp}${apikey}`;
    return md5(signStr).toUpperCase();
};

function md5(str) {
    var digest = java.security.MessageDigest.getInstance("MD5");
    digest.update(java.lang.String(str).getBytes());
    var messageDigest = digest.digest();
    var hexString = "";
    for (var i = 0; i < messageDigest.length; i++) {
        var t = (messageDigest[i] & 0xff).toString(16);
        if (t.length == 1) hexString += "0";
        hexString += t;
    }
    return hexString;
};

//! 检测是不是在首页 并返回首页 或 指定页面
function checkHomePage(status) {
    try {
        var maxAttempts = 10;
        var attempts = 0;

        while (attempts < maxAttempts) {
            attempts++;
            if (!checkControlStatus()) return false;
            logger.info(`第 ${attempts} 次检查首页状态`);

            var nav = id("contentWrapper").find();
            var emptyTextElement = className("android.widget.TextView").text("").findOne(200);
            var lookButton4 = text("pages/index/index[1]").exists();
            var lookButton = text('読み始める').findOne(200);
            var lookButton2 = text('続きを読む').findOne(200);
            var lookButton3 = text('更新待ち').findOne(200);


            //点击返回首页
            if (status != "detail") {
                if (nav.size() == 4 && !lookButton && !lookButton2 && !emptyTextElement && !lookButton3) {
                    sleep(1000);
                    nav.get(0).clickCenter();
                    logger.info("已确认在首页");
                    return true;
                } else {
                    logger.info("不在首页，执行返回操作");
                    back();
                    sleep(1000); // 等待返回动作完成
                }
            } else {
                if (!lookButton4 || lookButton || lookButton2) {
                    back();
                    logger.info("返回更新页面");
                    sleep(1000); // 等待返回动作完成
                } else {
                    logger.info("当前是更新页");
                    return true;
                }
            }

            if (!checkControlStatus()) return false;


        }

        logger.warn("达到最大尝试次数，退出检查,请关闭应用");
        return false;

    } catch (e) {
        logger.error("检测首页出错: " + e);
        return false;
    }
}

//!? 等待函数，带倒计时
function waitWithCountdown(milliseconds, message) {
    let w = null;
    try {
        if (!message) {
            message = "等待中";
        }

        var seconds = Math.ceil(milliseconds / 1000);
        logger.info(`开始等待: ${message}, ${seconds}秒`);

        // 创建悬浮窗
        w = floaty.window(
            <frame w="*" h="auto" gravity="center">
                <text id="text"
                    textColor="#ffffff"
                    textSize="14sp"
                    gravity="center"
                    bg="#88000000" />
            </frame>
        );

        w.setPosition(device.width / 2 - 250, device.height / 2 - 50);
        w.setSize(500, 100);

        // 倒计时
        for (let i = seconds; i > 0; i--) {
            // 先检查控制状态
            if (!checkControlStatus()) {
                logger.info("检测到停止信号，正常退出倒计时");
                return false;
            }

            try {
                // 更新显示文本
                ui.run(() => {
                    w.text.setText(message + ": " + i + "秒");
                });

                sleep(1000);
            } catch (e) {
                logger.warn("倒计时更新显示出错: " + e);
                return false;
            }
        }

        return true;

    } catch (e) {
        // 区分不同类型的错误
        if (e.toString().includes("ScriptInterruptedException")) {
            logger.info("脚本被中断，正常退出倒计时");
        } else {
            logger.error("waitWithCountdown 执行出错: " + e);
        }
        return false;

    } finally {
        // 确保在任何情况下都关闭悬浮窗
        try {
            if (w != null) {
                w.close();
            }
        } catch (e) {
            logger.warn("关闭悬浮窗失败: " + e);
        }
    }
}

//!? 点击获取章节信息并观看漫画
function chapterAndStartLook() {
    // 使用正则表达式匹配"更新"和"言葉"之间的数字
    var textElements = null;
    var number = 5;

    // 尝试进行颜色检查，但即使失败也继续执行, 两种方式进行对比，一种是text  一种截图
    try {
        var clickLikeOn = text('ic_read_sc_on');
        var clickLikeOff = text('ic_read_sc');
        sleep(2000);
        // 如果找到了元素，才尝试进行颜色检查
        if (clickLikeOn.exists() || clickLikeOff.exists()) {
            if (clickLikeOn.exists()) {
                //当点击过收藏可以继续观看 
                // return false;
            }
        } else {
            if (clickLikeOn && clickLikeOn.exists()) {
                if (utils.ensureCapturePermission()) {
                    var isLike = utils.checkElementStateBySelector(
                        clickLikeOn,
                        [255, 100, 17], // 选中状态的颜色
                        20
                    );
                    if (isLike > 0) {
                        //当点击过收藏可以继续观看 
                        // return false;
                    }
                } else {
                    logger.info("无截屏权限，跳过颜色检查");
                }
            }
        }

    } catch (e) {
        logger.warn("颜色检查失败，继续执行: " + e);
    }

    try {
        textElements = textMatches("更新\\d+話").find();
        if (textElements && textElements.size() > 0) {
            var element = textElements.get(0);
            var fullText = element.text();
            logger.info("找到元素文本: " + fullText);

            // 使用正则表达式提取数字
            var match = fullText.match(/更新(\d+)話/);
            if (match && match[1]) {
                number = parseInt(match[1]);
                logger.info("提取到章节: " + number+'漫画名称');
            } else {
                logger.info("未能从文本中提取数字");
            }
        } else {
            logger.info("未找到匹配的文本元素");
            return false;
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
        var continueButton = text('続きを読む').findOne(500);
        var continueButton2 = text('読み始める').findOne(500);
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
        var endTextFound = textContains("次の話を引っ張っています").exists() ||
        textContains("マスター、もう終わりだ。~").exists() ||
        textContains("主人、すでに最後まで来ましたよ~").exists();
        while(!endTextFound){
            sleep(1000);
        }
        return true;
    }

    var isScrollEnd = false;
    var lastY = -1;
    var count = 0;
    var maxScrollAttempts = 12; // 最大滚动尝试次数，防止无限循环

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
                textContains("マスター、もう終わりだ。~").exists() || textContains("主人、すでに最後まで来ましたよ~").exists();
                

            if (endTextFound) {
                logger.info("检测到'次の話を引っ張っています~'文本，点击屏幕");

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
                deviceWidth / 2 + random(-50, 50),  // 起始X坐标（屏幕中间附近随机）
                deviceHeight * (0.8 + random(-0.05, 0.05)),  // 起始Y坐标（屏幕下方随机）
                deviceWidth / 2 + random(-50, 50),  // 结束X坐标（屏幕中间附近随机）
                deviceHeight * (0.1 + random(-0.05, 0.05)),  // 结束Y坐标（屏幕上方随机）
                appConfig.readSpeed + random(-200, 200)  // 滑动时间随机
            );
        } catch (e) {
            logger.error("滑动操作出错: " + e);
        }

        // 等待滚动动画完成
        sleep(appConfig.readSpeed);

        // 检查是否出现了特定文本"次の話を引っ張っています~"
        try {
            var endTextFound = textContains("次の話を引っ張っています").exists() ||
                textContains("マスター、もう終わりだ。~").exists() ||
                textContains("主人、すでに最後まで来ましたよ~").exists();

            if (endTextFound) {
                logger.info("检测到'次の話を引っ張っています~'文本，点击屏幕");

                isScrollEnd = true;
                toast("当前章节结束,已结束滚动");
                break;
            }
        } catch (e) {
            logger.error("检查文本出错: " + e);
        }

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
        sleep(appConfig.readSpeed);
    }

    if (count >= maxScrollAttempts) {
        toast("滚动结束");
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
        sleep(1000);

        // 再次检查控制状态
        if (!checkControlStatus()) return false;
        // while(!className("android.widget.TextView").text("次の言葉").exists()){
        //     sleep(1000);
        // }
        text("次の言葉").waitFor();
        console.log("找到次の言葉", text("次の言葉").exists());

        var nextButton = text("次の言葉").findOne()
        if (className("android.widget.TextView").text("フォロー").exists()) {
            className("android.widget.TextView").text("フォロー").findOne().clickCenter();
        }
        sleep(500);

        if (nextButton) {
            nextButton.clickCenter();
            sleep(scrollParams.duration);
            return true;
        } else {
            toast("未找到'次の言葉'按钮");
            sleep(scrollParams.duration);
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
    console.log("checkControlStatus", appConfig.readComic.running, appConfig.readComic.isPaused);
    // 检查是否应该退出
    if (!appConfig.readComic.running) {
        logger.info("检测到停止或退出信号，终止当前操作，并等待重新开始");
        main();
        return false;
    }

    // 检查是否暂停
    if (appConfig.readComic.isPaused) {
        // 显示暂停状态并等待恢复
        toast("已暂停，等待继续...");
        logger.info("操作已暂停，等待继续命令");

        // 等待直到恢复或退出
        while (appConfig.readComic.isPaused && appConfig.readComic.running) {
            console.log("检测到暂停状态");
            sleep(500); // 暂停期间每300毫秒检查一次状态
        }
        logger.info("检测到暂停状态结束，开始继续执行");
        // 检查退出暂停循环的原因
        if (!appConfig.readComic.running) {
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
            logger.info("未捕获的异常: " + err + "\n堆栈: " + (err.stack || ""));
        } catch (error) {
            logger.error("处理未捕获异常时出错: " + error);
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
            console.info("已设置Java异常处理器");
        }
    }

    // 覆盖默认的错误事件
    if (typeof engines !== 'undefined' && engines.myEngine) {
        var engine = engines.myEngine();
        if (engine && typeof engine.on === 'function') {
            engine.on('uncaughtException', function (err) {
                customErrorHandler(err);
            });
            console.log("已设置脚本错误处理器");
        }
    }
} catch (e) {
    console.error("设置错误处理器时出错: " + e);
}


//! 组合一下从漫画详情页面到 观看漫画的动作
function ComicDetailToWatchComic() {
    if (!checkControlStatus()) return false;
    var newChapter = chapterAndStartLook();

    if (newChapter === false) {
        checkHomePage('detail')
        return false;
    }

    // if (newChapter >= 5) {
    //     logger.info("未获取到章节信息,使用默认章节信息");
    //     newChapter = 1; // 默认章节数
    // }

    var currentChapter = 1;

    // 章节阅读循环
    while (currentChapter <= newChapter && appConfig.readComic.running) {
        // 检查控制状态
        if (!checkControlStatus()) break;

        toast("开始阅读第" + currentChapter + "话");

        // 等待加载并在页面中提示
        waitWithCountdown(scrollParams.comicLoading, "正在加载第" + currentChapter + "话")

        // 检查控制状态
        if (!checkControlStatus()) break;

        // 滚动页面
        var scrollSuccess = scrollToBottom();
        //当滚动到最后一话时，直接结束
        var endTextFound2 = textContains("主人、すでに最後まで来ましたよ~").exists();
        if (endTextFound2) {
            toast("当前漫画,已观看完毕");
            break;
        }

        // 检查滚动结果
        if (!checkControlStatus()) break;
        // if (!scrollSuccess || !appConfig.readComic.running || appConfig.readComic.shouldExit) {
        //     logger.info("滚动失败或收到停止/退出命令，中断阅读");
        //     break;
        // }

        sleep(scrollParams.duration);
        utils.performGC();

        // 根据设置决定是否自动进入下一章
        if (appConfig.autoNextChapter) {
            if (!clickNext()) {
                logger.info("点击下一话失败");
                break;
            }
            currentChapter++;
            // 等待加载新章节
            // waitWithCountdown(scrollParams.comicLoading, "正在加载下一话")

        } else {
            toast("自动下一章已禁用，请手动进入下一章");

        }
    }
    // 循环结束返回更新页面
    checkHomePage('detail');

}

//! 主函数运行 从 打开app 开始 到 滚动观看漫画
function main() {
    // while (appConfig.readComic.running && !appConfig.readComic.shouldExit) {
    if(!appConfig.readComic.running){
        while(!appConfig.readComic.running){
            sleep(1000);
        }
    }
    
    if (safeStartApp(packageName)) {
        // app 开启之后需要检测是否在首页
        // chapterAndStartLook();
        if (!checkHomePage()) return true;

        // 检测用户是否登录
        if (!checkLogin()) return;

        //点击今日更新 进行观看动漫
        if (!startWatchComic()) return;
        // break;
        controlGridClick();
    }
    // }
}

try {


    //创建日志文件，更新appConfig的值，并初始化logger
    let currentContent = JSON.parse(files.read(filePath));
    appConfig.logging.logLevel = currentContent.logging.logLevel;
    appConfig.logging.enabled = currentContent.logging.enabled;
    appConfig.logging.deviceInfo = currentContent.logging.deviceInfo;
    appConfig.debugMode = currentContent.debugMode;
    appConfig.autoScroll = currentContent.autoScroll;
    appConfig.readSpeed = currentContent.readSpeed;
    appConfig.autoNextChapter = currentContent.autoNextChapter;
    scrollParams = appConfig.scrollParams[appConfig.scrollSpeedIndex]
    logger = loggerFile.initLogger('rhino', appConfig);
    logger.info("开始执行主程序");

    let result = main();
    if (result) {
        logger.info("主程序执行成功");
    } else {
        logger.error("主程序执行失败");
    }
} catch (e) {
    logger.error("执行主程序时发生异常: " + e);
} finally {
    logger.info("rhino脚本执行完成");
}