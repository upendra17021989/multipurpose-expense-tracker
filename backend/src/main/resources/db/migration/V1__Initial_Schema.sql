-- Flyway Migration: Create initial database schema
-- Version: V1__Initial_Schema.sql

-- Create users table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(500) NOT NULL,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_users_mobile ON users(mobile);
CREATE INDEX idx_users_email ON users(email);

-- Create accounts table
CREATE TABLE accounts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    address TEXT,
    society_name VARCHAR(255),
    store_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'OWNER' NOT NULL,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_account_type ON accounts(account_type);

-- Create expense_categories table
CREATE TABLE expense_categories (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL,
    category_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    category_type VARCHAR(50) NOT NULL,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE INDEX idx_expense_categories_account_id ON expense_categories(account_id);
CREATE INDEX idx_expense_categories_category_type ON expense_categories(category_type);

-- Create expenses table
CREATE TABLE expenses (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL,
    expense_date DATE NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    category_id BIGINT NOT NULL,
    expense_type VARCHAR(50) NOT NULL,
    festival_event_id BIGINT,
    vendor_name VARCHAR(255),
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(255),
    utr VARCHAR(255),
    cheque_number VARCHAR(50),
    paid_by VARCHAR(255) NOT NULL,
    approved_by VARCHAR(255),
    receipt_image_url TEXT,
    remarks TEXT,
    status VARCHAR(50) DEFAULT 'DRAFT' NOT NULL,
    soft_deleted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (category_id) REFERENCES expense_categories(id)
);

CREATE INDEX idx_expenses_account_id ON expenses(account_id);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_expense_type ON expenses(expense_type);
CREATE INDEX idx_expenses_soft_deleted ON expenses(soft_deleted);

-- Create attachments table
CREATE TABLE attachments (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL,
    reference_type VARCHAR(50) NOT NULL,
    reference_id BIGINT NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    uploaded_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE INDEX idx_attachments_account_id ON attachments(account_id);
CREATE INDEX idx_attachments_reference ON attachments(reference_type, reference_id);

-- Create personal_budgets table
CREATE TABLE personal_budgets (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    monthly_budget DECIMAL(10, 2) NOT NULL,
    monthly_savings_target DECIMAL(10, 2),
    alert_enabled BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    UNIQUE(account_id, month, year)
);

CREATE INDEX idx_personal_budgets_account_id ON personal_budgets(account_id);
CREATE INDEX idx_personal_budgets_month_year ON personal_budgets(month, year);

-- Create category_budgets table
CREATE TABLE category_budgets (
    id BIGSERIAL PRIMARY KEY,
    personal_budget_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    budget_amount DECIMAL(10, 2) NOT NULL,
    alert_limit_percent INTEGER DEFAULT 80 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (personal_budget_id) REFERENCES personal_budgets(id),
    FOREIGN KEY (category_id) REFERENCES expense_categories(id)
);

CREATE INDEX idx_category_budgets_personal_budget_id ON category_budgets(personal_budget_id);

-- Create flats table
CREATE TABLE flats (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL,
    block_name VARCHAR(100) NOT NULL,
    flat_number VARCHAR(50) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20),
    email VARCHAR(255),
    resident_type VARCHAR(50) NOT NULL,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE INDEX idx_flats_account_id ON flats(account_id);
CREATE INDEX idx_flats_block_flat ON flats(block_name, flat_number);

-- Create flat_members table
CREATE TABLE flat_members (
    id BIGSERIAL PRIMARY KEY,
    flat_id BIGINT NOT NULL,
    member_name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20),
    email VARCHAR(255),
    relation VARCHAR(100),
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (flat_id) REFERENCES flats(id)
);

CREATE INDEX idx_flat_members_flat_id ON flat_members(flat_id);

-- Create festival_events table
CREATE TABLE festival_events (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL,
    festival_name VARCHAR(255) NOT NULL,
    year INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    budget_amount DECIMAL(10, 2),
    collected_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    total_expense DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    balance_amount DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'PLANNED' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE INDEX idx_festival_events_account_id ON festival_events(account_id);
CREATE INDEX idx_festival_events_year ON festival_events(year);

-- Create festival_collections table
CREATE TABLE festival_collections (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL,
    festival_event_id BIGINT NOT NULL,
    flat_id BIGINT NOT NULL,
    expected_amount DECIMAL(10, 2) NOT NULL,
    collected_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    pending_amount DECIMAL(10, 2) NOT NULL,
    excess_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    refunded_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (festival_event_id) REFERENCES festival_events(id),
    FOREIGN KEY (flat_id) REFERENCES flats(id),
    UNIQUE(festival_event_id, flat_id)
);

CREATE INDEX idx_festival_collections_account_id ON festival_collections(account_id);
CREATE INDEX idx_festival_collections_festival_event_id ON festival_collections(festival_event_id);
CREATE INDEX idx_festival_collections_flat_id ON festival_collections(flat_id);

-- Create festival_collection_receipts table
CREATE TABLE festival_collection_receipts (
    id BIGSERIAL PRIMARY KEY,
    festival_collection_id BIGINT NOT NULL,
    payment_date DATE NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(255),
    utr VARCHAR(255),
    cheque_number VARCHAR(50),
    collected_by VARCHAR(255) NOT NULL,
    receipt_number VARCHAR(100) NOT NULL,
    receipt_pdf_url TEXT,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (festival_collection_id) REFERENCES festival_collections(id)
);

CREATE INDEX idx_festival_collection_receipts_festival_collection_id ON festival_collection_receipts(festival_collection_id);

-- Create products table
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    unit VARCHAR(50) NOT NULL,
    purchase_price DECIMAL(10, 2) NOT NULL,
    selling_price DECIMAL(10, 2) NOT NULL,
    opening_stock DECIMAL(10, 2) NOT NULL,
    current_stock DECIMAL(10, 2) NOT NULL,
    low_stock_alert_qty DECIMAL(10, 2),
    barcode VARCHAR(100),
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE INDEX idx_products_account_id ON products(account_id);
CREATE INDEX idx_products_barcode ON products(barcode);

-- Create suppliers table
CREATE TABLE suppliers (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    opening_balance DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    current_due DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE INDEX idx_suppliers_account_id ON suppliers(account_id);

-- Create customers table
CREATE TABLE customers (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    opening_credit DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    current_credit DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE INDEX idx_customers_account_id ON customers(account_id);

-- Create sales table
CREATE TABLE sales (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL,
    sale_date DATE NOT NULL,
    customer_id BIGINT,
    total_amount DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    net_amount DECIMAL(10, 2) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL,
    balance_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE INDEX idx_sales_account_id ON sales(account_id);
CREATE INDEX idx_sales_sale_date ON sales(sale_date);
CREATE INDEX idx_sales_customer_id ON sales(customer_id);

-- Create sale_items table
CREATE TABLE sale_items (
    id BIGSERIAL PRIMARY KEY,
    sale_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    selling_price DECIMAL(10, 2) NOT NULL,
    line_total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);

-- Create purchases table
CREATE TABLE purchases (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL,
    purchase_date DATE NOT NULL,
    supplier_id BIGINT NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    net_amount DECIMAL(10, 2) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL,
    balance_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE INDEX idx_purchases_account_id ON purchases(account_id);
CREATE INDEX idx_purchases_purchase_date ON purchases(purchase_date);
CREATE INDEX idx_purchases_supplier_id ON purchases(supplier_id);

-- Create purchase_items table
CREATE TABLE purchase_items (
    id BIGSERIAL PRIMARY KEY,
    purchase_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    purchase_price DECIMAL(10, 2) NOT NULL,
    line_total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX idx_purchase_items_purchase_id ON purchase_items(purchase_id);

-- Create customer_credit_ledger table
CREATE TABLE customer_credit_ledger (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    debit_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    credit_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    balance_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    payment_mode VARCHAR(50),
    reference_id VARCHAR(255),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE INDEX idx_customer_credit_ledger_account_id ON customer_credit_ledger(account_id);
CREATE INDEX idx_customer_credit_ledger_customer_id ON customer_credit_ledger(customer_id);

-- Create supplier_payment_ledger table
CREATE TABLE supplier_payment_ledger (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL,
    supplier_id BIGINT NOT NULL,
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    debit_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    credit_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    balance_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    payment_mode VARCHAR(50),
    reference_id VARCHAR(255),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE INDEX idx_supplier_payment_ledger_account_id ON supplier_payment_ledger(account_id);
CREATE INDEX idx_supplier_payment_ledger_supplier_id ON supplier_payment_ledger(supplier_id);

