import React, { useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useGetCategoriesQuery, useGetProductsByBoutiqueQuery } from '../generated/graphql';
import { API_CONFIG } from '../config/api';
import { configManager } from '../utils/configManager';
import { useCurrentUser } from '../hooks/useCurrentUser';

const NetworkTestScreen = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const router = useRouter();
  
  // 获取当前用户和配置
  const { user: currentUser } = useCurrentUser();
  const currentConfig = configManager.getConfig();
  
  const { data: categoriesData, loading: categoriesLoading, error: categoriesError } = useGetCategoriesQuery({
    variables: {
      boutiqueId: currentConfig.selectedBoutiqueId || "",
      filter: {},
      limit: 100,
      offset: 0
    },
    skip: !currentConfig.selectedBoutiqueId,
  });
  
  const { data: productsData, loading: productsLoading, error: productsError } = useGetProductsByBoutiqueQuery({
    variables: {
      boutiqueId: currentConfig.selectedBoutiqueId || "",
      filter: {},
      limit: 100,
      offset: 0
    },
    skip: !currentConfig.selectedBoutiqueId,
  });

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testDirectusConnection = async () => {
    addTestResult('🔄 开始测试 Directus 连接...');
    
    // 测试代理健康检查
    try {
      addTestResult('🧪 测试代理服务器健康状态...');
      const healthResponse = await fetch('http://localhost:3001/health');
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        addTestResult(`✅ 代理服务器运行正常: ${healthData.message}`);
      } else {
        addTestResult(`❌ 代理服务器健康检查失败: ${healthResponse.status}`);
      }
    } catch (error) {
      addTestResult(`🚨 代理服务器连接失败: ${error}`);
      addTestResult('💡 请确保代理服务器正在运行: npm run proxy');
    }

    // 测试通过代理的GraphQL查询
    try {
      addTestResult('🔄 通过代理测试GraphQL查询...');
      const response = await fetch('http://localhost:3001/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer CCZnVSanwCwzS6edoC8-2ImbzJiZLeAD',
        },
        body: JSON.stringify({
          query: '{ products(limit: 2) { id name } }'
        }),
      });

      addTestResult(`📡 代理GraphQL状态: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        addTestResult(`✅ 代理GraphQL调用成功`);
        addTestResult(`📊 数据: ${JSON.stringify(data).substring(0, 100)}...`);
      } else {
        addTestResult(`❌ 代理GraphQL错误: ${response.status}`);
      }
    } catch (error) {
      addTestResult(`🚨 代理GraphQL网络错误: ${error}`);
    }

    // 测试直接连接（用于对比）
    try {
      addTestResult('🔄 测试直接API连接（对比）...');
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query GetCategories {
              categories {
                id
                name
              }
            }
          `,
        }),
      });

      addTestResult(`📡 直接连接状态: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        addTestResult(`✅ 直接API调用成功`);
        addTestResult(`📊 数据: ${JSON.stringify(data).substring(0, 100)}...`);
      } else {
        addTestResult(`❌ 直接连接HTTP错误: ${response.status}`);
      }
    } catch (error) {
      addTestResult(`🚨 直接连接网络错误: ${error}`);
      addTestResult(`💡 这可能是CORS错误，使用代理可以解决`);
    }
  };

  const testApolloQueries = () => {
    addTestResult('🔄 测试 Apollo Client 查询...');
    
    if (categoriesLoading || productsLoading) {
      addTestResult('⏳ Apollo查询加载中...');
    }
    
    if (categoriesError) {
      addTestResult(`❌ 分类查询错误: ${categoriesError.message}`);
    } else if (categoriesData) {
      addTestResult(`✅ 分类查询成功: 获取到 ${categoriesData.categories?.length || 0} 个分类`);
    }
    
    if (productsError) {
      addTestResult(`❌ 商品查询错误: ${productsError.message}`);
    } else if (productsData) {
      addTestResult(`✅ 商品查询成功: 获取到 ${productsData.products?.length || 0} 个商品`);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const resetConfig = async () => {
    try {
      await configManager.resetConfig();
      addTestResult('🔄 配置已重置');
    } catch (error) {
      addTestResult(`❌ 重置配置失败: ${error}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 网络连接测试</Text>
      
      <View style={styles.buttonContainer}>
        <Button title="测试直接API调用" onPress={testDirectusConnection} />
        <Button title="测试Apollo查询" onPress={testApolloQueries} />
        <Button title="清除结果" onPress={clearResults} color="#ff6b6b" />
      </View>
      
      <Text style={styles.subtitle}>状态信息:</Text>
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          分类查询: {categoriesLoading ? '⏳ 加载中' : categoriesError ? '❌ 错误' : categoriesData ? '✅ 成功' : '⭕ 未开始'}
        </Text>
        <Text style={styles.statusText}>
          商品查询: {productsLoading ? '⏳ 加载中' : productsError ? '❌ 错误' : productsData ? '✅ 成功' : '⭕ 未开始'}
        </Text>
      </View>

      <Text style={styles.subtitle}>测试结果:</Text>
      <ScrollView style={styles.resultsContainer}>
        {testResults.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
        {testResults.length === 0 && (
          <Text style={styles.placeholderText}>点击上方按钮开始测试</Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 10,
  },
  statusContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  statusText: {
    fontSize: 16,
    marginBottom: 5,
  },
  resultsContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    flex: 1,
  },
  resultText: {
    fontSize: 14,
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
  configSection: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  configTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
});

export default NetworkTestScreen;
