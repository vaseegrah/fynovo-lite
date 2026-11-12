// Fast migration: delete Vanam duplicates, rename remaining to Vaseegrah Edibles (bulk ops)
import mongoose from "mongoose";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const uri = process.env.MONGODB_URI;
if (!uri) { console.error("MONGODB_URI not set"); process.exit(1); }

await mongoose.connect(uri);
const db = mongoose.connection.db;
const col = db.collection("syncedtransactions");

// Step 1: Find originalTransactionIds that already exist as Vaseegrah Edibles per userId
// (these are duplicates — delete the Vanam ones)
const ediblesDocs = await col.find(
  { brand: "Vaseegrah Edibles" },
  { projection: { userId: 1, originalTransactionId: 1 } }
).toArray();

console.log(`Found ${ediblesDocs.length} existing Vaseegrah Edibles records.`);

// Build a Set of "userId:originalTransactionId" keys that already exist as Edibles
const ediblesKeys = new Set(ediblesDocs.map(d => `${d.userId}:${d.originalTransactionId}`));

// Step 2: Get all Vanam records
const vanamDocs = await col.find(
  { brand: "Vaseegrah Vanam" },
  { projection: { _id: 1, userId: 1, originalTransactionId: 1 } }
).toArray();

console.log(`Found ${vanamDocs.length} Vaseegrah Vanam records to migrate.`);

const idsToDelete = [];
const idsToRename = [];

for (const doc of vanamDocs) {
  const key = `${doc.userId}:${doc.originalTransactionId}`;
  if (ediblesKeys.has(key)) {
    idsToDelete.push(doc._id);
  } else {
    idsToRename.push(doc._id);
  }
}

console.log(`Will delete ${idsToDelete.length} duplicates, rename ${idsToRename.length} records.`);

// Step 3: Bulk delete duplicates
if (idsToDelete.length > 0) {
  const delResult = await col.deleteMany({ _id: { $in: idsToDelete } });
  console.log(`Deleted ${delResult.deletedCount} duplicate Vanam records.`);
}

// Step 4: Bulk rename remaining
if (idsToRename.length > 0) {
  const renameResult = await col.updateMany(
    { _id: { $in: idsToRename } },
    { $set: { brand: "Vaseegrah Edibles", business: "Vaseegrah Edibles" } }
  );
  console.log(`Renamed ${renameResult.modifiedCount} Vanam records → Vaseegrah Edibles.`);
}

// Step 5: Migrate fynovointegrations brands array
const intResult = await db.collection("fynovointegrations").updateMany(
  { "brands.brand": "Vaseegrah Vanam" },
  { $set: { "brands.$[elem].brand": "Vaseegrah Edibles" } },
  { arrayFilters: [{ "elem.brand": "Vaseegrah Vanam" }] }
);
console.log(`fynovointegrations: matched=${intResult.matchedCount} modified=${intResult.modifiedCount}`);

// Verify no Vanam records remain
const remaining = await col.countDocuments({ brand: "Vaseegrah Vanam" });
console.log(`Remaining Vanam records: ${remaining}`);

await mongoose.disconnect();
console.log("Migration complete.");
