import client from './client'

export const chatAPI = {
  status: (signal) => client.get('/chat/status', { signal }),
  send: (request, signal) => client.post('/chat', request, { signal, timeout: 195000 }),
  documents: (query, page, signal) => client.get('/personal/documents', { params: { query, page, size: 20 }, signal }),
  documentStatus: (id, signal) => client.get(`/personal/documents/${id}/rag`, { signal }),
  enableDocument: (id, signal) => client.post(`/personal/documents/${id}/rag`, { consent: true }, { signal }),
  disableDocument: (id, signal) => client.delete(`/personal/documents/${id}/rag`, { signal }),
  askDocument: (id, message, signal) => client.post(`/personal/documents/${id}/rag/ask`, { message }, { signal, timeout: 195000 })
}
