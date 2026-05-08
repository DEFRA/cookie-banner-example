// Health check endpoint.
//
// Container orchestrators (Docker, Kubernetes) poll this endpoint to
// determine if the service is running. A 200 response means "healthy".
// This should be a lightweight check with no external dependencies.

export const health = {
  method: 'GET',
  path: '/health',
  handler: function (_request, h) {
    return h.response({ message: 'success' })
  }
}
