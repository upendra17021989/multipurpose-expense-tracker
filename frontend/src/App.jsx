import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { DashboardRouter } from './pages/DashboardRouter'
import { ExpenseList } from './pages/ExpenseList'
import { ExpenseForm } from './pages/ExpenseForm'
import { CategoryList } from './pages/CategoryList'
import { BudgetSettings } from './pages/BudgetSettings'
import { PersonalReports } from './pages/PersonalReports'
import { FlatList } from './pages/society/FlatList'
import { FlatForm } from './pages/society/FlatForm'
import { FestivalList } from './pages/society/FestivalList'
import { FestivalForm } from './pages/society/FestivalForm'
import { FestivalCollectionDashboard } from './pages/society/FestivalCollectionDashboard'
import { FestivalCollectionList } from './pages/society/FestivalCollectionList'
import { FestivalCollectionForm } from './pages/society/FestivalCollectionForm'
import { FestivalCollectionReceipt } from './pages/society/FestivalCollectionReceipt'
import { ProductList } from './pages/kirana/ProductList'
import { ProductForm } from './pages/kirana/ProductForm'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import 'react-toastify/dist/ReactToastify.css'
import './App.css'

function App() {
  return (
    <AppErrorBoundary>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/home" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute><ExpenseList /></ProtectedRoute>} />
          <Route path="/expenses/new" element={<ProtectedRoute><ExpenseForm /></ProtectedRoute>} />
          <Route path="/expenses/:expenseId/edit" element={<ProtectedRoute><ExpenseForm /></ProtectedRoute>} />
          <Route path="/categories" element={<ProtectedRoute><CategoryList /></ProtectedRoute>} />
          <Route path="/budget" element={<ProtectedRoute><BudgetSettings /></ProtectedRoute>} />
          <Route path="/personal/reports" element={<ProtectedRoute><PersonalReports /></ProtectedRoute>} />
          <Route path="/society/flats" element={<ProtectedRoute><FlatList /></ProtectedRoute>} />
          <Route path="/society/flats/new" element={<ProtectedRoute><FlatForm /></ProtectedRoute>} />
          <Route path="/society/flats/:flatId/edit" element={<ProtectedRoute><FlatForm /></ProtectedRoute>} />
          <Route path="/society/festivals" element={<ProtectedRoute><FestivalList /></ProtectedRoute>} />
          <Route path="/society/festivals/new" element={<ProtectedRoute><FestivalForm /></ProtectedRoute>} />
          <Route path="/society/festivals/:festivalEventId/edit" element={<ProtectedRoute><FestivalForm /></ProtectedRoute>} />
          <Route path="/society/festival-collections" element={<ProtectedRoute><FestivalCollectionDashboard /></ProtectedRoute>} />
          <Route path="/society/festival-collections/:festivalEventId" element={<ProtectedRoute><FestivalCollectionList /></ProtectedRoute>} />
          <Route path="/society/festival-collections/:festivalEventId/:collectionId/payment" element={<ProtectedRoute><FestivalCollectionForm /></ProtectedRoute>} />
          <Route path="/society/festival-collections/:festivalEventId/:collectionId/receipts" element={<ProtectedRoute><FestivalCollectionReceipt /></ProtectedRoute>} />
          <Route path="/kirana/products" element={<ProtectedRoute><ProductList /></ProtectedRoute>} />
          <Route path="/kirana/products/new" element={<ProtectedRoute><ProductForm /></ProtectedRoute>} />
          <Route path="/kirana/products/:productId/edit" element={<ProtectedRoute><ProductForm /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/home" replace />} />
        </Routes>
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop />
      </Router>
    </AppErrorBoundary>
  )
}

export default App
