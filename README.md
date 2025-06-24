# 激活码验证试错机制

## 概述

为 `main.js` 中的 `checkInvitationCode` 函数和 `rhino.js` 中的 `checkActivationStatus` 函数添加了试错机制，以提高网络请求的稳定性和用户体验。

## 功能特性

### 1. 通用重试函数 (utils.js)

在 `utils.js` 中添加了两个新的重试函数：

#### `retryOperation(operation, options)`
- **功能**: 通用重试函数，支持任意操作的重试
- **参数**:
  - `operation`: 要重试的操作函数
  - `options`: 重试选项对象
    - `maxRetries`: 最大重试次数 (默认: 3)
    - `retryDelay`: 重试延迟时间，毫秒 (默认: 2000)
    - `exponentialBackoff`: 是否使用指数退避 (默认: false)
    - `onRetry`: 重试时的回调函数
    - `onError`: 最终失败时的回调函数

#### `retryNetworkRequest(requestFn, options)`
- **功能**: 专门用于网络请求的重试函数
- **特性**:
  - 默认使用指数退避策略
  - 内置错误处理和日志记录
  - 自动重试网络相关错误

### 2. 激活码验证优化

#### main.js - checkInvitationCode
- 使用 `utils.retryNetworkRequest` 进行网络请求重试
- 最大重试次数: 3次
- 重试延迟: 2秒 (指数退避)
- 用户友好的重试提示
- 区分业务逻辑错误和网络错误

#### rhino.js - checkActivationStatus
- 使用 `utils.retryOperation` 进行状态检查重试
- 最大重试次数: 3次
- 重试延迟: 2秒 (指数退避)
- 详细的日志记录
- 优雅的错误处理

## 使用示例

```javascript
// 使用通用重试函数
utils.retryOperation(
  () => {
    // 你的操作代码
    return someOperation();
  },
  {
    maxRetries: 3,
    retryDelay: 2000,
    exponentialBackoff: true,
    onRetry: (error, retryCount, delay) => {
      console.log(`第${retryCount}次重试，等待${delay}ms`);
    },
    onError: (error, retryCount) => {
      console.log(`重试${retryCount}次后失败`);
    }
  }
);

// 使用网络请求重试函数
utils.retryNetworkRequest(
  () => {
    return http.get(url);
  },
  {
    maxRetries: 3,
    retryDelay: 2000
  }
);
```

## 错误处理策略

1. **网络错误**: 自动重试
2. **业务逻辑错误**: 不重试，直接返回结果
3. **解析错误**: 重试
4. **超时错误**: 重试

## 用户体验改进

- 重试过程中显示进度提示
- 失败后提供明确的错误信息
- 避免因临时网络问题导致的激活失败
- 减少用户手动重试的需求

## 配置参数

可以通过修改以下参数来调整重试行为：

```javascript
const retryConfig = {
  maxRetries: 3,        // 最大重试次数
  retryDelay: 2000,     // 基础重试延迟 (毫秒)
  exponentialBackoff: true  // 是否使用指数退避
};
```

## 注意事项

1. 重试机制仅处理网络相关错误，业务逻辑错误不会重试
2. 指数退避策略可以避免对服务器造成过大压力
3. 所有重试操作都有详细的日志记录，便于问题排查
4. 重试过程中会检查应用状态，确保不会在应用停止时继续重试
