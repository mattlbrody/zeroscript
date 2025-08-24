import path from 'path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import webpack from 'webpack';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const env = dotenv.config({ path: '.env.local' }).parsed || dotenv.config().parsed || {};

export default {
  entry: {
    popup: './src/index.js',
    background: './src/background.js',
    content: './src/contentWithAuth.js'
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