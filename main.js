"ui";

// 加载工具模块
var utils = require("./utils.js");

// 请求必要的权限
utils.requestPermissions();


//! 1. 加载配置和控制器
// 注意: 配置和控制器文件会在执行时返回对象供使用
// 使用 engines.execScriptFile 执行这些文件
var appConfig = null;
var rhinoEngine = null;
var logger = null;
// 跟踪悬浮窗的状态
let floatyWindow = null;
let isFloatyExpanded = false;

// 在文件顶部添加一个全局变量来跟踪悬浮窗的创建者
let floatyCreatedByMain = false;

// 设置界面主题
ui.statusBarColor("#FF0000");
//! 3. 加载配置模块
var config = require("./config.js");
var utils = require("./utils.js");
appConfig = config.appConfig;
appConfig.update = config.updateConfig;

//! 2. 初始化日志系统
logger = utils.initLogger("main", appConfig);


//! 6. 使用 AutoJS 兼容的错误处理，当发生 未被try catch 的异常时，会触发这个事件
try {
    // 原来的方法不兼容，使用更通用的方式
    logger.info("设置全局错误处理程序");


    // 更安全的线程异常处理方式
    try {
        if (java.lang.Thread.setDefaultUncaughtExceptionHandler) {
            logger.info("Java异常处理器API可用，正在设置...");
            java.lang.Thread.setDefaultUncaughtExceptionHandler(new java.lang.Thread.UncaughtExceptionHandler({
                uncaughtException: function (thread, ex) {
                    logger.error("未捕获的异常: " + ex + " 在线程: " + thread.getName(), ex);
                    // 不要在这里关闭悬浮窗，只记录错误
                    toast("检测到错误: " + ex);
                }
            }));
            logger.info("成功设置Java默认异常处理器");
        } else {
            logger.warn("Java异常处理器API不可用，跳过设置");
        }
    } catch (e) {
        logger.error("尝试设置Java异常处理器时出错: ", e);
    }
} catch (e) {
    logger.warn("设置全局错误处理失败", e);
}


//! 7. 开始创建ui 和执行ui的事件
$ui.layout(
    <vertical>
        <appbar bg={appConfig.theme}>
            <toolbar id="toolbar" title="有机会一起睡觉" titleColor="#ffffff" />
        </appbar>

        <frame>
            <vertical>
                <horizontal bg={appConfig.theme} h="50">
                    <vertical layout_weight="1" id="configTabContainer">
                        <button id="configTab" layout_weight="1" textSize="16sp" text="配置" textColor="#ffffff" bg={appConfig.theme} style="Widget.AppCompat.Button.Borderless" />
                        <View id="configIndicator" h="3dp" w="*" bg="#ffffff" />
                    </vertical>
                    <vertical layout_weight="1" id="historyTabContainer">
                        <button id="historyTab" layout_weight="1" textSize="16sp" text="历史" textColor="#cccccc" bg={appConfig.theme} style="Widget.AppCompat.Button.Borderless" />
                        <View id="historyIndicator" h="3dp" w="*" bg={appConfig.theme} />
                    </vertical>
                </horizontal>

                <ScrollView id="contentScroller" h="*" w="*">
                    <frame id="contentContainer" w="*">
                        <vertical id="configPage" padding="16">
                            <card w="*" h="80" margin="8" cardCornerRadius="8" cardElevation="2">
                                <horizontal padding="16" gravity="center_vertical">
                                    <img src="@drawable/ic_autorenew_black_48dp" w="40" h="40" tint="#FF5722" />
                                    <text text="有机会一起睡觉" textSize="18sp" textColor="#333333" marginLeft="16" />
                                </horizontal>
                            </card>

                            <card margin="8" cardCornerRadius="8" cardElevation="2">
                                <vertical padding="16">
                                    <text text="激活码：" textSize="16sp" />
                                    <input id="activationCode" hint="请输入激活码" text={appConfig.activationKey} />
                                </vertical>
                            </card>

                            <card margin="8" cardCornerRadius="8" cardElevation="2">
                                <vertical padding="16">
                                    <text text="阅读设置" textSize="16sp" />
                                    <checkbox id="autoScroll" text="自动滚动" checked={appConfig.autoScroll} />
                                    <checkbox id="autoNextChapter" text="自动下一章" checked={appConfig.autoNextChapter} />
                                    <text text="流程速度" textSize="16sp" />
                                    <spinner id="scrollSpeed" entries="慢速|中速|快速" selected={appConfig.scrollParams[appConfig.scrollSpeedIndex]} />
                                </vertical>
                            </card>

                            <button id="startButton" text="开始运行" textColor="#ffffff" bg={appConfig.theme} margin="16" />
                        </vertical>

                        <vertical id="historyPage" padding="16" visibility="gone">
                            <text text="漫画阅读历史" textSize="18sp" textColor={appConfig.theme} gravity="center" padding="8" />
                            <list id="historyList">
                                <card w="*" h="80" margin="8" cardCornerRadius="8" cardElevation="2">
                                    <horizontal gravity="center_vertical" padding="16">
                                        <vertical layout_weight="1">
                                            <text id="comicTitle" text="{{this.title}}" textSize="16sp" maxLines="1" ellipsize="end" />
                                            <text id="readTime" text="{{this.time}}" textSize="14sp" textColor="#999999" />
                                        </vertical>
                                        <text text="继续阅读" textColor={appConfig.theme} />
                                    </horizontal>
                                </card>
                            </list>
                        </vertical>
                    </frame>
                </ScrollView>
            </vertical>
        </frame>
    </vertical>
);

