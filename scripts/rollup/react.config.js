import {
  getPackageJson,
  resolvePkgPath,
  getBaseRollupPlugins
} from './utils.js';
import generatePackageJson from 'rollup-plugin-generate-package-json';
const { name, module } = getPackageJson('react');
//react 包的路径
const pkgPath = resolvePkgPath(name);
//react的产物路径
const pkgDistPath = resolvePkgPath(name, true);

export default [
  //react 包的入口
  {
    input: `${pkgPath}/${module}`,
    output: {
      file: `${pkgDistPath}/index.js`,
      name: 'react',
      format: 'esm'
    },
    plugins: [
      ...getBaseRollupPlugins({}),
      generatePackageJson({
        inputFolder: pkgPath,
        outputFolder: pkgDistPath,
        baseContents: ({ name, version, main, module, description }) => {
          return {
            name,
            version,
            main: 'index.js',
            description
          };
        }
      })
    ]
  },
  // jsx-runtime 包的入口
  {
    input: `${pkgPath}/src/jsx.ts`,
    output: [
      //jsx-runtime 包的产物
      {
        file: `${pkgDistPath}/jsx-runtime.js`,
        name: 'jsx-runtime.js',
        format: 'esm'
      },
      // jsx-dev-runtime 包的产物
      {
        file: `${pkgDistPath}/jsx-dev-runtime.js`,
        name: 'jsx-dev-runtime.js',
        format: 'esm'
      }
    ],
    plugins: [...getBaseRollupPlugins({})]
  }
];
