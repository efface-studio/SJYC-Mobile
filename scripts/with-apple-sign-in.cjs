const { withEntitlementsPlist } = require('expo/config-plugins');

// Expo also applies the installed Apple authentication plugin during prebuild.
module.exports = (config) => withEntitlementsPlist(config, (mod) => {
  if (!config.ios?.usesAppleSignIn) delete mod.modResults['com.apple.developer.applesignin'];
  return mod;
});