//todo 7.1. 设置标签页切换
$ui.configTab.on("click", () => {
    $ui.configPage.attr("visibility", "visible");
    $ui.historyPage.attr("visibility", "gone");
    $ui.configTab.attr("textColor", "#ffffff");
    $ui.historyTab.attr("textColor", "#cccccc");
    $ui.configIndicator.attr("bg", "#ffffff");
    $ui.historyIndicator.attr("bg", "#2196F3");
});

$ui.historyTab.on("click", () => {
    $ui.configPage.attr("visibility", "gone");
    $ui.historyPage.attr("visibility", "visible");
    $ui.configTab.attr("textColor", "#cccccc");
    $ui.historyTab.attr("textColor", "#ffffff");
    $ui.configIndicator.attr("bg", "#2196F3");
    $ui.historyIndicator.attr("bg", "#ffffff");
});
//todo 7.2. 设置激活按钮点击事件
$ui.startButton.on("click", () => {
    // 保存当前配置
    appConfig.activationKey = $ui.activationCode.getText().toString();
    appConfig.autoScroll = $ui.autoScroll.isChecked();
    appConfig.autoNextChapter = $ui.autoNextChapter.isChecked();
    appConfig.scrollParams[appConfig.scrollSpeedIndex] = $ui.scrollSpeed.getSelectedItemPosition();

    // 先检查无障碍服务是否正常
    let accessibilityOk = false;
    try {
        // 执行一个无障碍操作测试服务是否真正运行
        let testResult = id("test_nonexistent_id").exists();
        accessibilityOk = true;
    } catch (e) {
        if (e.toString().indexOf("无障碍服务已启用但并未运行") != -1) {
            dialogs.build({
                title: "无障碍服务问题",
                content: "检测到无障碍服务已启用但未正常运行。\n需要先解决这个问题才能继续。",
                positive: "解决问题",
                negative: "取消"
            }).on("positive", () => {
                engines.execScriptFile("./checkAccessibility.js");
            }).show();
            return;
        } else if (!auto.service) {
            dialogs.build({
                title: "需要无障碍服务",
                content: "此功能需要启用无障碍服务。",
                positive: "去启用",
                negative: "取消"
            }).on("positive", () => {
                auto.waitFor();
            }).show();
            return;
        } else {
            toast("无障碍服务检查时出现未知错误: " + e.message);
            return;
        }
    }

    // 无障碍服务正常，继续执行
    appConfig.update({
        activationKey: appConfig.activationKey,
        autoScroll: appConfig.autoScroll,
        autoNextChapter: appConfig.autoNextChapter,
        scrollSpeed: $ui.scrollSpeed.getSelectedItemPosition()
    }); // 更新配置文件
    logger.info("配置已保存：" + JSON.stringify({
        activationKey: appConfig.activationKey,
        autoScroll: appConfig.autoScroll,
        autoNextChapter: appConfig.autoNextChapter,
        scrollSpeed: $ui.scrollSpeed.getSelectedItemPosition()
    }));


    // 判断是否需要创建悬浮窗
    if (!floatyWindow) {
        // 创建悬浮窗
        floatyWindow = createFloatyWindow();
        floatyCreatedByMain = true;
        logger.info("创建了悬浮窗");
    }

    // 启动Rhino脚本执行引擎
    logger.info("开始运行Rhino脚本...");
    rhinoEngine = engines.execScriptFile("./rhino.js", {
        arguments: {
            action: "start",
            config: appConfig
        }
    });

    // 显示提示信息
    toast("已启动服务");
});

