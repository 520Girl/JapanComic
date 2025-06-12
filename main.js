"ui";

// 加载工具模块
var utils = require("./utils.js");
var launcher = require('./launcher.js');
var loggerFile = require('./logger.js');
//! 1. 加载配置和控制器
// 注意: 配置和控制器文件会在执行时返回对象供使用
// 使用 engines.execScriptFile 执行这些文件
var appConfig = null;
var rhinoEngine = null;
// 跟踪悬浮窗的状态
let floatyWindow = null;
let isFloatyExpanded = false;

// 在文件顶部添加一个全局变量来跟踪悬浮窗的创建者
let floatyCreatedByMain = false;


//! 3. 加载配置模块
var config = require("./config.js");
appConfig = config.appConfig;
appConfig.update = config.updateConfig;
appConfig.resetConfig = config.resetConfig;
// 设置界面主题
ui.statusBarColor(appConfig.floatyTheme);
//! 2. 初始化日志系统
var logger = loggerFile.initLogger('main', appConfig);


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
        <appbar bg="#00dc64">
            <toolbar id="toolbar" title="LINE マンガ自动化" titleColor="#ffffff" />
        </appbar>

        <frame>
            <vertical>
                <horizontal bg={appConfig.theme} h="50">
                    <vertical layout_weight="1" id="configTabContainer">
                        <button id="configTab" layout_weight="1" textSize="16sp" text="个性配置" textColor="#ffffff" bg={appConfig.theme} style="Widget.AppCompat.Button.Borderless" />
                        <View id="configIndicator" h="3dp" w="*" bg="#ffffff" />
                    </vertical>
                    <vertical layout_weight="1" id="historyTabContainer">
                        <button id="historyTab" layout_weight="1" textSize="16sp" text="系统设置" textColor="#cccccc" bg={appConfig.theme} style="Widget.AppCompat.Button.Borderless" />
                        <View id="historyIndicator" h="3dp" w="*" bg={appConfig.theme} />
                    </vertical>
                </horizontal>

                <ScrollView id="contentScroller" h="*" w="*">
                    <frame id="contentContainer" w="*">
                        <vertical id="configPage" padding="16">
                            {/* <card w="*" h="80" margin="8" cardCornerRadius="8" cardElevation="2">
                                <horizontal padding="16" gravity="center_vertical">
                                    <img src="@drawable/ic_autorenew_black_48dp" w="40" h="40" tint="#FF5722" />
                                    <text text="邮箱:ugly8girl@gmail.com" textSize="10sp" textColor="#333333" marginLeft="16" />
                                </horizontal>
                            </card> */}

                            <card margin="8" cardCornerRadius="8" cardElevation="2">
                                <vertical padding="16">
                                    <text text="激活码：" textSize="16sp" />
                                    <input id="activationCode" hint="请输入激活码" gravity="center" text={appConfig.activationKey} />
                                </vertical>
                            </card>

                            <card margin="8" cardCornerRadius="8" cardElevation="2">
                                <vertical padding="16">
                                    <text text="阅读设置" textSize="16sp" />
                                    <checkbox tint={appConfig.theme} id="autoScroll" text="自动滚动" checked={appConfig.autoScroll} />
                                    <checkbox id="autoNextChapter" text="自动下一章" checked={appConfig.autoNextChapter} />
                                    <text text="流程速度" textSize="16sp" />
                                    <spinner id="scrollSpeed" entries="慢速|中速|快速" />

                                    <text text="阅读速度 (ms)" textSize="14sp" textColor="#333333" marginBottom="8" />
                                    <seekbar id="speedSeekBar" max="3000" min="500" />
                                    <text id="speedValue" text={appConfig.readSpeed + " ms"} textSize="12sp" textColor="#666666" marginBottom="16" gravity="center" />
                                </vertical>
                            </card>

                            <button id="startButton" style="Widget.AppCompat.Button.Colored" text="开始运行" textColor="#ffffff" bg={appConfig.theme} margin="16" />
                        </vertical>

                        <vertical id="settingPage" padding="16" visibility="gone">
                            <card margin="8" cardCornerRadius="8" cardElevation="2">
                                <vertical padding="16">
                                    <horizontal gravity="center_vertical">
                                        <img src="@android:drawable/ic_menu_edit" w="22" h="22" tint={appConfig.theme} marginRight="8" />
                                        <text text="权限设置" textSize="10sp" textColor={appConfig.theme} gravity="left" padding="1" />
                                    </horizontal>

                                    <checkbox id="accessibilityPermission" text="无障碍服务" checked={appConfig.permissions.accessibility} />
                                    <checkbox id="floatingWindowPermission" text="悬浮窗" checked={appConfig.permissions.floatingWindow} />
                                    <checkbox id="screenCapturePermission" text="截图权限" checked={appConfig.permissions.screenCapture} />
                                    <checkbox id="storagePermission" text="存储权限" checked={appConfig.permissions.storage} />
                                </vertical>
                            </card>

                            <card margin="8" cardCornerRadius="8" cardElevation="2">
                                <vertical padding="16">
                                    <horizontal gravity="center_vertical">
                                        <img src="@drawable/ic_bug_report_black_48dp" w="24" h="24" tint={appConfig.theme} marginRight="8" />
                                        <text text="调试模式" textSize="10sp" textColor={appConfig.theme} gravity="left" padding="1" />
                                    </horizontal>
                                    <horizontal>
                                        <radiogroup orientation="horizontal">
                                            <radio id="debugModeOn" text="开启" checked={appConfig.debugMode} textSize="14sp" textColor="#333333" marginRight="16" />
                                            <radio id="debugModeOff" text="关闭" checked={!appConfig.debugMode} textSize="14sp" textColor="#333333" />
                                        </radiogroup>
                                    </horizontal>

                                    <vertical id="logSettingsContainer" visibility={appConfig.debugMode ? "visible" : "gone"}>
                                        <horizontal marginBottom="8">
                                            <text text="日志级别：" textSize="14sp" textColor="#333333" layout_gravity="center_vertical" />
                                            <spinner id="logLevelSpinner" textColor="#333333" entries="调试|信息|警告|错误|关闭" />
                                        </horizontal>
                                        <horizontal marginBottom="16">
                                            <checkbox id="logToFileCheck" text="记录到文件" checked={appConfig.logging && appConfig.logging.logToFile} textSize="14sp" textColor="#333333" />
                                            <checkbox id="deviceInfoCheck" text="收集设备信息" checked={appConfig.logging && appConfig.logging.deviceInfo} marginLeft="16" textSize="14sp" textColor="#333333" />
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
                            </card>
                        </vertical>
                    </frame>
                </ScrollView>
            </vertical>
        </frame>
    </vertical>
);

