import { terser } from 'rollup-plugin-terser'

export default {
    input: 'history.js',
    output: {
        file: '../release/plugins/history.min.js',
        format: 'iife',
        name: '$.Fx.History',
        banner: '/*! history/tQuery v0.1.2 | (c) zhliner@gmail.com 2021.10.20 | MIT License */',
        sourcemapExcludeSources: true,
    },
    plugins: [
        terser()
    ]
}
