import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState, useEffect } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import CarouselModal from '../components/CarouselModal';
import ProductCard from '../components/ProductCard';
import Tab from '../components/Tab';
import { useGetCategoriesQuery, useGetProductsQuery, useGetMyBoutiqueQuery } from '../generated/graphql';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { logger } from '../utils/logger';
import { LAYOUT, getCardWidth, getBottomPadding } from '../utils/constants';
import { imageCache } from '../utils/imageCache';
import { getDirectusThumbnailUrl } from '../utils/directus';
import { configManager } from '../utils/configManager';

// 使用统一的布局常量
const cardWidth = getCardWidth();
const BOTTOM_PADDING = getBottomPadding();

const ProductListScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>("recommended");
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [carouselVisible, setCarouselVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [currentConfig, setCurrentConfig] = useState(configManager.getConfig());
  
  // 使用新的用户状态管理hook
  const { user: currentUser, loading: userLoading, error: userError } = useCurrentUser();
  
  // 记录用户状态
  useEffect(() => {
    if (currentUser) {
      logger.info('ProductListScreen', `用户信息加载成功 - ID: ${currentUser.id}, 姓名: ${currentUser.first_name} ${currentUser.last_name}`);
    }
    if (userError) {
      logger.error('ProductListScreen', `用户信息加载失败: ${userError}`);
    }
  }, [currentUser, userError]);

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
  
  // 使用真实的API
  const { data: categoryData, loading: categoryLoading, error: categoryError } = useGetCategoriesQuery({
    variables: {
      userId: currentUser?.id || "",
      boutiqueId: currentConfig.selectedBoutiqueId || "",
      filter: {},
      limit: 100,
      offset: 0
    },
    skip: !currentUser?.id || !currentConfig.selectedBoutiqueId,
  });
  
  // 获取店铺信息 - 根据配置中的selectedBoutiqueId获取特定店铺
  const { data: boutiqueData, loading: boutiqueLoading, error: boutiqueError } = useGetMyBoutiqueQuery({
    variables: { userId: currentUser?.id || "" },
    skip: !currentUser?.id,
    // 不指定client，使用默认的主GraphQL端点
  });
  
  // 根据配置选择特定店铺，而不是默认取第一个
  const boutique = currentConfig.selectedBoutiqueId 
    ? boutiqueData?.boutiques?.find(b => b.id === currentConfig.selectedBoutiqueId)
    : boutiqueData?.boutiques?.[0]; // 如果没有配置，则取第一个作为后备
  
  // 调试信息：记录店铺信息
  useEffect(() => {
    if (boutiqueData?.boutiques && boutiqueData.boutiques.length > 0) {
      logger.info('ProductListScreen', '用户店铺信息:', {
        totalBoutiques: boutiqueData.boutiques.length,
        currentBoutique: boutique ? { id: boutique.id, name: boutique.name } : null,
        allBoutiques: boutiqueData.boutiques.map(b => ({ id: b.id, name: b.name }))
      });
    }
  }, [boutiqueData, boutique]);
  
  // 构建查询变量
  const buildQueryVariables = () => {
    const variables: any = {};
    
    // 构建动态 filter 对象
    const filters: any[] = [];
    
    // 添加用户过滤器 - 只显示当前用户创建的商品
    if (currentUser?.id) {
      filters.push({
        user_created: { id: { _eq: currentUser.id } }
      });
    }

    // 添加店铺过滤器 - 只显示当前店铺的商品
    if (boutique?.id) {
      filters.push({
        boutique_id: { id: { _eq: boutique.id } }
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
  }, [selectedCategory, search, boutique, currentUser]);

  const { data: productData, loading: productLoading, error: productError, refetch } = useGetProductsQuery({
    variables: queryVariables,
  });

  // 获取所有商品用于轮播 - 同样应用用户和店铺过滤器
  const { data: allProductsData } = useGetProductsQuery({
    variables: {
      filter: (() => {
        const carouselFilters: any[] = [];
        
        // 添加用户过滤器
        if (currentUser?.id) {
          carouselFilters.push({
            user_created: { id: { _eq: currentUser.id } }
          });
        }
        
        // 添加店铺过滤器
        if (boutique?.id) {
          carouselFilters.push({
            boutique_id: { id: { _eq: boutique.id } }
          });
        }
        
        if (carouselFilters.length === 0) {
          return undefined;
        } else if (carouselFilters.length === 1) {
          return carouselFilters[0];
        } else {
          return { _and: carouselFilters };
        }
      })(),
      limit: 1000, // 获取所有商品
      sort: ["-created_at"] // 按创建时间排序
    },
    skip: !currentUser?.id || !boutique?.id, // 只有在有用户和店铺信息时才查询
  });

  // 调试信息 - 使用结构化日志
  React.useEffect(() => {
    if (categoryError) {
      logger.error('ProductListScreen', '分类加载错误', categoryError.message);
    }
    if (productError) {
      logger.error('ProductListScreen', '商品加载错误', productError.message);
    }
    if (boutiqueError) {
      logger.error('ProductListScreen', '店铺信息加载错误', boutiqueError.message);
    }
    if (boutique) {
      logger.info('ProductListScreen', `店铺信息加载成功: ${boutique.name}`);
    }
  }, [categoryError, productError, boutiqueError, boutique]);

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
              {boutiqueLoading ? '加载中...' : (
                currentConfig.selectedBoutiqueName || 
                boutique?.name || 
                '朱老板服装旗舰店'
              )}
            </Text>
            <View style={styles.ratingSection}>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons key={star} name="star" size={12} color="#ff6b35" />
                ))}
              </View>
              <Text style={styles.ratingText}>
                {boutique?.stars ? `${boutique.stars}分` : '11.5高分'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={[styles.couponButton, { marginRight: 8 }]}
            onPress={() => setCarouselVisible(true)}
          >
            <Text style={styles.couponText}>轮播</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.couponButton, { backgroundColor: '#666' }]}
            onPress={() => {
              logger.info('ProductListScreen', '配置按钮被点击，跳转到配置页面');
              try {
                router.push('/config');
              } catch (error) {
                logger.error('ProductListScreen', '跳转配置页面失败', error);
              }
            }}
          >
            <Ionicons name="settings" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
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
        <FlatList
          ref={flatListRef}
          data={productData?.products || []}
          keyExtractor={(prod) => prod.id}
          renderItem={({ item }) => <ProductCard product={item} />}
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
      </View>

      {/* 轮播模态框 */}
      <CarouselModal
        visible={carouselVisible}
        onClose={() => setCarouselVisible(false)}
        products={allProductsData?.products || []}
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
    width: 12,
  },
});

export default ProductListScreen;
