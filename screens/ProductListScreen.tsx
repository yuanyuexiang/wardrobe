import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Platform, RefreshControl, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CarouselModal from '../components/CarouselModal';
import ProductCard from '../components/ProductCard';
import Tab from '../components/Tab';
import { useGetCategoriesQuery, useGetProductsQuery } from '../generated/graphql';

// 计算卡片宽度 - 与ProductCard中的计算保持一致
const { width: screenWidth } = Dimensions.get('window');
const HORIZONTAL_PADDING = 32; // 左右各16px padding
const ITEM_SEPARATOR = 12; // 卡片间距
const VISIBLE_CARDS = 2.2; // 显示2.2个卡片，创造滑动效果
const cardWidth = (screenWidth - HORIZONTAL_PADDING - ITEM_SEPARATOR * (VISIBLE_CARDS - 1)) / VISIBLE_CARDS;

// 计算底部安全距离，避开底部选项卡
const TAB_BAR_HEIGHT = Platform.select({
  ios: 83, // iOS底部选项卡高度 + 安全区域
  android: 70, // Android底部选项卡高度
  default: 70,
});
const BOTTOM_PADDING = TAB_BAR_HEIGHT + 16; // 选项卡高度 + 额外间距

const ProductListScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>("recommended");
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [carouselVisible, setCarouselVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  
  // 使用真实的API
  const { data: categoryData, loading: categoryLoading, error: categoryError } = useGetCategoriesQuery();
  
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

  // 调试信息
  React.useEffect(() => {
    if (categoryError) {
      console.log('分类加载错误:', categoryError);
    }
    if (productError) {
      console.log('商品加载错误:', productError);
    }
  }, [categoryError, productError]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setCurrentIndex(0);
    const refreshVariables = buildQueryVariables();
    await refetch(refreshVariables);
    setRefreshing(false);
  };

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const itemWidth = cardWidth + ITEM_SEPARATOR; // 使用动态计算的卡片宽度
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
            <Text style={styles.brandName}>朱老板服装旗舰店</Text>
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