// 抽取保存配置和继续执行的逻辑为单独的函数
function saveConfigAndContinue() {
    // 保存配置
    var config = {
        readSpeed: appConfig.readSpeed,
        autoScroll: appConfig.autoScroll,
        autoNextChapter: appConfig.autoNextChapter,
        debugMode: appConfig.debugMode,
        scrollSpeedIndex: $ui.scrollSpeed.getSelectedItemPosition(),
        activation: appConfig.activation,
        firstRun: false,
        activationKey: appConfig.activationKey,
        permissions: appConfig.permissions,
        logger: {
            enabled: appConfig.logging.enabled,
            logLevel: $ui.logLevelSpinner.getSelectedItem(),
            logToFile: appConfig.logging.logToFile,
            deviceInfo: appConfig.logging.deviceInfo,
            errorReport: appConfig.logging.errorReport,
            reportUrl: $ui.reportUrlInput.getText().toString(),
        },
        readComic: {
            running: true,
            isPaused: false
        }
    }
    appConfig.update(config);
    logger.info("配置已保存：" + JSON.stringify(config));

    // 判断是否需要创建悬浮窗
    if (!floatyWindow) {
        // 创建悬浮窗
        floatyWindow = createFloatyWindow();
        floatyCreatedByMain = true;
        logger.info("创建了悬浮窗");
    }
    logger.info("开始运行Rhino脚本...");
    rhinoEngine = engines.execScriptFile("./rhino.js", {
        arguments: {
            action: "start",
            config: appConfig
        }
    });

    // 显示提示信息
    toast("已启动服务");
}

