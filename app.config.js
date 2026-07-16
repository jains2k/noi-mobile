/**
 * Resolves local and EAS-hosted Firebase configuration without committing it.
 * EAS file variables contain an absolute temporary path on the build worker.
 */
module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    googleServicesFile:
      process.env.GOOGLE_SERVICE_INFO_PLIST || "./GoogleService-Info.plist",
  },
});
