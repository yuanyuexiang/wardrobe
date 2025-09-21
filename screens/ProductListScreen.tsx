import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState, useEffect } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import CarouselModal from '../components/CarouselModal';
import ProductCard from '../components/ProductCard';
import Tab from '../components/Tab';
import FloatingQRCode from '../components/FloatingQRCode';
import { useGetCategoriesQuery, useGetProductsQuery } from '../generated/graphql';
import { useBoutiqueInfo } from '../hooks/useBoutiqueInfo';
import { logger } from '../utils/logger';
import { LAYOUT, getCardWidth, getBottomPadding } from '../utils/constants';
import { imageCache } from '../utils/imageCache';
import { getDirectusThumbnailUrl } from '../utils/directus';
import { configManager } from '../utils/configManager';
import { deviceStartupManager } from '../utils/deviceStartupManager';

// 使用统一的布局常量
const cardWidth = getCardWidth();
const BOTTOM_PADDING = getBottomPadding();

const ProductListScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>("recommended");
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [carouselVisible, setCarouselVisible] = useState(false);
  const [qrCodeVisible, setQrCodeVisible] = useState(true); // 默认显示二维码
  const [isGridLayout, setIsGridLayout] = useState(false); // 布局切换状态: false=单层水平, true=双层网格
  const [isCarouselDevice, setIsCarouselDevice] = useState(false); // 是否为轮播设备
  const flatListRef = useRef<FlatList>(null);
  const [currentConfig, setCurrentConfig] = useState(configManager.getConfig());
  const updateIntervalRef = useRef<number | null>(null); // 定时更新引用
  
  // 使用共享的商家信息
  const { boutiqueId, boutique, loading: boutiqueLoading } = useBoutiqueInfo();
  
  // 设备授权系统不需要用户状态

  // 检查设备用途并自动开启轮播
  useEffect(() => {
    const checkDevicePurpose = async () => {
      try {
        const startupInfo = await deviceStartupManager.checkStartupState();
        if (startupInfo.state === 'approved' && startupInfo.terminalInfo?.purposes === 'carousel') {
          // 如果设备用途是轮播，自动开启轮播模式
          logger.info('ProductListScreen', '检测到轮播设备，自动开启轮播模式');
          setIsCarouselDevice(true);
          setCarouselVisible(true);
          setQrCodeVisible(false); // 轮播设备不显示二维码
        }
      } catch (error) {
        logger.error('ProductListScreen', '检查设备用途失败', error);
      }
    };
    
    checkDevicePurpose();
  }, []);

  // 监听配置变化
  useEffect(() => {
    const unsubscribe = configManager.addListener((config) => {
      setCurrentConfig(config);
      logger.info('ProductListScreen', '配置更新', { 
        selectedBoutiqueId: config.selectedBoutiqueId,
        selectedBoutiqueName: config.selectedBoutiqueName 
      });
    });
    
    return unsubscribe;
  }, []);

  // 使用真实的API - 不再需要 userId 参数
  const { data: categoryData, loading: categoryLoading, error: categoryError } = useGetCategoriesQuery({
    variables: {
      boutiqueId: boutiqueId || "",
      filter: {},
      limit: 100,
      offset: 0
    },
    skip: !boutiqueId,
  });
  
  // 获取店铺信息 - 不再使用用户依赖的查询
  // 直接使用从设备启动管理器获取的店铺ID  // 构建查询变量
  const buildQueryVariables = () => {
    const variables: any = {};
    
    // 构建动态 filter 对象
    const filters: any[] = [];
    
    // 只使用店铺过滤器 - 显示当前店铺的所有商品
    if (boutiqueId) {
      filters.push({
        boutique_id: { id: { _eq: boutiqueId } }
      });
    }
    
    // 处理推荐商品分类（获取最新上架的5个商品）
    if (selectedCategory === "recommended") {
      variables.limit = 5;
      variables.sort = ["-created_at"]; // 按创建时间倒序排列
    } else {
      // 普通分类显示所有商品
      variables.limit = 1000; // 设置一个足够大的数字来获取所有商品
      
      // 添加分类过滤器
      if (selectedCategory) {
        filters.push({
          category_id: { id: { _eq: parseInt(selectedCategory) } }
        });
      }
    }
    
    // 添加搜索过滤器
    if (search && search.trim()) {
      filters.push({
        _or: [
          { name: { _contains: search.trim() } },
          { subtitle: { _contains: search.trim() } },
          { description: { _contains: search.trim() } }
        ]
      });
    }
    
    // 如果有过滤条件，使用 _and 组合
    if (filters.length > 0) {
      if (filters.length === 1) {
        variables.filter = filters[0];
      } else {
        variables.filter = { _and: filters };
      }
    }
    
    return variables;
  };
  
  // 打印查询变量，便于调试
  const queryVariables = buildQueryVariables();
  useEffect(() => {
    logger.info('ProductListScreen', '商品查询变量:', JSON.stringify(queryVariables, null, 2));
  }, [selectedCategory, search, boutiqueId]);

  const { data: productData, loading: productLoading, error: productError, refetch } = useGetProductsQuery({
    variables: queryVariables,
  });

  // 获取所有商品用于轮播 - 只使用店铺过滤器
  const { data: allProductsData, refetch: refetchAllProducts } = useGetProductsQuery({
    variables: {
      filter: boutiqueId ? {
        boutique_id: { id: { _eq: boutiqueId } }
      } : undefined,
      limit: 1000, // 获取所有商品
      sort: ["-created_at"] // 按创建时间排序
    },
    skip: !boutiqueId, // 只有在有店铺信息时才查询
  });

  // 调试信息 - 使用结构化日志
  React.useEffect(() => {
    if (categoryError) {
      logger.error('ProductListScreen', '分类加载错误', categoryError.message);
    }
    if (productError) {
      logger.error('ProductListScreen', '商品加载错误', productError.message);
    }
  }, [categoryError, productError]);

  // 定时更新商品数据（测试模式 - 30秒）
  useEffect(() => {
    if (!boutiqueId) return;

    // 递归设置定时更新
    const scheduleNextUpdate = () => {
      updateIntervalRef.current = setTimeout(() => {
        logger.info('ProductListScreen', '定时更新主商品列表');
        
        // 只更新主商品列表，轮播数据由CarouselModal自己管理
        refetch?.()
          .then(() => {
            logger.info('ProductListScreen', '主商品列表更新成功');
            scheduleNextUpdate(); // 成功后安排下次更新
          })
          .catch(error => {
            logger.error('ProductListScreen', '主商品列表更新失败', error);
            scheduleNextUpdate(); // 失败后也安排下次更新
          });
      }, 30 * 1000); // 30秒测试间隔
    };

    // 开始定时更新
    scheduleNextUpdate();

    return () => {
      if (updateIntervalRef.current) {
        clearTimeout(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, [boutiqueId, refetch]);

  // 图像预加载优化
  useEffect(() => {
    if (productData?.products) {
      const imageUrls = productData.products
        .filter(product => product.main_image)
        .map(product => getDirectusThumbnailUrl(product.main_image!, 320));
      
      if (imageUrls.length > 0) {
        logger.info('ProductListScreen', `开始预加载${imageUrls.length}张商品图片`);
        imageCache.preloadBatch(imageUrls);
      }
    }
  }, [productData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setCurrentIndex(0);
    const refreshVariables = buildQueryVariables();
    await refetch(refreshVariables);
    setRefreshing(false);
  };

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const itemWidth = cardWidth + LAYOUT.ITEM_SEPARATOR; // 使用统一的布局常量
    const index = Math.round(contentOffset / itemWidth);
    setCurrentIndex(index);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* 顶部品牌区域 */}
      <View style={styles.header}>
        <View style={styles.brandSection}>
          <View style={styles.brandLogo}>
            <Text style={styles.logoText}>衣橱</Text>
          </View>
          <View style={styles.brandInfo}>
            <Text style={styles.brandName}>
              {currentConfig.selectedBoutiqueName || '朱老板服装旗舰店'}
            </Text>
            <View style={styles.ratingSection}>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons key={star} name="star" size={12} color="#ff6b35" />
                ))}
              </View>
              <Text style={styles.ratingText}>11.5高分</Text>
            </View>
          </View>
        </View>
        {/* 只在非轮播设备上显示操作按钮 */}
        {!isCarouselDevice && (
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={[styles.couponButton, { marginRight: 8 }]}
              onPress={() => setCarouselVisible(true)}
            >
              <Text style={styles.couponText}>轮播</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.layoutButton}
              onPress={() => setIsGridLayout(!isGridLayout)}
            >
              <Ionicons 
                name={isGridLayout ? "list" : "grid"} 
                size={18} 
                color="#ff6b35" 
              />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 分类导航 */}
      <View style={styles.categorySection}>
        {categoryLoading ? (
          <ActivityIndicator size="small" color="#ff6b35" />
        ) : (
          <FlatList
            horizontal
            data={[
              { id: "recommended", name: "推荐商品" },
              ...(categoryData?.categories || [])
            ]}
            keyExtractor={(cat) => cat.id}
            renderItem={({ item: cat }) => (
              <Tab
                label={cat.name}
                selected={selectedCategory === cat.id}
                onPress={() => {
                  setSelectedCategory(cat.id);
                  setCurrentIndex(0);
                }}
              />
            )}
            style={styles.tabBar}
            contentContainerStyle={styles.tabContainer}
            showsHorizontalScrollIndicator={false}
          />
        )}
      </View>

      {/* 商品列表 */}
      <View style={styles.productSection}>
        {isGridLayout ? (
          /* 双层横向布局 */
          <View style={styles.doubleLayerContainer}>
            <FlatList
              data={productData?.products?.filter((_, index) => index % 2 === 0) || []}
              keyExtractor={(prod) => `top-${prod.id}`}
              renderItem={({ item }) => (
                <ProductCard 
                  product={item} 
                  layoutMode="grid" 
                />
              )}
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
              contentContainerStyle={styles.layerContent}
              style={styles.topLayer}
            />
            <FlatList
              data={productData?.products?.filter((_, index) => index % 2 === 1) || []}
              keyExtractor={(prod) => `bottom-${prod.id}`}
              renderItem={({ item }) => (
                <ProductCard 
                  product={item} 
                  layoutMode="grid" 
                />
              )}
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
              contentContainerStyle={styles.layerContent}
              style={styles.bottomLayer}
            />
          </View>
        ) : (
          /* 单层横向布局 */
          <FlatList
            ref={flatListRef}
            data={productData?.products || []}
            keyExtractor={(prod) => prod.id}
            renderItem={({ item }) => (
              <ProductCard 
                product={item} 
                layoutMode="horizontal" 
              />
            )}
            style={styles.productList}
            contentContainerStyle={styles.productContainer}
            ListEmptyComponent={productLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ff6b35" />
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>暂无商品</Text>
              </View>
            )}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
            snapToAlignment="start"
            decelerationRate="fast"
          />
        )}
        
        {/* 双层布局的空状态 */}
        {isGridLayout && (!productData?.products || productData.products.length === 0) && !productLoading && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>暂无商品</Text>
          </View>
        )}
        
        {/* 双层布局的加载状态 */}
        {isGridLayout && productLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ff6b35" />
          </View>
        )}
      </View>

      {/* 轮播模态框 */}
      <CarouselModal
        visible={carouselVisible}
        onClose={() => setCarouselVisible(false)}
        products={allProductsData?.products || []}
        boutiqueId={boutiqueId}
      />

      {/* 浮动二维码 */}
      <FloatingQRCode
        boutiqueId={boutiqueId}
        visible={qrCodeVisible && !!boutiqueId}
        onClose={() => setQrCodeVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // 顶部品牌区域
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  brandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  brandLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#ff6b35',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  brandInfo: {
    flex: 1,
  },
  brandName: {
    fontSize: 20, // 增加品牌名称字体大小，让品牌更突出
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stars: {
    flexDirection: 'row',
    marginRight: 6,
  },
  ratingText: {
    fontSize: 13, // 增加评分文字大小，提高可读性
    color: '#666',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    padding: 8,
    marginRight: 8,
  },
  couponButton: {
    backgroundColor: '#ff6b35',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  couponText: {
    color: '#fff',
    fontSize: 13, // 增加优惠券按钮文字大小
    fontWeight: 'bold',
  },
  layoutButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ff6b35',
  },
  // 分类导航区域
  categorySection: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tabBar: {
    paddingVertical: 12,
  },
  tabContainer: {
    paddingHorizontal: 16,
  },
  // 商品列表区域
  productSection: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  productList: {
    flex: 1,
    // 移除paddingVertical，这会在水平滚动中造成上下空白
  },
  productContainer: {
    paddingHorizontal: 16,
    // 移除paddingBottom，在水平滚动中不需要
    alignItems: 'stretch', // 允许项目填充可用高度
    // 移除minHeight，让flex自然处理
  },
  gridContainer: {
    padding: 16,
    paddingBottom: BOTTOM_PADDING,
  },
  doubleLayerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 8,
  },
  topLayer: {
    flex: 1,
    marginBottom: 2,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  bottomLayer: {
    flex: 1,
    marginTop: 2,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
  },
  layerContent: {
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  emptyText: {
    fontSize: 17, // 增加空状态文字大小
    color: '#999',
  },
  itemSeparator: {
    width: 3,
  },
});

export default ProductListScreen;
