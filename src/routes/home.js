// Home page route.
//
// A minimal Hapi route definition — exports an object with method, path,
// and handler. The handler calls h.view() to render a Nunjucks template.
// Route-specific variables (like pageTitle) are passed as the second
// argument and merged with the global context from nunjucks/context.js.

export const home = {
  method: 'GET',
  path: '/',
  handler: function (_request, h) {
    return h.view('home', {
      pageTitle: 'Cookie Banner Demo'
    })
  }
}
