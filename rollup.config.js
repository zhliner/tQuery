import { terser } from 'rollup-plugin-terser'

export default {
    input: 'tquery.js',
    output: {
        file: 'release/tquery.min.js',
        format: 'iife',
        name: '$',
        banner: '/*! tQuery v0.5.3 | (c) zhliner@gmail.com 2021.10.20 | MIT License */',
        sourcemapExcludeSources: true,
    },
    plugins: [
        terser()
    ]
}
