import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ProductCard from '../components/ProductCard';
import Tab from '../components/Tab';
import { useGetCategoriesQuery, useGetProductsQuery } from '../generated/graphql';

const PAGE_SIZE = 10;

const ProductListScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  
  // 使用真实的API
  const { data: categoryData, loading: categoryLoading, error: categoryError } = useGetCategoriesQuery();
  
  // 构建查询变量
  const buildQueryVariables = () => {
    const variables: any = {
      limit: PAGE_SIZE,
      offset,
    };
    
    // 构建动态 filter 对象
    const filters: any[] = [];
    
    // 添加分类过滤器
    if (selectedCategory) {
      filters.push({
        category_id: { id: { _eq: parseInt(selectedCategory) } }
      });
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
  
  const { data: productData, loading: productLoading, error: productError, fetchMore, refetch } = useGetProductsQuery({
    variables: buildQueryVariables(),
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
    setOffset(0);
    setCurrentIndex(0);
    const refreshVariables = buildQueryVariables();
    refreshVariables.offset = 0;
    await refetch(refreshVariables);
    setRefreshing(false);
  };

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const itemWidth = 160 + 12; // ProductCard width + separator
    const index = Math.round(contentOffset / itemWidth);
    setCurrentIndex(index);
  };

  const handleLoadMore = () => {
    if (productData?.products?.length === PAGE_SIZE) {
      const newOffset = offset + PAGE_SIZE;
      setOffset(newOffset);
      fetchMore({
        variables: {
          categoryFilter: selectedCategory ? { id: { _eq: selectedCategory } } : undefined,
          limit: PAGE_SIZE,
          offset: newOffset,
          search,
        },
      });
    }
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
            <Text style={styles.brandName}>酷耶旗舰店</Text>
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
          <TouchableOpacity style={styles.searchIcon}>
            <Ionicons name="search" size={20} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.couponButton}>
            <Text style={styles.couponText}>+ 领券</Text>
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
            data={categoryData?.categories || []}
            keyExtractor={(cat) => cat.id}
            renderItem={({ item: cat }) => (
              <Tab
                label={cat.name}
                selected={selectedCategory === cat.id}
                onPress={() => {
                  setSelectedCategory(cat.id);
                  setOffset(0);
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
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>推荐商品</Text>
          {selectedCategory && (
            <Text style={styles.sectionSubtitle}>
              {categoryData?.categories?.find(cat => cat.id === selectedCategory)?.name}
            </Text>
          )}
          {productData?.products && productData.products.length > 0 && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                {currentIndex + 1} / {productData.products.length}
              </Text>
            </View>
          )}
        </View>
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
          ListFooterComponent={() => (
            <TouchableOpacity style={styles.moreButton} activeOpacity={0.7}>
              <View style={styles.moreContent}>
                <Text style={styles.moreText}>查看更多</Text>
                <Ionicons name="chevron-forward" size={16} color="#ff6b35" />
              </View>
            </TouchableOpacity>
          )}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
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
    fontSize: 18,
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
    fontSize: 12,
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
    fontSize: 12,
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
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  progressContainer: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  productList: {
    flex: 1,
  },
  productContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: 'flex-start',
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
    fontSize: 16,
    color: '#999',
  },
  itemSeparator: {
    width: 12,
  },
  moreButton: {
    width: 100,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginLeft: 12,
    borderWidth: 2,
    borderColor: '#ff6b35',
    borderStyle: 'dashed',
  },
  moreContent: {
    alignItems: 'center',
  },
  moreText: {
    fontSize: 14,
    color: '#ff6b35',
    fontWeight: '600',
    marginBottom: 4,
  },
});

export default ProductListScreen;
