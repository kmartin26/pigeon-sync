// Fails when a production dependency does not support the Node version that
// ships with the minimum VS Code version in engines.vscode. webpack bundles
// these packages into dist/extension.js, so they run in the extension host.
const semver = require('semver');
const lock = require('../package-lock.json');

// VS Code 1.90 (engines.vscode ^1.90.0) runs extensions on Node 20.9.0.
const EXTENSION_HOST_NODE = '20.9.0';

const failures = Object.entries(lock.packages)
  .filter(([path, pkg]) => path && !pkg.dev && pkg.engines && pkg.engines.node)
  .filter(([, pkg]) => !semver.satisfies(EXTENSION_HOST_NODE, pkg.engines.node))
  .map(([path, pkg]) => `${path.replace(/^.*node_modules\//, '')}@${pkg.version} requires node ${pkg.engines.node}`);

if (failures.length) {
  console.error(`Production dependencies incompatible with Node ${EXTENSION_HOST_NODE}:`);
  failures.forEach(line => console.error(`  ${line}`));
  process.exit(1);
}
console.log(`All production dependencies support Node ${EXTENSION_HOST_NODE}.`);
