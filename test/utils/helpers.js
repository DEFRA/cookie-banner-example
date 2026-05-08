export function getOptions (page, method = 'GET') {
  return {
    method,
    url: `/${page}`
  }
}
