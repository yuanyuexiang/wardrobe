module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // 暂时移除 module-resolver 插件，避免 EAS Build 问题
      // [
      //   'module-resolver',
      //   {
      //     root: ['./'],
      //     alias: {
      //       '@': '.',
      //       '@/components': './components',
      //       '@/constants': './constants',
      //       '@/hooks': './hooks',
      //       '@/utils': './utils',
      //       '@/config': './config',
      //       '@/types': './types',
      //       '@/screens': './screens',
      //     },
      //   },
      // ],
    ],
  };
};
