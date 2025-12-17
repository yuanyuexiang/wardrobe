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
import * as VideoThumbnails from 'expo-video-thumbnails';
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
  const [isVideoModalVisible, setIsVideoModalVisible] = useState(false);
  const [videoThumbnailUri, setVideoThumbnailUri] = useState<string>('');
  const flatListRef = useRef<FlatList>(null);
  const previewFlatListRef = useRef<FlatList>(null);

  const { data, loading, error } = useGetProductDetailQuery({
    variables: { id: id as string },
    skip: !id
  });

  const product = data?.products_by_id;

  // 为视频创建播放器实例（仅在有视频时）
  const videoUrl = product?.video_url ? getDirectusVideoUrl(product.video_url) : '';

  // 只在有 videoUrl 时创建播放器
  const videoPlayer = useVideoPlayer(videoUrl || 'https://placeholder.com/empty.mp4', (player) => {
    player.loop = false;
    player.showNowPlayingNotification = false;
  });

  // 当 videoUrl 变化时，更新播放器源
  useEffect(() => {
    if (videoUrl && videoPlayer) {
      logger.info('ProductDetail', `更新视频播放器源: ${videoUrl}`);
      // 替换播放器的视频源
      videoPlayer.replace(videoUrl);
    }
  }, [videoUrl, videoPlayer]);

  // 监听视频播放完成
  useEffect(() => {
    if (!videoPlayer || !videoUrl) return;

    const subscription = videoPlayer.addListener('playingChange', (newIsPlaying) => {
      if (!newIsPlaying && videoPlayer.currentTime >= videoPlayer.duration - 0.5) {
        // 视频播放完成，自动关闭Modal
        setIsVideoModalVisible(false);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [videoPlayer, videoUrl]);

  // 当Modal打开时自动播放视频
  useEffect(() => {
    if (isVideoModalVisible && videoPlayer && videoUrl) {
      logger.info('ProductDetail', 'Modal打开，重新加载并播放视频');
      // 使用 replace 重新加载视频源，确保从头开始
      videoPlayer.replace(videoUrl);
      // 增加延迟等待视频完全加载（修复：有声音但没有图像的问题）
      setTimeout(() => {
        videoPlayer.play();
      }, 300);
    } else if (!isVideoModalVisible && videoPlayer) {
      logger.info('ProductDetail', 'Modal关闭，暂停视频');
      videoPlayer.pause();
    }
  }, [isVideoModalVisible, videoPlayer, videoUrl]);

  // 生成视频缩略图
  useEffect(() => {
    logger.info('ProductDetail', `缩略图生成Effect触发 - videoUrl: ${videoUrl}, product存在: ${!!product}, Platform: ${Platform.OS}`);

    const generateThumbnail = async () => {
      if (!videoUrl) {
        logger.info('ProductDetail', '没有视频URL，跳过缩略图生成');
        return;
      }

      if (Platform.OS === 'web') {
        // Web 平台不支持，使用主图作为降级
        const fallbackUrl = product?.main_image ? getDirectusImageUrl(product.main_image) : '';
        logger.info('ProductDetail', `Web平台使用主图作为缩略图: ${fallbackUrl}`);
        setVideoThumbnailUri(fallbackUrl);
        return;
      }

      try {
        logger.info('ProductDetail', `【关键】开始生成视频缩略图 - URL: ${videoUrl}`);
        logger.info('ProductDetail', `VideoThumbnails对象: ${typeof VideoThumbnails}, getThumbnailAsync: ${typeof VideoThumbnails.getThumbnailAsync}`);

        const { uri } = await VideoThumbnails.getThumbnailAsync(videoUrl, {
          time: 0, // 获取第0秒的帧（首帧）
          quality: 0.8,
        });

        logger.info('ProductDetail', `【成功】视频缩略图生成成功: ${uri}`);
        setVideoThumbnailUri(uri);
      } catch (error) {
        logger.error('ProductDetail', `【错误】视频缩略图生成失败: ${String(error)}`);
        // 降级使用主图
        const fallbackUrl = product?.main_image ? getDirectusImageUrl(product.main_image) : '';
        logger.info('ProductDetail', `降级使用主图: ${fallbackUrl}`);
        setVideoThumbnailUri(fallbackUrl);
      }
    };

    if (videoUrl && product) {
      logger.info('ProductDetail', `【执行】条件满足，开始调用generateThumbnail()`);
      generateThumbnail();
    } else {
      logger.info('ProductDetail', `条件不满足 - videoUrl: "${videoUrl}", product: ${!!product}`);
    }
  }, [videoUrl, product]);


  // 处理媒体数组(视频+图片)
  const mediaItems = React.useMemo(() => {
    if (!product) return [];

    const items: MediaItem[] = [];

    // 1. 如果有视频,视频作为第一项
    if (product.video_url) {
      const fullVideoUrl = getDirectusVideoUrl(product.video_url);
      logger.info('ProductDetail', `视频URL转换: ${product.video_url} -> ${fullVideoUrl}`);
      // 使用生成的视频缩略图，如果还未生成则使用主图作为临时占位
      const thumbnailUrl = videoThumbnailUri || (product.main_image ? getDirectusImageUrl(product.main_image) : '');
      logger.info('ProductDetail', `视频缩略图URL: ${thumbnailUrl} (生成状态: ${videoThumbnailUri ? '已生成' : '使用主图'})`);
      items.push({
        type: 'video',
        url: fullVideoUrl, // 转换为完整URL
        thumbnail: thumbnailUrl,
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
  }, [product, videoThumbnailUri]);

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
  }, [mediaItems, product]); const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
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
      // 视频项：始终显示缩略图 + 播放按钮
      logger.info('ProductDetail', `渲染视频项 ${index}, 缩略图: ${item.thumbnail}`);

      return (
        <View style={styles.imageContainer}>
          <TouchableOpacity
            style={styles.videoThumbnailContainer}
            onPress={() => {
              setIsVideoModalVisible(true);
              // 播放逻辑移到 useEffect 中自动处理
            }}
            activeOpacity={0.9}
          >
            {/* 显示视频缩略图或占位符 */}
            {item.thumbnail ? (
              Platform.OS === 'web' ? (
                <img
                  src={item.thumbnail}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain' as any,
                    display: 'block',
                  }}
                  alt="视频缩略图"
                  onError={(e) => {
                    console.error('视频缩略图加载失败:', item.thumbnail);
                    logger.error('ProductDetail', `视频缩略图加载失败: ${item.thumbnail}`);
                  }}
                  onLoad={() => {
                    console.log('视频缩略图加载成功:', item.thumbnail);
                  }}
                />
              ) : (
                <Image
                  source={{ uri: item.thumbnail }}
                  style={styles.productImage}
                  resizeMode="contain"
                />
              )
            ) : (
              <View style={styles.noImageContainer}>
                <Text style={styles.noImageText}>视频</Text>
              </View>
            )}

            {/* 播放按钮覆盖层 */}
            <View style={styles.playButtonOverlay}>
              <View style={styles.playButton}>
                <Ionicons name="play" size={48} color="#fff" />
              </View>
              <Text style={styles.videoLabel}>点击播放视频</Text>
            </View>
          </TouchableOpacity>

          {/* 计数器 */}
          <View style={styles.imageOverlay}>
            <Text style={styles.imageCounter}>
              📹 视频 ({index + 1} / {mediaItems.length})
            </Text>
          </View>
        </View>
      );
    } else {
      // 图片项
      const simpleUrl = getDirectusImageUrl(item.url);

      logger.info('ProductDetail', `渲染图片项 ${index}: ${simpleUrl.substring(0, 50)}...`);

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
                objectFit: 'contain' as any,
                display: 'block',
              }}
              alt={`商品图片 ${index + 1}`}
              onError={(e) => {
                console.error('图片加载失败:', simpleUrl);
                logger.error('ProductDetail', `图片加载失败: ${simpleUrl}`);
              }}
              onLoad={() => {
                console.log('图片加载成功:', simpleUrl);
              }}
            />
          ) : (
            <Image
              source={{ uri: simpleUrl }}
              style={styles.productImage}
              resizeMode="contain"
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

            {/* {product.stock !== null && product.stock !== undefined && (
              <View style={styles.stockContainer}>
                <Text style={styles.stockLabel}>库存：</Text>
                <Text style={[
                  styles.stockText,
                  product.stock > 0 ? styles.inStock : styles.outOfStock
                ]}>
                  {product.stock > 0 ? `${product.stock}件` : '缺货'}
                </Text>
              </View>
            )} */}

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
            <TouchableWithoutFeedback onPress={() => { }}>
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

      {/* 视频播放Modal */}
      <Modal
        visible={isVideoModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          videoPlayer.pause();
          setIsVideoModalVisible(false);
        }}
      >
        <View style={styles.videoModalOverlay}>
          {/* 点击背景关闭 */}
          <TouchableWithoutFeedback
            onPress={() => {
              videoPlayer.pause();
              setIsVideoModalVisible(false);
            }}
          >
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>

          {/* 视频播放器容器 */}
          <View style={styles.videoModalContent}>
            <VideoView
              player={videoPlayer}
              style={styles.fullscreenVideo}
              nativeControls
              allowsFullscreen
              allowsPictureInPicture
            />

            {/* 关闭按钮 */}
            <TouchableOpacity
              style={styles.videoCloseButton}
              onPress={() => {
                videoPlayer.pause();
                setIsVideoModalVisible(false);
              }}
            >
              <Ionicons name="close-circle" size={40} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
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
    height: screenHeight, // 占满整个屏幕高度
    width: screenWidth,
    position: 'relative',
    backgroundColor: '#ffffff', // 白色背景
  },
  imageContainer: {
    width: screenWidth,
    height: screenHeight, // 明确设置为屏幕高度
    position: 'relative',
    justifyContent: 'center', // 垂直居中
    alignItems: 'center', // 水平居中
  },
  productImage: {
    width: '100%',
    height: '100%',
    zIndex: 1, // 确保在模糊背景之上
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
    height: screenHeight, // 明确设置为屏幕高度
    position: 'relative',
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // 增加不透明度，让按钮更突出
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 107, 53, 1.0)', // 完全不透明，增强对比度
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3, // 添加白色边框
    borderColor: '#fff', // 白色边框增加对比度
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, // 增加阴影不透明度
    shadowRadius: 8, // 增加阴影半径
    elevation: 12, // 增加 Android 阴影效果
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
  // 视频Modal相关
  videoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoModalContent: {
    width: screenWidth,
    aspectRatio: 16 / 9, // 使用 aspectRatio 代替固定高度
    maxHeight: screenHeight * 0.8, // 最大高度不超过屏幕的80%
    position: 'relative',
    backgroundColor: '#000', // 添加黑色背景
  },
  fullscreenVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000', // 添加黑色背景，确保视频正确渲染
  },
  videoCloseButton: {
    position: 'absolute',
    top: 10, // 调整到视频内部顶部
    right: 10, // 右上角
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // 添加半透明背景，更容易看到
    borderRadius: 20, // 圆形背景
    padding: 2,
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
