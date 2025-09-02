import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { getDirectusImageUrl } from '../utils/directus';
import { logger } from '../utils/logger';

interface CarouselModalProps {
  visible: boolean;
  onClose: () => void;
  products: any[];
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const CarouselModal: React.FC<CarouselModalProps> = ({ visible, onClose, products }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 过滤出有主图的商品
  const validProducts = products.filter(product => product.main_image);

  useEffect(() => {
    if (visible && validProducts.length > 0) {
      // 开始自动轮播
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % validProducts.length);
      }, 5000); // 每5秒切换
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [visible, validProducts.length]);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(0);
      setLoading(true);
      setControlsVisible(true);
    }
  }, [visible]);

  // 控制按钮自动隐藏逻辑
  useEffect(() => {
    if (visible) {
      // 清除之前的定时器
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
      
      // 设置5秒后隐藏控制按钮
      hideControlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 5000);
    }

    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, [visible]);

  // 重置隐藏定时器的函数
  const resetHideTimer = () => {
    setControlsVisible(true);
    
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    
    hideControlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 5000);
  };

  const handleImageLoad = () => {
    setLoading(false);
  };

  const handleImageError = () => {
    setLoading(false);
  };

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? validProducts.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % validProducts.length);
  };

  if (!visible || validProducts.length === 0) {
    return null;
  }

  const currentProduct = validProducts[currentIndex];
  const imageUrl = currentProduct.main_image 
    ? getDirectusImageUrl(
        currentProduct.main_image, 
        Math.round(screenWidth), 
        Math.round(screenHeight),
        90 // 高质量
      )
    : null;

  // 结构化日志
  logger.debug('CarouselModal', `轮播状态更新 - 当前索引: ${currentIndex}, 商品: ${currentProduct?.name}, 总数: ${validProducts.length}`);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={resetHideTimer}>
        <View style={styles.modalContainer}>
          {/* 关闭按钮 */}
          {controlsVisible && (
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={30} color="white" />
            </TouchableOpacity>
          )}

          {/* 图片计数器 */}
          {controlsVisible && (
            <View style={styles.counter}>
              <Text style={styles.counterText}>
                {currentIndex + 1} / {validProducts.length}
              </Text>
            </View>
          )}

        {/* 主图片区域 - 填充整个屏幕 */}
        <View style={styles.imageContainer}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="white" />
            </View>
          )}
          
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.mainImage}
              resizeMode="cover" // 改为cover，填充整个容器
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          ) : (
            <View style={styles.noImageContainer}>
              <Text style={styles.noImageText}>暂无图片</Text>
            </View>
          )}

          {/* 左右切换按钮 */}
          {controlsVisible && (
            <>
              <TouchableOpacity style={styles.prevButton} onPress={goToPrevious}>
                <Ionicons name="chevron-back" size={40} color="white" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.nextButton} onPress={goToNext}>
                <Ionicons name="chevron-forward" size={40} color="white" />
              </TouchableOpacity>
            </>
          )}

          {/* 商品信息覆盖层 - 在图片底部 */}
          {controlsVisible && (
            <View style={styles.overlayInfo}>
              <Text style={styles.overlayProductName} numberOfLines={2}>
                {currentProduct.name || '商品名称'}
              </Text>
              <Text style={styles.overlayProductPrice}>
                ¥{currentProduct.price || '0.00'}
              </Text>
            </View>
          )}
        </View>

        {/* 底部指示器 */}
        {controlsVisible && (
          <View style={styles.indicators}>
            {validProducts.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.indicator,
                  { backgroundColor: index === currentIndex ? 'white' : 'rgba(255,255,255,0.3)' }
                ]}
                onPress={() => setCurrentIndex(index)}
              />
            ))}
          </View>
        )}

        {/* 自动播放状态 */}
        {controlsVisible && (
          <View style={styles.autoPlayIndicator}>
            <Ionicons name="play" size={16} color="white" />
            <Text style={styles.autoPlayText}>自动播放中</Text>
          </View>
        )}
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counter: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  counterText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  imageContainer: {
    flex: 1,
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -25 }],
    zIndex: 999,
  },
  mainImage: {
    width: screenWidth,
    height: screenHeight,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  prevButton: {
    position: 'absolute',
    left: 20,
    top: '50%',
    transform: [{ translateY: -20 }],
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButton: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -20 }],
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayInfo: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'center',
  },
  overlayProductName: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  overlayProductPrice: {
    color: '#ff6b35',
    fontSize: 26,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  indicators: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  autoPlayIndicator: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  autoPlayText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 4,
  },
  noImageContainer: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  noImageText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
  },
});

export default CarouselModal;
