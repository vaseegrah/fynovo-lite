import { describe, expect, it } from "vitest";
import { SyncedTransaction } from "../models/SyncedTransaction";

describe("transaction persistence", () => {
  it("has the compound unique index used to prevent duplicate source records", () => {
    const index = SyncedTransaction.schema.indexes().find(([keys]) => "userId" in keys && "integrationId" in keys && "originalTransactionId" in keys);
    expect(index).toBeDefined(); expect(index?.[1].unique).toBe(true);
  });
});
