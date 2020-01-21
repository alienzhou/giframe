import path from 'path';
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve'; // resolve external packages
import typescript from 'rollup-plugin-typescript2'; // notice ts version (https://github.com/ezolenko/rollup-plugin-typescript2/issues/88)
import strip from '@rollup/plugin-strip';
import { terser } from "rollup-plugin-terser";
import pkg from './package.json';

const ROOT_DIR = __dirname;
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');
const BANNER = `/** GIFrame.js v${pkg.version}, repo: https://github.com/alienzhou/giframe, MIT licence */`;

export default {
    input: path.resolve(ROOT_DIR, 'src', 'giframe.ts'),
    plugins: [
        typescript({
            tsconfig: 'tsconfig.json',
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
        strip()
    ],
    output: [{
        file: path.resolve(DIST_DIR, 'umd', 'giframe.js'),
        format: 'umd',
        name: 'GIFrame',
        sourcemap: true,
        banner: BANNER,
        globals: {
            window: 'window'
        },
        plugins: [
            babel({ runtimeHelpers: true }),
            terser({
                output: {
                    comments: /GIFrame.js/,
                }
            })
        ]
    }, {
        file: path.resolve(DIST_DIR, 'esm', 'giframe.esm.js'),
        format: 'esm',
        name: 'GIFrame',
        banner: BANNER,
        sourcemap: true,
        plugins: [
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
        ]
    }]
};
