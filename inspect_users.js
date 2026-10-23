const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
env.split('\n').forEach(line => {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
});

async function main() {
  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await mongoose.connection.collection('users').find({}).toArray();
  console.log('Users in DB:');
  for (const u of users) {
    console.log(`  id: ${u._id}, email: ${u.email}, name: ${u.name}`);
    const txCount = await mongoose.connection.collection('syncedtransactions').countDocuments({ userId: u._id });
    const incomeCount = await mongoose.connection.collection('syncedtransactions').countDocuments({ userId: u._id, type: 'income' });
    const expenseCount = await mongoose.connection.collection('syncedtransactions').countDocuments({ userId: u._id, type: 'expense' });
    console.log(`    total txs: ${txCount} (income: ${incomeCount}, expense: ${expenseCount})`);
  }
  await mongoose.disconnect();
}
main();

