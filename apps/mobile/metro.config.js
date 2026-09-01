const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const config = getDefaultConfig(projectRoot);

// The journal model stays in the shared package rather than being copied into
// the native client. Metro must watch that workspace directory during development.
config.watchFolders = [workspaceRoot];

module.exports = config;
