"ui";
/**
 * 作者：GallopingSteak
 * 邮箱：uglygirlvip@gmail.com 
 */
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

                                        <horizontal marginTop="16" gravity="center_vertical">
                                            <img src="@drawable/ic_save_black_48dp" w="24" h="24" tint={appConfig.theme} marginRight="8" />
                                            <button id="exportLogsBtn" text="导出日志" w="*" textColor="#ffffff" bg={appConfig.theme} />
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
    let logLevelMap = {
        0: "debug",
        1: "info",
        2: "warn",
        3: "error",
        4: "none"
    };
    appConfig.logging.logLevel = logLevelMap[$ui.logLevelSpinner.getSelectedItemPosition()];
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
            logLevel: appConfig.logging.logLevel,
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

    let deviceid = device.getAndroidId ? device.getAndroidId() : "tests";
    let facility = "script";
    let timestamp = new Date().getTime();
    let CDKEY = appConfig.activationKey;
    let apikey = appConfig.activation.apikey;   
    let baseUrl = appConfig.activation.baseUrl;
    let info = `${device.brand}|${device.model}|${device.width}|${device.product}|${device.sdkInt}|${device.release}|${device.buildId}|${device.buildId}|${device.getAndroidId()}|${appConfig.version}`
    console.log(`info:${info}`)
    // 生成签名
    let sign = generateActivationSign(CDKEY, deviceid, facility, info, timestamp, apikey);

    // 构建请求URL
    let url = `${baseUrl}/index.php/appv1/user/card_use?deviceid=${deviceid}&info=${info}&facility=${facility}&timestamp=${timestamp}&CDKEY=${CDKEY}&sign=${sign}`;

    logger.info("URL: " + `deviceid=${deviceid}&info=${info}&facility=${facility}&timestamp=${timestamp}&CDKEY=${CDKEY}&sign=${sign}`);

    if (!CDKEY) {
        toast('请输入激活码!!')
        if (callback) callback();
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
                    if (launcher.checkResults.storage && launcher.checkResults.accessibility && launcher.checkResults.floaty) {
                        saveConfigAndContinue()
                        if (callback) callback();
                        return
                    }
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
            if (callback) callback();
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
                toast("权限已全部通过,点击开始运行!!!")
            })
            .catch(e => {
                console.error("请求截图权限时出错: " + e);
                toast("请求截图权限失败");
                // 恢复复选框状态
                $ui.screenCapturePermission.checked = false;
                appConfig.permissions.screenCapture = false;
            })
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
                    <img id="menuButton" tin={appConfig.floatyTheme} w="40" h="40" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHEAAABxCAYAAADifkzQAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2dpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDYuMC1jMDAzIDc5LjE2NDUyNywgMjAyMC8xMC8xNS0xNzo0ODozMiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDoyMTEzNDZGOTAxN0QxMUVGODEyMUVFNUUwQkVDRURGMSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpFREJBODNGRTM5QUExMUVGQkYxMEVBMDFCOTlEQUZBRiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpFREJBODNGRDM5QUExMUVGQkYxMEVBMDFCOTlEQUZBRiIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjIuMSAoV2luZG93cykiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDozMEQyNzZGNzAxOEMxMUVGQTRFRUQ4RDlGMzIyRjI2NCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDozMEQyNzZGODAxOEMxMUVGQTRFRUQ4RDlGMzIyRjI2NCIvPiA8L3JkZjpEZXNjcmlw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" />
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
            let running = appConfig.readComic.running;
            toast(running ? "停止阅读" : "重新开始");
            try {
               
                // 更新配置，设置running为false
                appConfig.update({
                    readComic: {
                        running: !running,
                        isPaused: false
                    }
                });
                //当时停止状态，暂停按钮必须为暂停状态,并且不能点击
                if(!running){
                    floatyWindow.pauseButton.attr("enabled", false);
                }else{
                    floatyWindow.pauseButton.attr("enabled", true);
                }
                floatyWindow.pauseButton.setText("暂停");
                floatyWindow.stopButton.setText(!running ? "停止" : "开始");
                logger.info(running ? "停止命令" : "重新开始");
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
                        isPaused: false,
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
                        // appConfig.update({
                        //     readComic: {
                        //         running: false,
                        //         isPaused: false
                        //     }
                        // });

                        // // 关闭悬浮窗
                        // if (floatyWindow) {
                        //     floatyWindow.close();
                        //     floatyWindow = null;
                        // }

                        // // 停止Rhino脚本执行引擎
                        // if (rhinoEngine) {
                        //     engines.stopAll();
                        // }

                        // // 退出脚本
                        // setTimeout(function () {
                        //     ui.finish();
                        //     exit();
                        // }, 500);
                        utils.handleActivationExpired(appConfig,logger);
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
                title: "激活码设置",
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
                    //保存激活码
                    appConfig.update({
                        activationKey: view.activationCode.getText()
                    });
                    
                    dialog.dismiss();
                    resolve();
                } catch (e) {
                    logger.error("激活码保存设置时出错", e);
                    toast("保存失败请重启!!!");
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