//初始化事件绑定
function initEvents() {
    // 设置seekbar的初始值
    let initialProgress = Math.floor(Math.max(0, 300));
    $ui.speedSeekBar.setProgress(initialProgress);

    //  监听seekbar变化
    $ui.speedSeekBar.setOnSeekBarChangeListener({
        onProgressChanged: function (seekBar, progress, fromUser) {
            logger.info("进度变化: " + progress);
            let value = Math.floor(Math.max(500, Math.min(3000, progress + 500)));
            logger.info("新的速度值: " + value);
            $ui.speedValue.setText(value + " ms");
            appConfig.readSpeed = value;
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
    $ui.logLevelSpinner.setSelection(logLevelMap[currentLogLevel] || 1);

    // 导出日志按钮点击事件
    $ui.exportLogsBtn.on("click", function () {
        try {
            console.log('导出日志', loggerFile.getLogArchive())
            if (loggerFile && loggerFile.getLogArchive) {
                let archivePath = loggerFile.getLogArchive();
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
            logger.error("导出日志出错" + e);
            toast("导出日志出错: " + e);
        }
    });

    // 在UI事件处理部分添加以下代码
    $ui.debugModeOn.on("check", (checked) => {
        if (checked) {
            // 更新配置对象
            appConfig.debugMode = true;
            $ui.logSettingsContainer.attr("visibility", "visible");

        }
    });

    $ui.debugModeOff.on("check", (checked) => {
        if (checked) {
            // 更新配置对象
            appConfig.debugMode = false;
            $ui.logSettingsContainer.attr("visibility", "gone");

        }
    });

    //设置标签页切换，
    $ui.configTab.on("click", () => {
        $ui.configPage.attr("visibility", "visible");
        $ui.settingPage.attr("visibility", "gone");
        $ui.configTab.attr("textColor", "#ffffff");
        $ui.historyTab.attr("textColor", "#cccccc");
        $ui.configIndicator.attr("bg", "#ffffff");
        $ui.historyIndicator.attr("bg", appConfig.theme);
    });

    $ui.historyTab.on("click", () => {
        $ui.configPage.attr("visibility", "gone");
        $ui.settingPage.attr("visibility", "visible");
        $ui.configTab.attr("textColor", "#cccccc");
        $ui.historyTab.attr("textColor", "#ffffff");
        $ui.configIndicator.attr("bg", appConfig.theme);
        $ui.historyIndicator.attr("bg", "#ffffff");
    });

    //! 当开始的时候才将全部配置进行同步，设置激活按钮点击事件
    $ui.startButton.on("click", () => {

        // 禁用按钮，防止重复点击
        $ui.startButton.attr("enabled", false);
        $ui.startButton.setText("请稍候...");
        $ui.startButton.attr("bg", "#cccccc"); // 灰色

        // 保存当前配置
        appConfig.activationKey = $ui.activationCode.getText().toString();
        appConfig.autoScroll = $ui.autoScroll.isChecked();
        appConfig.autoNextChapter = $ui.autoNextChapter.isChecked();

        // 保存权限设置
        appConfig.permissions.accessibility = $ui.accessibilityPermission.isChecked();
        appConfig.permissions.floatingWindow = $ui.floatingWindowPermission.isChecked();
        appConfig.permissions.screenCapture = $ui.screenCapturePermission.isChecked();
        appConfig.permissions.storage = $ui.storagePermission.isChecked();

        // // 保存阅读历史设置
        // appConfig.readHistory.enabled = $ui.enableHistory.isChecked();
        // appConfig.readHistory.autoClean = $ui.autoCleanHistory.isChecked();


        // 检查必要的权限
        launcher.checkEnvironment()
            .then(() => {
                console.log('检查必要的权限', launcher.checkResults.storage, launcher.checkResults.accessibility, launcher.checkResults.floaty)
                if (launcher.checkResults.storage &&
                    launcher.checkResults.accessibility &&
                    launcher.checkResults.floaty) {
                    // 检查邀请码
                    checkInvitationCode(() => {
                        ui.run(() => {
                            $ui.startButton.attr("enabled", true);
                            $ui.startButton.setText("开始运行");
                            $ui.startButton.attr("bg", appConfig.theme); // 恢复主题色
                        });
                    });;
                    return;
                } else {
                    // 显示权限设置界面
                    launcher.fixAccessibilityService()
                        .finally(() => {
                            ui.run(() => {
                                $ui.startButton.attr("enabled", true);
                                $ui.startButton.setText("开始运行");
                                $ui.startButton.attr("bg", appConfig.theme); // 灰色
                            });
                        });
                }
            })
            .catch(error => {
                logger.error("启用无障碍服务失败: " + error);
                toast("启用无障碍服务失败，请重试");
            })
    })


    //初始化配置
    $ui.scrollSpeed.setSelection(appConfig.scrollSpeedIndex);

    //todo 7.4. 设置权限复选框的点击事件
    // 无障碍服务权限
    $ui.accessibilityPermission.on("check", (checked) => {
        if (checked) {
            // 如果选中，检查是否已有权限
            if (!auto.service) {
                dialogs.build({
                    title: "需要无障碍服务",
                    content: "此功能需要启用无障碍服务，是否立即开启？",
                    positive: "去开启",
                    negative: "取消"
                }).on("positive", () => {
                    // 使用 auto.waitFor() 等待用户手动启用
                    auto.waitFor();
                }).on("negative", () => {
                    // 如果用户取消，恢复复选框状态
                    $ui.accessibilityPermission.checked = false;
                    appConfig.permissions.accessibility = false;
                }).show();
            }
        } else {
            // 如果取消选中，提示用户
            if (auto.service) {
                dialogs.build({
                    title: "关闭无障碍服务",
                    content: "关闭无障碍服务可能影响脚本正常运行，是否继续？",
                    positive: "继续",
                    negative: "取消"
                }).on("positive", () => {
                    // 尝试关闭无障碍服务
                    auto.service = false;
                }).on("negative", () => {
                    // 如果用户取消，恢复复选框状态
                    $ui.accessibilityPermission.checked = true;
                    appConfig.permissions.accessibility = true;
                }).show();
            }
        }
    });

    // 悬浮窗权限
    $ui.floatingWindowPermission.on("check", (checked) => {
        if (checked) {
            // 如果选中，检查是否已有权限
            if (!utils.checkFloatyPermission()) {
                dialogs.build({
                    title: "需要悬浮窗权限",
                    content: "此功能需要启用悬浮窗权限，是否立即开启？",
                    positive: "去开启",
                    negative: "取消"
                }).on("positive", () => {
                    utils.requestFloatyPermission();
                }).on("negative", () => {
                    // 如果用户取消，恢复复选框状态
                    $ui.floatingWindowPermission.checked = false;
                    appConfig.permissions.floatingWindow = false;
                }).show();
            }
        }
    });

    // 截图权限
    $ui.screenCapturePermission.on("check", (checked) => {
        if (checked) {
            // 如果选中，检查是否已有权限
            if (utils.hasCapturePermission) {
                return; // 已经有权限，直接返回
            }

            // 如果正在请求权限，提示用户等待
            if (utils.captureRequestInProgress) {
                toast("正在请求截图权限，请稍候...");
                return;
            }

            // 请求权限
            if (!utils.checkCapturePermission()) {
                dialogsCaptureScreen();
            }
        }
    });

    // 存储权限
    $ui.storagePermission.on("check", (checked) => {
        if (checked) {
            // 如果选中，检查是否已有权限
            if (!utils.hasStoragePermission()) {
                dialogs.build({
                    title: "需要存储权限",
                    content: "此功能需要存储权限以保存配置和历史记录，是否立即授权？",
                    positive: "去授权",
                    negative: "取消"
                }).on("positive", () => {
                    if (!utils.requestPermissions(["android.permission.WRITE_EXTERNAL_STORAGE"])) {
                        toast("获取存储权限失败");
                        // 恢复复选框状态
                        $ui.storagePermission.checked = false;
                        appConfig.permissions.storage = false;
                    }
                }).on("negative", () => {
                    // 如果用户取消，恢复复选框状态
                    $ui.storagePermission.checked = false;
                    appConfig.permissions.storage = false;
                }).show();
            }
        }
    });
}
initEvents();
//检测邀请码是否过期
function checkInvitationCode(callback) {
    // ====== 下面是新增的激活请求逻辑 ======
    console.log(`${device.model}|${device.width}|${device.hardware}|${device.getAndroidId()}`)
    let deviceid = device.getAndroidId ? device.getAndroidId() : "tests";
    let facility = "script";
    let timestamp = new Date().getTime();
    let CDKEY = appConfig.activationKey;
    let apikey = appConfig.activation.apiKey;
    let baseUrl = appConfig.activation.apiUrl;

    // 生成签名
    let sign = utils.generateActivationSign(CDKEY, deviceid, facility, timestamp, apikey);

    // 构建请求URL
    let url = `${baseUrl}/index.php/appv1/user/card_use?deviceid=${deviceid}&facility=${facility}&timestamp=${timestamp}&CDKEY=${CDKEY}&sign=${sign}`;

    logger.info("激活请求URL: " + url);

    if (!CDKEY) {
        toast('请输入激活码!!')
        return
    }
    // 发送激活请求
    threads.start(function () {
        try {
            let res = http.get(url);
            if (!res || !res.body) {
                toast("激活请求失败，网络无响应");
                logger.error("激活请求失败，网络无响应");
                // if (callback) callback();
                return;
            }
            let result = res.body.string();
            logger.info("激活返回: " + result);
            let json = {};
            try {
                json = JSON.parse(result);
            } catch (e) {
                logger.error("激活返回解析失败: " + e);
                if (callback) callback();
                return;
            }
            console.log('激活返回', json.code == 1)
            if (json.code == 1) { // 假设1为成功
                // 更新激活状态
                appConfig.update({
                    activation: {
                        isActivated: true,
                        lastCheckTime: new Date().getTime()
                    }
                });

                toast(json.msg);
                // ====== 激活成功后继续原有逻辑 ======
                ui.run(() => {
                    if (appConfig.permissions.screenCapture) {
                        // 如果已经有权限，直接继续
                        if (utils.hasCapturePermission) {
                            saveConfigAndContinue();
                        }
                        // 如果正在请求权限，提示用户等待
                        if (utils.captureRequestInProgress) {
                            toast("正在请求截图权限，请稍候...");
                            if (callback) callback();
                            return;
                        }
                        if (!utils.checkCapturePermission()) {
                            dialogsCaptureScreen();
                        }
                    } else {
                        saveConfigAndContinue();
                    }
                    if (callback) callback();
                });
            } else {
                toast(json.msg || '激活失败');
                logger.error("激活失败: " + (json.msg || "未知错误"));
            }
            if (callback) callback();
        } catch (e) {
            toast("激活码异常，请联系管理员！");
            logger.error("激活请求异常: " + e);
        }
    });
}

//截图权限弹窗
function dialogsCaptureScreen() {
    dialogs.build({
        title: "需要截图权限",
        content: "此功能需要截图权限，是否立即授权？",
        positive: "去授权",
        negative: "取消"
    }).on("positive", () => {
        utils.requestCapturePermission()
            .then(result => {
                if (!result) {
                    toast("获取截图权限失败");
                    // 恢复复选框状态
                    $ui.screenCapturePermission.checked = false;
                    appConfig.permissions.screenCapture = false;
                }
            })
            .catch(e => {
                console.error("请求截图权限时出错: " + e);
                toast("请求截图权限失败");
                // 恢复复选框状态
                $ui.screenCapturePermission.checked = false;
                appConfig.permissions.screenCapture = false;
            });
    }).on("negative", () => {
        // 如果用户取消，恢复复选框状态
        $ui.screenCapturePermission.checked = false;
        appConfig.permissions.screenCapture = false;
    }).show();
}

// 显示权限设置界面
function showPermissionSettings() {
    if (!launcher.checkResults.accessibility) {
        // 调用 fixAccessibilityService 函数来启用无障碍服务
        launcher.fixAccessibilityService()
            .then(success => {
                if (success) {
                    // 无障碍服务已成功启用，继续检查其他权限
                    if (launcher.checkResults.storage &&
                        launcher.checkResults.floaty) {
                        // 所有权限都已获取，继续执行
                        saveConfigAndContinue();
                    } else {
                        // 继续检查其他权限
                        showPermissionSettings();
                    }
                } else {
                    // 启用失败，显示提示
                    toast("启用无障碍服务失败，请手动开启");
                    // 打开系统设置
                    app.startActivity({
                        action: "android.settings.ACCESSIBILITY_SETTINGS"
                    });
                }
            })
            .catch(error => {
                logger.error("启用无障碍服务失败: " + error);
                toast("启用无障碍服务失败，请重试");
            });
    } else {
        // 检查其他权限
        if (!launcher.checkResults.storage) {
            // 处理存储权限
            launcher.checkStoragePermission()
                .then(() => {
                    if (launcher.checkResults.storage) {
                        showPermissionSettings();
                    }
                });
        }
        if (!launcher.checkResults.floaty) {
            // 处理悬浮窗权限
            launcher.checkFloatyPermission()
                .then(() => {
                    if (launcher.checkResults.floaty) {
                        showPermissionSettings();
                    }
                });
        }
    }
}

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
                    <img id="menuButton" tin={appConfig.floatyTheme} w="40" h="40" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAABICAYAAABV7bNHAAAP10lEQVR42uWceXBVVZ7HP+fe+/aQBUIwQBIIJEjCDiFIUCCEIAhaSg1RcaENLj3tjNpS44i2hEDRhKHaGqhOa5MhSlI64lBhmgaNoCxmcAtNXACFRGxC1LAkIWR7ecuZPxIePPJWEsS0v6pXr9675553z/f81u855wkClRNzDTgGjUCTtwCjQCQh6YugL1JaAD1CqIACUkEKwU8pQkoQTsAJOEC2g2hGUIeU9QjxNcivcDgOUsPXzHytLaBu/bY4+kA0ekM2iCxgGGCid0srUn6Hwts4xSYSCk5fG0B7Z2jEDn8U+B2SaP4x5QyC3xOv/BHxZ1vgAB3J7ouBYhC3B6RlvV8+AOt9DC864x+gyl/FIJS3kSKVX5Z8ibAvZNhrJ7wDdCS7L3rxDoLJ/CJFfgXts67UJOXytRwFA8W/XHAAxCjQv0X5Y7quAFWe/jWIufziRcwg3PGMu4l9u3QAksO9N1pJkBKkveOFBKFhEHqsAMGmZFKep902geQtpzQAnPJRENE/n8Feeu8cLCCEihGVEKHRTw0hRLUQoZiJVUOJVPsQrvYhXj+QKLUPYYqZQVo4OjQmV79Ipb0xOJCE6IdR/2vgecGRf9JjCPsbkHzdB4yTK21bA4womBQjemEgUjUxWA0lXAmhvxZBvC6KCMVEPzWEwVokYaoZvVAxCz16oaGhovgYuJSSJbX5bGmquJZkpQqzMkZD6zMSiO8eAM5O9Xa61FsnNAaoZqLVUMIUC4N1/RmshhGmGLlJi2CwLoo+ipEwxURfxYJZ6DEIDdGDFYoQgtmW8Wy5+CkIfbDjiqHFNk5DFVOCLR/MqMwyJdBfMRGhWBisH8AgLZLwTtWOUkPpoxgwCN0NN9hM8ygUN90NGF49UknVOgrPoBwYs0zx/G/0b3t0tq+XRKmhTDDEUN7+Y/DOGjFJAZEUHEA2MizjegU4l7Vo9DXpEELGKUBEMPeoQiHDnExvktmWMWid0TBIhOIUoG8wtyRq/YjV+vUqgMbp44hSQ67lVosCWIK5Y4oxHosw9CqAwlUzqYahrpwqiACtU5Ay8PjntDInZFKv8j+X5HbLBHDagrQwVAUhtEDbK8BM08heWYxMN43AINSgnVAHfxygvo3pTOV7o8RqkSTpoztqtsBtTNHcKnqfbZ3MsYzz2aSoqIji4mI0TeOVV14hJiamS5uzZ8+ydOlS2traWLRoEdnZ2axatYqysjJCQkIoKCggIuJyYK2treWxxx6jra2NrKwsHnnkEVasWMHHH3/s8RmMRiMbNmwgLi7O7XuTomOGMZHD7bVB4COEhhQikDpFQTLT5Du8l5eX89577wFQV1fnEaCmpiZ27dqF3W4nPj6e7OxsDhw4wJ49e1wDLCwsRK/vcI319fXs2LEDKSWJiYkA7N+/n/3793t8Br1ez/nz57sABJAZMpGXL+wGEXjhoATasJ9iZLwhrkfqo6ud/JWf33zzTQoLC/32cUlCQ0PdXuHh4S5wr5ZpxgTMQUbggB30eH0M/X8C/yOlZNmyZUyYMIGUlBSfbXU6HXV1dShKYPMcohi41ZRAaWtlwGVHYAA5bWRYxv5k4b2pqYmHH37Yq5+5EsxDhw65AaRpGklJSV61aI55DKWt3wQ89ICgF0C6Kem6AxMeHk5GRgYAx44dY9myZdjtdq/t7XY7qamppKSkuF5TpkzhyJEj3sO9ORljEM8UEEDxWgTD9Tddd4CsViuFhYXExsYCsGnTJrZv346qqkGZqMPh8Ho9STcwqFIpID1LNcYTKozXHSAhBIMGDSI/P5+FCxditVrJzc31OmBFUVi+fHmXMD906FCvv2FUdNxmGsHxix93pIHdBshpY5Z5TND+J5hZv1rmzp3LM888w9q1a7HZbD5/Y+XKlQE76ct+aCwFjR9CABFN8+9/HMy2jA56kE8//TShoaFu3z3//PP079/fv90rCqtXr6asrIyysjKfPmjhwoVuk2c0Glm3bh2DBw/2et8tpkTCFCMXAiheNT8GzQjdAGK0vkED9P7773vUjNmzZ3v0G560Y/PmzUyfPp0ffvjBq7/Zvn17l0Tx2Wef9QlQlNqH8YZY9rX93S+Z70c3nWSYA9ces9ns97qiKC7zM5lMbu+a5j5fCQkJbNy4EZ2ug9s2GAxu79607+p+uuRPQmWWKSkgllFwYmk7Ao/suiLtbI/+FxZYJgQEkMPhoKGhwev1vn07NLGxsRG73U5YWBiapmG1WmlqasJgMGCxWNxMRkrptb03gMLDw/36zPK270ipfgEUs6/63Kb5U7BXGt7jgqOZaaabGaRFoPPBjqiqSr9+/kNoWFiY22eDweBVK4QQQbUPmGU0xNJfDeOs9M0RqfzrhN8hUL0Us5yw1VHSVM7mxr3saf6CFmczY41DUYXCjRSn04nNZusSLfPy8tiyZQuRkZEei2XX1AvB4bbv+Kr9e19lh9P/KIUARc9FBPut1fyl+XMUegYcKSWVlZU4ncGvOFRUVBAdHU1WVpabo3733XfZtGkTJ0+eDIBl9L/aoQX3WA7SzaPQPGhPXl4ee/bsCShfSkpK4uWXX6ayspJbb72VqVOn8uKLLzJ27Fif+ZPdbndFvNLSUurq6ti6dStDhgzhjjvuAODee+9l8uTJVFVVkZeXx7Rp00hLS/PY31TTzfRB5WKPAeS0kmEZ6/HSsWPHXJyOvwTyiSeeAGDNmjXU1tZSUlJCaWkpWVlZrFy50qtpPPXUU3z22WcAVFVVub7ftm0be/fuBSA/P5/HH3+cxYsX88Ybb5Cbm+sVoKFaJIn6mzhkq+0ZgKK0MMbqB3s1F+FnIwFAWload955Jw6Hg+HDhxMVFcWZM2doaWmhsLCQkpISysvLGTZsWJc+jh8/7gLoSqmqqnIBtn37dhobG0lLS0PTNEaN8r5wrAqFTPNoDjV8D174ap9h/mrK9V7LeN6MftLj5e+//54LFy54pC7uueceTp8+jaqq7Nq1i8zMTBdop0+fZt26dRQXF9PQ0MB9991HUVGRy9SklEgpURSFBQsWUFZWRltbG21tba7M2Wg04nA4uHixw1juuusuSkpKAjL3vS1HSa/JA0XvMcwH4W2dzDJ7pzwGDhzIyJEju7zKyso4fbpjK3J6ejozZsxwC+ExMTFs3LiRsrIyHnzwQXJyclzgtLS0kJeXx4YNG5BSUlBQQEVFBfPmzXP1sX79eioqKigpKbmmQDHGEMtANQRva2YBm5gFhbQAlnycTqeLVq2vr2f16tWua6tWrfJKZCUnJ/P6668D0NrayrZt23jhhRc4deoUFouFRYsWMXDgQOx2OwcOHHBl3vfffz8RERE0NjZeE0ARioVU43BKWo56LDsC1qA4XSTDdVF+w3Zubi7PPfccNTU1rF+/nrq6OgDmz5/P5MmT/WbiH3zwAbNmzWLJkiWcOnUKgPb2drZu3QrAJ598wrlz5wCYMmUK4eHh3Uo1FCE6NzfYu6FB0skM0wh0fhbeTp48yYYNG6ivr6e4uNjlE4xGI8uXL/fpE44ePUpOTg4lJSVuLOLEiRPJyclxmdU777zjVvz2hIwxDu082qFdK0A2Ms1j/TbbsWMHra2tAG4VeEpKCuPGeV5Tq6mpYc2aNRQUFNDe3n45BA8dSm5uLllZWa5i1Wq1snv3ble5MWfOnG7x5BL4S9NnZNdu8lqTBWRiYYqRScZhfts9+eSTHDhwgMzMTNegAA4ePMhtt93GwYMH3cwpLy+PlJQU8vPzXeBERUWRm5vLp59+yuLFi936qa6u5osvvgAgNjaW5ORkn5SJT3pX2sk9/zb3//gnzktn9/Kg0fqYgJacVVUlJSWFnTt3UlpayooVKzh06BAOh4Py8nJXaL4Uwb755huXpul0Oh566CFeeuklFyd9tezfv9/VR3p6Okaj0a2ATU1NddEkvqTO0cxval/lv5u/AEV37XTHJdJsRXgmOZGLrqmgLCoqYu3atYwYMaJLblJdXc2kSZNIS0sjJyeH0aNH+zQZp9PJsWPH2LlzJ2lpaW4ZsicN8tTX4baT3PfDBr5xNPrnpCU2/wA5WjgQk8OtpoRrtvW6ujqsVivR0dEei9UhQ4a4mdL1EId0svXiR/zm7GvUSxnYwqHEpnWe1PPaJkQ1k2oc2q2Hu0SUeZphf+bQE2KVdnLOvcUfGnbTruiC2sypdR5j9Gpe6eaR6IVGb5Uf7Q088MN/8r71O7/+pusMSqn5JkScjNRHc8HRQqhi6lU7y6SUHGz9miW1r1LpuOgxxwkAIaegMvsCiFDvv+RgmBrKdFMi80MmM9s8ihDF+LMH6NWG3fz7ubdouET6XZu0CiqXngUi/UxH53s7FqFjuimRBZbxzDKPIV4XdcPp1yvlgrOV5WeLyW/8EJRubzZtElQu/TsQG6T+Ag76oJKsj2auZRzzLeNJ1A/EohgQN+iYa1V7LY/U5nPAWu2V3wlS6gUnlh5GMK57Bm9HlZIRuv7MNCVyd5+ppBkTMCr6nwycfS1HeODHP1LjtAa05h5gLVIjqMz+AMTMHvKMne9thCtmMkxJ3B0ykTTTSGK1ftfNyRc17uex2s209fyEHNSQ4msEPQPQJQCEiQYk/9PyJdtaPidcaIzVx3BnyCQyzaOJ1w3AKHQ9BlirdNB2XaCXp7SOk77XyWcIBYlCPbCvvZp9577FIN4mWXcTs81JLAhJJcUY3+08a7ppJAahdhy/7NkBlAtOPjoOh/wI+Oli9xWmOEAJ4Q7LeOZaxjLVNIJoNTxozWp12ph2Ooe/tdd2J6R3KTNQnOmXjmRWADduC710InDSV+i5xTiU+SGTSDeNIlbXL+BDeb898zovN37YcwAhv8PaOFol/6iDp8ZHgZh+wwASAoRCK5Ljtjr+2nyYgsZ9vNdcQY3tHKGqhQFqqG/NEhrFjfugp045SjZzc/FfO37x1CMDaVcOA1E/s3qhg/eTVoZofZlnHsc8yzhuMSUSobjvAmlxthP17T/T3DMaVI+didxccPJyb1XZzyDFH37eBZYDRToZoFqYZhzmMsWbtDA0oTK3Jo93W09038yEXMGw/8rtIMwuyd4ZGjHDS4H0XlKNgrQRquiZZIhjnnkMtc5m/qNhdzezaPkR0jyThI1Wd4AATvyqP0J9HxhNbxIJHX865fC8Qhp4RyfAOYvhhdWXvnHPyRMKzyLsC4EvexVAgg6t6V4mfRyp3H0lOF0BAjr+P8eagZR7+eXI/4Ejg4RNXbboe67qhhedob3xduDfkJz7h4VFUoeUK1DtGVdrzpXK6VuOLRmCpj2OkAuRxCGEvpej0g6iGtiOzplP3OaT+DjtG3g8/PxBC2bdGBQlFZiElHFAHEJYcKLv3OcokFJBwA35m0AJCNHxByISBwIb0AycAnkKRDnIj7E2fk7y202BdPv/6tNzWzYBx34AAAAASUVORK5CYII=" />
                    {/* <button id="menuButton"  style="Widget.AppCompat.Button.Colored" text="菜单" w="40" h="40" bg={appConfig.floatyTheme} textColor="#ffffff" textSize="12sp" style="@style/Widget.AppCompat.Button.Colored" /> */}
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
        logger.error("创建悬浮窗出错: " + e);
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
                        running: false
                    }
                });

                logger.info("已发送停止命令");
                toggleControlPanel();
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
                console.log("切换暂停状态", isPaused);

                // 更新配置
                appConfig.update({
                    readComic: {
                        isPaused: isPaused
                    }
                });

                // 更新UI
                floatyWindow.pauseButton.setText(isPaused ? "继续" : "暂停");
                // toast(isPaused ? "已暂停" : "已继续");
                logger.info(isPaused ? "已暂停阅读" : "已继续阅读");
            } catch (e) {
                logger.error("调用暂停方法出错: ", e);
            }
        });

        // 设置按钮
        floatyWindow.settingsButton.setOnClickListener(function (view) {
            // 收起控制面板
            toggleControlPanel();

            // 暂停程序
            appConfig.update({
                readComic: {
                    isPaused: true
                }
            });

            // 显示设置对话框
            showSettingsDialog().then(() => {
                // 对话框关闭后继续运行程序
                appConfig.update({
                    readComic: {
                        isPaused: true,
                    }
                });
            });
        });

        // 退出按钮
        floatyWindow.exitButton.setOnClickListener(function (view) {
            // 收起控制面板
            toggleControlPanel();

            // 暂停程序
            appConfig.update({
                readComic: {
                    isPaused: true
                }
            });

            dialogs.confirm("确认退出", "确定要退出脚本吗？", function (confirmed) {
                if (confirmed) {
                    toast("正在退出...");
                    try {
                        // 更新配置，设置shouldExit为true
                        appConfig.update({
                            readComic: {
                                running: false,
                                isPaused: false
                            }
                        });

                        // 关闭悬浮窗
                        if (floatyWindow) {
                            floatyWindow.close();
                            floatyWindow = null;
                        }

                        // 停止Rhino脚本执行引擎
                        if (rhinoEngine) {
                            engines.stopAll();
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
                } else {
                    // 用户取消退出，继续运行程序
                    appConfig.update({
                        readComic: {
                            isPaused: false
                        }
                    });
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
    return new Promise((resolve, reject) => {
        try {
            logger.info("显示设置对话框");

            // 创建视图
            let view = ui.inflate(
                <vertical padding="16">
                    <vertical padding="16">
                        <text text="激活码：" textSize="14sp" />
                        <input id="activationCode" textSize="14sp" hint="请输入激活码" gravity="center" text={appConfig.activationKey} />
                    </vertical>
                </vertical>
            );

            // 创建对话框
            let dialog = dialogs.build({
                title: "阅读设置",
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



                    toast("设置已保存");
                    dialog.dismiss();
                    resolve();
                } catch (e) {
                    console.error("保存设置时出错: " + e);
                    logger.error("保存设置时出错", e);
                    toast("保存设置失败: " + e);
                    dialog.dismiss();
                    reject(e);
                }
            });

            // 设置取消按钮点击事件
            dialog.on("negative", () => {
                dialog.dismiss();
                resolve();
            });

            // 设置重置按钮点击事件
            dialog.on("neutral", () => {
                // 重置设置
                appConfig.resetConfig();
                toast("设置已重置为默认值");
                logger.info("设置已重置为默认值");
                // 关闭当前对话框并重新打开
                dialog.dismiss();
                setTimeout(() => {
                    showSettingsDialog().then(resolve);
                }, 500);
            });

            // 显示对话框
            dialog.show();
            logger.info("设置对话框已显示");
        } catch (e) {
            logger.error("显示设置对话框时出错", e);
            toast("显示设置对话框失败: " + e);
            reject(e);
        }
    });
}

//! 设置历史页面 和 android页面的自带的选项菜单的监听

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

    logger.info("资源清理完成");
});

