import { defineConfig, presetUno, transformerDirectives } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
  ],
  transformers: [
    transformerDirectives(),
  ],
  theme: {
    colors: {
      'ma-bg': '#e8effc',
      'ma': '#195ee6',
      'ma-text': '#505050',
      'ma-h': '#dae5fb',
    }
  }
})
