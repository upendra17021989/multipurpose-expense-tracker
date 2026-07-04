UPDATE society_annual_collections
SET financial_year = SUBSTRING(financial_year FROM 1 FOR 5) ||
                     (CAST(SUBSTRING(financial_year FROM 1 FOR 4) AS INTEGER) + 1)
WHERE financial_year ~ '^\d{4}-\d{2}$';
