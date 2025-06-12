"ui";

/**
 * launcher.js
 * 应用启动器，专门处理各种权限和无障碍服务问题，确保主程序能够正常运行
 */

// 设置UI
ui.layout(
    <vertical padding="16">
        <text textSize="24sp" textColor="#FF5722" text="应用启动器" gravity="center" margin="0 20" />
        <text id="statusText" textSize="16sp" text="正在检查环境..." margin="0 20" />
        <progressbar id="progressBar" style="@android:style/Widget.ProgressBar.Horizontal" progress="0" />

        <vertical id="actionPanel" margin="0 30" visibility="gone">
            <button id="fixBtn" text="修复无障碍服务" style="Widget.AppCompat.Button.Colored" margin="0 10" />
            <button id="startBtn" text="启动应用" style="Widget.AppCompat.Button.Colored" margin="0 10" />
            <button id="settingsBtn" text="权限设置" style="Widget.AppCompat.Button.Colored" margin="0 10" />
        </vertical>

        <vertical id="logPanel" margin="0 10">
            <text textSize="14sp" text="环境检查日志:" textColor="#666666" />
            <scroll height="200">
                <text id="logText" textSize="12sp" textColor="#333333" margin="0 5" />
            </scroll>
        </vertical>
    </vertical>
);

// 初始化日志
var logText = "";
function log(message) {
    console.log(message);
    // logText += message + "\n";
    // ui.logText.setText(logText);
    // // 自动滚动到底部
    // ui.run(() => {
    //     let scrollView = ui.logPanel.getChildAt(1); // 获取ScrollView
    //     if (scrollView) {
    //         scrollView.fullScroll(android.view.View.FOCUS_DOWN);
    //     }
    // });
}

// 更新状态文本和进度条
function updateStatus(message, progress) {
    console.log(message);
    // ui.statusText.setText(message);
    // ui.progressBar.setProgress(progress);
}

// 检查环境
var checkResults = {
    storage: false,
    accessibility: false,
    floaty: false,
    devInfo: {}
};

// 启动主程序
function startMainApp() {
    log("准备启动主程序...");
    updateStatus("启动中...", 100);

    // 确保无障碍服务正常运行
    if (!auto.service) {
        log("无障碍服务未启用，尝试启用...");
        auto.waitFor();
        sleep(3000); // 等待服务启动
    }

    // 验证无障碍服务是否真正运行
    let serviceRunning = false;
    for (let i = 0; i < 3; i++) {
        try {
            let testResult = id("test_nonexistent_id").exists();
            serviceRunning = true;
            break;
        } catch (e) {
            if (e.toString().indexOf("无障碍服务已启用但并未运行") != -1) {
                log("等待无障碍服务完全启动...");
                sleep(2000);
                continue;
            }
        }
    }

    if (!serviceRunning) {
        log("无障碍服务未正常运行，请手动检查");
        updateStatus("无障碍服务未正常运行", 0);
        ui.actionPanel.setVisibility(android.view.View.VISIBLE);
        return;
    }

    setTimeout(() => {
        try {
            // 先启动主程序
            engines.execScriptFile("./main.js");
            log("已启动主程序");

            // 等待主程序初始化
            sleep(2000);

            // 再启动 rhino 脚本
            engines.execScriptFile("./rhino.js");
            log("已启动 rhino 脚本");

            setTimeout(() => {
                ui.finish();
            }, 1000);
        } catch (e) {
            log("启动程序失败: " + e);
            updateStatus("启动失败", 0);
            // ui.actionPanel.setVisibility(android.view.View.VISIBLE);
        }
    }, 1000);
}

// 检查所有必要条件
function checkEnvironment() {
    return new Promise((resolve, reject) => {
        updateStatus("检查存储权限...", 10);
        checkStoragePermission()
            .then(() => {
                updateStatus("检查无障碍服务...", 30);
                return checkAccessibilityService();
            })
            .then(() => {
                updateStatus("检查悬浮窗权限...", 50);
                return checkFloatyPermission();
            })
            .then(() => {
                updateStatus("收集设备信息...", 70);
                return collectDeviceInfo();
            })
            .then(() => {
                updateStatus("环境检查完成", 90);
                evaluateResults();
                resolve();
            })
            .catch(error => {
                log("检查过程中出错: " + error);
                updateStatus("检查失败", 0);
                // ui.actionPanel.setVisibility(android.view.View.VISIBLE);
                resolve();
            });
    });
}

