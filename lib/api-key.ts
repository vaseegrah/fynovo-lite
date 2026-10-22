export function getApiKeyLast4(apiKey: string) {
  return apiKey.slice(-4);
}

export function getApiKeyPrefix(apiKey: string) {
  const visibleLength = apiKey.startsWith("fnv_") ? 12 : 8;
  return `${apiKey.slice(0, visibleLength)}...`;
}
