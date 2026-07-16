import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ResetPassword } from './pages/ResetPassword'
import { ProfileSettings } from './pages/ProfileSettings'
import { ChangePassword } from './pages/ChangePassword'
import { UserFeedback } from './pages/UserFeedback'
import { Workspaces } from './pages/Workspaces'
import { DashboardRouter, SocietyMemberDirectory } from './pages/DashboardRouter'
import { ExpenseList } from './pages/ExpenseList'
import { ExpenseForm } from './pages/ExpenseForm'
import { CategoryList } from './pages/CategoryList'
import { BudgetSettings } from './pages/BudgetSettings'
import { PersonalReports } from './pages/PersonalReports'
import { SharedExpenseGroups } from './pages/personal/SharedExpenseGroups'
import { SharedExpenseGroup } from './pages/personal/SharedExpenseGroup'
import { SharedExpenseFriends } from './pages/personal/SharedExpenseFriends'
import { MyDocumentsFull as MyDocuments } from './pages/personal/MyDocumentsFull'
import { PersonalTodos } from './pages/personal/PersonalTodos'
import { PersonalExpenses } from './pages/personal/PersonalExpenses'
import { FlatList } from './pages/society/FlatList'
import { FlatForm } from './pages/society/FlatForm'
import { VendorList } from './pages/society/VendorList'
import { VendorForm } from './pages/society/VendorForm'
import { StaffList } from './pages/society/StaffList'
import { StaffForm } from './pages/society/StaffForm'
import { FestivalList } from './pages/society/FestivalList'
import { FestivalForm } from './pages/society/FestivalForm'
import { FestivalCollectionDashboard } from './pages/society/FestivalCollectionDashboard'
import { FestivalCollectionList } from './pages/society/FestivalCollectionList'
import { FestivalCollectionForm } from './pages/society/FestivalCollectionForm'
import { FestivalCollectionReceipt } from './pages/society/FestivalCollectionReceipt'
import { AnnualFinance } from './pages/society/annual-finance/AnnualFinance'
import { JoinSociety } from './pages/society/JoinSociety'
import { ProductList } from './pages/kirana/ProductList'
import { ProductForm } from './pages/kirana/ProductForm'
import { SupplierList } from './pages/kirana/SupplierList'
import { SupplierForm } from './pages/kirana/SupplierForm'
import { CustomerList } from './pages/kirana/CustomerList'
import { CustomerForm } from './pages/kirana/CustomerForm'
import { SalesList } from './pages/kirana/SalesList'
import { SalesForm } from './pages/kirana/SalesForm'
import { PurchaseList } from './pages/kirana/PurchaseList'
import { PurchaseForm } from './pages/kirana/PurchaseForm'
import { CustomerCreditLedger } from './pages/kirana/CustomerCreditLedger'
import { SupplierPaymentLedger } from './pages/kirana/SupplierPaymentLedger'
import { KiranaReports } from './pages/kirana/KiranaReports'
import { SportsDashboard } from './pages/sports/SportsDashboard'
import { SportsMembers } from './pages/sports/SportsMembers'
import { SportsEvents } from './pages/sports/SportsEvents'
import { SportsExpenses } from './pages/sports/SportsExpenses'
import { SportsCollections } from './pages/sports/SportsCollections'
import { SportsCollectionReceipts } from './pages/sports/SportsCollectionReceipts'
import { SportsReports } from './pages/sports/SportsReports'
import { SystemAdminDashboard } from './pages/system-admin/SystemAdminDashboard'
import { SystemAdminManagement } from './pages/system-admin/SystemAdminManagement'
import { SystemAdminAuditLogs } from './pages/system-admin/SystemAdminAuditLogs'
import { SystemAdminFeedback } from './pages/system-admin/SystemAdminFeedback'
import { SystemAdminOperations } from './pages/system-admin/SystemAdminOperations'
import { SystemAdminSettings } from './pages/system-admin/SystemAdminSettings'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { SessionActivityMonitor } from './components/SessionActivityMonitor'
import { AppLockOverlay } from './components/AppLockOverlay'
import 'react-toastify/dist/ReactToastify.css'
import './App.css'

