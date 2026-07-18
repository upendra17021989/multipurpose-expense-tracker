import axiosInstance from './client'
import { useAuthStore } from '../store/authStore'

const annualLedgerCache = new Map()

const invalidateAnnualCollections = (financialYear) => {
  const accountId = useAuthStore.getState().currentAccount?.id || 'no-account'
  if (financialYear) {
    ;[...annualLedgerCache.keys()].filter((key) => key.startsWith(`${accountId}:${financialYear}:`)).forEach((key) => annualLedgerCache.delete(key))
  } else {
    ;[...annualLedgerCache.keys()].filter((key) => key.startsWith(`${accountId}:`)).forEach((key) => annualLedgerCache.delete(key))
  }
}

const cachedAnnualLedger = (financialYear, flatId) => {
  const accountId = useAuthStore.getState().currentAccount?.id || 'no-account'
  const key = `${accountId}:${financialYear}:${flatId || 'member'}`
  if (annualLedgerCache.has(key)) return annualLedgerCache.get(key)
  const request = axiosInstance.get('/society/annual-collections/ledger', { params: { financialYear, ...(flatId ? { flatId } : {}) } })
    .catch((error) => {
      annualLedgerCache.delete(key)
      throw error
    })
  annualLedgerCache.set(key, request)
  return request
}

export const authAPI = {
  register: (data) => axiosInstance.post('/auth/register', data),
  login: (data) => axiosInstance.post('/auth/login', data),
  loginWithAccount: (data, accountId) => axiosInstance.post(`/auth/login/${accountId}`, data),
  resetPassword: (data) => axiosInstance.post('/auth/reset-password', data),
  switchAccount: (accountId) => axiosInstance.post(`/auth/switch-account/${accountId}`),
  addWorkspace: (data) => axiosInstance.post('/auth/workspaces', data),
  updateProfile: (data) => axiosInstance.put('/auth/profile', data),
  changePassword: (data) => axiosInstance.put('/auth/change-password', data),
  validateToken: () => axiosInstance.get('/auth/validate')
}

export const societyMembershipAPI = {
  listSocieties: () => axiosInstance.get('/public/societies'),
  listSocietyFlats: (societyId) => axiosInstance.get(`/public/societies/${societyId}/flats`),
  requestToJoin: (data) => axiosInstance.post('/society/membership-requests', data),
  getPending: () => axiosInstance.get('/society/membership-requests'),
  getMembers: () => axiosInstance.get('/society/members'),
  updateMemberRole: (membershipId, role) => axiosInstance.patch(`/society/members/${membershipId}/role`, { role }),
  approve: (requestId, data) => axiosInstance.post(`/society/membership-requests/${requestId}/approve`, data),
  reject: (requestId) => axiosInstance.delete(`/society/membership-requests/${requestId}`)
}

export const workspaceAPI = {
  listSports: () => axiosInstance.get('/public/sports-workspaces')
}

export const systemAdminAPI = {
  getDashboard: () => axiosInstance.get('/system-admin/dashboard'),
  getUsers: (params) => axiosInstance.get('/system-admin/users', { params }),
  setUserStatus: (id, active) => axiosInstance.patch(`/system-admin/users/${id}/status`, { active }),
  setSystemAdmin: (id, systemAdmin) => axiosInstance.patch(`/system-admin/users/${id}/system-admin`, { systemAdmin }),
  getAccounts: (params) => axiosInstance.get('/system-admin/accounts', { params }),
  setAccountStatus: (id, active) => axiosInstance.patch(`/system-admin/accounts/${id}/status`, { active }),
  getAuditLogs: (params) => axiosInstance.get('/system-admin/audit-logs', { params }),
  getFeedback: (params) => axiosInstance.get('/system-admin/feedback', { params }),
  updateFeedbackStatus: (id, data) => axiosInstance.patch(`/system-admin/feedback/${id}/status`, data),
  getHealth: () => axiosInstance.get('/system-admin/health'),
  getStorage: () => axiosInstance.get('/system-admin/storage'),
  getSettings: () => axiosInstance.get('/system-admin/settings'),
  updateSettings: (data) => axiosInstance.put('/system-admin/settings', data)
}

