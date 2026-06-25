import axiosInstance from './client'

export const authAPI = {
  register: (data) => axiosInstance.post('/auth/register', data),
  login: (data) => axiosInstance.post('/auth/login', data),
  loginWithAccount: (data, accountId) => axiosInstance.post(`/auth/login/${accountId}`, data),
  switchAccount: (accountId) => axiosInstance.post(`/auth/switch-account/${accountId}`),
  validateToken: () => axiosInstance.get('/auth/validate')
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
  rejectExpense: (expenseId) => axiosInstance.post(`/expenses/${expenseId}/reject`)
}

export const personalBudgetAPI = {
  getBudgets: () => axiosInstance.get('/personal-budgets'),
  getCurrentBudget: () => axiosInstance.get('/personal-budgets/current'),
  getBudgetByMonthYear: (month, year) => axiosInstance.get('/personal-budgets/lookup', { params: { month, year } }),
  createBudget: (data) => axiosInstance.post('/personal-budgets', data),
  updateBudget: (budgetId, data) => axiosInstance.put(`/personal-budgets/${budgetId}`, data),
  deleteBudget: (budgetId) => axiosInstance.delete(`/personal-budgets/${budgetId}`)
}

export const societyFlatAPI = {
  getFlats: (blockName) => axiosInstance.get('/society/flats', { params: blockName ? { blockName } : {} }),
  getFlat: (flatId) => axiosInstance.get(`/society/flats/${flatId}`),
  createFlat: (data) => axiosInstance.post('/society/flats', data),
  updateFlat: (flatId, data) => axiosInstance.put(`/society/flats/${flatId}`),
  deleteFlat: (flatId) => axiosInstance.delete(`/society/flats/${flatId}`)
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
  createSale: (data) => axiosInstance.post('/kirana/sales', data)
}

export const kiranaPurchaseAPI = {
  getPurchases: () => axiosInstance.get('/kirana/purchases'),
  getPurchasesByDateRange: (startDate, endDate) => axiosInstance.get('/kirana/purchases/range', { params: { startDate, endDate } }),
  getPurchase: (purchaseId) => axiosInstance.get(`/kirana/purchases/${purchaseId}`),
  createPurchase: (data) => axiosInstance.post('/kirana/purchases', data)
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
