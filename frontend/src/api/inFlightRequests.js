// Share overlapping reads only. Settled results are never cached.
export const createInFlightRequests = () => {
  const requests = new Map()
  return (key, fetchRequest) => {
    if (requests.has(key)) return requests.get(key)
    const request = Promise.resolve().then(fetchRequest).finally(() => requests.delete(key))
    requests.set(key, request)
    return request
  }
}
