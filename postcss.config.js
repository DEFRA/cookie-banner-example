import autoprefixer from 'autoprefixer'
import cssnano from 'cssnano'
import cssnanoPresetDefault from 'cssnano-preset-default'

export default {
  plugins: [
    autoprefixer({
      env: 'stylesheets'
    }),
    cssnano({
      preset: cssnanoPresetDefault({
        env: 'stylesheets'
      })
    })
  ]
}