// 检查存储权限
function checkStoragePermission() {
    return new Promise((resolve, reject) => {
        try {
            let hasPermission = files.isDir(files.getSdcardPath());
            log("存储权限: " + (hasPermission ? "已授权" : "未授权"));

            if (!hasPermission) {
                // 请求权限
                log("请求存储权限...");
                try {
                    let granted = runtime.requestPermissions(["android.permission.WRITE_EXTERNAL_STORAGE"]);
                    log("存储权限请求结果: " + (granted ? "成功" : "失败"));
                    checkResults.storage = granted;
                } catch (e) {
                    log("请求存储权限出错: " + e);
                    checkResults.storage = false;
                }
            } else {
                checkResults.storage = true;
            }

            resolve();
        } catch (e) {
            log("检查存储权限出错: " + e);
            checkResults.storage = false;
            resolve(); // 继续执行而不中断流程
        }
    });
}

// 检查无障碍服务
function checkAccessibilityService() {
    return new Promise((resolve, reject) => {
        try {
            if (!auto.service) {
                log("无障碍服务未启用");
                checkResults.accessibility = false;
            } else {
                // 检查无障碍服务是否真正运行
                try {
                    // 执行一个简单的无障碍操作测试服务是否工作
                    let testResult = id("test_nonexistent_id").exists();
                    log("无障碍服务已启用且运行正常");
                    checkResults.accessibility = true;
                } catch (e) {
                    if (e.toString().indexOf("无障碍服务已启用但并未运行") != -1) {
                        log("警告: 无障碍服务已启用但未运行，需要修复");
                        checkResults.accessibility = false;
                        checkResults.accessibilityNotRunning = true;
                    } else {
                        log("检查无障碍服务时出错: " + e);
                        checkResults.accessibility = false;
                    }
                }
            }

            resolve(checkResults.accessibility);
        } catch (e) {
            log("检查无障碍服务出错: " + e);
            checkResults.accessibility = false;
            resolve(checkResults.accessibility); // 继续执行而不中断流程
        }
    });
}

// 检查悬浮窗权限
function checkFloatyPermission() {
    return new Promise((resolve, reject) => {
        try {
            let hasPermission = false;
            if (android.os.Build.VERSION.SDK_INT >= 23) { // Android 6.0+
                hasPermission = android.provider.Settings.canDrawOverlays(context);
            } else {
                hasPermission = true; // 旧版Android默认允许
            }

            log("悬浮窗权限: " + (hasPermission ? "已授权" : "未授权"));
            checkResults.floaty = hasPermission;

            resolve();
        } catch (e) {
            log("检查悬浮窗权限出错: " + e);
            checkResults.floaty = false;
            resolve(); // 继续执行而不中断流程
        }
    });
}

// 收集设备信息
function collectDeviceInfo() {
    return new Promise((resolve, reject) => {
        try {
            checkResults.devInfo = {
                brand: device.brand,
                product: device.product,
                sdkInt: device.sdkInt,
                release: device.release,
                buildId: device.buildId
            };

            log("设备信息: " + JSON.stringify(checkResults.devInfo));
            resolve();
        } catch (e) {
            log("收集设备信息时出错: " + e);
            resolve(); // 继续执行而不中断流程
        }
    });
}

// 评估检查结果
function evaluateResults() {
    log("\n环境检查结果摘要:");
    log("存储权限: " + (checkResults.storage ? "通过" : "未通过"));
    log("无障碍服务: " + (checkResults.accessibility ? "通过" : "未通过"));
    log("悬浮窗权限: " + (checkResults.floaty ? "通过" : "未通过"));

    // 显示操作面板
    // ui.actionPanel.setVisibility(android.view.View.VISIBLE);

    if (checkResults.storage && checkResults.accessibility && checkResults.floaty) {
        updateStatus("环境检查通过，可以启动", 100);
        log("所有检查通过，可以启动主程序");

        // 自动启动主程序
        // setTimeout(startMainApp, 1500);
    } else {
        if (checkResults.accessibilityNotRunning) {
            updateStatus("无障碍服务已启用但未运行，需要修复", 50);
        } else if (!checkResults.accessibility) {
            updateStatus("无障碍服务未启用，请先启用", 30);
        } else if (!checkResults.floaty) {
            updateStatus("缺少悬浮窗权限，请授权", 60);
        } else {
            updateStatus("环境检查未通过，请解决问题后再启动", 40);
        }
    }
}

