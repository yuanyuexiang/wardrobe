import { useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
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
import { useGetProductDetailQuery } from '../generated/graphql';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ProductDetailScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const previewFlatListRef = useRef<FlatList>(null);
  
  const { data, loading, error } = useGetProductDetailQuery({ 
    variables: { id: id as string },
    skip: !id
  });

  const product = data?.products_by_id;

  // 处理图片数组
  const images = React.useMemo(() => {
    if (!product) return [];
    
    const imageList: string[] = [];
    
    // 添加主图
    if (product.main_image) {
      imageList.push(product.main_image);
    }
    
    // 添加其他图片
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach((img: any) => {
        if (typeof img === 'string' && img !== product.main_image) {
          imageList.push(img);
        }
      });
    }
    
    // 调试信息
    console.log('商品图片调试:', {
      productId: product?.id,
      mainImage: product?.main_image,
      rawImages: product?.images,
      processedImages: imageList,
      imageCount: imageList.length
    });
    
    return imageList;
  }, [product]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
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
    setPreviewImageIndex(index);
    setIsImageModalVisible(true);
  };

  const closeImageModal = () => {
    setIsImageModalVisible(false);
  };

  const renderImageItem = ({ item, index }: { item: string; index: number }) => {
    // 使用不带参数的简单URL
    const simpleUrl = `https://forge.matrix-net.tech/assets/${item}`;
    
    // 调试信息
    console.log('图片渲染调试:', {
      index,
      fileId: item,
      simpleUrl
    });
    
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
            onError={(error: any) => {
              console.log('HTML img 加载错误:', {
                index,
                fileId: item,
                simpleUrl,
                error
              });
            }}
            onLoad={() => {
              console.log('HTML img 加载成功:', {
                index,
                fileId: item,
                url: simpleUrl
              });
            }}
            alt={`商品图片 ${index + 1}`}
          />
        ) : (
          <Image
            source={{ uri: simpleUrl }}
            style={styles.productImage}
            onError={(error: any) => {
              console.log('React Native Image 加载错误:', {
                index,
                fileId: item,
                simpleUrl,
                error
              });
            }}
            onLoad={() => {
              console.log('React Native Image 加载成功:', {
                index,
                fileId: item,
                url: simpleUrl
              });
            }}
            resizeMode="cover"
          />
        )}
        {/* 图片信息覆盖层 */}
        <View style={styles.imageOverlay}>
          <Text style={styles.imageCounter}>
            {index + 1} / {images.length}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPreviewImageItem = ({ item, index }: { item: string; index: number }) => (
    <TouchableOpacity 
      style={styles.previewImageContainer}
      onPress={closeImageModal}
      activeOpacity={1}
    >
      {Platform.OS === 'web' ? (
        <img
          src={`https://forge.matrix-net.tech/assets/${item}`}
          style={{
            width: '100%',
            height: '80%',
            objectFit: 'contain' as any
          }}
          alt={`预览图片 ${index + 1}`}
        />
      ) : (
        <Image
          source={{ uri: `https://forge.matrix-net.tech/assets/${item}` }}
          style={styles.previewImage}
          resizeMode="contain"
        />
      )}
    </TouchableOpacity>
  );

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
    // 添加调试信息
    console.log('产品加载调试:', {
      error: error?.message,
      product,
      data,
      loading,
      id
    });
    
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {error ? `加载失败：${error.message}` : '未找到商品'}
        </Text>
        <Text style={styles.debugText}>ID: {id}</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* 图片轮播区域 */}
        <View style={styles.imageSection}>
          {images.length > 0 ? (
            <>
              <FlatList
                ref={flatListRef}
                data={images}
                renderItem={renderImageItem}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                keyExtractor={(item, index) => `image-${index}`}
                getItemLayout={(data, index) => ({
                  length: screenWidth,
                  offset: screenWidth * index,
                  index,
                })}
              />
              
              {/* 圆点指示器 */}
              {images.length > 1 && (
                <View style={styles.dotsContainer}>
                  {images.map((_, index) => renderDot(index))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.noImageContainer}>
              <Text style={styles.noImageText}>暂无图片</Text>
            </View>
          )}
        </View>

        {/* 商品信息区域 */}
        <View style={styles.infoSection}>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{product.name}</Text>
            
            {product.subtitle && (
              <Text style={styles.productSubtitle}>{product.subtitle}</Text>
            )}
            
            <View style={styles.priceContainer}>
              <Text style={styles.currentPrice}>¥{product.price}</Text>
              {product.market_price && product.market_price > product.price && (
                <Text style={styles.originalPrice}>¥{product.market_price}</Text>
              )}
            </View>

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
                {images.length > 0 && (
                  <>
                    <FlatList
                      ref={previewFlatListRef}
                      data={images}
                      renderItem={renderPreviewImageItem}
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      onViewableItemsChanged={onPreviewViewableItemsChanged}
                      viewabilityConfig={viewabilityConfig}
                      keyExtractor={(item, index) => `preview-${index}`}
                      initialScrollIndex={previewImageIndex}
                      getItemLayout={(data, index) => ({
                        length: screenWidth,
                        offset: screenWidth * index,
                        index,
                      })}
                    />
                    
                    {/* 预览模式的圆点指示器 */}
                    {images.length > 1 && (
                      <View style={styles.previewDotsContainer}>
                        {images.map((_, index) => (
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
                        {previewImageIndex + 1} / {images.length}
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
  debugText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  debugImageContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 10,
    borderRadius: 8,
    maxWidth: 200,
  },
  debugImage: {
    width: 100,
    height: 75,
    marginVertical: 5,
  },
  imageSection: {
    height: screenHeight * 0.60, // 减小高度，占屏幕60%
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
