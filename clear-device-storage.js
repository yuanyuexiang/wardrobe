const { AsyncStorage } = require('@react-native-async-storage/async-storage');

console.log('清除设备存储，模拟首次启动...');

// 在浏览器环境中清除localStorage
if (typeof window !== 'undefined' && window.localStorage) {
  console.log('清除localStorage中的设备ID...');
  window.localStorage.removeItem('device_id');
  window.localStorage.removeItem('device_android_id');
  console.log('✅ localStorage已清除');
}

// 提示刷新页面
console.log('💡 请刷新页面以模拟首次启动体验');

// 也可以通过URL参数强制首次状态
console.log('🔗 或者访问: http://localhost:8081?force_first_time=true');