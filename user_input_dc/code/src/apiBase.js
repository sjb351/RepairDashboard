export function getApiBase(config) {
  const host = config?.reasons_api?.host
  if (host) {
    const port = config?.reasons_api?.port ? `:${config.reasons_api.port}` : ""
    const protocol =
      config?.reasons_api?.protocol ||
      (typeof window !== "undefined" ? window.location.protocol.replace(":", "") : "http")
    return `${protocol}://${host}${port}`
  }
  return "/api"
}
