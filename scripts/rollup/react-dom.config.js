import { getPackageJSON, resolvePkgPath, getBaseRollupPlugins } from './utils';
import generatePackageJson from 'rollup-plugin-generate-package-json';
import alias from '@rollup/plugin-alias';
const { name, module, peerDependencies } = getPackageJSON('react-dom');
// react-dom包的路径
const pkgPath = resolvePkgPath(name);
// react-dom产物路径
const pkgDistPath = resolvePkgPath(name, true);
export default [
  // react-dom
  {
    input: `${pkgPath}/${module}`,
    output: [
      {
        file: `${pkgDistPath}/index.js`,
        name: 'index',
        format: 'esm'
      },
      //兼容react-dom/client
      {
        file: `${pkgDistPath}/client.js`,
        name: 'client',
        format: 'esm'
      }
    ],
    plugins: [
      ...getBaseRollupPlugins(),
      alias({
        entries: {
          hostConfig: `${pkgPath}/src/hostConfig.ts`
        }
      }),
      generatePackageJson({
        inputFolder: pkgPath,
        outputFolder: pkgDistPath,
        baseContents: ({ name, description, version }) => ({
          name,
          description,
          version,
          peerDependencies: {
            react: version
          },
          main: 'index.js'
        })
      })
    ],
    external: [...Object.keys(peerDependencies)]
  },
  //react-test-utils
  {
    input: `${pkgPath}/test-utils.ts`,
    output: [
      {
        file: `${pkgDistPath}/test-utils.js`,
        name: 'testUtils',
        format: 'umd'
      }
    ],
    plugins: [...getBaseRollupPlugins()],
    external: ['react', 'react-dom']
  }
];
