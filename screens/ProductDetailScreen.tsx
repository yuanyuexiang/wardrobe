import { useLocalSearchParams } from 'expo-router';
import React, { useRef, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useGetProductDetailQuery } from '../generated/graphql';
import { getDirectusImageUrl, getDirectusVideoUrl } from '../utils/directus';
import { logger } from '../utils/logger';
import { imageCache } from '../utils/imageCache';
import { LAYOUT } from '../utils/constants';

const { screenWidth, screenHeight } = LAYOUT;

// 媒体项类型定义
type MediaItem = {
  type: 'video' | 'image';
  url: string;
  thumbnail?: string;
  id: string;
};

const ProductDetailScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [playingVideoIndex, setPlayingVideoIndex] = useState<number | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const previewFlatListRef = useRef<FlatList>(null);
  
  const { data, loading, error } = useGetProductDetailQuery({ 
    variables: { id: id as string },
    skip: !id
  });

  const product = data?.products_by_id;

  // 为视频创建播放器实例（仅在有视频时）
  const videoUrl = product?.video_url ? getDirectusVideoUrl(product.video_url) : '';
  const videoPlayer = useVideoPlayer(videoUrl, (player) => {
    player.loop = false;
    player.showNowPlayingNotification = false;
  });

  // 监听视频播放完成
  useEffect(() => {
    if (!videoPlayer || !videoUrl) return;
    
    const subscription = videoPlayer.addListener('playingChange', (newIsPlaying) => {
      if (!newIsPlaying && videoPlayer.currentTime >= videoPlayer.duration - 0.5) {
        // 视频播放完成，返回缩略图状态
        setPlayingVideoIndex(null);
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, [videoPlayer, videoUrl]);


  // 处理媒体数组(视频+图片)
  const mediaItems = React.useMemo(() => {
    if (!product) return [];
    
    const items: MediaItem[] = [];
    
    // 1. 如果有视频,视频作为第一项
    if (product.video_url) {
      const fullVideoUrl = getDirectusVideoUrl(product.video_url);
      logger.info('ProductDetail', `视频URL转换: ${product.video_url} -> ${fullVideoUrl}`);
      items.push({
        type: 'video',
        url: fullVideoUrl, // 转换为完整URL
        thumbnail: product.main_image || '',
        id: 'video-0'
      });
    }
    
    // 2. 添加主图
    if (product.main_image) {
      items.push({
        type: 'image',
        url: product.main_image,
        id: 'main-image'
      });
    }
    
    // 3. 添加其他图片
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach((img: any, index: number) => {
        if (typeof img === 'string' && img !== product.main_image) {
          items.push({
            type: 'image',
            url: img,
            id: `image-${index}`
          });
        }
      });
    }
    
    return items;
  }, [product]);

  // 结构化日志记录
  useEffect(() => {
    if (id) {
      logger.info('ProductDetailScreen', `开始加载商品详情: ${id}`);
    }
  }, [id]);

  useEffect(() => {
    if (product) {
      logger.info('ProductDetailScreen', `商品详情加载成功: ${product.name}`);
    }
    if (error) {
      logger.error('ProductDetailScreen', `商品详情加载失败: ${error.message}`);
    }
  }, [product, error]);

  // 图像预加载优化
  useEffect(() => {
    if (mediaItems.length > 0) {
      const imageUrls = mediaItems
        .filter(item => item.type === 'image')
        .map(item => getDirectusImageUrl(item.url));
      
      if (imageUrls.length > 0) {
        logger.info('ProductDetailScreen', `开始预加载${imageUrls.length}张商品图片`);
        imageCache.preloadBatch(imageUrls);
      }
    }
    
    // 记录视频信息
    if (product?.video_url) {
      logger.info('ProductDetailScreen', '检测到商品视频', {
        videoUrl: product.video_url
      });
    }
  }, [mediaItems, product]);  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentImageIndex(viewableItems[0].index || 0);
    }
  }).current;

  const onPreviewViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setPreviewImageIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handleImagePress = (index: number) => {
    const item = mediaItems[index];
    // 只有图片才能预览
    if (item && item.type === 'image') {
      setPreviewImageIndex(index);
      setIsImageModalVisible(true);
    }
  };

  const closeImageModal = () => {
    setIsImageModalVisible(false);
  };

  const renderMediaItem = ({ item, index }: { item: MediaItem; index: number }) => {
    if (item.type === 'video') {
      // 视频项
      const isPlaying = playingVideoIndex === index;
      
      return (
        <View style={styles.imageContainer}>
          {isPlaying ? (
            // 播放状态: 显示视频播放器
            <View style={styles.videoPlayerContainer}>
              <VideoView
                player={videoPlayer}
                style={styles.video}
                allowsFullscreen
                allowsPictureInPicture
                nativeControls
              />
              
              {/* 关闭按钮 */}
              <TouchableOpacity 
                style={styles.closeVideoButton}
                onPress={() => {
                  videoPlayer.pause();
                  setPlayingVideoIndex(null);
                }}
              >
                <Ionicons name="close-circle" size={32} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            // 未播放状态: 显示缩略图 + 播放按钮
            <TouchableOpacity 
              style={styles.videoThumbnailContainer}
              onPress={() => {
                setPlayingVideoIndex(index);
                videoPlayer.play();
              }}
              activeOpacity={0.9}
            >
              {Platform.OS === 'web' ? (
                <img
                  src={getDirectusImageUrl(item.thumbnail || '')}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover' as any
                  }}
                  alt="视频缩略图"
                />
              ) : (
                <Image
                  source={{ uri: getDirectusImageUrl(item.thumbnail || '') }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
              )}
              
              {/* 播放按钮覆盖层 */}
              <View style={styles.playButtonOverlay}>
                <View style={styles.playButton}>
                  <Ionicons name="play" size={48} color="#fff" />
                </View>
                <Text style={styles.videoLabel}>点击播放视频</Text>
              </View>
            </TouchableOpacity>
          )}
          
          {/* 计数器 */}
          {!isPlaying && (
            <View style={styles.imageOverlay}>
              <Text style={styles.imageCounter}>
                📹 视频 ({index + 1} / {mediaItems.length})
              </Text>
            </View>
          )}
        </View>
      );
    } else {
      // 图片项
      const simpleUrl = getDirectusImageUrl(item.url);
      
      return (
        <TouchableOpacity 
          style={styles.imageContainer} 
          onPress={() => handleImagePress(index)}
          activeOpacity={0.9}
        >
          {Platform.OS === 'web' ? (
            <img
              src={simpleUrl}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover' as any
              }}
              alt={`商品图片 ${index + 1}`}
            />
          ) : (
            <Image
              source={{ uri: simpleUrl }}
              style={styles.productImage}
              resizeMode="cover"
            />
          )}
          <View style={styles.imageOverlay}>
            <Text style={styles.imageCounter}>
              {index + 1} / {mediaItems.length}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }
  };

  const renderPreviewImageItem = ({ item, index }: { item: MediaItem; index: number }) => {
    // 预览模式只显示图片,跳过视频
    if (item.type === 'video') return null;
    
    return (
      <TouchableOpacity 
        style={styles.previewImageContainer}
        onPress={closeImageModal}
        activeOpacity={1}
      >
        {Platform.OS === 'web' ? (
          <img
            src={getDirectusImageUrl(item.url)}
            style={{
              width: '100%',
              height: '80%',
              objectFit: 'contain' as any
            }}
            alt={`预览图片 ${index + 1}`}
          />
        ) : (
          <Image
            source={{ uri: getDirectusImageUrl(item.url) }}
            style={styles.previewImage}
            resizeMode="contain"
          />
        )}
      </TouchableOpacity>
    );
  };

  const renderDot = (index: number) => (
    <TouchableOpacity
      key={index}
      style={[
        styles.dot,
        currentImageIndex === index ? styles.activeDot : styles.inactiveDot
      ]}
      onPress={() => {
        flatListRef.current?.scrollToIndex({ 
          index, 
          animated: true 
        });
      }}
    />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>正在加载商品详情...</Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {error ? `加载失败：${error.message}` : '未找到商品'}
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.imageSection}>
          {mediaItems.length > 0 ? (
            <>
              <FlatList
                ref={flatListRef}
                data={mediaItems}
                renderItem={renderMediaItem}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                keyExtractor={(item) => item.id}
                getItemLayout={(data, index) => ({
                  length: screenWidth,
                  offset: screenWidth * index,
                  index,
                })}
              />
              
              {/* 圆点指示器 */}
              {mediaItems.length > 1 && (
                <View style={styles.dotsContainer}>
                  {mediaItems.map((_, index) => renderDot(index))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.noImageContainer}>
              <Text style={styles.noImageText}>暂无图片</Text>
            </View>
          )}
        </View>

        <View style={styles.infoSection}>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{product.name}</Text>
            
            {product.subtitle && (
              <Text style={styles.productSubtitle}>{product.subtitle}</Text>
            )}
            
            {/* <View style={styles.priceContainer}>
              <Text style={styles.currentPrice}>¥{product.price}</Text>
              {product.market_price && product.market_price > product.price && (
                <Text style={styles.originalPrice}>¥{product.market_price}</Text>
              )}
            </View> */}

            {product.brand && (
              <View style={styles.brandContainer}>
                <Text style={styles.brandLabel}>品牌：</Text>
                <Text style={styles.brandText}>{product.brand}</Text>
              </View>
            )}

            {product.stock !== null && product.stock !== undefined && (
              <View style={styles.stockContainer}>
                <Text style={styles.stockLabel}>库存：</Text>
                <Text style={[
                  styles.stockText,
                  product.stock > 0 ? styles.inStock : styles.outOfStock
                ]}>
                  {product.stock > 0 ? `${product.stock}件` : '缺货'}
                </Text>
              </View>
            )}

            {product.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionTitle}>商品详情</Text>
                <Text style={styles.descriptionText}>{product.description}</Text>
              </View>
            )}

            {product.category_id && (
              <View style={styles.categoryContainer}>
                <Text style={styles.categoryLabel}>分类：</Text>
                <Text style={styles.categoryText}>{product.category_id.name}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* 图片预览Modal */}
      <Modal
        visible={isImageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageModal}
      >
        <TouchableWithoutFeedback onPress={closeImageModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
                {mediaItems.length > 0 && (
                  <>
                    <FlatList
                      ref={previewFlatListRef}
                      data={mediaItems}
                      renderItem={renderPreviewImageItem}
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      onViewableItemsChanged={onPreviewViewableItemsChanged}
                      viewabilityConfig={viewabilityConfig}
                      keyExtractor={(item) => `preview-${item.id}`}
                      initialScrollIndex={previewImageIndex}
                      getItemLayout={(data, index) => ({
                        length: screenWidth,
                        offset: screenWidth * index,
                        index,
                      })}
                    />
                    
                    {/* 预览模式的圆点指示器 */}
                    {mediaItems.length > 1 && (
                      <View style={styles.previewDotsContainer}>
                        {mediaItems.map((_, index) => (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.previewDot,
                              previewImageIndex === index ? styles.previewActiveDot : styles.previewInactiveDot
                            ]}
                            onPress={() => {
                              previewFlatListRef.current?.scrollToIndex({ 
                                index, 
                                animated: true 
                              });
                            }}
                          />
                        ))}
                      </View>
                    )}
                    
                    {/* 预览模式的计数器 */}
                    <View style={styles.previewCounter}>
                      <Text style={styles.previewCounterText}>
                        {previewImageIndex + 1} / {mediaItems.length}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    color: '#333',
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorText: {
    color: '#333',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 10,
  },
  imageSection: {
    height: screenHeight * 0.60,
    position: 'relative',
    backgroundColor: '#000',
  },
  imageContainer: {
    width: screenWidth,
    height: '100%',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 20, // 减小top值
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  imageCounter: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  noImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  noImageText: {
    color: '#666',
    fontSize: 16,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#fff',
  },
  inactiveDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  // 视频缩略图相关
  videoThumbnailContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 107, 53, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  videoLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  // 视频播放器相关
  videoPlayerContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  closeVideoButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 4,
  },
  infoSection: {
    backgroundColor: '#fff',
    paddingTop: 0,
  },
  productInfo: {
    padding: 20,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    lineHeight: 32,
  },
  productSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  currentPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e91e63',
    marginRight: 12,
  },
  originalPrice: {
    fontSize: 18,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  brandLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginRight: 8,
  },
  brandText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  stockLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginRight: 8,
  },
  stockText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inStock: {
    color: '#4CAF50',
  },
  outOfStock: {
    color: '#f44336',
  },
  descriptionContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 24,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  categoryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginRight: 8,
  },
  categoryText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  // 图片预览Modal样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: screenWidth,
    height: screenHeight,
    position: 'relative',
  },
  previewImageContainer: {
    width: screenWidth,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '80%',
  },
  previewDotsContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  previewActiveDot: {
    backgroundColor: '#fff',
  },
  previewInactiveDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  previewCounter: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  previewCounterText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
});

export default ProductDetailScreen;
