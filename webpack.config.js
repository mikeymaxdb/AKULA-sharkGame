const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const ESLintPlugin = require('eslint-webpack-plugin')
const path = require('path')

module.exports = {
    entry: './src/index.js',
    target: 'web',
    stats: 'errors-warnings',
    resolve: {
        modules: [
            path.resolve(__dirname, 'node_modules'),
            path.resolve(__dirname, 'src'),
        ],
    },
    plugins: [
        new ESLintPlugin(),
        new MiniCssExtractPlugin(),
        new HtmlWebpackPlugin({
            title: 'index',
            template: 'src/index.html',
        }),
        new CopyPlugin({
            patterns: [
                { from: 'assets', to: 'assets' },
                // { from: 'favicon.ico', to: 'favicon.ico' },
            ],
        }),
    ],
    module: {
        rules: [
            { test: /\.(png|woff|woff2|eot|ttf|svg)$/, loader: 'url-loader' },
            {
                test: /\.s[ac]ss$/i,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader',
                    'sass-loader',
                ],
            },
        ],
    },
    devServer: {
        contentBase: path.join(__dirname, 'dist'),
        port: 2080,
        host: '0.0.0.0',
    },
    devtool: 'inline-source-map',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
    },
};