export const expenseCategoryAPI = {
  getCategories: () => axiosInstance.get('/expenses/categories'),
  getCategoriesByType: (categoryType) => axiosInstance.get(`/expenses/categories/type/${categoryType}`),
  getCategory: (categoryId) => axiosInstance.get(`/expenses/categories/${categoryId}`),
  createCategory: (data) => axiosInstance.post('/expenses/categories', data),
  updateCategory: (categoryId, data) => axiosInstance.put(`/expenses/categories/${categoryId}`, data),
  deleteCategory: (categoryId) => axiosInstance.delete(`/expenses/categories/${categoryId}`)
}

export const expenseAPI = {
  getExpenses: () => axiosInstance.get('/expenses'),
  getTodaysExpenses: () => axiosInstance.get('/expenses/today'),
  getExpensesByDateRange: (startDate, endDate) => axiosInstance.get('/expenses/range', { params: { startDate, endDate } }),
  getExpense: (expenseId) => axiosInstance.get(`/expenses/${expenseId}`),
  createExpense: (data) => axiosInstance.post('/expenses', data),
  updateExpense: (expenseId, data) => axiosInstance.put(`/expenses/${expenseId}`, data),
  deleteExpense: (expenseId) => axiosInstance.delete(`/expenses/${expenseId}`),
  approveExpense: (expenseId) => axiosInstance.post(`/expenses/${expenseId}/approve`),
  rejectExpense: (expenseId) => axiosInstance.post(`/expenses/${expenseId}/reject`),
  previewImport: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return axiosInstance.post('/expenses/import/preview', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  confirmImport: (rows) => axiosInstance.post('/expenses/import', { rows })
}

export const personalBudgetAPI = {
  getBudgets: () => axiosInstance.get('/personal-budgets'),
  getCurrentBudget: () => axiosInstance.get('/personal-budgets/current'),
  getBudgetByMonthYear: (month, year) => axiosInstance.get('/personal-budgets/lookup', { params: { month, year } }),
  createBudget: (data) => axiosInstance.post('/personal-budgets', data),
  updateBudget: (budgetId, data) => axiosInstance.put(`/personal-budgets/${budgetId}`, data),
  deleteBudget: (budgetId) => axiosInstance.delete(`/personal-budgets/${budgetId}`)
}

export const dailyQuoteAPI = {
  getToday: () => axiosInstance.get('/personal/quote-of-day')
}
export const feedbackAPI = {
  list: () => axiosInstance.get('/feedback'),
  create: (data) => axiosInstance.post('/feedback', data)
}

export const personalTodoAPI = {
  list: () => axiosInstance.get('/personal/todos'),
  create: (data) => axiosInstance.post('/personal/todos', data),
  update: (id, data) => axiosInstance.put(`/personal/todos/${id}`, data),
  setCompleted: (id, completed) => axiosInstance.patch(`/personal/todos/${id}/completed`, { completed }),
  delete: (id) => axiosInstance.delete(`/personal/todos/${id}`)
}

export const personalDocumentAPI = {
  list: (params = {}) => axiosInstance.get('/personal/documents', { params }),
  get: (documentId) => axiosInstance.get(`/personal/documents/${documentId}`),
  summary: () => axiosInstance.get('/personal/documents/summary'),
  create: (metadata, file) => {
    const formData = new FormData()
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    formData.append('file', file)
    return axiosInstance.post('/personal/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  update: (documentId, metadata) => axiosInstance.put(`/personal/documents/${documentId}`, metadata),
  share: (documentId, recipient) => axiosInstance.post(`/personal/documents/${documentId}/share`, { recipient }),
  download: (documentId) => axiosInstance.get(`/personal/documents/${documentId}/download`, { responseType: 'blob' }),
  delete: (documentId) => axiosInstance.delete(`/personal/documents/${documentId}`)
}

export const sharedExpenseAPI = {
  getGroups: () => axiosInstance.get('/personal/shared-expenses/groups'),
  getFriends: () => axiosInstance.get('/personal/shared-expenses/friends'),
  createGroup: (data) => axiosInstance.post('/personal/shared-expenses/groups', data),
  getGroup: (groupId) => axiosInstance.get(`/personal/shared-expenses/groups/${groupId}`),
  exportGroup: (groupId) => axiosInstance.get('/personal/shared-expenses/groups/' + groupId + '/export', { responseType: 'blob' }),
  exportGroupPdf: (groupId) => axiosInstance.get('/personal/shared-expenses/groups/' + groupId + '/export-pdf', { responseType: 'blob' }),
  updateGroup: (groupId, data) => axiosInstance.put(`/personal/shared-expenses/groups/${groupId}`, data),
  deleteGroup: (groupId) => axiosInstance.delete(`/personal/shared-expenses/groups/${groupId}`),
  addMember: (groupId, data) => axiosInstance.post(`/personal/shared-expenses/groups/${groupId}/members`, data),
  updateMember: (groupId, memberId, data) => axiosInstance.put(`/personal/shared-expenses/groups/${groupId}/members/${memberId}`, data),
  addExpense: (groupId, data) => axiosInstance.post(`/personal/shared-expenses/groups/${groupId}/expenses`, data),
  addSettlement: (groupId, data) => axiosInstance.post(`/personal/shared-expenses/groups/${groupId}/settlements`, data),
  reverseExpense: (expenseId) => axiosInstance.delete(`/personal/shared-expenses/expenses/${expenseId}`),
  reverseSettlement: (settlementId) => axiosInstance.delete(`/personal/shared-expenses/settlements/${settlementId}`),
  getInvitations: () => axiosInstance.get('/personal/shared-expenses/invitations'),
  inviteUser: (groupId, data) => axiosInstance.post(`/personal/shared-expenses/invitations/groups/${groupId}`, data),
  acceptInvitation: (invitationId) => axiosInstance.post(`/personal/shared-expenses/invitations/${invitationId}/accept`),
  declineInvitation: (invitationId) => axiosInstance.post(`/personal/shared-expenses/invitations/${invitationId}/decline`)
}


export const societyFlatAPI = {
  getFlats: (blockName) => axiosInstance.get('/society/flats', { params: blockName ? { blockName } : {} }),
  getFlat: (flatId) => axiosInstance.get(`/society/flats/${flatId}`),
  createFlat: (data) => axiosInstance.post('/society/flats', data),
  updateFlat: (flatId, data) => axiosInstance.put(`/society/flats/${flatId}`, data),
  deleteFlat: (flatId) => axiosInstance.delete(`/society/flats/${flatId}`),
  previewImport: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return axiosInstance.post('/society/flats/import/preview', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  confirmImport: (rows) => axiosInstance.post('/society/flats/import', { rows })
}

export const societyAnnualCollectionAPI = {
  list: (financialYear, page = 0, size = 10, search = '') => axiosInstance.get('/society/annual-collections', { params: { financialYear, page, size, search } }),
  ledger: cachedAnnualLedger,
  summary: (financialYear) => axiosInstance.get('/society/annual-collections/summary', { params: { financialYear } }),
  create: (data) => axiosInstance.post('/society/annual-collections', data).then((response) => {
    invalidateAnnualCollections(data.financialYear)
    return response
  }),
  update: (id, data) => axiosInstance.put(`/society/annual-collections/${id}`, data).then((response) => {
    invalidateAnnualCollections()
    return response
  }),
  delete: (id) => axiosInstance.delete(`/society/annual-collections/${id}`).then((response) => {
    invalidateAnnualCollections()
    return response
  }),
  previewBankBook: (file, financialYear) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('financialYear', financialYear)
    return axiosInstance.post('/society/annual-collections/bank-book/preview', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  importBankBook: (data) => axiosInstance.post('/society/annual-collections/bank-book/import', data).then((response) => {
    invalidateAnnualCollections(data.financialYear)
    return response
  })
}

export const societyStaffAPI = {
  getStaff: () => axiosInstance.get('/society/staff'),
  getStaffMember: (staffId) => axiosInstance.get(`/society/staff/${staffId}`),
  createStaff: (data) => axiosInstance.post('/society/staff', data),
  updateStaff: (staffId, data) => axiosInstance.put(`/society/staff/${staffId}`, data),
  deleteStaff: (staffId) => axiosInstance.delete(`/society/staff/${staffId}`)
}
export const societyVendorAPI = {
  getVendors: () => axiosInstance.get('/society/vendors'),
  getVendor: (vendorId) => axiosInstance.get(`/society/vendors/${vendorId}`),
  createVendor: (data) => axiosInstance.post('/society/vendors', data),
  updateVendor: (vendorId, data) => axiosInstance.put(`/society/vendors/${vendorId}`, data),
  deleteVendor: (vendorId) => axiosInstance.delete(`/society/vendors/${vendorId}`)
}
export const kiranaProductAPI = {
  getProducts: () => axiosInstance.get('/kirana/products'),
  getLowStockProducts: () => axiosInstance.get('/kirana/products/low-stock'),
  getProduct: (productId) => axiosInstance.get(`/kirana/products/${productId}`),
  createProduct: (data) => axiosInstance.post('/kirana/products', data),
  updateProduct: (productId, data) => axiosInstance.put(`/kirana/products/${productId}`, data),
  deleteProduct: (productId) => axiosInstance.delete(`/kirana/products/${productId}`)
}

export const kiranaSupplierAPI = {
  getSuppliers: () => axiosInstance.get('/kirana/suppliers'),
  getSupplier: (supplierId) => axiosInstance.get(`/kirana/suppliers/${supplierId}`),
  createSupplier: (data) => axiosInstance.post('/kirana/suppliers', data),
  updateSupplier: (supplierId, data) => axiosInstance.put(`/kirana/suppliers/${supplierId}`, data),
  deleteSupplier: (supplierId) => axiosInstance.delete(`/kirana/suppliers/${supplierId}`)
}

export const kiranaCustomerAPI = {
  getCustomers: () => axiosInstance.get('/kirana/customers'),
  getCustomer: (customerId) => axiosInstance.get(`/kirana/customers/${customerId}`),
  createCustomer: (data) => axiosInstance.post('/kirana/customers', data),
  updateCustomer: (customerId, data) => axiosInstance.put(`/kirana/customers/${customerId}`, data),
  deleteCustomer: (customerId) => axiosInstance.delete(`/kirana/customers/${customerId}`)
}

export const kiranaSalesAPI = {
  getSales: () => axiosInstance.get('/kirana/sales'),
  getSalesByDateRange: (startDate, endDate) => axiosInstance.get('/kirana/sales/range', { params: { startDate, endDate } }),
  getSale: (saleId) => axiosInstance.get(`/kirana/sales/${saleId}`),
  createSale: (data) => axiosInstance.post('/kirana/sales', data),
  updateSale: (saleId, data) => axiosInstance.put(`/kirana/sales/${saleId}`, data),
  cancelSale: (saleId) => axiosInstance.delete(`/kirana/sales/${saleId}`)
}

export const kiranaPurchaseAPI = {
  getPurchases: () => axiosInstance.get('/kirana/purchases'),
  getPurchasesByDateRange: (startDate, endDate) => axiosInstance.get('/kirana/purchases/range', { params: { startDate, endDate } }),
  getPurchase: (purchaseId) => axiosInstance.get(`/kirana/purchases/${purchaseId}`),
  createPurchase: (data) => axiosInstance.post('/kirana/purchases', data),
  updatePurchase: (purchaseId, data) => axiosInstance.put(`/kirana/purchases/${purchaseId}`, data),
  cancelPurchase: (purchaseId) => axiosInstance.delete(`/kirana/purchases/${purchaseId}`)
}

export const kiranaLedgerAPI = {
  getCustomerLedger: (customerId) => axiosInstance.get('/kirana/ledgers/customer-credit', { params: customerId ? { customerId } : {} }),
  recordCustomerPayment: (customerId, data) => axiosInstance.post(`/kirana/ledgers/customer-credit/${customerId}/payments`, data),
  getSupplierLedger: (supplierId) => axiosInstance.get('/kirana/ledgers/supplier-payments', { params: supplierId ? { supplierId } : {} }),
  recordSupplierPayment: (supplierId, data) => axiosInstance.post(`/kirana/ledgers/supplier-payments/${supplierId}/payments`, data)
}


export const festivalEventAPI = {
  getFestivals: (year) => axiosInstance.get('/society/festivals', { params: year ? { year } : {} }),
  getFestival: (festivalEventId) => axiosInstance.get(`/society/festivals/${festivalEventId}`),
  createFestival: (data) => axiosInstance.post('/society/festivals', data),
  updateFestival: (festivalEventId, data) => axiosInstance.put(`/society/festivals/${festivalEventId}`, data),
  updateFestivalStatus: (festivalEventId, status) => axiosInstance.put(`/society/festivals/${festivalEventId}/status`, { status }),
  deleteFestival: (festivalEventId) => axiosInstance.delete(`/society/festivals/${festivalEventId}`)
}

export const festivalCollectionAPI = {
  getCollections: (festivalEventId) => axiosInstance.get('/society/festival-collections', { params: { festivalEventId } }),
  getCollection: (collectionId) => axiosInstance.get(`/society/festival-collections/${collectionId}`),
  getSummary: (festivalEventId) => axiosInstance.get('/society/festival-collections/summary', { params: { festivalEventId } }),
  generateDemand: (data) => axiosInstance.post('/society/festival-collections/generate-demand', data),
  updateDemand: (collectionId, data) => axiosInstance.put(`/society/festival-collections/${collectionId}/demand`, data),
  addPayment: (collectionId, data) => axiosInstance.post(`/society/festival-collections/${collectionId}/payments`, data),
  getReceipts: (collectionId) => axiosInstance.get(`/society/festival-collections/${collectionId}/receipts`)
}
export const attachmentAPI = {
  getAttachments: (referenceType, referenceId) => axiosInstance.get('/attachments', { params: { referenceType, referenceId } }),
  uploadAttachment: (referenceType, referenceId, file) => {
    const formData = new FormData()
    formData.append('referenceType', referenceType)
    formData.append('referenceId', referenceId)
    formData.append('file', file)
    return axiosInstance.post('/attachments', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  deleteAttachment: (attachmentId) => axiosInstance.delete(`/attachments/${attachmentId}`),
  downloadAttachment: (attachmentId) => axiosInstance.get(`/attachments/${attachmentId}/download`, { responseType: 'blob' }),
  downloadUrl: (attachmentId) => `/api/attachments/${attachmentId}/download`
}

export const sportsAPI = {
  getMembershipRequests: () => axiosInstance.get('/sports/membership-requests'),
  approveMembership: (id) => axiosInstance.post(`/sports/membership-requests/${id}/approve`),
  rejectMembership: (id) => axiosInstance.delete(`/sports/membership-requests/${id}`),
  getMembers: () => axiosInstance.get('/sports/members'),
  createMember: (data) => axiosInstance.post('/sports/members', data),
  generateMemberLogins: () => axiosInstance.post('/sports/members/generate-logins'),
  updateMember: (memberId, data) => axiosInstance.put(`/sports/members/${memberId}`, data),
  deleteMember: (memberId) => axiosInstance.delete(`/sports/members/${memberId}`),
  getEvents: (year) => axiosInstance.get('/sports/events', { params: year ? { year } : {} }),
  createEvent: (data) => axiosInstance.post('/sports/events', data),
  updateEvent: (eventId, data) => axiosInstance.put(`/sports/events/${eventId}`, data),
  updateEventStatus: (eventId, status) => axiosInstance.put(`/sports/events/${eventId}/status`, { status }),
  deleteEvent: (eventId) => axiosInstance.delete(`/sports/events/${eventId}`),
  getExpenses: () => axiosInstance.get('/sports/expenses'),
  createExpense: (data) => axiosInstance.post('/sports/expenses', data),
  updateExpense: (expenseId, data) => axiosInstance.put(`/sports/expenses/${expenseId}`, data),
  deleteExpense: (expenseId) => axiosInstance.delete(`/sports/expenses/${expenseId}`),
  getCollections: (sportsEventId) => axiosInstance.get('/sports/collections', { params: { sportsEventId } }),
  getCollectionSummary: (sportsEventId) => axiosInstance.get('/sports/collections/summary', { params: { sportsEventId } }),
  generateDemand: (data) => axiosInstance.post('/sports/collections/generate-demand', data),
  addPayment: (collectionId, data) => axiosInstance.post(`/sports/collections/${collectionId}/payments`, data),
  deleteDemand: (collectionId) => axiosInstance.delete(`/sports/collections/${collectionId}/demand`),
  getReceipts: (collectionId) => axiosInstance.get(`/sports/collections/${collectionId}/receipts`),
  voidReceipt: (receiptId, data) => axiosInstance.post(`/sports/receipts/${receiptId}/void`, data)
}






