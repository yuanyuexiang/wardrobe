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
  const [currentPosition, setCurrentPosition] = useState({ x: screenWidth - 80, y: 100 });
  const pan = useRef(new Animated.ValueXY({ x: screenWidth - 80, y: 100 })).current;

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
        const componentWidth = isExpanded ? 200 : 60;
        const componentHeight = isExpanded ? 200 : 60; // 更新高度
        
        if (finalX < screenWidth / 2) {
          finalX = 10; // 吸附到左边
        } else {
          finalX = screenWidth - componentWidth - 10; // 吸附到右边
        }
        
        // 垂直边界限制
        if (finalY < 50) finalY = 50;
        if (finalY > screenHeight - componentHeight - 50) {
          finalY = screenHeight - componentHeight - 50;
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
          width: isExpanded ? 200 : 60,
          height: isExpanded ? 200 : 60, // 减少高度，因为移除了按钮
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
            <Ionicons name="qr-code" size={28} color="#007AFF" />
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
                <Ionicons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {/* 二维码 */}
            <View style={styles.qrContainer}>
              <QRCode
                value={qrCodeValue}
                size={140}
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
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  expandedContent: {
    borderRadius: 16,
    backgroundColor: 'white',
  },
  compactButton: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 30,
  },
  expandedContainer: {
    padding: 16,
    width: '100%',
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 8,
  },
  dragIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
    opacity: 0.3,
  },
  dragLine: {
    width: 12,
    height: 1.5,
    backgroundColor: '#007AFF',
    borderRadius: 0.75,
  },
});

export default FloatingQRCode;