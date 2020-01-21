import path from 'path';
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve'; // resolve external packages
import typescript from 'rollup-plugin-typescript2'; // notice ts version (https://github.com/ezolenko/rollup-plugin-typescript2/issues/88)
import strip from '@rollup/plugin-strip';
import { terser } from "rollup-plugin-terser";
import pkg from './package.json';

const ROOT_DIR = __dirname;
const BANNER = `/** GIFrame.js v${pkg.version}, repo: https://github.com/alienzhou/giframe, MIT licence */`;

export default [{
    input: path.resolve(ROOT_DIR, 'src', 'giframe.ts'),
    plugins: [
        typescript({
            tsconfigOverride: {
                compilerOptions: {
                    module: 'ES2015',
                    target: 'ES5'
                }
            }
        }),
        resolve({
            mainFields: ['module', 'main'],
            browser: true
        }),
        commonjs(),
        strip(),
        babel({ runtimeHelpers: true }),
        terser({
            output: {
                comments: /GIFrame.js/,
            }
        })
    ],
    output: [{
        file: pkg.browser,
        format: 'umd',
        name: 'GIFrame',
        sourcemap: true,
        banner: BANNER,
        globals: {
            window: 'window'
        }
    }]
}, {
    input: path.resolve(ROOT_DIR, 'src', 'giframe.ts'),
    plugins: [
        typescript({
            tsconfigOverride: {
                compilerOptions: {
                    module: 'ES2015'
                }
            }
        }),
        resolve({
            mainFields: ['module', 'main'],
            browser: true
        }),
        commonjs(),
        strip(),
        terser({
            compress: false,
            mangle: false,
            module: true,
            output: {
                beautify: true,
                comments: /GIFrame.js/,
                braces: true
            }
        })
    ],
    output: [{
        file: pkg.module,
        format: 'esm',
        name: 'GIFrame',
        banner: BANNER,
        sourcemap: true
    }]
}];
