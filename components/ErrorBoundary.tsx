/**
 * 错误边界组件
 * 捕获React组件树中的JavaScript错误，并显示备用UI
 */
import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { logger } from '../utils/logger';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackComponent?: React.ComponentType<{ error: Error; onReset: () => void }>;
  onError?: (error: Error, errorInfo: any) => void;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // 更新状态以显示错误UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // 记录错误到日志系统
    logger.error('ErrorBoundary', '捕获到组件错误', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // 更新状态
    this.setState({
      error,
      errorInfo,
    });

    // 调用自定义错误处理器
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义错误组件，使用它
      if (this.props.fallbackComponent) {
        const FallbackComponent = this.props.fallbackComponent;
        return (
          <FallbackComponent 
            error={this.state.error!} 
            onReset={this.handleReset} 
          />
        );
      }

      // 默认错误UI
      return (
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={64} color="#ff6b35" />
            
            <Text style={styles.title}>出现错误</Text>
            <Text style={styles.message}>
              应用遇到了意外错误，我们已经记录了这个问题。
            </Text>

            {__DEV__ && this.state.error && (
              <ScrollView style={styles.errorDetails}>
                <Text style={styles.errorTitle}>错误详情（仅开发环境显示）:</Text>
                <Text style={styles.errorText}>{this.state.error.message}</Text>
                {this.state.error.stack && (
                  <Text style={styles.stackText}>{this.state.error.stack}</Text>
                )}
              </ScrollView>
            )}

            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={this.handleReset}
            >
              <Text style={styles.retryText}>重试</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// 便捷的Hook式错误边界
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallbackComponent?: React.ComponentType<{ error: Error; onReset: () => void }>
) => {
  return (props: P) => (
    <ErrorBoundary fallbackComponent={fallbackComponent}>
      <Component {...props} />
    </ErrorBoundary>
  );
};

// 简化的错误显示组件
export const SimpleErrorFallback: React.FC<{ error: Error; onReset: () => void }> = ({ 
  error, 
  onReset 
}) => (
  <View style={styles.simpleContainer}>
    <Text style={styles.simpleTitle}>加载失败</Text>
    <Text style={styles.simpleMessage}>请稍后重试</Text>
    <TouchableOpacity style={styles.simpleButton} onPress={onReset}>
      <Text style={styles.simpleButtonText}>重试</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  errorDetails: {
    maxHeight: 200,
    width: '100%',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#d32f2f',
    marginBottom: 8,
  },
  stackText: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'monospace',
  },
  retryButton: {
    backgroundColor: '#ff6b35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // 简化错误组件样式
  simpleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  simpleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  simpleMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  simpleButton: {
    backgroundColor: '#ff6b35',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  simpleButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ErrorBoundary;
