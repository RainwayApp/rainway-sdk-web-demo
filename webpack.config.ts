import fs = require("fs");
import path = require("path");
import webpack = require("webpack");
import HtmlWebpackPlugin = require("html-webpack-plugin");
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");
const assetPath = path.resolve(__dirname, "./assets");
const outputPath = path.resolve(__dirname, "./public");
import "webpack-dev-server";

const sdkVersion = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "node_modules", "@rainway", "web", "package.json"),
    { encoding: "utf-8" },
  ),
).version;

console.log(`Detected Rainway SDK version ${sdkVersion}`);

const config: webpack.Configuration & { devServer: any } = {
  resolve: {
    extensions: [".webpack.js", ".web.js", ".ts", ".tsx", ".js", ".css"],
    plugins: [
      // the SDK itself uses paths. pretty dumb that you need to point this plugin
      // at the tsconfig of the dependency but there you go
      //new TsconfigPathsPlugin({ configFile: "../rainway-sdk/tsconfig.json" }),
      new TsconfigPathsPlugin({
        configFile: "./tsconfig.json",
        extensions: [".webpack.js", ".web.js", ".ts", ".tsx", ".js", ".css"],
      }),
    ],
    fallback: { util: false },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        options: {
          projectReferences: true,
        },
      },
      {
        test: /\.js$/,
        loader: "source-map-loader",
        enforce: "post",
      },
      {
        test: /\.css$/,
        use: [
          "style-loader",
          { loader: "css-loader", options: { importLoaders: 1 } },
          {
            loader: "postcss-loader",
            options: {
              ident: "postcss",
              plugins: [require("autoprefixer")],
            },
          },
        ],
      },
      {
        include: [assetPath],
        test: /\.(png|svg|jpg|jpeg|otf|eot|woff2?|svg|ttf|js|json|webp|ico)$/,
        use: {
          loader: "file-loader",
          options: {
            name: "[path][name].[ext]",
          },
        },
      },
    ],
  },
  entry: {
    quick: "./src/quick-demo/index.tsx",
    react: "./src/react-demo/index.tsx",
  },
  output: {
    filename: "bundle.[name].[fullhash].js",
    path: outputPath,
  },
  plugins: [
    new HtmlWebpackPlugin({
      chunks: ["quick"],
      inject: "body",
      template: path.resolve(assetPath, "./index-quick.ejs"),
      inlineSource: ".(js|css)$",
      filename: "quick/index.html",
    }),
    new HtmlWebpackPlugin({
      chunks: ["react"],
      inject: "body",
      template: path.resolve(assetPath, "./index-react.ejs"),
      inlineSource: ".(js|css)$",
      filename: "index.html",
    }),
    new webpack.DefinePlugin({
      __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
      __RAINWAY_SDK_VERSION__: JSON.stringify(sdkVersion),
      __BUILD_COMMIT__: JSON.stringify(
        require("child_process")
          .execSync("git rev-parse --short HEAD")
          .toString(),
      ),
    }),
  ],
  devtool: "inline-source-map",
  mode: "development",
  devServer: {
    contentBase: outputPath,
    host: "0.0.0.0",
    port: 4445,
    disableHostCheck: true,
    inline: true,
    stats: "minimal",
    historyApiFallback: true,
  },
};

module.exports = config;
