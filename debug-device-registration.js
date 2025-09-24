// 设备注册调试工具
// 在浏览器控制台中运行此代码来调试设备注册功能

console.log('🔧 设备注册调试工具');
console.log('==================');

// 1. 检查当前设备信息
function checkDeviceInfo() {
  console.log('\n📱 当前设备信息:');
  console.log('localStorage device_id:', localStorage.getItem('device_id'));
  console.log('localStorage device_android_id:', localStorage.getItem('device_android_id'));
  
  // 如果存在window.deviceStartupManager
  if (typeof window !== 'undefined' && window.deviceStartupManager) {
    console.log('DeviceStartupManager:', window.deviceStartupManager);
  }
}

// 2. 清除设备存储（模拟首次启动）
function clearDeviceStorage() {
  console.log('\n🗑️ 清除设备存储...');
  localStorage.removeItem('device_id');
  localStorage.removeItem('device_android_id');
  console.log('✅ 设备存储已清除');
  console.log('💡 请刷新页面以触发首次启动流程');
}

// 3. 强制设置首次启动状态
function forceFirstTimeState() {
  console.log('\n🔄 强制设置首次启动状态...');
  clearDeviceStorage();
  
  // 设置一个标记来强制首次状态
  localStorage.setItem('force_first_time', 'true');
  window.location.reload();
}

// 4. 测试设备注册API
async function testDeviceRegistration() {
  console.log('\n🧪 测试设备注册API...');
  
  const deviceData = {
    android_id: 'web_browser_device_debug_' + Date.now(),
    brand: 'Apple',
    manufacturer: 'Apple Inc.',
    model_name: 'MacBook Pro',
    device_type: 'web',
    device_name: 'Apple MacBook Pro (调试)',
    os_name: 'macOS',
    os_version: '14.0',
    total_memory: '16384'
  };
  
  try {
    const response = await fetch('http://localhost:3001/api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer CCZnVSanwCwzS6edoC8t2ImbzJiZLeAD',
      },
      body: JSON.stringify({
        query: `
          mutation RegisterDevice($data: create_terminals_input!) {
            create_terminals_item(data: $data) {
              id
              android_id
              device_name
              brand
              manufacturer
              model_name
              device_type
              os_name
              os_version
              total_memory
              date_created
            }
          }
        `,
        variables: { data: deviceData }
      })
    });
    
    const result = await response.json();
    console.log('✅ API测试结果:', result);
    
  } catch (error) {
    console.error('❌ API测试失败:', error);
  }
}

// 暴露函数到全局作用域
window.debugDevice = {
  checkDeviceInfo,
  clearDeviceStorage,
  forceFirstTimeState,
  testDeviceRegistration
};

console.log('\n📝 可用命令:');
console.log('- debugDevice.checkDeviceInfo() - 检查当前设备信息');
console.log('- debugDevice.clearDeviceStorage() - 清除设备存储');
console.log('- debugDevice.forceFirstTimeState() - 强制首次启动状态');
console.log('- debugDevice.testDeviceRegistration() - 测试注册API');

console.log('\n🚀 开始调试...');
checkDeviceInfo();