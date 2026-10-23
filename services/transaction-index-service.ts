import { SyncedTransaction } from "@/models/SyncedTransaction";

let indexSync: Promise<void> | undefined;

export function ensureSyncedTransactionIndexes() {
  if (!indexSync) {
    indexSync = (async () => {
      const legacyIndexName = "userId_1_integrationId_1_originalTransactionId_1";
      const indexes = await SyncedTransaction.collection.indexes();
      const legacyUniqueIndex = indexes.find((index) => index.name === legacyIndexName && index.unique);

      if (legacyUniqueIndex) {
        try {
          await SyncedTransaction.collection.dropIndex(legacyIndexName);
        } catch (error) {
          const currentIndexes = await SyncedTransaction.collection.indexes();
          if (currentIndexes.some((index) => index.name === legacyIndexName && index.unique)) throw error;
        }
      }

      await SyncedTransaction.createIndexes();
    })().catch((error: unknown) => {
      indexSync = undefined;
      throw error;
    });
  }
  return indexSync;
}
