"ui";

// 布局界面
ui.layout(
    <vertical padding="16">
        <text textSize="18sp" textColor="#333333" text="AutoJS无障碍服务检查工具" gravity="center" margin="0 10" />
        <text id="statusText" textSize="16sp" text="检查中..." margin="0 10" />
        <button id="checkBtn" text="检查无障碍服务" style="Widget.AppCompat.Button.Colored" margin="0 10" />
        <button id="enableBtn" text="启用无障碍服务" style="Widget.AppCompat.Button.Colored" margin="0 10" />
        <button id="restartBtn" text="重启无障碍服务" style="Widget.AppCompat.Button.Colored" margin="0 10" visibility="gone" />
        <text textSize="14sp" text="常见问题：" textColor="#666666" margin="0 20 0 5" />
        <scroll>
            <vertical>
                <text textSize="14sp" text="1. 无障碍服务已启用但未运行：通常需要重启服务或设备" textColor="#666666" margin="10 5" />
                <text textSize="14sp" text="2. Android 10及以上版本权限更严格，建议在应用内授予额外权限" textColor="#666666" margin="10 5" />
                <text textSize="14sp" text="3. 部分设备需要在'后台启动设置'中授予权限" textColor="#666666" margin="10 5" />
                <text textSize="14sp" text="4. 如果重启无障碍服务后仍不工作，请尝试重启设备" textColor="#666666" margin="10 5" />
                <text textSize="14sp" text="5. 确保AutoJS有悬浮窗权限和后台运行权限" textColor="#666666" margin="10 5" />
            </vertical>
        </scroll>
    </vertical>
);

// 检查无障碍服务状态并更新UI
function checkAccessibilityStatus() {
    if (auto.service) {
        try {
            // 执行一个无障碍操作测试服务是否真正运行
            let test = id("test_nonexistent_id").exists();
            ui.statusText.setText("无障碍服务状态: 已启用且运行正常");
            ui.statusText.setTextColor(android.graphics.Color.parseColor("#4CAF50"));
            ui.restartBtn.setVisibility(android.view.View.GONE);
            return true;
        } catch (e) {
            if (e.toString().indexOf("无障碍服务已启用但并未运行") != -1) {
                ui.statusText.setText("无障碍服务状态: 已启用但未运行，需要重启");
                ui.statusText.setTextColor(android.graphics.Color.parseColor("#FFA500"));
                ui.restartBtn.setVisibility(android.view.View.VISIBLE);
            } else {
                ui.statusText.setText("无障碍服务状态: 出现未知错误: " + e.message);
                ui.statusText.setTextColor(android.graphics.Color.parseColor("#F44336"));
                ui.restartBtn.setVisibility(android.view.View.VISIBLE);
            }
            return false;
        }
    } else {
        ui.statusText.setText("无障碍服务状态: 未启用");
        ui.statusText.setTextColor(android.graphics.Color.parseColor("#F44336"));
        ui.restartBtn.setVisibility(android.view.View.GONE);
        return false;
    }
}

// 启用无障碍服务
function enableAccessibilityService() {
    try {
        // 使用Auto.js内置方法
        toast("请在打开的设置页面中找到并启用Auto.js的无障碍服务");
        auto.waitFor();

        // 检查是否成功启用
        setTimeout(function () {
            if (checkAccessibilityStatus()) {
                toast("无障碍服务已成功启用");
            } else {
                toast("无障碍服务启用失败或未运行，请手动检查设置");
            }
        }, 3000);
    } catch (e) {
        toast("启用无障碍服务时出错: " + e.message);
        console.error("启用无障碍服务时出错:", e);
    }
}

// 重启无障碍服务
function restartAccessibilityService() {
    try {
        toast("正在尝试重启无障碍服务...");

        // 先关闭服务
        auto.service = false;
        sleep(1000);

        // 再启用服务
        auto.service = true;
        sleep(2000);

        // 检查状态
        if (checkAccessibilityStatus()) {
            toast("无障碍服务已成功重启");
        } else {
            // 如果程序控制重启失败，尝试引导用户手动操作
            toast("自动重启失败，将引导您手动重启");
            sleep(1000);
            app.startActivity({
                action: "android.settings.ACCESSIBILITY_SETTINGS"
            });
            toast("请在设置中找到Auto.js，关闭后再重新打开");
        }
    } catch (e) {
        toast("重启无障碍服务时出错: " + e.message);
        console.error("重启无障碍服务时出错:", e);
    }
}

// 初始检查
setTimeout(checkAccessibilityStatus, 500);

// 按钮事件
ui.checkBtn.on("click", function () {
    checkAccessibilityStatus();
});

ui.enableBtn.on("click", function () {
    enableAccessibilityService();
});

ui.restartBtn.on("click", function () {
    restartAccessibilityService();
});

// 提供打开设备设置的额外选项
ui.emitter.on("back_pressed", e => {
    e.consumed = true;
    let options = ["退出", "打开无障碍设置", "打开后台权限设置", "取消"];
    dialogs.select("请选择操作", options)
        .then(i => {
            switch (i) {
                case 0:
                    ui.finish();
                    break;
                case 1:
                    app.startActivity({
                        action: "android.settings.ACCESSIBILITY_SETTINGS"
                    });
                    break;
                case 2:
                    // 尝试打开后台权限设置
                    try {
                        app.startActivity({
                            action: "android.settings.APPLICATION_DETAILS_SETTINGS",
                            data: "package:" + context.getPackageName()
                        });
                        toast("请在应用设置中找到并允许'后台活动'和'后台弹出界面'权限");
                    } catch (e) {
                        toast("无法打开权限设置: " + e.message);
                    }
                    break;
                case 3:
                    // 取消操作
                    break;
            }
        });

    return true;
}); 