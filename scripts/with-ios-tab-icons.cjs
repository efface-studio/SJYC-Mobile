const { IOSConfig, withXcodeProject } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

// UIKit measures inactive tabs before Metro's asynchronous image requests finish.
module.exports = (config) => withXcodeProject(config, async (mod) => {
  const root = mod.modRequest.projectRoot;
  const catalog = path.join(IOSConfig.Paths.getSourceRoot(root), 'Images.xcassets');
  for (const tab of ['home', 'programs', 'spaces', 'clubs', 'my']) {
    for (const name of [tab, tab + '-rest']) {
      const dir = path.join(catalog, 'sjyc-tab-' + name + '.imageset');
      await fs.mkdir(dir, { recursive: true });
      const images = [];
      for (const scale of [1, 2, 3]) {
        const filename = name + (scale === 1 ? '' : '@' + scale + 'x') + '.png';
        await fs.copyFile(path.join(root, 'assets/navigation', filename), path.join(dir, filename));
        images.push({ idiom: 'universal', filename, scale: scale + 'x' });
      }
      await fs.writeFile(path.join(dir, 'Contents.json'), JSON.stringify({
        images, info: { author: 'xcode', version: 1 }, properties: { 'template-rendering-intent': 'original' },
      }));
    }
  }
  return mod;
});
