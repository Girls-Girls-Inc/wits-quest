module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
  overrides: [
    {
      test: ['./frontend/src'],
      plugins: ['babel-plugin-transform-vite-meta-env']
    }
  ]
};
