"rhino";
// 本文件以rhino引擎(第一代API)模式运行
// This file runs in rhino engine (API v1) mode

//! 测试逻辑 
// maxScrollAttempts = 30 页面滚动
// maxScrolls  = 5 更新页面滚动
// 初始化日志系统
var logger = null;
var config = require("./config.js");
var utils = require("./utils.js");
appConfig = config.appConfig;
logger = utils.initLogger("rhino", appConfig);
var packageName = "uni.UNIE701BEA";
var scrollParams = appConfig.scrollParams[appConfig.scrollSpeedIndex];
var setIntervalLookConfig = null;
var moreWatchNum = 0;
console.log('scrollParams', scrollParams);

var args = engines.myEngine().execArgv;

// 添加控制命令的事件监听器

// 监听配置变更     
threads.start(function () {
    let filePath = files.path("./config.json");
    // let lastContent = files.read(filePath);
    // 定期检查配置文件变化
    setIntervalLookConfig = setInterval(() => {
        try {

            let currentContent = JSON.parse(files.read(filePath));
            if (appConfig.readComic.isPaused != currentContent.readComic.isPaused) {
                appConfig.readComic.running = currentContent.readComic.running;
                appConfig.readComic.shouldExit = currentContent.readComic.shouldExit;
                appConfig.readComic.isPaused = currentContent.readComic.isPaused;
                appConfig.autoScroll = currentContent.autoScroll;
                appConfig.readSpeed = currentContent.readSpeed;
                console.log("newConfig: 是否暂停 ", currentContent.readComic.isPaused);
            }
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
        var appIcon = text(app.getAppName(packageName)).findOne(scrollParams.appStart);
        if (appIcon) {
            appIcon.clickCenter();
            logger.info("通过图标启动应用");
            toast("通过图标启动应用");
            sleep(scrollParams.appStart);
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

    var timeout = 20000;
    var startTime = new Date().getTime();

    // 等待应用启动并加载内容

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
        logger.info("找到 " + contentWrapperElements.size() + " 个contentWrapper元素");

        if (contentWrapperElements.size() >= 4) {
            // 获取第四个元素（索引为3）
            var fourthElement = contentWrapperElements.get(3);
            fourthElement.clickCenter();

            sleep(scrollParams.duration)
            // 执行登录查看
            if (!userLogin()) {
                toast("用户未登录，停止脚本");
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
    console.log('userLogin', text('今すぐログイン').exists(), text('観光客').exists());
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
        for (let i = 0; i < 9; i++) {
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



//! 检测是不是在首页 并返回首页 或 指定页面
function checkHomePage(status) {
    try {
        var maxAttempts = 5;
        var attempts = 0;

        while (attempts < maxAttempts) {
            attempts++;
            logger.info(`第 ${attempts} 次检查首页状态`);

            var nav = id("contentWrapper").find();
            var emptyTextElement = className("android.widget.TextView").text("").findOne(200);
            var lookButton = text('読み始める').findOne(200);
            var lookButton2 = text('続きを読む').findOne(200);
            console.log("detailPage----------",text("最近の更新").exists());

            //点击返回首页
            if (status != "detail") {
                if (nav.size() == 4 && !lookButton && !lookButton2 && !emptyTextElement) {
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
                if (!text("最近の更新").exists() || lookButton || lookButton2) {
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
                return false;
            }
        }else{
            if (clickLike && clickLike.exists()) {
                if (utils.ensureCapturePermission()) {
                    var isLike = utils.checkElementStateBySelector(
                        clickLike,
                        [255, 100, 17], // 选中状态的颜色
                        20
                    );
                    if(isLike > 0){
                        return false;
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
        sleep(30000);
        return true;
    }

    var isScrollEnd = false;
    var lastY = -1;
    var count = 0;
    var maxScrollAttempts = 5; // 最大滚动尝试次数，防止无限循环

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
        sleep(1000);

        // 再次检查控制状态
        if (!checkControlStatus()) return false;
        // while(!className("android.widget.TextView").text("次の言葉").exists()){
        //     sleep(1000);
        // }

        var nextButton = className("android.widget.TextView").text("次の言葉").waitFor();
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
            sleep(500); // 暂停期间每300毫秒检查一次状态
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

//! 记录阅读历史
function saveReadHistory(comicInfo) {
    if (!appConfig.readHistory.enabled) {
        return;
    }

    try {
        // 读取现有历史记录
        var historyFile = files.path("./history.json");
        var history = [];
        if (files.exists(historyFile)) {
            history = JSON.parse(files.read(historyFile));
        }

        // 添加新记录
        var record = {
            comicId: comicInfo.id || "",
            title: comicInfo.title || "未知标题",
            chapter: comicInfo.chapter || 1,
            timestamp: new Date().getTime(),
            userId: appConfig.userInfo.userId || "",
            username: appConfig.userInfo.username || ""
        };

        // 检查是否已存在相同漫画的记录
        var existingIndex = history.findIndex(item => item.comicId === record.comicId);
        if (existingIndex !== -1) {
            // 更新现有记录
            history[existingIndex] = record;
        } else {
            // 添加新记录
            history.unshift(record);
        }

        // 如果启用了自动清理，保持记录数量在限制内
        if (appConfig.readHistory.autoClean && history.length > appConfig.readHistory.maxItems) {
            history = history.slice(0, appConfig.readHistory.maxItems);
        }

        // 保存历史记录
        files.write(historyFile, JSON.stringify(history, null, 2));
        logger.info("已保存阅读历史");

    } catch (e) {
        logger.error("保存阅读历史失败: " + e);
    }
}

//! 获取漫画信息
function getComicInfo() {
    try {
        var title = "";
        var chapter = 1;
        var id = "";

        // 尝试获取标题
        var titleElement = textMatches(".*").findOne(1000);
        if (titleElement) {
            title = titleElement.text();
        }

        // 尝试获取章节信息
        var chapterMatch = title.match(/第(\d+)话/);
        if (chapterMatch) {
            chapter = parseInt(chapterMatch[1]);
        }

        // 返回漫画信息
        return {
            id: id,
            title: title,
            chapter: chapter
        };
    } catch (e) {
        logger.error("获取漫画信息失败: " + e);
        return {
            id: "",
            title: "未知标题",
            chapter: 1
        };
    }
}

//! 组合一下从漫画详情页面到 观看漫画的动作
function ComicDetailToWatchComic() {
    var newChapter = chapterAndStartLook();
    if(newChapter === false){
        checkHomePage('detail')
        return false;
    }
    
    // 获取并保存漫画信息到历史记录
    var comicInfo = getComicInfo();
    saveReadHistory(comicInfo);
    
    if (newChapter >= 5) {
        logger.info("未获取到章节信息,使用默认章节信息");
        newChapter = 1; // 默认章节数
    }

    var currentChapter = 1;

    // 章节阅读循环
    while (currentChapter <= newChapter && appConfig.readComic.running && !appConfig.readComic.shouldExit) {
        // 检查控制状态
        if (!checkControlStatus()) break;

        toast("开始阅读第" + currentChapter + "话");

        // 等待加载并在页面中提示
        waitWithCountdown(scrollParams.comicLoading, "正在加载第" + currentChapter + "话")

        // 检查控制状态
        if (!checkControlStatus()) break;

        // 滚动页面
        var scrollSuccess = scrollToBottom();

        // 检查滚动结果
        if (!scrollSuccess || !appConfig.readComic.running || appConfig.readComic.shouldExit) {
            logger.info("滚动失败或收到停止/退出命令，中断阅读");
            break;
        }

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
            waitWithCountdown(5000, "正在加载下一话")

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
        if (safeStartApp(packageName)) {
            // app 开启之后需要检测是否在首页
            // chapterAndStartLook();

            if (!checkHomePage()) return true;

            // 检测用户是否登录
            if (!checkLogin()) return ;

            //点击今日更新 进行观看动漫
            if (!startWatchComic()) return;
            // break;

            controlGridClick();
        }
    // }
}
main()
//! 主程序开始执行
// try {
//     // 确保无障碍服务正常运行
//     if (!ensureAccessibilityService()) {
//         throw new Error("无障碍服务未正常运行，脚本终止");
//     }

//     // 主循环 - 当需要停止时会跳出此循环
//     while (appConfig.readComic.running && !appConfig.readComic.shouldExit) {
//         // 启动应用
//         var duration = appConfig.scrollParams["0"]
//         if (safeStartApp(packageName)) {
//             // checkHomePage(2);
//             example();

//             break;
//             // 检查控制状态
//             if (!checkControlStatus()) break;
//             // 给应用足够时间启动,阅读
//             sleep(200);
//             break;
//             // 检查登录状态
//             if (!checkLogin()) break;

//             // 检查控制状态
//             if (!checkControlStatus()) break;

//             sleep(duration.duration);

//             // 进入章节页面
//             var isStartReadComic = startWatchComic();
//             if (!isStartReadComic) {
//                 logger.info("未开始阅读,脚本终止");
//                 break;
//             }
//             break;

//             // 检查控制状态
//             if (!checkControlStatus()) break;

//             sleep(duration.duration);

//             // 点击观看漫画
//             var newChapter = chapterAndStartLook();
//             if (newChapter === 0) {
//                 logger.info("未获取到章节信息,使用默认章节信息");
//                 newChapter = 5; // 默认章节数
//             }

//             var currentChapter = 1;

//             // 章节阅读循环
//             while (currentChapter <= newChapter && appConfig.readComic.running && !appConfig.readComic.shouldExit) {
//                 // 检查控制状态
//                 if (!checkControlStatus()) break;

//                 toast("开始阅读第" + currentChapter + "话");

//                 // 等待加载并在页面中提示
//                 if (!waitWithCountdown(20, "正在加载第" + currentChapter + "话")) {
//                     break; // 如果等待被中断，则跳出循环
//                 }

//                 // 检查控制状态
//                 if (!checkControlStatus()) break;

//                 // 滚动页面
//                 var scrollSuccess = scrollToBottom();

//                 // 检查滚动结果
//                 if (!scrollSuccess || !appConfig.readComic.running || appConfig.readComic.shouldExit) {
//                     logger.info("滚动失败或收到停止/退出命令，中断阅读");
//                     break;
//                 }

//                 sleep(duration.duration);
//                 utils.performGC();

//                 // 根据设置决定是否自动进入下一章
//                 if (appConfig.autoNextChapter) {
//                     if (!clickNext()) {
//                         logger.info("点击下一话失败");
//                         break;
//                     }
//                     currentChapter++;
//                     // 等待加载新章节
//                     if (!waitWithCountdown(5, "正在加载下一话")) {
//                         break;
//                     }
//                 } else {
//                     toast("自动下一章已禁用，请手动进入下一章");
//                     // 等待用户手动操作
//                     if (!waitWithCountdown(30, "等待用户手动操作")) {
//                         break;
//                     }
//                     break; // 退出循环，不再自动阅读下一章
//                 }
//             }

//             // 如果因为控制命令而退出，这里会执行
//             if (!appConfig.readComic.running || appConfig.readComic.shouldExit) {
//                 logger.info("因控制命令退出章节阅读循环");
//                 break;
//             }

//             logger.info("章节阅读完成");
//             toast("章节阅读完成");

//             // 如果需要循环读取，可以在这里添加代码
//             // 例如：重新开始或者退出
//             if (appConfig.readComic.isPaused) {
//                 // 如果是暂停状态，则重新开始
//                 logger.info("检测到暂停状态，将重新开始");
//                 appConfig.readComic.isPaused = false;
//                 continue; // 重新开始
//             } else {
//                 // 否则结束循环
//                 break;
//             }

//         } else {
//             logger.error("应用启动失败，请手动启动应用后重试");
//             break;
//         }
//     }

//     logger.info("主循环已退出");

//     // 如果是因为暂停而退出的，可以在这里处理重启逻辑
//     if (appConfig.readComic.isPaused && appConfig.readComic.running && !appConfig.readComic.shouldExit) {
//         logger.info("检测到暂停状态，等待继续命令");
//         toast("已暂停，等待继续...");

//         // 等待继续命令
//         while (appConfig.readComic.isPaused && appConfig.readComic.running && !appConfig.readComic.shouldExit) {
//             sleep(500);
//         }

//         // 如果收到继续命令且不是停止或退出
//         if (appConfig.readComic.running && !appConfig.readComic.shouldExit) {
//             logger.info("收到继续命令，将重新开始脚本");
//             toast("继续执行，重新开始...");

//             // 重新执行脚本
//             engines.execScriptFile("./rhino.js", {
//                 arguments: {
//                     action: "restart",
//                     config: appConfig
//                 }
//             });

//             // 退出当前脚本实例
//             exit();
//         }
//     }

// } catch (e) {
//     logger.error("执行过程中出错: " + e);
//     toast("执行出错: " + e.message);
// } 

logger.info("rhino脚本执行完成");
