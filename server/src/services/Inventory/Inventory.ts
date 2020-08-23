import { Container } from 'typedi';
import {
  InventoryTransaction,
  Item,
  Option,
} from '@/models';
import InventoryAverageCost from '@/services/Inventory/InventoryAverageCost';
import InventoryCostLotTracker from '@/services/Inventory/InventoryCostLotTracker';

type TCostMethod = 'FIFO' | 'LIFO' | 'AVG';

export default class InventoryService {
  /**
   * Computes the given item cost and records the inventory lots transactions
   * and journal entries based on the cost method FIFO, LIFO or average cost rate.
   * @param {Date} fromDate -
   * @param {number} itemId -
   */
  static async computeItemCost(fromDate: Date, itemId: number) {
    const item = await Item.tenant().query()
      .findById(itemId)
      .withGraphFetched('category');

    // Cannot continue if the given item was not inventory item.
    if (item.type !== 'inventory') {
      throw new Error('You could not compute item cost has no inventory type.');
    }
    const costMethod: TCostMethod = item.category.costMethod;
    let costMethodComputer: IInventoryCostMethod;

    // Switch between methods based on the item cost method.
    switch(costMethod) {
      case 'FIFO':
      case 'LIFO':
        costMethodComputer = new InventoryCostLotTracker(fromDate, itemId);
        break;
      case 'AVG':
        costMethodComputer = new InventoryAverageCost(fromDate, itemId);
        break;
    }
    return costMethodComputer.computeItemCost();
  }

  /**
   * SChedule item cost compute job.
   * @param {number} itemId 
   * @param {Date} startingDate 
   */
  static async scheduleComputeItemCost(itemId: number, startingDate: Date|string) {
    const agenda = Container.get('agenda');

    return agenda.schedule('in 3 seconds', 'compute-item-cost', {
      startingDate, itemId,
    });
  }

  /**
   * Records the inventory transactions. 
   * @param {Bill} bill 
   * @param {number} billId 
   */
  static async recordInventoryTransactions(
    entries: [],
    deleteOld: boolean,
  ) {
    const entriesItemsIds = entries.map((e: any) => e.item_id);
    const inventoryItems = await Item.tenant()
      .query()
      .whereIn('id', entriesItemsIds)
      .where('type', 'inventory');

    const inventoryItemsIds = inventoryItems.map((i: any) => i.id);

    // Filter the bill entries that have inventory items.
    const inventoryEntries = entries.filter(
      (entry: any) => inventoryItemsIds.indexOf(entry.item_id) !== -1
    );
    inventoryEntries.forEach(async (entry: any) => {
      if (deleteOld) {
        await this.deleteInventoryTransactions(
          entry.transactionId,
          entry.transactionType,
        );
      }
      await InventoryTransaction.tenant().query().insert({
        ...entry,
        lotNumber: entry.lotNumber,
      });
    });
  }

  /**
   * Deletes the given inventory transactions.
   * @param {string} transactionType 
   * @param {number} transactionId 
   * @return {Promise}
   */
  static deleteInventoryTransactions(
    transactionId: number,
    transactionType: string,
  ) {
    return InventoryTransaction.tenant().query()
      .where('transaction_type', transactionType)
      .where('transaction_id', transactionId)
      .delete();
  }

  /**
   * Retrieve the lot number after the increment.
   */
  static async nextLotNumber() {
    const LOT_NUMBER_KEY = 'lot_number_increment';
    const effectRows = await Option.tenant().query()
      .where('key', LOT_NUMBER_KEY)
      .increment('value', 1);

    if (effectRows === 0) {
      await Option.tenant().query()
        .insert({
          key: LOT_NUMBER_KEY,
          value: 1,
        });
    }
    const options = await Option.tenant().query();
    return options.getMeta(LOT_NUMBER_KEY, 1);
  }
}