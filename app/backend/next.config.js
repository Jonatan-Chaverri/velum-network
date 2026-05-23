export default {
    webpack(config) {
      config.module.rules.push({
        test: /\.wasm$/,
        type: 'asset/resource',
      });
      return config;
    },
  };
  