module.exports = {
  appId: 'com.claudemonitor.app',
  productName: 'Claude Monitor',
  copyright: 'Copyright 2026',
  directories: {
    output: 'dist-electron',
  },
  files: [
    'electron/**/*',
    'server/**/*',
    'package.json',
    'node_modules/**/*',
  ],
  extraResources: [
    {
      from: 'server/public',
      to: 'public',
    },
  ],
  mac: {
    category: 'public.app-category.developer-tools',
    target: [
      { target: 'dmg', arch: ['arm64'] },
      { target: 'zip', arch: ['arm64'] },
    ],
    icon: 'assets/icon.icns',
    hardenedRuntime: false,
    minimumSystemVersion: '11.0',
    entitlements: 'electron/entitlements.mac.plist',
    entitlementsInherit: 'electron/entitlements.mac.plist',
  },
  dmg: {
    title: 'Claude Monitor',
    window: { width: 540, height: 380 },
    iconSize: 128,
  },
  npmRebuild: true,
  asar: true,
  asarUnpack: [
    '**/*.node',
    'node_modules/better-sqlite3/**/*',
    'node_modules/**/*.node',
  ],
};