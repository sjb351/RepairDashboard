export function getApiBase(config) {
  const host = config?.reasons_api?.host
  if (host) {
    const port = config?.reasons_api?.port ? `:${config.reasons_api.port}` : ""
    return `http://${host}${port}`
  }
  return "/api"
}
