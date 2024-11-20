const { defineConfig } = require('@vue/cli-service')
const fs = require('fs');
const path = require('path');

module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    https: {
      key: fs.readFileSync(path.join(__dirname, 'cert', 'cert.key')),
      cert: fs.readFileSync(path.join(__dirname, 'cert', 'cert.crt')),
    },
  }
})
