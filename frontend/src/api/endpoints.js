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
  getExpensesByDateRange: (startDate, endDate) => axiosInstance.get('/expenses', { params: { startDate, endDate } }),
  getExpense: (expenseId) => axiosInstance.get(`/expenses/${expenseId}`),
  createExpense: (data) => axiosInstance.post('/expenses', data),
  updateExpense: (expenseId, data) => axiosInstance.put(`/expenses/${expenseId}`, data),
  deleteExpense: (expenseId) => axiosInstance.delete(`/expenses/${expenseId}`)
}
