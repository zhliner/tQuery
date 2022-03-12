import { terser } from 'rollup-plugin-terser'

const _banner = '/*! tQuery v0.5.3 | (c) zhliner@gmail.com 2021.10.20 | MIT License */';

export default {
    input: 'tquery.js',
    output: [
        {
            file: '../articlejs/base/tquery/tquery.min.js',
            format: 'iife',
            name: '$',
            banner: _banner,
            sourcemapExcludeSources: true,
        },
        {
            file: '../Tpb/tquery/tquery.min.js',
            format: 'iife',
            name: '$',
            banner: _banner,
            sourcemapExcludeSources: true,
        },
    ],
    plugins: [
        terser({
            mangle: {
                keep_classnames: true,
                keep_fnames: /^tQuery$/
            }
        })
    ]
}