//! 8. 创建悬浮
function createFloatyWindow() {
    // 关闭之前的悬浮窗（如果有）
    if (floatyWindow) {
        try {
            floatyWindow.close();
        } catch (e) {
            console.error("关闭旧悬浮窗出错: " + e);
        }
        floatyWindow = null;
    }

    try {
        // 创建包含展开面板的悬浮窗
        floatyWindow = floaty.rawWindow(
            <horizontal>
                <frame id="expandPanel" visibility="gone" bg="#00000000" padding="4" alpha="0.9">
                    <horizontal gravity="center">
                        <button id="stopButton" text="停止" w="40" h="35" bg={appConfig.floatyTheme} textColor="#ffffff" margin="1" alpha="0.8" style="@style/Widget.AppCompat.Button.Colored" />
                        <button id="pauseButton" text="暂停" w="40" h="35" bg={appConfig.floatyTheme} textColor="#ffffff" margin="1" alpha="0.8" style="@style/Widget.AppCompat.Button.Colored" />
                        <button id="settingsButton" text="设置" w="40" h="35" bg={appConfig.floatyTheme} textColor="#ffffff" margin="1" alpha="0.8" style="@style/Widget.AppCompat.Button.Colored" />
                        <button id="exitButton" text="退出" w="40" h="35" bg={appConfig.floatyTheme} textColor="#ffffff" margin="1" alpha="0.8" style="@style/Widget.AppCompat.Button.Colored" />
                    </horizontal>
                </frame>
                <frame gravity="center">
                    <button id="menuButton" text="菜单" w="40" h="40" bg={appConfig.floatyTheme} textColor="#ffffff" textSize="12sp" style="@style/Widget.AppCompat.Button.Colored" />
                </frame>
            </horizontal>
        );

        // 设置窗口大小
        floatyWindow.setSize(-2, -2);

        // 设置初始位置
        floatyWindow.setPosition(device.width - 100, device.height / 2);

        // 重要：确保悬浮窗可触摸
        floatyWindow.setTouchable(true);

        // 设置菜单按钮点击事件
        floatyWindow.menuButton.setOnClickListener(function (view) {
            logger.info("菜单按钮被点击");
            toggleControlPanel();
        });

        return floatyWindow;
    } catch (e) {
        console.error("创建悬浮窗出错: " + e);
        toast("创建悬浮窗出错: " + e);
        return null;
    }
}

