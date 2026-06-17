require('dotenv').config();
const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') return;

  if (!process.env.APPLE_ID || !process.env.APPLE_TEAM_ID) {
    console.log('Skipping notarization: APPLE_ID or APPLE_TEAM_ID not set');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  return await notarize({
    tool: 'notarytool',
    teamId: process.env.APPLE_TEAM_ID,
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
  });
};