const path = require('path')
const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  configureWebpack: {
    resolve: {
      alias: {
        // BASE_CONFIG: configPath,
        '@': path.resolve(__dirname, './src')
      }
    },
  },
  transpileDependencies: true
})
