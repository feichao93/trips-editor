const webpack = require('webpack')
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const packageInfo = require('./package')

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production'

  return {
    context: __dirname,

    entry: './src/main.tsx',

    output: {
      path: path.join(__dirname, 'build'),
      filename: isProduction ? '[name].[chunkhash:6].js' : '[name].js',
    },

    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },

    module: {
      rules: [
        { test: /\.tsx?$/, loaders: ['ts-loader'] },
        { test: /\.css$/, loaders: ['style-loader', 'css-loader'] },
        { test: /\.styl$/, loaders: ['style-loader', 'css-loader', 'stylus-loader'] },
        { test: /\.ya?ml$/, loaders: ['json-loader', 'yaml-loader'] },
      ],
    },

    plugins: [
      new HtmlWebpackPlugin({ template: 'src/template.html' }),
      new webpack.DefinePlugin({
        BUILD_VERSION: JSON.stringify(packageInfo.version),
        BUILD_TIME: JSON.stringify(new Date().toString()),
      }),
      new webpack.ProvidePlugin({
        Snabbdom: 'snabbdom-pragma',
      }),
    ],

    devServer: {
      hot: true,
    },
  }
}
