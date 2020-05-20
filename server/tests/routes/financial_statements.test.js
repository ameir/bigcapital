import moment from 'moment';
import {
  request,
  expect,
} from '~/testInit';
import {
  tenantWebsite,
  tenantFactory,
  loginRes
} from '~/dbInit';

let creditAccount;
let debitAccount;
let incomeType;

describe('routes: `/financial_statements`', () => {
  beforeEach(async () => {
    // Balance sheet types.
    const assetType = await tenantFactory.create('account_type', { normal: 'debit', balance_sheet: true });
    const liabilityType = await tenantFactory.create('account_type', { normal: 'credit', balance_sheet: true });

    // Income statement types.
    incomeType = await tenantFactory.create('account_type', { normal: 'credit', income_sheet: true });
    const expenseType = await tenantFactory.create('account_type', { normal: 'debit', income_sheet: true });

    // Assets & liabilites accounts.
    creditAccount = await tenantFactory.create('account', { account_type_id: liabilityType.id });
    debitAccount = await tenantFactory.create('account', { account_type_id: assetType.id });

    // Income && expenses accounts.
    const incomeAccount = await tenantFactory.create('account', { account_type_id: incomeType.id });
    const expenseAccount = await tenantFactory.create('account', { account_type_id: expenseType.id });
    // const income2Account = await tenantFactory.create('account', { account_type_id: incomeType.id });

    const accountTransactionMixied = { date: '2020-1-10' };

    // Expense --
    // 1000 Credit  - Credit account 
    //    1000 Debit - expense account.
    await tenantFactory.create('account_transaction', {
      credit: 1000, debit: 0, account_id: debitAccount.id, referenceType: 'Expense',
      referenceId: 1, ...accountTransactionMixied,
    });
    await tenantFactory.create('account_transaction', {
      credit: 0, debit: 1000, account_id: expenseAccount.id, referenceType: 'Expense',
      referenceId: 1, ...accountTransactionMixied,
    });

    // Jounral
    // 4000 Credit - liability account.
    //     2000 Debit - Asset account
    //     2000 Debit - Asset account
    await tenantFactory.create('account_transaction', {
      credit: 4000, debit: 0, account_id: creditAccount.id, ...accountTransactionMixied,
    });
    await tenantFactory.create('account_transaction', {
      debit: 2000, credit: 0, account_id: debitAccount.id, ...accountTransactionMixied,
    });
    await tenantFactory.create('account_transaction', {
      debit: 2000, credit: 0, account_id: debitAccount.id, ...accountTransactionMixied,
    });

    // Income Journal.
    // 2000 Credit - Income account.
    //    2000 Debit - Asset account.
    await tenantFactory.create('account_transaction', {
      credit: 2000, account_id: incomeAccount.id, ...accountTransactionMixied
    });
    await tenantFactory.create('account_transaction', {
      debit: 2000, credit: 0, account_id: debitAccount.id, ...accountTransactionMixied,
    });

    // -----------------------------------------
    // Assets account balance  = 5000  |  Libility account balance = 4000
    // Expense account balance = 1000  |  Income account balance   = 2000
  });


  describe('routes: `/financial_statements/journal`', () => {
    it('Should response unauthorized in case the user was not authorized.', async () => {
      const res = await request()
        .get('/api/financial_statements/journal')
        .send();

      expect(res.status).equals(401);
    });

    it('Should retrieve ledger sheet transactions grouped by reference type and id.', async () => {
      const res = await request()
        .get('/api/financial_statements/journal')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .send();

      expect(res.status).equals(200);
      expect(res.body.journal.length).to.be.at.least(1);

      expect(res.body.journal[0].credit).to.be.a('number');
      expect(res.body.journal[0].debit).to.be.a('number');
      expect(res.body.journal[0].entries).to.be.a('array');
      expect(res.body.journal[0].id).to.be.a('string');

      expect(res.body.journal[0].entries[0].credit).to.be.a('number');
      expect(res.body.journal[0].entries[0].debit).to.be.a('number');
    });

    it('Should retrieve transactions between date range.', async () => {
      const res = await request()
        .get('/api/financial_statements/journal')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          from_date: '2018-01-01',
          to_date: '2019-01-01',
        })
        .send();

      expect(res.body.journal.length).equals(0);
    });

    it('Should retrieve transactions that associated to the queried accounts.', async () => {
      const res = await request()
        .get('/api/financial_statements/journal')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          account_ids: [creditAccount.id],
        })
        .send();

      expect(res.body.journal[0].entries.length).equals(1);
      expect(res.body.journal[0].entries[0].account_id).equals(creditAccount.id);

      expect(res.body.journal.length).equals(1);
    });

    it('Should retrieve tranasactions with the given types.', async () => {
      const res = await request()
        .get('/api/financial_statements/journal')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          transaction_types: ['Expense'],
        });

      expect(res.body.journal.length).equals(1);
    });

    it('Should retrieve transactions with range amount.', async () => {
      const res = await request()
        .get('/api/financial_statements/journal')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          from_range: 2000,
          to_range: 2000,
        })
        .send();

      expect(res.body.journal[0].credit).satisfy((credit) => {
        return credit === 0 || credit >= 2000;
      });
      expect(res.body.journal[0].debit).satisfy((debit) => {
        return debit === 0 || debit >= 2000;
      });
    });

    it('Should format credit and debit to no cents of retrieved transactions.', async () => {

    });

    it('Should divide credit/debit amount on 1000', async () => {
      const res = await request()
        .get('/api/financial_statements/journal')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          number_format: {
            divide_1000: true,
          },
        })
        .send();

      const journal = res.body.journal.find((j) => j.id === '1-Expense');

      expect(journal.credit).equals(1);
      expect(journal.debit).equals(1);
    });
  });

  describe('routes: `/financial_statements/general_ledger`', () => {
    it('Should response unauthorized in case the user was not authorized.', async () => {
      const res = await request()
        .get('/api/financial_statements/general_ledger')
        .send();

      expect(res.status).equals(401);
    });

    it('Should retrieve request query meta on response schema.', async () => {
      const res = await request()
        .get('/api/financial_statements/general_ledger')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .send();

      expect(res.body.query.from_date).equals(moment().startOf('year').format('YYYY-MM-DD'));
      expect(res.body.query.to_date).equals(moment().endOf('year').format('YYYY-MM-DD'));
      expect(res.body.query.basis).equals('cash');
      expect(res.body.query.number_format.no_cents).equals(false);
      expect(res.body.query.number_format.divide_1000).equals(false);
      expect(res.body.query.none_zero).equals(false);
      expect(res.body.query.accounts_ids).to.be.an('array');
    });

    it('Should retrieve the general ledger accounts with associated transactions and opening/closing balance.', async () => {
      const res = await request()
        .get('/api/financial_statements/general_ledger')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .send();

      expect(res.body.accounts).is.an('array');
      expect(res.body.accounts[0].id).to.be.an('number');
      expect(res.body.accounts[0].name).to.be.a('string');
      expect(res.body.accounts[0].code).to.be.a('string');
      expect(res.body.accounts[0].transactions).to.be.a('array');
      expect(res.body.accounts[0].opening).to.be.a('object');
      expect(res.body.accounts[0].opening.amount).to.be.a('number');
      expect(res.body.accounts[0].opening.date).to.be.a('string');
      expect(res.body.accounts[0].closing).to.be.a('object');
      expect(res.body.accounts[0].closing.amount).to.be.a('number');
      expect(res.body.accounts[0].closing.date).to.be.a('string');
    });

    it('Should retrieve opening and closing balance.', async () => {
      const res = await request()
        .get('/api/financial_statements/general_ledger')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .send();

      const targetAccount = res.body.accounts.find((a) => a.id === creditAccount.id);

      expect(targetAccount).to.be.an('object');
      expect(targetAccount.opening).to.deep.equal({
        amount: 0, date: '2020-01-01',
      });
      expect(targetAccount.closing).to.deep.equal({
        amount: 4000, date: '2020-12-31',
      });
    });

    it('Should retrieve opening and closing balance between the given date range.', async () => {
      const res = await request()
        .get('/api/financial_statements/general_ledger')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          from_date: '2018-01-01',
          to_date: '2020-03-30',
          // none_zero: true,
        })
        .send();

      console.log(res.body);

      const targetAccount = res.body.accounts.find((a) => a.id === creditAccount.id);

      expect(targetAccount).to.be.an('object');
      expect(targetAccount.opening).to.deep.equal({
        amount: 4000, date: '2020-01-01',
      });
      expect(targetAccount.closing).to.deep.equal({
        amount: 4000, date: '2020-03-30',
      });
    });

    it('Should retrieve accounts with associated transactions.', async () => {
      const res = await request()
        .get('/api/financial_statements/general_ledger')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          none_zero: true,
        })
        .send();

  
    })
 
    it('Should retrieve accounts transactions only that between date range.', async () => {
      const res = await request()
        .get('/api/financial_statements/general_ledger')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          from_date: '2020-01-20',
          to_date: '2020-03-30',
          none_zero: true,
        })
        .send();

    });

    it('Should not retrieve all accounts that have no transactions in the given date range when `none_zero` is `false`.', async () => {
      const res = await request()
        .get('/api/financial_statements/general_ledger')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          from_date: '2020-01-20',
          to_date: '2020-03-30',
          none_zero: false,
        })
        .send();

      res.body.accounts.forEach((account) => {
        expect(account.transactions.length).not.equals(0);
      });
    });

    it('Should retrieve all accounts even it have no transactions in the given date range when `none_zero` is `true`', async () => {
      const res = await request()
        .get('/api/financial_statements/general_ledger')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          from_date: '2020-01-01',
          to_date: '2020-03-30',
          none_zero: true,
        })
        .send();

      const accountsNoTransactions = res.body.accounts.filter(a => a.transactions.length === 0);
      const accountsWithTransactions = res.body.accounts.filter(a => a.transactions.length > 0);

      expect(accountsNoTransactions.length).not.equals(0);
      expect(accountsWithTransactions.length).not.equals(0);
    });

    it('Should amount transactions divided on `1000` when `number_format.none_zero` is `true`.', async () => {
      const res = await request()
        .get('/api/financial_statements/general_ledger')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          from_date: '2020-01-01',
          to_date: '2020-03-30',
          number_format: {
            divide_1000: true,
          },
        })
        .send();

      expect(res.body.accounts).include.something.deep.equals({
        id: creditAccount.id,
        name: creditAccount.name,
        code: creditAccount.code, 
        index: null,
        transactions: [
          {
            id: 1002,
            note: null,
            transactionType: null,
            referenceType: null,
            referenceId: null,
            date: '2020-01-09T22:00:00.000Z',
            createdAt: null,
            amount: 4
          }
        ],
        opening: { date: '2020-01-01', amount: 0 },
        closing: { date: '2020-03-30', amount: 4 }
      });
    });

    it('Should amount transactions rounded with no decimals when `number_format.no_cents` is `true`.', async () => {
      await tenantFactory.create('account_transaction', {
        debit: 0.25, credit: 0, account_id: debitAccount.id, date: '2020-1-10',
      });

      const res = await request()
        .get('/api/financial_statements/general_ledger')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          from_date: '2020-01-01',
          to_date: '2020-03-30',
          number_format: {
            divide_1000: true,
            no_cents: true,
          },
          accounts_ids: [debitAccount.id]
        })
        .send();

      expect(res.body.accounts[0].transactions[2].amount).equal(2);
    });

    it('Should retrieve only accounts that given in the query.', async () => {
      const res = await request()
        .get('/api/financial_statements/general_ledger')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          from_date: '2020-01-01',
          to_date: '2020-03-30',
          none_zero: true,
          accounts_ids: [creditAccount.id],
        })
        .send();

      expect(res.body.accounts.length).equals(1);
    });
  });

  describe('routes: `financial_statements/balance_sheet`', () => {
    it('Should response unauthorzied in case the user was not authorized.', async () => {
      const res = await request()
        .get('/api/financial_statements/balance_sheet')
        .send();

      expect(res.status).equals(401);
    });

    it('Should retrieve query of the balance sheet with default values.', async () => {
      const res = await request()
        .get('/api/financial_statements/balance_sheet')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          display_columns_by: 'year',
          from_date: '2020-01-01',
          to_date: '2020-02-01',
        })
        .send();

      expect(res.body.query.display_columns_by).equals('year');
      expect(res.body.query.from_date).equals('2020-01-01');
      expect(res.body.query.to_date).equals('2020-02-01');

      expect(res.body.query.number_format.no_cents).equals(false);
      expect(res.body.query.number_format.divide_1000).equals(false);

      expect(res.body.query.none_zero).equals(false);
    });

    it('Should retrieve the asset accounts balance.', async () => {
      const res = await request()
        .get('/api/financial_statements/balance_sheet')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          display_columns_by: 'year',
        })
        .send();

      expect(res.body.accounts[0].children).to.be.a('array');
      expect(res.body.accounts[1].children).to.be.a('array');

      expect(res.body.accounts[0].children.length).is.not.equals(0);
      expect(res.body.accounts[1].children.length).is.not.equals(0);
    });

    it('Should retrieve assets/liabilities total balance between the given date range.', async () => {
      const res = await request()
        .get('/api/financial_statements/balance_sheet')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          display_columns_type: 'total',
          from_date: '2012-01-01',
          to_date: '2032-02-02',
        })
        .send();

      expect(res.body.accounts[0].children).include.something.deep.equals({
        id: 1001,
        index: null,
        name: debitAccount.name,
        code: debitAccount.code,
        total: { formatted_amount: 5000, amount: 5000, date: '2032-02-02' }
      });

      expect(res.body.accounts[1].children).include.something.deep.equals({        
        id: 1000,
        index: null,
        name: creditAccount.name,
        code: creditAccount.code,
        total: { formatted_amount: 4000, amount: 4000, date: '2032-02-02' }
      });
    });

    it('Should retrieve asset/liabilities balance sheet with display columns by `year`.', async () => {
      const res = await request()
        .get('/api/financial_statements/balance_sheet')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          display_columns_by: 'year',
          display_columns_type: 'date_periods',
          from_date: '2012-01-01',
          to_date: '2018-02-02',
        })
        .send();

      expect(res.body.accounts[0].children[0].total_periods.length).equals(7);
      expect(res.body.accounts[1].children[0].total_periods.length).equals(7);

      expect(res.body.accounts[0].children[0].total_periods).deep.equals([
        {
          amount: 0,
          formatted_amount: 0,
          date: '2012',
        },
        {
          amount: 0,
          formatted_amount: 0,
          date: '2013',
        },
        {
          amount: 0,
          formatted_amount: 0,
          date: '2014',
        },
        {
          amount: 0,
          formatted_amount: 0,
          date: '2015',
        },
        {
          amount: 0,
          formatted_amount: 0,
          date: '2016',
        },
        {
          amount: 0,
          formatted_amount: 0,
          date: '2017',
        },
        {
          amount: 0,
          formatted_amount: 0,
          date: '2018',
        },
      ]);
    });

    it('Should retrieve balance sheet with display columns by `day`.', async () => {
      const res = await request()
        .get('/api/financial_statements/balance_sheet')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          display_columns_by: 'day',
          display_columns_type: 'date_periods',
          from_date: '2020-01-08',
          to_date: '2020-01-12',
        })
        .send();

      expect(res.body.accounts[0].children).include.something.deep.equals({
        id: debitAccount.id,
        index: debitAccount.index,
        name: debitAccount.name,
        code: debitAccount.code,
        total_periods: [
          { date: '2020-01-08', formatted_amount: 0, amount: 0 },
          { date: '2020-01-09', formatted_amount: 0, amount: 0 },
          { date: '2020-01-10', formatted_amount: 5000, amount: 5000 },
          { date: '2020-01-11', formatted_amount: 5000, amount: 5000 },
          { date: '2020-01-12', formatted_amount: 5000, amount: 5000 },
        ],
        total: { formatted_amount: 5000, amount: 5000, date: '2020-01-12' }
      });
      expect(res.body.accounts[1].children).include.something.deep.equals({
        id: creditAccount.id,
        index: creditAccount.index,
        name: creditAccount.name,
        code: creditAccount.code,
        total_periods: [
          { date: '2020-01-08', formatted_amount: 0, amount: 0 },
          { date: '2020-01-09', formatted_amount: 0, amount: 0 },
          { date: '2020-01-10', formatted_amount: 4000, amount: 4000 },
          { date: '2020-01-11', formatted_amount: 4000, amount: 4000 },
          { date: '2020-01-12', formatted_amount: 4000, amount: 4000 }
        ],
        total: { formatted_amount: 4000, amount: 4000, date: '2020-01-12' }
      });
    });

    it('Should retrieve the balance sheet with display columns by `month`.', async () => {
      const res = await request()
        .get('/api/financial_statements/balance_sheet')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          display_columns_by: 'month',
          display_columns_type: 'date_periods',
          from_date: '2019-07-01',
          to_date: '2020-06-30',
        })
        .send();

      expect(res.body.accounts[0].children).include.something.deep.equals({
        id: debitAccount.id,
        index: debitAccount.index,
        name: debitAccount.name,
        code: debitAccount.code,
        total_periods: [
          { date: '2019-07', formatted_amount: 0, amount: 0 },
          { date: '2019-08', formatted_amount: 0, amount: 0 },
          { date: '2019-09', formatted_amount: 0, amount: 0 },
          { date: '2019-10', formatted_amount: 0, amount: 0 },
          { date: '2019-11', formatted_amount: 0, amount: 0 },
          { date: '2019-12', formatted_amount: 0, amount: 0 },
          { date: '2020-01', formatted_amount: 5000, amount: 5000 },
          { date: '2020-02', formatted_amount: 5000, amount: 5000 },
          { date: '2020-03', formatted_amount: 5000, amount: 5000 },
          { date: '2020-04', formatted_amount: 5000, amount: 5000 },
          { date: '2020-05', formatted_amount: 5000, amount: 5000 },
          { date: '2020-06', formatted_amount: 5000, amount: 5000 },
        ],
        total: { formatted_amount: 5000, amount: 5000, date: '2020-06-30' } 
      });
    });

    it('Should retrieve the balance sheet with display columns `quarter`.', async () => {
      const res = await request()
        .get('/api/financial_statements/balance_sheet')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          display_columns_by: 'quarter',
          display_columns_type: 'date_periods',
          from_date: '2020-01-01',
          to_date: '2020-12-31',
        })
        .send();

      expect(res.body.accounts[0].children).include.something.deep.equals({
        id: debitAccount.id,
        index: debitAccount.index,
        name: debitAccount.name,
        code: debitAccount.code,
        total_periods: [
          { date: '2020-03', formatted_amount: 5000, amount: 5000 },
          { date: '2020-06', formatted_amount: 5000, amount: 5000 },
          { date: '2020-09', formatted_amount: 5000, amount: 5000 },
          { date: '2020-12', formatted_amount: 5000, amount: 5000 },
        ],
        total: { formatted_amount: 5000, amount: 5000, date: '2020-12-31' },
      });
    });

    it('Should retrieve the balance sheet amounts without cents.', async () => {
      await tenantFactory.create('account_transaction', {
        debit: 0.25, credit: 0, account_id: debitAccount.id, date: '2020-1-10',
      });
      const res = await request()
        .get('/api/financial_statements/balance_sheet')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          display_columns_by: 'quarter',
          display_columns_type: 'date_periods',
          from_date: '2020-01-01',
          to_date: '2020-12-31',
          number_format: {
            no_cents: true,
          },
        })
        .send();

      expect(res.body.accounts[0].children).include.something.deep.equals({
        id: debitAccount.id,
        index: debitAccount.index,
        name: debitAccount.name,
        code: debitAccount.code,
        total_periods: [
          { date: '2020-03', formatted_amount: 5000, amount: 5000.25 },
          { date: '2020-06', formatted_amount: 5000, amount: 5000.25 },
          { date: '2020-09', formatted_amount: 5000, amount: 5000.25 },
          { date: '2020-12', formatted_amount: 5000, amount: 5000.25 },  
        ],
        total: { formatted_amount: 5000, amount: 5000.25, date: '2020-12-31' },
      });
    });

    it('Should retrieve the balance sheet amounts divided on 1000.', async () => {
      const res = await request()
        .get('/api/financial_statements/balance_sheet')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          display_columns_by: 'quarter',
          display_columns_type: 'date_periods',
          from_date: '2020',
          to_date: '2021',
          number_format: {
            divide_1000: true,
          },
        })
        .send();
      
      expect(res.body.accounts[0].children).include.something.deep.equals({
        id: debitAccount.id,
        index: debitAccount.index,
        name: debitAccount.name,
        code: debitAccount.code,
        total_periods: [
          { date: '2020-03', formatted_amount: 5, amount: 5000 },
          { date: '2020-06', formatted_amount: 5, amount: 5000 },
          { date: '2020-09', formatted_amount: 5, amount: 5000 },
          { date: '2020-12', formatted_amount: 5, amount: 5000 },
          { date: '2021-03', formatted_amount: 5, amount: 5000 },
        ],
        total: { formatted_amount: 5, amount: 5000, date: '2021' },
      });
    });

    it('Should not retrieve accounts has no transactions between the given date range in case query none_zero is true.', async () => {
      const res = await request()
        .get('/api/financial_statements/balance_sheet')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          display_columns_by: 'quarter',
          from_date: '2002',
          to_date: '2003',
          number_format: {
            divide_1000: true,
          },
          none_zero: true,
        })
        .send();

      expect(res.body.accounts[0].children.length).equals(0);
      expect(res.body.accounts[1].children.length).equals(0);
    });
  });

  describe('routes: `/financial_statements/trial_balance`', () => {
    it('Should response unauthorized in case the user was not authorized.', async () => {
      const res = await request()
        .get('/api/financial_statements/trial_balance_sheet')
        .send();

      expect(res.status).equals(401);
    });

    it('Should retrieve the trial balance of accounts.', async () => {
      const res = await request()
        .get('/api/financial_statements/trial_balance_sheet')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .send();

      expect(res.body.accounts).include.something.deep.equals({
        account_id: debitAccount.id,
        name: debitAccount.name,
        code: debitAccount.code,
        accountNormal: 'debit',
        credit: 1000,
        debit: 6000,
        balance: 5000,
      });
      expect(res.body.accounts).include.something.deep.equals({
        account_id: creditAccount.id,
        name: creditAccount.name,
        code: creditAccount.code,
        accountNormal: 'credit',
        credit: 4000,
        debit: 0,
        balance: 4000,
      });
    });

    it('Should not retrieve accounts has no transactions between the given date range.', async () => {
      const res = await request()
        .get('/api/financial_statements/trial_balance_sheet')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          // There is no transactions between these dates.
          from_date: '2002-01-01',
          to_date: '2003-01-01',
          none_zero: true,
        })
        .send();

      expect(res.body.accounts.length).equals(0);
    });

    it('Should retrieve trial balance of accounts between the given date range.', async () => {
      const res = await request()
        .get('/api/financial_statements/trial_balance_sheet')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          // There is no transactions between these dates.
          from_date: '2020-01-05',
          to_date: '2020-01-10',
          none_zero: true,
        })
        .send();

      expect(res.body.accounts).include.something.deep.equals({
        account_id: creditAccount.id,
        name: creditAccount.name,
        code: creditAccount.code,
        accountNormal: 'credit',
        credit: 4000,
        debit: 0,
        balance: 4000
      });
    });

    it('Should credit, debit and balance amount be divided on 1000.', async () => {
      const res = await request()
        .get('/api/financial_statements/trial_balance_sheet')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          // There is no transactions between these dates.
          from_date: '2020-01-05',
          to_date: '2020-01-10',
          number_format: {
            divide_1000: true,
          },
        })
        .send();

      expect(res.body.accounts).include.something.deep.equals({
        account_id: creditAccount.id,
        name: creditAccount.name,
        code: creditAccount.code,
        accountNormal: 'credit',
        credit: 4,
        debit: 0,
        balance: 4
      });
    });

    it('Should credit, debit and balance amount rounded without cents.', async () => {
      const res = await request()
        .get('/api/financial_statements/trial_balance_sheet')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          // There is no transactions between these dates.
          from_date: '2020-01-05',
          to_date: '2020-01-10',
          number_format: {
            no_cents: true,
          },
        })
        .send();
    });

    it('Should retrieve associated account details in accounts list.', async () => {

    });
  });

  describe('routes: `/api/financial_statements/profit_loss_sheet`', () => {
    it('Should response unauthorized in case the user was not authorized.', async () => {
      const res = await request()
        .get('/api/financial_statements/profit_loos_sheet')
        .send();

      expect(res.status).equals(401);
      expect(res.body.message).equals('Unauthorized');
    });

    it('Should retrieve columns when display type `date_periods` and columns by `month` between date range.', async () => {
      const res = await request()
        .get('/api/financial_statements/profit_loss_sheet')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          from_date: '2020-01-01',
          to_date: '2020-12-12',
          display_columns_type: 'date_periods',
          display_columns_by: 'month',
        })
        .send();

      expect(res.body.columns.length).equals(12);
      expect(res.body.columns).deep.equals([
        '2020-01', '2020-02',
        '2020-03', '2020-04',
        '2020-05', '2020-06',
        '2020-07', '2020-08',
        '2020-09', '2020-10',
        '2020-11', '2020-12',
      ]);
    });

    it('Should retrieve columns when display type `date_periods` and columns by `quarter`.', async () => {
      const res = await request()
        .get('/api/financial_statements/profit_loss_sheet')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          from_date: moment().startOf('year').format('YYYY-MM-DD'),
          to_date: moment().endOf('year').format('YYYY-MM-DD'),
          display_columns_type: 'date_periods',
          display_columns_by: 'quarter',
        })
        .send();

      expect(res.body.columns.length).equals(4);
      expect(res.body.columns).deep.equals([
        '2020-03', '2020-06', '2020-09', '2020-12',
      ]);
    });

    it('Should retrieve columns when display type `date_periods` and columns by `day` between date range.', async () => {
      const res = await request()
        .get('/api/financial_statements/profit_loss_sheet')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          from_date: moment('2020-01-01').startOf('month').format('YYYY-MM-DD'),
          to_date: moment('2020-01-01').endOf('month').format('YYYY-MM-DD'),
          display_columns_type: 'date_periods',
          display_columns_by: 'day',
        })
        .send();

      expect(res.body.columns.length).equals(31);
      expect(res.body.columns).deep.equals([
        '2020-01-01', '2020-01-02', '2020-01-03',
        '2020-01-04', '2020-01-05', '2020-01-06',
        '2020-01-07', '2020-01-08', '2020-01-09',
        '2020-01-10', '2020-01-11', '2020-01-12',
        '2020-01-13', '2020-01-14', '2020-01-15',
        '2020-01-16', '2020-01-17', '2020-01-18',
        '2020-01-19', '2020-01-20', '2020-01-21',
        '2020-01-22', '2020-01-23', '2020-01-24',
        '2020-01-25', '2020-01-26', '2020-01-27',
        '2020-01-28', '2020-01-29', '2020-01-30',
        '2020-01-31',
      ]);
    });

    it('Should retrieve all income accounts even it has no transactions.', async () => {
      const zeroAccount = await tenantFactory.create('account', { account_type_id: incomeType.id });

      const res = await request()
        .get('/api/financial_statements/profit_loss_sheet')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          from_date: moment('2020-01-01').startOf('month').format('YYYY-MM-DD'),
          to_date: moment('2020-01-01').endOf('month').format('YYYY-MM-DD'),
          display_columns_type: 'total',
          display_columns_by: 'month',
          none_zero: false,
        })
        .send();

      expect(res.body.profitLoss.income.accounts).include.something.deep.equals({
        id: zeroAccount.id,
        index: zeroAccount.index,
        name: zeroAccount.name,
        code: zeroAccount.code,
        total: { amount: 0, date: '2020-01-31', formatted_amount: 0 },
      });
    });

    it('Should retrieve total of each income account when display columns by `total`.',  async () => {
      const toDate = moment('2020-01-01').endOf('month').format('YYYY-MM-DD');
      const res = await request()
        .get('/api/financial_statements/profit_loss_sheet')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          from_date: moment('2020-01-01').startOf('month').format('YYYY-MM-DD'),
          to_date: toDate,
        })
        .send();

      expect(res.body.profitLoss.income.accounts).to.be.an('array');
      expect(res.body.profitLoss.income.accounts.length).not.equals(0);
      expect(res.body.profitLoss.income.accounts[0].id).to.be.an('number');
      expect(res.body.profitLoss.income.accounts[0].name).to.be.an('string');
      expect(res.body.profitLoss.income.accounts[0].total).to.be.an('object');
      expect(res.body.profitLoss.income.accounts[0].total.amount).to.be.an('number');
      expect(res.body.profitLoss.income.accounts[0].total.formatted_amount).to.be.an('number');
      expect(res.body.profitLoss.income.accounts[0].total.date).equals(toDate);
    });

    it('Should retrieve credit sumation of income accounts.', async () => {
      const res = await request()
        .get('/api/financial_statements/profit_loss_sheet')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          from_date: '2020-01-01',
          to_date: '2021-01-01',
        })
        .send();

      expect(res.body.profitLoss.income.total).to.be.an('object');
      expect(res.body.profitLoss.income.total.amount).equals(2000);
      expect(res.body.profitLoss.income.total.formatted_amount).equals(2000);
      expect(res.body.profitLoss.income.total.date).equals('2021-01-01');
    });

    it('Should retrieve debit sumation of expenses accounts.', async () => {
      const res = await request()
        .get('/api/financial_statements/profit_loss_sheet')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          from_date: '2020-01-01',
          to_date: '2021-01-01',
        })
        .send();

      expect(res.body.profitLoss.expenses.total).to.be.an('object');
      expect(res.body.profitLoss.expenses.total.amount).equals(1000);
      expect(res.body.profitLoss.expenses.total.formatted_amount).equals(1000);
      expect(res.body.profitLoss.expenses.total.date).equals('2021-01-01');
    });

    it('Should retrieve credit total of income accounts with `date_periods` columns between the given date range.', async () => {
      const res = await request()
        .get('/api/financial_statements/profit_loss_sheet')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          from_date: '2019-12-01',
          to_date: '2020-12-01',
          display_columns_type: 'date_periods',
          display_columns_by: 'month',
        })
        .send();

      expect(res.body.profitLoss.income.total_periods[0].amount).equals(0);
      expect(res.body.profitLoss.income.total_periods[1].amount).equals(2000);
      expect(res.body.profitLoss.income.total_periods[2].amount).equals(2000);
    });

    it('Should retrieve debit total of expenses accounts with `date_periods` columns between the given date range.', async () => {
      const res = await request()
        .get('/api/financial_statements/profit_loss_sheet')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          from_date: '2019-12-01',
          to_date: '2020-12-01',
          display_columns_type: 'date_periods',
          display_columns_by: 'month',
        })
        .send();

      expect(res.body.profitLoss.expenses.total_periods[0].amount).equals(0);
      expect(res.body.profitLoss.expenses.total_periods[1].amount).equals(1000);
      expect(res.body.profitLoss.expenses.total_periods[2].amount).equals(1000);
    });

    it('Should retrieve total net income with `total column display between the given date range.', async () => {
      const res = await request()
        .get('/api/financial_statements/profit_loss_sheet')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          from_date: '2019-12-01',
          to_date: '2020-12-01',
          display_columns_type: 'total',
        })
        .send();

      expect(res.body.profitLoss.net_income.total.amount).equals(1000);
      expect(res.body.profitLoss.net_income.total.formatted_amount).equals(1000);
      expect(res.body.profitLoss.net_income.total.date).equals('2020-12-01');
    });

    it('Should retrieve total net income with `date_periods` columns between the given date range.', async () => {
      const res = await request()
        .get('/api/financial_statements/profit_loss_sheet')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          from_date: '2019-12-01',
          to_date: '2020-12-01',
          display_columns_type: 'date_periods',
          display_columns_by: 'quarter',
        })
        .send();

      expect(res.body.profitLoss.net_income).deep.equals({
        total_periods: [
          { date: '2019-12', amount: 0, formatted_amount: 0 },
          { date: '2020-03', amount: 1000, formatted_amount: 1000 },
          { date: '2020-06', amount: 1000, formatted_amount: 1000 },
          { date: '2020-09', amount: 1000, formatted_amount: 1000 },
          { date: '2020-12', amount: 1000, formatted_amount: 1000 }
        ],      
      });
    });

    it('Should not retrieve income or expenses accounts that has no transactions between the given date range in case none_zero equals true.', async () => {
      const res = await request()
        .get('/api/financial_statements/profit_loss_sheet')
        .set('x-access-token', loginRes.body.token)
        .set('organization-id', tenantWebsite.organizationId)
        .query({
          from_date: '2020-01-01',
          to_date: '2021-01-01',
          display_columns_by: 'month',
          display_columns_type: 'date_periods',
          none_zero: true,
        })
        .send();

      expect(res.body.profitLoss.income.accounts.length).equals(1);
    });
  });
});
