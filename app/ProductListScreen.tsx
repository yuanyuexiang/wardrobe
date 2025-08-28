import { gql, useQuery } from '@apollo/client';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ProductCard from '../components/ProductCard';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  image?: string;
  price?: number;
  description?: string;
}

interface TabProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

const Tab: React.FC<TabProps> = ({ label, selected, onPress }) => (
  <View style={{ marginRight: 12 }}>
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: selected ? '#e91e63' : '#f5f5f5',
      }}
    >
      <Text style={{ color: selected ? '#fff' : '#333', fontWeight: 'bold' }}>{label}</Text>
    </TouchableOpacity>
  </View>
);

const GET_CATEGORIES = gql`
  query GetCategories {
    categories {
      id
      name
    }
  }
`;

const GET_PRODUCTS_BY_CATEGORY = gql`
  query GetProducts($categoryId: ID!, $limit: Int, $offset: Int, $search: String) {
    products(
      filter: {
        category: { id: { _eq: $categoryId } },
        _or: [
          { name: { _contains: $search } },
          { description: { _contains: $search } }
        ]
      }
      limit: $limit
      offset: $offset
    ) {
      id
      name
      image
      price
      description
    }
  }
`;

const PAGE_SIZE = 10;

const ProductListScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const { data: categoryData, loading: categoryLoading } = useQuery<{ categories: Category[] }>(GET_CATEGORIES);
  const {
    data: productData,
    loading: productLoading,
    fetchMore,
    refetch,
  } = useQuery<{ products: Product[] }>(GET_PRODUCTS_BY_CATEGORY, {
    variables: { categoryId: selectedCategory, limit: PAGE_SIZE, offset, search },
    skip: !selectedCategory,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    setOffset(0);
    await refetch({ categoryId: selectedCategory, limit: PAGE_SIZE, offset: 0, search });
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (productData?.products?.length === PAGE_SIZE) {
      const newOffset = offset + PAGE_SIZE;
      setOffset(newOffset);
      fetchMore({
        variables: { categoryId: selectedCategory, limit: PAGE_SIZE, offset: newOffset },
        updateQuery: (prev: { products: Product[] }, { fetchMoreResult }: { fetchMoreResult?: { products: Product[] } }) => {
          if (!fetchMoreResult) return prev;
          return {
            products: [...prev.products, ...fetchMoreResult.products],
          };
        },
      });
    }
  };

  if (categoryLoading) return <ActivityIndicator />;

  return (
    <View style={styles.container}>
      <FlatList
        horizontal
        data={categoryData?.categories}
        keyExtractor={(cat: any) => cat.id}
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
        showsHorizontalScrollIndicator={false}
      />
      <TextInput
        style={styles.search}
        value={search}
        onChangeText={text => {
          setSearch(text);
          setOffset(0);
        }}
        placeholder="搜索商品名称或描述"
      />
      <FlatList
        data={productData?.products || []}
        keyExtractor={(prod: any) => prod.id}
        renderItem={({ item }) => <ProductCard product={item} />}
        style={styles.productList}
        ListEmptyComponent={productLoading ? <ActivityIndicator /> : null}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tabBar: {
    height: 56,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  search: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 10,
    margin: 8,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  productList: {
    flex: 1,
    padding: 8,
  },
});

export default ProductListScreen;
