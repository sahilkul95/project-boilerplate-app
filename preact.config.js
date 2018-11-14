// import ButternutWebpackPlugin from 'butternut-webpack-plugin';
import preactCliSwPrecachePlugin from 'preact-cli-sw-precache';

export default (config, env, helpers) => {
  const precacheConfig = {
    staticFileGlobs: [
      'public/assets',
      'public/index.html',
      'public/manifest.json'
    ],
    stripPrefix: 'public/',
    minify: true,
    navigateFallback: 'index.html',
    clientsClaim: true,
    skipWaiting: true
    // filename: 'sw.js'
  };
  let { index } = helpers.getPluginsByName(config, 'UglifyJsPlugin')[0] || 0;
  // console.log(plugin.options);
  if (index) {
    config.plugins.splice(index, 1);
    // config.plugins.push(new ButternutWebpackPlugin());
  }
  preactCliSwPrecachePlugin(config, precacheConfig);
};
