const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const dotenv = require('dotenv');

// Load environment variables
const env = dotenv.config({ path: '.env.local' }).parsed || dotenv.config().parsed || {};

module.exports = {
  entry: {
    popup: './src/index.js',
    background: './src/background.js',
    content: './src/content.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx']
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: 'popup.html',
      chunks: ['popup']
    }),
    new CopyWebpackPlugin({
      patterns: [
        // Copy all files from public directory except index.html (handled by HtmlWebpackPlugin)
        { 
          from: 'public',
          to: '.',
          globOptions: {
            ignore: ['**/index.html']
          },
          noErrorOnMissing: true
        }
      ]
    }),
    new webpack.DefinePlugin({
      'process.env': JSON.stringify({
        REACT_APP_SUPABASE_URL: env.REACT_APP_SUPABASE_URL || '',
        REACT_APP_SUPABASE_ANON_KEY: env.REACT_APP_SUPABASE_ANON_KEY || '',
        NODE_ENV: process.env.NODE_ENV || 'development'
      })
    })
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist')
    },
    port: 3000,
    hot: true
  }
};