// Lets the web build live under a sub-path (e.g. /app on the ODDO site) via ODDO_BASE_URL.
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...config.experiments, baseUrl: process.env.ODDO_BASE_URL || '' },
});
