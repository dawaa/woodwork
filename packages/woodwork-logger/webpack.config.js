const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: './lib/woodwork-logger.js',
  devtool: 'source-map',
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          mangle: {
            properties: {
              reserved: [
                'create',
                'flush',
                'get',
              ],
            },
          },
        },
      }),
    ],
  },
};
