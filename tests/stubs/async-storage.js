const store = new Map();
module.exports = {
  __esModule: true,
  default: {
    getItem: async (k) => (store.has(k) ? store.get(k) : null),
    setItem: async (k, v) => { store.set(k, String(v)); },
    removeItem: async (k) => { store.delete(k); },
    clear: async () => { store.clear(); },
    getAllKeys: async () => Array.from(store.keys()),
    multiRemove: async (keys) => { keys.forEach((k) => store.delete(k)); },
  },
};
