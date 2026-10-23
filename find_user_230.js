const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
env.split('\n').forEach(line => {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
});

async function main() {
  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGODB_URI);
  const txs = await mongoose.connection.collection('syncedtransactions').find({}).toArray();
  const byUser = {};
  for (const t of txs) {
    const u = t.userId.toString();
    byUser[u] = byUser[u] || { incomePaid: 0, expensePaid: 0, brands: {} };
    const b = t.brand || t.business;
    byUser[u].brands[b] = byUser[u].brands[b] || { income: 0, expense: 0 };
    if (t.status === 'paid') {
      if (t.type === 'income') {
        byUser[u].incomePaid += t.amountMinor;
        byUser[u].brands[b].income += t.amountMinor;
      }
      if (t.type === 'expense') {
        byUser[u].expensePaid += t.amountMinor;
        byUser[u].brands[b].expense += t.amountMinor;
      }
    }
  }
  for (const [u, val] of Object.entries(byUser)) {
    const userDoc = await mongoose.connection.collection('users').findOne({ _id: new mongoose.Types.ObjectId(u) });
    console.log(`User ${userDoc ? userDoc.email : u}:`);
    console.log(`  Total Income Paid: ${val.incomePaid / 100}, Expense Paid: ${val.expensePaid / 100}`);
    console.log('  Brands:', val.brands);
  }
  await mongoose.disconnect();
}
main();