// 尝试修复无障碍服务
function fixAccessibilityService() {
    return new Promise((resolve, reject) => {
        if (!auto.service) {
            // 无障碍服务未启用，尝试启用
            threads.start(function () {
                log("无障碍服务未启用，尝试启用...");
                try {
                    auto.waitFor();
                    // 等待服务启动
                    sleep(3000);
                    // 验证服务是否真正运行
                    let serviceRunning = false;
                    for (let i = 0; i < 3; i++) {
                        try {
                            let testResult = id("test_nonexistent_id").exists();
                            serviceRunning = true;
                            break;
                        } catch (e) {
                            if (e.toString().indexOf("无障碍服务已启用但并未运行") != -1) {
                                log("等待无障碍服务完全启动...");
                                sleep(2000);
                                continue;
                            }
                        }
                    }
                    if (serviceRunning) {
                        log("无障碍服务已成功启用");
                        checkResults.accessibility = true;
                        resolve(true);
                    } else {
                        log("无障碍服务启用失败");
                        resolve(false);
                    }
                } catch (e) {
                    log("启用无障碍服务出错: " + e);
                    resolve(false);
                }
            });
        } else if (checkResults.accessibilityNotRunning) {
            // 无障碍服务已启用但未运行
            log("无障碍服务已启用但未运行，尝试重启...");
            try {
                auto.service = false;
                sleep(1000);
                auto.service = true;
                sleep(2000);

                // 再次检查
                try {
                    let testResult = id("test_nonexistent_id").exists();
                    log("无障碍服务已成功修复");
                    checkResults.accessibility = true;
                    checkResults.accessibilityNotRunning = false;
                    resolve(true);
                } catch (e) {
                    if (e.toString().indexOf("无障碍服务已启用但并未运行") != -1) {
                        log("重启无障碍服务失败，请尝试使用'无障碍服务检查工具'...");
                        resolve(false);
                    }
                }
            } catch (e) {
                log("修复无障碍服务出错: " + e);
                resolve(false);
            }
        } else {
            // 其他情况
            log("正在打开无障碍服务设置...");
            app.startActivity({
                action: "android.settings.ACCESSIBILITY_SETTINGS"
            });
            toast("请在设置中找到并启用Auto.js的无障碍服务");
            resolve(false);
        }
    });
}

// 打开系统设置
function openSystemSettings() {
    let items = [
        "无障碍服务设置",
        "悬浮窗权限设置",
        "应用详情设置",
        "电池优化设置",
        "运行无障碍检查工具",
        "取消"
    ];

    dialogs.select("请选择要打开的设置", items)
        .then(i => {
            switch (i) {
                case 0:
                    app.startActivity({
                        action: "android.settings.ACCESSIBILITY_SETTINGS"
                    });
                    break;
                case 1:
                    if (android.os.Build.VERSION.SDK_INT >= 23) {
                        app.startActivity({
                            action: "android.settings.action.MANAGE_OVERLAY_PERMISSION",
                            data: "package:" + context.getPackageName()
                        });
                    } else {
                        app.startActivity({
                            action: "android.settings.APPLICATION_DETAILS_SETTINGS",
                            data: "package:" + context.getPackageName()
                        });
                    }
                    break;
                case 2:
                    app.startActivity({
                        action: "android.settings.APPLICATION_DETAILS_SETTINGS",
                        data: "package:" + context.getPackageName()
                    });
                    break;
                case 3:
                    if (android.os.Build.VERSION.SDK_INT >= 23) {
                        app.startActivity({
                            action: "android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
                            data: "package:" + context.getPackageName()
                        });
                    } else {
                        toast("此功能仅支持Android 6.0及以上版本");
                    }
                    break;
                case 4:
                    engines.execScriptFile("./checkAccessibility.js");
                    break;
            }
        });
}

// 事件处理
ui.fixBtn.on("click", () => {
    fixAccessibilityService();
});

ui.startBtn.on("click", () => {
    startMainApp();
});

ui.settingsBtn.on("click", () => {
    openSystemSettings();
});

// 启动检查
// setTimeout(checkEnvironment, 500);

module.exports = {
    checkResults: checkResults,
    checkEnvironment: checkEnvironment,
    checkStoragePermission: checkStoragePermission,
    checkAccessibilityService: checkAccessibilityService,
    checkFloatyPermission: checkFloatyPermission,
    collectDeviceInfo: collectDeviceInfo,
    evaluateResults: evaluateResults,
    fixAccessibilityService: fixAccessibilityService,
};