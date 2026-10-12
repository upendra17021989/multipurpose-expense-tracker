import client from './client'

export const chatAPI = {
  status: (signal) => client.get('/chat/status', { signal }),
  send: (request, signal) => client.post('/chat', request, { signal, timeout: 195000 })
}
