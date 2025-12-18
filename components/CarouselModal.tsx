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
  StatusBar,
} from 'react-native';
import { useQuery } from '@apollo/client';
import { GetProductsByBoutiqueDocument } from '../generated/graphql';
import { getDirectusImageUrl } from '../utils/directus';
import { logger } from '../utils/logger';

interface CarouselModalProps {
  visible: boolean;
  onClose: () => void;
  products: any[];
  boutiqueId?: string;
  carouselInterval?: number; // 轮播间隔时间（秒）
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('screen'); // 使用 'screen' 而不是 'window' 来获取包含状态栏的完整屏幕尺寸

const CarouselModal: React.FC<CarouselModalProps> = ({ visible, onClose, products, boutiqueId, carouselInterval }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [localProducts, setLocalProducts] = useState(products);
  const intervalRef = useRef<number | null>(null);
  const hideControlsTimeoutRef = useRef<number | null>(null);
  const updateIntervalRef = useRef<number | null>(null);

  // 计算实际使用的轮播间隔（毫秒）
  // 如果 carouselInterval 为 0 或 null/undefined，使用默认的 5 秒
  const actualInterval = (carouselInterval && carouselInterval > 0) ? carouselInterval * 1000 : 5000;

  // GraphQL查询，用于定时更新
  const { data: queryData, refetch } = useQuery(GetProductsByBoutiqueDocument, {
    variables: {
      boutiqueId: boutiqueId || '',
      filter: { carousel: { _eq: "in" } }
    },
    skip: !boutiqueId || !visible,
    fetchPolicy: 'cache-first',
  });

  // 定时更新数据（测试模式 - 10秒）
  useEffect(() => {
    if (!visible || !boutiqueId) return;

    // 立即更新一次
    if (refetch) {
      logger.info('CarouselModal', '轮播启动，立即更新数据');
      refetch().catch(error => {
        logger.error('CarouselModal', '数据刷新失败', error);
      });
    }

    // 递归设置定时更新
    const scheduleNextUpdate = () => {
      updateIntervalRef.current = setTimeout(() => {
        logger.info('CarouselModal', '定时更新商品数据');
        if (refetch) {
          refetch()
            .then(() => {
              logger.info('CarouselModal', '定时更新成功');
              scheduleNextUpdate(); // 成功后安排下次更新
            })
            .catch(error => {
              logger.error('CarouselModal', '定时数据刷新失败', error);
              scheduleNextUpdate(); // 失败后也安排下次更新
            });
        }
      }, 10 * 1000); // 10秒测试间隔
    };

    // 开始定时更新
    scheduleNextUpdate();

    return () => {
      if (updateIntervalRef.current) {
        clearTimeout(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, [visible, boutiqueId, refetch]);

  // 更新本地产品数据
  useEffect(() => {
    if (queryData?.products) {
      setLocalProducts(queryData.products);
      logger.info('CarouselModal', '产品数据已更新', {
        count: queryData.products.length
      });
    } else if (products) {
      setLocalProducts(products);
    }
  }, [queryData?.products, products]);

  // 过滤出参与轮播的商品（carousel为"in"）并展开所有images
  const carouselItems = localProducts
    .filter(product => product.carousel === "in") // 只包含参与轮播的商品
    .flatMap(product => {
      // 解析图片数据，优先使用 carousel_images
      let imageIds: string[] = [];
      let sourceData = product.carousel_images;

      // 如果 carousel_images 无效，回退到 images
      // 判断无效: undefined/null, 空数组, 或空JSON数组字符串
      if (!sourceData || (Array.isArray(sourceData) && sourceData.length === 0) || sourceData === '[]') {
        sourceData = product.images;
      }

      if (sourceData) {
        try {
          imageIds = Array.isArray(sourceData)
            ? sourceData
            : JSON.parse(sourceData);
        } catch (e) {
          console.warn('解析商品图片失败:', e);
          imageIds = [];
        }
      }

      // 为每个图片创建一个轮播项，包含商品信息
      return imageIds.map(imageId => ({
        imageId,
        productName: product.name,
        productId: product.id,
        // 可以添加其他需要的商品信息
      }));
    });

  useEffect(() => {
    if (visible && carouselItems.length > 0) {
      // 开始自动轮播
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % carouselItems.length);
      }, actualInterval); // 使用动态计算的间隔时间
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [visible, carouselItems.length, actualInterval]);

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

      // 使用动态间隔时间后隐藏控制按钮
      hideControlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, actualInterval);
    }

    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, [visible, actualInterval]);

  // 重置隐藏定时器的函数
  const resetHideTimer = () => {
    setControlsVisible(true);

    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }

    hideControlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, actualInterval); // 使用动态计算的间隔时间
  };

  const handleImageLoad = () => {
    setLoading(false);
  };

  const handleImageError = () => {
    setLoading(false);
  };

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? carouselItems.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % carouselItems.length);
  };

  if (!visible || carouselItems.length === 0) {
    return null;
  }

  const currentItem = carouselItems[currentIndex];
  const imageUrl = currentItem?.imageId
    ? getDirectusImageUrl(
      currentItem.imageId,
      Math.round(screenWidth),
      Math.round(screenHeight),
      90 // 高质量
    )
    : null;

  // 结构化日志
  logger.debug('CarouselModal', `轮播状态更新 - 当前索引: ${currentIndex}, 商品: ${currentItem?.productName}, 总数: ${carouselItems.length}`);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar hidden />
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
                {currentIndex + 1} / {carouselItems.length}
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
                  {currentItem?.productName || '商品名称'}
                </Text>
                {/* <Text style={styles.overlayProductPrice}>
                ¥{currentProduct.price || '0.00'}
              </Text> */}
              </View>
            )}
          </View>

          {/* 底部指示器 */}
          {controlsVisible && (
            <View style={styles.indicators}>
              {carouselItems.map((_, index) => (
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
    top: 40, // 减少顶部距离，从50改为40，考虑状态栏隐藏
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
    top: 40, // 减少顶部距离，从50改为40，考虑状态栏隐藏
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
    bottom: 80, // 减少底部距离，从120改为80
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
    bottom: 40, // 减少底部距离，从60改为40
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
    bottom: 10, // 减少底部距离，从20改为10
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
