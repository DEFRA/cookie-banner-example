// Client-side entry point.
//
// This file is the Webpack entry point for client-side JavaScript.
// It imports and initialises:
//
// 1. govuk-frontend's initAll() — required to activate GOV.UK Design
//    System components that use JavaScript (e.g. the cookie banner's
//    button styling, notification banners, etc.)
//
// 2. Our cookies module — handles the enhanced (JavaScript-enabled)
//    cookie banner behaviour: async consent submission, immediate
//    GTM loading, and GA cookie deletion.

import { initAll } from 'govuk-frontend'
import cookies from './cookies.js'

cookies.init()

initAll()
