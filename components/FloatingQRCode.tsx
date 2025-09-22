import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  TouchableOpacity,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import Draggable from 'react-native-draggable';

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
  
  // 计算初始位置
  const getInitialPosition = () => {
    const topSafeArea = Platform.OS === 'ios' ? 60 : 40;
    return {
      x: screenWidth * 0.7, 
      y: topSafeArea + 20,
    };
  };

  const qrCodeValue = `https://carture.matrix-net.tech/?boutique_id=${boutiqueId}`;

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  if (!visible || !boutiqueId) {
    return null;
  }

  const componentSize = isExpanded ? (Platform.OS === 'ios' ? 180 : 170) : 55;
  const initialPos = getInitialPosition();

  return (
    <Draggable
      x={initialPos.x}
      y={initialPos.y}
      minX={0}
      maxX={screenWidth - componentSize}
      minY={Platform.OS === 'ios' ? 60 : 40}
      maxY={screenHeight - componentSize - (Platform.OS === 'ios' ? 100 : 80)}
      renderSize={componentSize}
      renderColor="transparent"
      shouldReverse={false}
      onDrag={() => {}} // 拖动时的回调（必需）
      onDragRelease={() => {}} // 释放时的回调
      onShortPressRelease={() => {}} // 短按释放的回调
      onPressIn={() => {}} // 按下时的回调（必需）
      onPressOut={() => {}} // 松开时的回调（必需）
      onLongPress={() => {}} // 长按的回调
      onRelease={() => {}} // 释放的回调（必需）
    >
      <View style={[
        styles.content, 
        isExpanded && styles.expandedContent,
        {
          width: componentSize,
          height: componentSize,
        }
      ]}>
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

        {/* 拖拽指示器 */}
        <View style={styles.dragIndicator}>
          <View style={styles.dragLine} />
          <View style={styles.dragLine} />
          <View style={styles.dragLine} />
        </View>
      </View>
    </Draggable>
  );
};

const styles = StyleSheet.create({
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