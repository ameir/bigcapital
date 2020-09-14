exports.up = function (knex) {
  return knex('account_types').insert([
    {
      id: 1,
      name: 'Fixed Asset',
      key: 'fixed_asset',
      normal: 'debit',
      root_type: 'asset',
      child_type: 'fixed_asset',
      balance_sheet: true,
      income_sheet: false,
    },
    {
      id: 2,
      name: 'Current Asset',
      key: 'current_asset',
      normal: 'debit',
      root_type: 'asset',
      child_type: 'current_asset',
      balance_sheet: true,
      income_sheet: false,
    },
    {
      id: 14,
      name: 'Other Asset',
      key: 'other_asset',
      normal: 'debit',
      root_type: 'asset',
      child_type: 'other_asset',
      balance_sheet: true,
      income_sheet: false,
    },
    {
      id: 3,
      name: 'Long Term Liability',
      key: 'long_term_liability',
      normal: 'credit',
      root_type: 'liability',
      child_type: 'long_term_liability',
      balance_sheet: false,
      income_sheet: true,
    },
    {
      id: 4,
      name: 'Current Liability',
      key: 'current_liability',
      normal: 'credit',
      root_type: 'liability',
      child_type: 'current_liability',
      balance_sheet: false,
      income_sheet: true,
    },
    {
      id: 13,
      name: 'Other Liability',
      key: 'other_liability',
      normal: 'credit',
      root_type: 'liability',
      child_type: 'other_liability',
      balance_sheet: false,
      income_sheet: true,
    },
    {
      id: 5,
      name: 'Equity',
      key: 'equity',
      normal: 'credit',
      root_type: 'equity',
      child_type: 'equity',
      balance_sheet: true,
      income_sheet: false,
    },
    {
      id: 6,
      name: 'Expense',
      key: 'expense',
      normal: 'debit',
      root_type: 'expense',
      child_type: 'expense',
      balance_sheet: false,
      income_sheet: true,
    },
    {
      id: 10,
      name: 'Other Expense',
      key: 'other_expense',
      normal: 'debit',
      root_type: 'expense',
      balance_sheet: false,
      income_sheet: true,
    },
    {
      id: 7,
      name: 'Income',
      key: 'income',
      normal: 'credit',
      root_type: 'income',
      child_type: 'income',
      balance_sheet: false,
      income_sheet: true,
    },
    {
      id: 11,
      name: 'Other Income',
      key: 'other_income',
      normal: 'credit',
      root_type: 'income',
      child_type: 'other_income',
      balance_sheet: false,
      income_sheet: true,
    },
    {
      id: 12,
      name: 'Cost of Goods Sold (COGS)',
      key: 'cost_of_goods_sold',
      normal: 'debit',
      root_type: 'expenses',
      child_type: 'expenses',
      balance_sheet: true,
      income_sheet: false,
    },
    {
      id: 8,
      name: 'Accounts Receivable (A/R)',
      key: 'accounts_receivable',
      normal: 'debit',
      root_type: 'asset',
      child_type: 'current_asset',
      balance_sheet: true,
      income_sheet: false,
    },
    {
      id: 9,
      name: 'Accounts Payable (A/P)',
      key: 'accounts_payable',
      normal: 'credit',
      root_type: 'liability',
      child_type: 'current_liability',
      balance_sheet: true,
      income_sheet: false,
    },
  ]);
};


exports.down = function(knex) {
  
}