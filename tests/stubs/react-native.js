module.exports = {
  Platform: { OS: 'web', select: (spec) => (spec && spec.web) || spec && spec.default },
  Alert: { alert: () => {} },
  AppState: { currentState: 'active', addEventListener: () => ({ remove: () => {} }) },
};
