export const ACCOUNT_NAVIGATION = {
  INDIVIDUAL: [
    {
      label: 'Finance',
      items: [
        { label: 'Expenses', to: '/personal/expenses' },
        { label: 'Categories', to: '/categories' },
        { label: 'Budget', to: '/budget' },
        { label: 'Reports', to: '/personal/reports' }
      ]
    },
    {
      label: 'Personal',
      items: [
        { label: 'Shared Expenses', to: '/personal/shared-expenses' },
        { label: 'Friends', to: '/personal/friends' },
        { label: 'Documents', to: '/personal/documents' },
        { label: 'Tasks', to: '/personal/todos' },
        { label: 'Office Hours', to: '/personal/office-hours' }
      ]
    }
  ],
  SOCIETY: [
    {
      label: 'Finance',
      items: [
        { label: 'Annual Finance', to: '/society/annual-finance' },
        { label: 'Financial Ledger', to: '/society/financial-ledger' },
        { label: 'Journal Book', to: '/society/journal-book' },
        { label: 'Categories', to: '/categories' }
      ]
    },
    {
      label: 'Community',
      items: [
        { label: 'Festivals', to: '/society/festivals' },
        { label: 'Collections', to: '/society/festival-collections' },
        { label: 'Flats', to: '/society/flats' },
        { label: 'Member Directory', to: '/society/member-directory' },
        { label: 'Vendors', to: '/society/vendors' },
        { label: 'Staff', to: '/society/staff' }
      ]
    }
  ],
  KIRANA_STORE: [
    {
      label: 'Transactions',
      items: [
        { label: 'Expenses', to: '/expenses' },
        { label: 'Sales', to: '/kirana/sales' },
        { label: 'Purchases', to: '/kirana/purchases' }
      ]
    },
    {
      label: 'Inventory and parties',
      items: [
        { label: 'Categories', to: '/categories' },
        { label: 'Products', to: '/kirana/products' },
        { label: 'Customers', to: '/kirana/customers' },
        { label: 'Customer Credit', to: '/kirana/customer-credit' },
        { label: 'Suppliers', to: '/kirana/suppliers' },
        { label: 'Supplier Dues', to: '/kirana/supplier-payments' }
      ]
    },
    { label: 'Insights', items: [{ label: 'Reports', to: '/kirana/reports' }] }
  ],
  SPORTS: [
    {
      label: 'Sports',
      items: [
        { label: 'Overview', to: '/sports', exact: true },
        { label: 'Members', to: '/sports/members' },
        { label: 'Events', to: '/sports/events' },
        { label: 'Expenses', to: '/sports/expenses' },
        { label: 'Collections', to: '/sports/collections' },
        { label: 'Reports', to: '/sports/reports' }
      ]
    }
  ]
}

export const getNavigationGroups = (accountType, isSystemAdmin = false) => {
  const groups = [...(ACCOUNT_NAVIGATION[accountType] || [])]
  if (isSystemAdmin)
    groups.push({
      label: 'Administration',
      items: [{ label: 'System Admin', to: '/system-admin' }]
    })
  groups.push({
    label: 'Support',
    items: [{ label: 'Feedback', to: '/feedback', exact: true }]
  })
  return groups
}

export const isNavigationItemActive = (pathname, item) => {
  if (item.label === 'Dashboard')
    return pathname === '/home' || pathname === '/dashboard'
  if (item.exact) return pathname === item.to
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}
