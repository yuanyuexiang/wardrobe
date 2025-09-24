const fetch = require('cross-fetch');

const AUTH_TOKEN = 'CCZnVSanwCwzS6edoC8t2ImbzJiZLeAD';
const API_URL = 'http://localhost:3001/api/graphql';

// 查询现有设备
async function listDevices() {
  try {
    console.log('📋 查询现有设备...');
    
    const query = {
      query: `
        query {
          terminals {
            id
            android_id
            device_name
            brand
            manufacturer
            model_name
            device_type
            os_name
            os_version
            authorized_boutique {
              id
              name
            }
            date_created
          }
        }
      `
    };
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify(query)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`📱 找到 ${data.data.terminals.length} 台设备:`);
      
      data.data.terminals.forEach((terminal, index) => {
        console.log(`\n${index + 1}. ${terminal.device_name || '未知设备'}`);
        console.log(`   ID: ${terminal.id}`);
        console.log(`   Android ID: ${terminal.android_id}`);
        console.log(`   品牌: ${terminal.brand || '未知'}`);
        console.log(`   型号: ${terminal.model_name || '未知'}`);
        console.log(`   类型: ${terminal.device_type || '未知'}`);
        console.log(`   系统: ${terminal.os_name || '未知'} ${terminal.os_version || ''}`);
        console.log(`   授权精品店: ${terminal.authorized_boutique ? terminal.authorized_boutique.name : '未授权'}`);
        console.log(`   创建时间: ${terminal.date_created}`);
      });
      
      return data.data.terminals;
    } else {
      const error = await response.text();
      console.error('❌ 查询失败:', error);
      return [];
    }
  } catch (error) {
    console.error('❌ 网络错误:', error.message);
    return [];
  }
}

// 注册新设备
async function registerNewDevice(deviceData) {
  try {
    console.log('\n🔄 注册新设备...');
    console.log('📱 设备信息:', JSON.stringify(deviceData, null, 2));
    
    const mutation = {
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
      variables: {
        data: deviceData
      }
    };
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify(mutation)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ 设备注册成功!');
      console.log('📋 注册结果:', JSON.stringify(data.data.create_terminals_item, null, 2));
      return data.data.create_terminals_item;
    } else {
      const error = await response.text();
      console.error('❌ 注册失败:', error);
      return null;
    }
  } catch (error) {
    console.error('❌ 网络错误:', error.message);
    return null;
  }
}

// 删除测试设备（清理）
async function cleanupTestDevices() {
  try {
    console.log('\n🧹 清理测试设备...');
    
    // 首先查询所有测试设备
    const devices = await listDevices();
    const testDevices = devices.filter(d => d.android_id.startsWith('web_browser_device_test_'));
    
    if (testDevices.length === 0) {
      console.log('✅ 没有找到测试设备，无需清理');
      return;
    }
    
    console.log(`🗑️  找到 ${testDevices.length} 个测试设备，开始删除...`);
    
    for (const device of testDevices) {
      const deleteQuery = {
        query: `
          mutation DeleteDevice($id: ID!) {
            delete_terminals_item(id: $id) {
              id
            }
          }
        `,
        variables: { id: device.id }
      };
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`,
        },
        body: JSON.stringify(deleteQuery)
      });
      
      if (response.ok) {
        console.log(`✅ 已删除设备: ${device.device_name} (ID: ${device.id})`);
      } else {
        console.log(`❌ 删除设备失败: ${device.device_name} (ID: ${device.id})`);
      }
    }
  } catch (error) {
    console.error('❌ 清理失败:', error.message);
  }
}

// 完整的设备注册演示
async function deviceRegistrationDemo() {
  console.log('🚀 设备注册功能演示');
  console.log('=' * 50);
  
  // 1. 显示现有设备
  const existingDevices = await listDevices();
  
  // 2. 注册一个新设备
  const newDeviceData = {
    android_id: 'web_browser_device_demo_' + Date.now(),
    brand: 'Apple',
    manufacturer: 'Apple Inc.',
    model_name: 'MacBook Pro',
    device_type: 'web',
    device_name: 'Apple MacBook Pro (演示设备)',
    os_name: 'macOS',
    os_version: '14.0',
    total_memory: '16384'
  };
  
  const newDevice = await registerNewDevice(newDeviceData);
  
  if (newDevice) {
    console.log('\n🎉 设备注册演示成功完成!');
    console.log('📝 总结:');
    console.log(`   - 注册前设备数量: ${existingDevices.length}`);
    console.log(`   - 新注册设备ID: ${newDevice.id}`);
    console.log(`   - 新注册设备Android ID: ${newDevice.android_id}`);
    console.log(`   - 注册时间: ${newDevice.date_created}`);
    console.log('\n💡 提示:');
    console.log('   - 新设备现在处于"待审批"状态');
    console.log('   - 管理员可以在后台为设备分配精品店权限');
    console.log('   - 分配权限后，设备将能够正常使用应用');
  } else {
    console.log('\n❌ 设备注册演示失败');
  }
  
  // 3. 再次显示设备列表以确认注册
  console.log('\n📋 注册后的设备列表:');
  await listDevices();
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--cleanup')) {
    await cleanupTestDevices();
  } else if (args.includes('--list')) {
    await listDevices();
  } else {
    await deviceRegistrationDemo();
  }
}

main().catch(console.error);