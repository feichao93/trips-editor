const webpack = require('webpack')
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')

module.exports = env => {
  env = env || {}
  const isProduction = env.prod

  return {
    context: __dirname,
    devtool: isProduction ? false : 'source-map',

    entry: './src/main.tsx',

    output: {
      path: path.join(__dirname, 'build'),
      filename: isProduction ? '[name].[chunkhash:6].js' : '[name].js',
    },

    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },

    module: {
      loaders: [
        { test: /\.tsx?$/, loaders: ['ts-loader'] },
        { test: /\.css$/, loaders: ['style-loader', 'css-loader'] },
        { test: /\.styl$/, loaders: ['style-loader', 'css-loader', 'stylus-loader'] },
      ],
    },

    plugins: [
      new HtmlWebpackPlugin({ template: 'src/template.html' }),
      new webpack.DefinePlugin({
        'node.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
      }),
      new webpack.NamedModulesPlugin(),
      new webpack.ProvidePlugin({
        Snabbdom: 'snabbdom-pragma',
      }),
    ].concat(isProduction ? [new UglifyJsPlugin()] : [new webpack.HotModuleReplacementPlugin()]),

    devServer: {
      port: 8080,
      hot: true,
    },
  }
}