//todo 8.2. 切换悬浮窗的控制面板
function toggleControlPanel() {
    if (!floatyWindow) {
        console.log("悬浮窗不存在，无法切换面板");
        return;
    }

    try {
        logger.info("切换控制面板");

        // 通过控制expandPanel的可见性来切换面板状态
        let expandPanel = floatyWindow.expandPanel;
        if (isFloatyExpanded) {
            // 收起面板
            expandPanel.attr("visibility", "gone");
            isFloatyExpanded = false;
            // 恢复原始位置
            floatyWindow.setPosition(device.width - 100, device.height / 2);
        } else {
            // 展开面板
            expandPanel.attr("visibility", "visible");
            isFloatyExpanded = true;
            // 调整位置，确保控制按钮在屏幕内
            let currentX = floatyWindow.getX();
            let newX = Math.min(currentX, device.width - 450);
            floatyWindow.setPosition(newX, floatyWindow.getY());
            // logger.info("面板已展开");
        }

        // 为所有按钮设置点击事件
        // 停止按钮
        floatyWindow.stopButton.setOnClickListener(function (view) {
            toast("停止阅读");
            try {
                // 更新配置，设置running为false
                appConfig.update({
                    readComic: {
                        running: false,
                        shouldExit: false,
                        isPaused: false
                    }
                });
                
                logger.info("已发送停止命令");
                toggleControlPanel(); // 收起控制面板
            } catch (e) {
                logger.error("调用停止方法出错: ", e);
                toast("停止操作失败: " + e.message);
            }
        });

        // 暂停按钮
        floatyWindow.pauseButton.setOnClickListener(function (view) {
            try {
                // 获取当前是否暂停的状态
                let isPaused = appConfig.readComic.isPaused;
                
                // 切换暂停状态
                isPaused = !isPaused;
                
                // 更新配置
                appConfig.update({
                    readComic: {
                        isPaused: isPaused,
                        running: true,
                        shouldExit: false
                    }
                });
                
                // 更新UI
                floatyWindow.pauseButton.setText(isPaused ? "继续" : "暂停");
                toast(isPaused ? "已暂停" : "已继续");
                logger.info(isPaused ? "已暂停阅读" : "已继续阅读");
            } catch (e) {
                logger.error("调用暂停方法出错: ", e);
                toast("暂停操作失败: " + e.message);
            }
        });

        // 设置按钮
        floatyWindow.settingsButton.setOnClickListener(function (view) {
            toast("打开设置");
            toggleControlPanel(); // 收起控制面板
            showSettingsDialog();
        });

        // 退出按钮
        floatyWindow.exitButton.setOnClickListener(function (view) {
            dialogs.confirm("确认退出", "确定要退出脚本吗？", function(confirmed) {
                if (confirmed) {
                    toast("正在退出...");
                    try {
                        // 更新配置，设置shouldExit为true
                        appConfig.update({
                            readComic: {
                                running: false,
                                shouldExit: true,
                                isPaused: false
                            }
                        });
                        
                        // 发送退出控制事件
                        events.broadcast.emit("comic_control", {
                            action: "exit"
                        });
        
                        // 关闭悬浮窗
                        if (floatyWindow) {
                            floatyWindow.close();
                            floatyWindow = null;
                        }
        
                        // 停止Rhino脚本执行引擎
                        if (rhinoEngine) {
                            try {
                                rhinoEngine.forceStop();
                                rhinoEngine = null;
                                logger.info("已强制停止Rhino引擎");
                            } catch (e) {
                                console.log("强制停止Rhino引擎失败: ", e);
                                logger.error("强制停止Rhino引擎失败: ", e);
                            }
                        }
        
                        // 退出脚本
                        setTimeout(function () {
                            ui.finish();
                            exit();
                        }, 500);
                    } catch (e) {
                        logger.error("退出操作出错: ", e);
                        toast("退出操作失败: " + e.message);
                        ui.finish();
                        exit();
                    }
                }
            });
        });
    } catch (e) {
        logger.error("切换控制面板状态出错: " + e);
        toast("切换控制面板出错");
        // 重置状态
        isFloatyExpanded = false;
    }
}

