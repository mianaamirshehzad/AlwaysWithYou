jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  return {
    Ionicons: (props) => React.createElement('Ionicons', props),
    MaterialIcons: (props) => React.createElement('MaterialIcons', props),
  };
});

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  return (props) => React.createElement('Ionicons', props);
});
