// 测试 Directus URL 转换
const { getDirectusThumbnailUrl, getDirectusImageUrl } = require('./utils/directus.ts');

// 测试文件 ID（从实际数据中获取）
const testFileId = 'fea3b6e6-936c-47f3-99de-5216b3d7fdd9';

console.log('测试 Directus URL 转换:');
console.log('文件 ID:', testFileId);
console.log('缩略图 URL:', getDirectusThumbnailUrl(testFileId, 320));
console.log('原始 URL:', getDirectusImageUrl(testFileId));
console.log('优化 URL:', getDirectusImageUrl(testFileId, 500, 500, 90));
