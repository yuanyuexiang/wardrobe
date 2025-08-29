import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
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
  
  // 使用真实的API
  const { data: categoryData, loading: categoryLoading, error: categoryError } = useGetCategoriesQuery();
  const { data: productData, loading: productLoading, error: productError, fetchMore, refetch } = useGetProductsQuery({
    variables: {
      categoryFilter: selectedCategory ? { id: { _eq: parseInt(selectedCategory) } } : undefined,
      limit: PAGE_SIZE,
      offset,
      search,
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
    setOffset(0);
    await refetch({ 
      categoryFilter: selectedCategory ? { id: { _eq: selectedCategory } } : undefined, 
      limit: PAGE_SIZE, 
      offset: 0, 
      search 
    });
    setRefreshing(false);
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
      <FlatList
        data={productData?.products || []}
        keyExtractor={(prod) => prod.id}
        renderItem={({ item }) => <ProductCard product={item} />}
        style={styles.productList}
        contentContainerStyle={styles.productContainer}
        ListEmptyComponent={productLoading ? <ActivityIndicator size="large" color="#ff6b35" /> : null}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        numColumns={2}
        columnWrapperStyle={styles.row}
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
  productList: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  productContainer: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
});

export default ProductListScreen;
