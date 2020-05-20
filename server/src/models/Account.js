/* eslint-disable global-require */
import { Model, mixin } from 'objection';
import { flatten } from 'lodash';
import TenantModel from '@/models/TenantModel';
import {
  buildFilterQuery,
  buildSortColumnQuery,
} from '@/lib/ViewRolesBuilder';
import CachableQueryBuilder from '@/lib/Cachable/CachableQueryBuilder';
import CachableModel from '@/lib/Cachable/CachableModel';
import DateSession from '@/models/DateSession';


export default class Account extends mixin(TenantModel, [CachableModel, DateSession]) {
  /**
   * Table name
   */
  static get tableName() {
    return 'accounts';
  }

  /**
   * Extend query builder model.
   */
  static get QueryBuilder() {
    return CachableQueryBuilder;
  }

  /**
   * Model modifiers.
   */
  static get modifiers() {
    const TABLE_NAME = Account.tableName;

    return {
      filterAccounts(query, accountIds) {
        if (accountIds.length > 0) {
          query.whereIn(`${TABLE_NAME}.id`, accountIds);
        }
      },
      filterAccountTypes(query, typesIds) {
        if (typesIds.length > 0) {
          query.whereIn('account_types.accoun_type_id', typesIds);
        }
      },
      viewRolesBuilder(query, conditionals, expression) {
        buildFilterQuery(Account.tableName, conditionals, expression)(query);
      },
      sortColumnBuilder(query, columnKey, direction) {
        buildSortColumnQuery(Account.tableName, columnKey, direction)(query);
      },
    };
  }

  /**
   * Relationship mapping.
   */
  static get relationMappings() {
    const AccountType = require('@/models/AccountType');
    const AccountBalance = require('@/models/AccountBalance');
    const AccountTransaction = require('@/models/AccountTransaction');

    return {
      /**
       * Account model may belongs to account type.
       */
      type: {
        relation: Model.BelongsToOneRelation,
        modelClass: this.relationBindKnex(AccountType.default),
        join: {
          from: 'accounts.accountTypeId',
          to: 'account_types.id',
        },
      },

      /**
       * Account model may has many balances accounts.
       */
      balance: {
        relation: Model.HasOneRelation,
        modelClass: this.relationBindKnex(AccountBalance.default),
        join: {
          from: 'accounts.id',
          to: 'account_balances.accountId',
        },
      },

      /**
       * Account model may has many transactions.
       */
      transactions: {
        relation: Model.HasManyRelation,
        modelClass: this.relationBindKnex(AccountTransaction.default),
        join: {
          from: 'accounts.id',
          to: 'accounts_transactions.accountId',
        },
      },
    };
  }

  static collectJournalEntries(accounts) {
    return flatten(accounts.map((account) => account.transactions.map((transaction) => ({
      accountId: account.id,
      ...transaction,
      accountNormal: account.type.normal,
    }))));
  }
}
