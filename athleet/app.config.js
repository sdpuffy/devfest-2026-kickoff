// Extends app.json for the GitHub Pages build.
//
// Normal development (`npx expo start`) uses app.json unchanged.
//
// When EXPO_BASE_URL is set (the deploy workflow sets it to "/<repo-name>"), the web build
// becomes a static site that GitHub Pages can host:
//   - `static` output: one HTML file per route
//   - API routes turned off (GitHub Pages can't run server code)
//   - every URL and asset path prefixed with the repo name
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_BASE_URL;
  if (!baseUrl) return config;

  return {
    ...config,
    web: { ...config.web, output: 'static' },
    experiments: { ...config.experiments, baseUrl },
    plugins: (config.plugins ?? []).map((plugin) => {
      if (plugin === 'expo-router') return ['expo-router', { apiRoutes: false }];
      if (Array.isArray(plugin) && plugin[0] === 'expo-router') return ['expo-router', { ...plugin[1], apiRoutes: false }];
      return plugin;
    }),
  };
};