//todo 8.3. 显示设置对话框
function showSettingsDialog() {
    try {
        logger.info("显示设置对话框");

        // 创建视图
        let view = ui.inflate(
            <vertical padding="16">
                <text text="阅读速度 (ms)" textSize="14sp" textColor="#333333" marginBottom="8" />
                <seekbar id="speedSeekBar" max="3000" min="500" />
                <text id="speedValue" text={appConfig.readSpeed + " ms"} textSize="12sp" textColor="#666666" marginBottom="16" gravity="center" />

                <horizontal marginBottom="16">
                    <checkbox id="autoScrollCheck" text="自动滚动" checked={appConfig.autoScroll} textSize="14sp" textColor="#333333" />
                    <checkbox id="autoNextChapterCheck" text="自动下一章" checked={appConfig.autoNextChapter} marginLeft="16" textSize="14sp" textColor="#333333" />
                </horizontal>

                <text text="高级设置" textSize="16sp" textColor="#333333" marginBottom="8" marginTop="8" />
                <horizontal marginBottom="16">
                    <checkbox id="debugModeCheck" text="调试模式" checked={appConfig.debugMode} textSize="14sp" textColor="#333333" />
                    <checkbox id="accessibilityCheck" text="使用无障碍服务" checked={appConfig.useAccessibilityService} marginLeft="16" textSize="14sp" textColor="#333333" />
                </horizontal>

                {/* 日志设置部分 - 仅在调试模式下显示 */}
                <vertical id="logSettingsContainer" visibility={appConfig.debugMode ? "visible" : "gone"}>
                    <text text="日志设置" textSize="16sp" textColor="#333333" marginBottom="8" marginTop="8" />
                    <horizontal marginBottom="8">
                        <text text="日志级别：" textSize="14sp" textColor="#333333" layout_gravity="center_vertical" />
                        <spinner id="logLevelSpinner" entries="调试|信息|警告|错误|关闭" />
                    </horizontal>
                    <horizontal marginBottom="16">
                        <checkbox id="logToFileCheck" text="记录到文件" checked={appConfig.logging ? appConfig.logging.logToFile : true} textSize="14sp" textColor="#333333" />
                        <checkbox id="deviceInfoCheck" text="收集设备信息" checked={appConfig.logging ? appConfig.logging.deviceInfo : true} marginLeft="16" textSize="14sp" textColor="#333333" />
                    </horizontal>

                    {/* 错误上报设置 */}
                    <text text="错误上报设置" textSize="16sp" textColor="#333333" marginBottom="8" marginTop="8" />
                    <horizontal marginBottom="8">
                        <checkbox id="errorReportCheck" text="启用错误上报" checked={appConfig.logging && appConfig.logging.errorReport} textSize="14sp" textColor="#333333" />
                    </horizontal>
                    <text text="上报地址：" textSize="14sp" textColor="#333333" marginBottom="4" />
                    <input id="reportUrlInput" hint="请输入错误上报服务器地址" text={appConfig.logging && appConfig.logging.reportUrl || ""} textSize="14sp" />

                    <horizontal marginTop="16">
                        <button id="exportLogsBtn" text="导出日志" w="*" style="Widget.AppCompat.Button.Colored" textColor="#ffffff" bg={appConfig.theme} />
                    </horizontal>
                </vertical>
            </vertical>
        );

        // 设置seekbar的初始值
        let initialProgress = Math.floor(Math.max(0, Math.min(2500, appConfig.readSpeed - 500)));
        logger.debug("初始进度: " + initialProgress + ", 配置: " + JSON.stringify(appConfig));
        view.speedSeekBar.setProgress(initialProgress);

        //  监听seekbar变化
        view.speedSeekBar.setOnSeekBarChangeListener({
            onProgressChanged: function (seekBar, progress, fromUser) {
                logger.debug("进度变化: " + progress);
                let value = Math.floor(Math.max(500, Math.min(3000, progress + 500)));
                logger.debug("新的速度值: " + value);
                view.speedValue.setText(value + " ms");
            }
        });

        // 设置日志级别下拉选择框的初始值
        let logLevelMap = {
            "debug": 0,
            "info": 1,
            "warn": 2,
            "error": 3,
            "none": 4
        };
        let currentLogLevel = appConfig.logging ? appConfig.logging.logLevel : "info";
        view.logLevelSpinner.setSelection(logLevelMap[currentLogLevel] || 1);

        // 调试模式复选框变化监听
        view.debugModeCheck.on("check", function (checked) {
            // 根据调试模式状态显示或隐藏日志设置
            view.logSettingsContainer.attr("visibility", checked ? "visible" : "gone");
        });

        // 导出日志按钮点击事件
        view.exportLogsBtn.on("click", function () {
            try {
                if (logger && logger.getLogArchive) {
                    let archivePath = logger.getLogArchive();
                    if (archivePath) {
                        toast("日志已导出到: " + archivePath);
                        // 询问用户是否要分享日志
                        dialogs.confirm("日志已导出", "日志已导出到: " + archivePath + "\n\n是否立即分享日志?", function (confirmed) {
                            if (confirmed) {
                                // 分享日志文件
                                app.viewFile(archivePath);
                            }
                        });
                    } else {
                        logger.warn("导出日志失败，请确保日志已记录")
                        toast("导出日志失败，请确保日志已记录");
                    }
                } else {
                    logger.warn("系统日志不可用")
                    toast("日志系统不可用");
                }
            } catch (e) {
                logger.error("导出日志出错", e);
                toast("导出日志出错: " + e);
            }
        });

        // 创建对话框
        let dialog = dialogs.build({
            title: "漫画阅读设置",
            titleColor: "#333333",
            customView: view,
            positive: "确定",
            negative: "取消",
            neutral: "重置",
            cancelable: true
        });

        // 设置确定按钮点击事件
        dialog.on("positive", () => {
            try {
                // 获取设置的值并进行有效性检查
                let progress = 0;
                try {
                    let rawProgress = view.speedSeekBar.getProgress();
                    // 确保rawProgress是一个有效的数值
                    progress = Math.floor(typeof rawProgress === 'number' && !isNaN(rawProgress) ? rawProgress : 0);
                } catch (e) {
                    logger.error("获取进度值出错", e);
                }
                let newSpeed = Math.floor(Math.max(500, Math.min(3000, progress + 500)));
                let autoScroll = view.autoScrollCheck.isChecked();
                let autoNextChapter = view.autoNextChapterCheck.isChecked();
                let debugMode = view.debugModeCheck.isChecked();
                let useAccessibility = view.accessibilityCheck.isChecked();

                // 获取日志设置
                let logLevelIndex = view.logLevelSpinner.getSelectedItemPosition();
                let logLevelOptions = ["debug", "info", "warn", "error", "none"];
                let logLevel = logLevelOptions[logLevelIndex] || "info";
                let logToFile = view.logToFileCheck.isChecked();
                let deviceInfo = view.deviceInfoCheck.isChecked();

                // 获取错误上报设置
                let errorReport = debugMode && view.errorReportCheck.isChecked();
                let reportUrl = view.reportUrlInput.getText().toString().trim();

                console.log("保存设置: 速度=" + newSpeed + ", 调试模式=" + debugMode);

                // 更新配置
                appConfig.update({
                    readSpeed: newSpeed,
                    autoScroll: autoScroll,
                    autoNextChapter: autoNextChapter,
                    debugMode: debugMode,
                    useAccessibilityService: useAccessibility,
                    logging: {
                        enabled: logLevel !== "none",
                        logLevel: logLevel,
                        logToFile: logToFile,
                        deviceInfo: deviceInfo,
                        errorReport: errorReport,
                        reportUrl: reportUrl
                    }
                });

                // 更新日志级别
                if (logger && logger.setLogLevel) {
                    logger.setLogLevel(logLevel);
                    logger.info("日志级别已更改为: " + logLevel);
                }

                // 更新错误上报设置
                if (logger && typeof logger.options !== 'undefined') {
                    logger.options.errorReport = errorReport;
                    logger.options.reportUrl = reportUrl;
                    logger.info("错误上报设置已更新: " + (errorReport ? "已启用" : "已禁用"));
                    if (errorReport) {
                        logger.info("错误上报地址: " + reportUrl);
                    }
                }

                // 更新控制器设置
                // if (comicController && comicController.running) {
                //     comicController.setReadSpeed(newSpeed);
                // }


                toast("设置已保存");
                logger.info("设置已保存: 速度=" + newSpeed + ", 调试模式=" + debugMode);
            } catch (e) {
                console.error("保存设置时出错: " + e);
                logger.error("保存设置时出错", e);
                toast("保存设置失败: " + e);
            }
        });

        // 设置重置按钮点击事件
        dialog.on("neutral", () => {
            // 重置设置
            appConfig.reset();
            toast("设置已重置为默认值");
            logger.info("设置已重置为默认值");
            // 关闭当前对话框并重新打开
            dialog.dismiss();
            setTimeout(showSettingsDialog, 500);
        });

        // 显示对话框
        dialog.show();
        logger.info("设置对话框已显示");
    } catch (e) {
        logger.error("显示设置对话框时出错", e);
        toast("显示设置对话框失败: " + e);
    }
}

