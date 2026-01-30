import { defineConfig } from '@tarojs/taro-solid';

export default defineConfig({
  appKey: 'pet-hospital-user',
  designWidth: 375,
  deviceRatio: {
    375: 1,
    640: 2.6 / 2,
    750: 1,
    828: 1.81 / 2,
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: [],
  compiler: {
    type: 'webpack',
    prebundle: {
      enable: false,
    },
  },
  framework: 'solid',
  cache: {
    enable: false,
  },
});
