const path = require('path');

module.exports = {
  target: 'node', 
  entry: './server.js', 
  output: {
    filename: 'server.bundle.js',
    path: path.resolve(__dirname, 'dist'), // Output directory for bundled server-side code
    libraryTarget: 'commonjs2', // Output format for Node.js
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
          },
        },
      },
    ],
  },
};