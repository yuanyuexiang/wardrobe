import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function HomeScreen() {
  const router = useRouter();
  
  useEffect(() => {
    // 自动跳转到商品列表页
    router.replace('/ProductListScreen');
  }, [router]);

  return null;
}
