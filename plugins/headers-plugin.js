module.exports = function (context, options) {
  return {
    name: 'docusaurus-plugin-headers',
    configureWebpack(config, isServer, utils) {
      return {
        devServer: {
          headers: {
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp',
          },
        },
      };
    },
  };
};