function App() {
  return (
    <AppErrorBoundary>
      <Router>
        <SessionActivityMonitor />
        <AppLockOverlay />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            }
          />
          <Route
            path="/feedback"
            element={
              <ProtectedRoute>
                <UserFeedback />
              </ProtectedRoute>
            }
          />          <Route
            path="/workspaces"
            element={
              <ProtectedRoute>
                <Workspaces />
              </ProtectedRoute>
            }
          />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute>
                <ExpenseList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses/new"
            element={
              <ProtectedRoute>
                <ExpenseForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses/:expenseId/edit"
            element={
              <ProtectedRoute>
                <ExpenseForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/categories"
            element={
              <ProtectedRoute>
                <CategoryList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/budget"
            element={
              <ProtectedRoute>
                <BudgetSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/personal/expenses"
            element={
              <ProtectedRoute>
                <PersonalExpenses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/personal/reports"
            element={
              <ProtectedRoute>
                <PersonalReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/personal/shared-expenses"
            element={
              <ProtectedRoute>
                <SharedExpenseGroups />
              </ProtectedRoute>
            }
          />
          <Route
            path="/personal/shared-expenses/:groupId"
            element={
              <ProtectedRoute>
                <SharedExpenseGroup />
              </ProtectedRoute>
            }
          />
          <Route
            path="/personal/shared-expenses/:groupId/:section"
            element={
              <ProtectedRoute>
                <SharedExpenseGroup />
              </ProtectedRoute>
            }
          />
          <Route
            path="/personal/friends"
            element={
              <ProtectedRoute>
                <SharedExpenseFriends />
              </ProtectedRoute>
            }
          />
          <Route
            path="/personal/documents"
            element={
              <ProtectedRoute>
                <MyDocuments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/society/flats"
            element={
              <ProtectedRoute>
                <FlatList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/personal/todos"
            element={
              <ProtectedRoute>
                <PersonalTodos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/society/member-directory"
            element={
              <ProtectedRoute>
                <SocietyMemberDirectory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/society/flats/new"
            element={
              <ProtectedRoute>
                <FlatForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/society/flats/:flatId/edit"
            element={
              <ProtectedRoute>
                <FlatForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/society/vendors"
            element={
              <ProtectedRoute>
                <VendorList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/society/vendors/new"
            element={
              <ProtectedRoute>
                <VendorForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/society/vendors/:vendorId/edit"
            element={
              <ProtectedRoute>
                <VendorForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/society/staff"
            element={
              <ProtectedRoute>
                <StaffList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/society/staff/new"
            element={
              <ProtectedRoute>
                <StaffForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/society/staff/:staffId/edit"
            element={
              <ProtectedRoute>
                <StaffForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/society/festivals"
            element={
              <ProtectedRoute>
                <FestivalList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/society/festivals/new"
            element={
              <ProtectedRoute>
                <FestivalForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/society/festivals/:festivalEventId/edit"
            element={
              <ProtectedRoute>
                <FestivalForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/society/festival-collections"
            element={
              <ProtectedRoute>
                <FestivalCollectionDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/society/annual-finance" element={<ProtectedRoute><AnnualFinance /></ProtectedRoute>} />
          <Route path="/society/join" element={<ProtectedRoute><JoinSociety /></ProtectedRoute>} />
          <Route path="/society/annual-collections" element={<Navigate to="/society/annual-finance" replace />} />
          <Route
            path="/society/festival-collections/:festivalEventId"
            element={
              <ProtectedRoute>
                <FestivalCollectionList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/society/festival-collections/:festivalEventId/:collectionId/payment"
            element={
              <ProtectedRoute>
                <FestivalCollectionForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/society/festival-collections/:festivalEventId/:collectionId/receipts"
            element={
              <ProtectedRoute>
                <FestivalCollectionReceipt />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kirana/products"
            element={
              <ProtectedRoute>
                <ProductList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kirana/products/new"
            element={
              <ProtectedRoute>
                <ProductForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kirana/products/:productId/edit"
            element={
              <ProtectedRoute>
                <ProductForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kirana/suppliers"
            element={
              <ProtectedRoute>
                <SupplierList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kirana/suppliers/new"
            element={
              <ProtectedRoute>
                <SupplierForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kirana/suppliers/:supplierId/edit"
            element={
              <ProtectedRoute>
                <SupplierForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kirana/customers"
            element={
              <ProtectedRoute>
                <CustomerList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kirana/customers/new"
            element={
              <ProtectedRoute>
                <CustomerForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kirana/customers/:customerId/edit"
            element={
              <ProtectedRoute>
                <CustomerForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kirana/sales"
            element={
              <ProtectedRoute>
                <SalesList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kirana/sales/new"
            element={
              <ProtectedRoute>
                <SalesForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kirana/sales/:saleId/edit"
            element={
              <ProtectedRoute>
                <SalesForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kirana/purchases"
            element={
              <ProtectedRoute>
                <PurchaseList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kirana/purchases/new"
            element={
              <ProtectedRoute>
                <PurchaseForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kirana/purchases/:purchaseId/edit"
            element={
              <ProtectedRoute>
                <PurchaseForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kirana/customer-credit"
            element={
              <ProtectedRoute>
                <CustomerCreditLedger />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kirana/supplier-payments"
            element={
              <ProtectedRoute>
                <SupplierPaymentLedger />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kirana/reports"
            element={
              <ProtectedRoute>
                <KiranaReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sports"
            element={
              <ProtectedRoute>
                <SportsDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sports/members"
            element={
              <ProtectedRoute>
                <SportsMembers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sports/events"
            element={
              <ProtectedRoute>
                <SportsEvents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sports/expenses"
            element={
              <ProtectedRoute>
                <SportsExpenses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sports/collections"
            element={
              <ProtectedRoute>
                <SportsCollections />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sports/collections/:collectionId/receipts"
            element={
              <ProtectedRoute>
                <SportsCollectionReceipts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/system-admin"
            element={
              <ProtectedRoute requireSystemAdmin>
                <SystemAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/system-admin/users" element={<ProtectedRoute requireSystemAdmin><SystemAdminManagement mode="users" /></ProtectedRoute>} />
          <Route path="/system-admin/accounts" element={<ProtectedRoute requireSystemAdmin><SystemAdminManagement mode="accounts" /></ProtectedRoute>} />
          <Route path="/system-admin/feedback" element={<ProtectedRoute requireSystemAdmin><SystemAdminFeedback /></ProtectedRoute>} />`r`n          <Route path="/system-admin/audit-logs" element={<ProtectedRoute requireSystemAdmin><SystemAdminAuditLogs /></ProtectedRoute>} />
          <Route path="/system-admin/health" element={<ProtectedRoute requireSystemAdmin><SystemAdminOperations mode="health" /></ProtectedRoute>} />
          <Route path="/system-admin/storage" element={<ProtectedRoute requireSystemAdmin><SystemAdminOperations mode="storage" /></ProtectedRoute>} />
          <Route path="/system-admin/settings" element={<ProtectedRoute requireSystemAdmin><SystemAdminSettings /></ProtectedRoute>} />
          <Route
            path="/sports/reports"
            element={
              <ProtectedRoute>
                <SportsReports />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/home" replace />} />
        </Routes>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
        />
      </Router>
    </AppErrorBoundary>
  )
}

export default App



