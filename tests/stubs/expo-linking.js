module.exports = {
  createURL: (path) => `https://example.invalid/${path}`,
  openSettings: async () => {},
  parse: () => ({ pathname: '/' }),
  addEventListener: () => ({ remove: () => {} }),
};