//! 设置历史页面 和 android页面的自带的选项菜单的监听
// 加载历史记录示例数据
let historyData = [
    { title: "某科学的超电磁炮", time: "2023-06-15 14:30" },
    { title: "进击的巨人", time: "2023-06-14 20:15" },
    { title: "鬼灭之刃", time: "2023-06-12 18:45" }
];

$ui.historyList.setDataSource(historyData);
$ui.historyList.on("item_click", (item, i, itemView, listView) => {
    toast("选择了漫画: " + item.title);
});

// 设置全局事件
$ui.emitter.on("create_options_menu", (menu) => {
    menu.add("设置");
    menu.add("关于");
    menu.add("退出").setIcon($ui.R.drawable.ic_exit_to_app_black_48dp).setShowAsAction(2);
});

$ui.emitter.on("options_item_selected", (e, item) => {
    let title = item.getTitle();
    switch (title) {
        case "设置":
            try {
                // 调用设置对话框函数
                showSettingsDialog();
            } catch (err) {
                logger.error("显示设置对话框时出错", err);
                toast("显示设置对话框失败: " + err);
            }
            break;
        case "关于":
            dialogs.alert("关于", "超燃自动阅读 v1.0\n一款专为漫画爱好者打造的自动阅读工具");
            break;
        case "退出":
            // 关闭悬浮窗（如果存在）
            if (floatyWindow) {
                floatyWindow.close();
                floatyWindow = null;
            }
            $ui.finish();
            break;
    }
    e.consumed = true;
});

// 在应用退出时清理资源
ui.emitter.on('exit', function () {
    logger.info("UI界面退出，正在清理资源");

    // 关闭所有悬浮窗
    utils.closeAllFloatyWindows();

    // 停止所有正在运行的脚本
    try {
        engines.stopAll();
    } catch (e) {
        logger.error("停止所有脚本失败", e);
    }

    // 发送广播通知其他脚本退出
    if (events && events.broadcast) {
        events.broadcast.emit("script_exit");
    }

    logger.info("资源清理完成");
});