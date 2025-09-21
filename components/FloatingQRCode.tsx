import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  TouchableOpacity,
  Animated,
  PanResponder,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface FloatingQRCodeProps {
  boutiqueId: string;
  visible?: boolean;
  onClose?: () => void;
}

const FloatingQRCode: React.FC<FloatingQRCodeProps> = ({ 
  boutiqueId, 
  visible = true, 
  onClose 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentPosition, setCurrentPosition] = useState({ x: screenWidth - 70, y: 120 });
  const pan = useRef(new Animated.ValueXY({ x: screenWidth - 70, y: 120 })).current;

  const qrCodeValue = `https://carture.matrix-net.tech/?boutique_id=${boutiqueId}`;

  // 创建PanResponder处理拖拽
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: currentPosition.x,
          y: currentPosition.y,
        });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gesture) => {
        pan.flattenOffset();
        
        // 计算最终位置
        const newX = currentPosition.x + gesture.dx;
        const newY = currentPosition.y + gesture.dy;
        
        // 边界检测和自动吸附
        let finalX = newX;
        let finalY = newY;
        
        // 水平边界检测（吸附到左右边缘）
        const compactSize = 55;
        const expandedSize = Platform.OS === 'ios' ? 180 : 170; // iOS和Android适配
        const componentWidth = isExpanded ? expandedSize : compactSize;
        const componentHeight = isExpanded ? expandedSize : compactSize;
        
        if (finalX < screenWidth / 2) {
          finalX = 15; // 吸附到左边，增加边距
        } else {
          finalX = screenWidth - componentWidth - 15; // 吸附到右边，增加边距
        }
        
        // 垂直边界限制，考虑状态栏和底部安全区域
        const topSafeArea = Platform.OS === 'ios' ? 60 : 40;
        const bottomSafeArea = Platform.OS === 'ios' ? 100 : 80;
        if (finalY < topSafeArea) finalY = topSafeArea;
        if (finalY > screenHeight - componentHeight - bottomSafeArea) {
          finalY = screenHeight - componentHeight - bottomSafeArea;
        }
        
        // 更新位置状态
        setCurrentPosition({ x: finalX, y: finalY });
        
        // 动画到最终位置
        Animated.spring(pan, {
          toValue: { x: finalX, y: finalY },
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  if (!visible || !boutiqueId) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
          width: isExpanded ? (Platform.OS === 'ios' ? 180 : 170) : 55,
          height: isExpanded ? (Platform.OS === 'ios' ? 180 : 170) : 55,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={[styles.content, isExpanded && styles.expandedContent]}>
        {/* 收缩状态 - 只显示二维码图标 */}
        {!isExpanded && (
          <TouchableOpacity
            style={styles.compactButton}
            onPress={handleToggleExpand}
            activeOpacity={0.8}
          >
            <Ionicons name="qr-code" size={24} color="#ff6b35" />
          </TouchableOpacity>
        )}

        {/* 展开状态 - 显示完整二维码 */}
        {isExpanded && (
          <View style={styles.expandedContainer}>
            {/* 标题栏 */}
            <View style={styles.header}>
              <Text style={styles.title}>店铺二维码</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsExpanded(false)}
              >
                <Ionicons name="close" size={18} color="#666" />
              </TouchableOpacity>
            </View>

            {/* 二维码 */}
            <View style={styles.qrContainer}>
              <QRCode
                value={qrCodeValue}
                size={Platform.OS === 'ios' ? 120 : 110}
                backgroundColor="white"
                color="black"
              />
            </View>
          </View>
        )}
      </View>

      {/* 拖拽指示器 */}
      <View style={styles.dragIndicator}>
        <View style={styles.dragLine} />
        <View style={styles.dragLine} />
        <View style={styles.dragLine} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 999,
    elevation: 10,
  },
  content: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 27.5, // 55/2 圆角
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 53, 0.3)', // 使用橙色边框
  },
  expandedContent: {
    borderRadius: 16,
    backgroundColor: 'white',
    borderColor: 'rgba(255, 107, 53, 0.2)',
    borderWidth: 1,
  },
  compactButton: {
    width: 55,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 27.5,
  },
  expandedContainer: {
    padding: 14,
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff6b35', // 使用橙色标题
  },
  closeButton: {
    padding: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 6,
    borderRadius: 8,
    flex: 1,
  },
  dragIndicator: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 16,
    height: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
    opacity: 0.4,
  },
  dragLine: {
    width: 10,
    height: 1.2,
    backgroundColor: '#ff6b35', // 使用橙色拖拽指示器
    borderRadius: 0.6,
  },
});

export default FloatingQRCode;