import axiosInstance from './client'

export const authAPI = {
  register: (data) => axiosInstance.post('/auth/register', data),
  login: (data) => axiosInstance.post('/auth/login', data),
  loginWithAccount: (data, accountId) => axiosInstance.post(`/auth/login/${accountId}`, data),
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
  updateFlat: (flatId, data) => axiosInstance.put(`/society/flats/${flatId}`, data),
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
