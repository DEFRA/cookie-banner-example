import neostandard from 'neostandard'

export default [
  ...neostandard({
    ignores: ['.public/**']
  }),
  {
    rules: {
      curly: ['error', 'all']
    }
  }
]
