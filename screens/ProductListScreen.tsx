import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState, useEffect } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CarouselModal from '../components/CarouselModal';
import ProductCard from '../components/ProductCard';
import Tab from '../components/Tab';
import { useGetCategoriesQuery, useGetProductsQuery, useGetMyBoutiqueQuery } from '../generated/graphql';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { logger } from '../utils/logger';
import { LAYOUT, getCardWidth, getBottomPadding } from '../utils/constants';
import { imageCache } from '../utils/imageCache';
import { getDirectusThumbnailUrl } from '../utils/directus';

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
  
  // 使用真实的API
  const { data: categoryData, loading: categoryLoading, error: categoryError } = useGetCategoriesQuery();
  
  // 获取店铺信息 - 使用主端点和真实的用户ID
  const { data: boutiqueData, loading: boutiqueLoading, error: boutiqueError } = useGetMyBoutiqueQuery({
    variables: { userId: currentUser?.id || "" },
    skip: !currentUser?.id,
    // 不指定client，使用默认的主GraphQL端点
  });
  
  const boutique = boutiqueData?.boutiques?.[0]; // 假设一个用户只有一个商家
  
  // 构建查询变量
  const buildQueryVariables = () => {
    const variables: any = {};
    
    // 构建动态 filter 对象
    const filters: any[] = [];
    
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
  
  const { data: productData, loading: productLoading, error: productError, refetch } = useGetProductsQuery({
    variables: buildQueryVariables(),
  });

  // 获取所有商品用于轮播
  const { data: allProductsData } = useGetProductsQuery({
    variables: {
      limit: 1000, // 获取所有商品
      sort: ["-created_at"] // 按创建时间排序
    },
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
              {boutiqueLoading ? '加载中...' : (boutique?.name || '朱老板服装旗舰店')}
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
            style={styles.couponButton}
            onPress={() => setCarouselVisible(true)}
          >
            <Text style={styles.couponText}>轮播</Text>
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
    paddingVertical: 8, // 添加上下内边距
  },
  productContainer: {
    paddingHorizontal: 16,
    paddingBottom: BOTTOM_PADDING, // 使用动态计算的底部内边距
    alignItems: 'stretch', // 允许项目填充可用高度
    minHeight: '100%', // 确保容器充满可用空间
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
