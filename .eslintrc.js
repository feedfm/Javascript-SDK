module.exports = {
  'env': {
    'es6': true,
    'browser': true
  },
  'extends': 'eslint:recommended',
  'parserOptions': {
    'ecmaVersion': 2018,
    sourceType: 'module'
  },
  'rules': {
    'no-console': [ 'error', { 'allow': [ 'log' ] } ],
    'indent': [ 'error', 2 ],
    'linebreak-style': [ 'error', 'unix' ],
    'quotes': [ 'error', 'single' ],
    'semi': [ 'error', 'always' ],
    'eqeqeq': [ 'error', 'always' ]
  }
};
