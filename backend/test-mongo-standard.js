import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

// Force Google DNS
dns.setServers(['8.8.8.8', '8.8.4.4']);

console.log('🔍 Testing MongoDB with Standard Connection String...\n');

// Use standard connection string (non-SRV) with direct shard members
const standardUri = 'mongodb://ac-necythp-shard-00-00.e5wmol7.mongodb.net:27017,ac-necythp-shard-00-01.e5wmol7.mongodb.net:27017,ac-necythp-shard-00-02.e5wmol7.mongodb.net:27017/hederaPadDB?ssl=true&replicaSet=atlas-i5i79t-shard-0&authSource=admin&retryWrites=true&w=majority';

const username = 'onatolafaruq_db_user';
const password = 'tzdDsGFQdoYm9aRF';

const fullUri = standardUri.replace('mongodb://', `mongodb://${username}:${password}@`);

console.log('Using standard connection string (non-SRV)');
console.log('Connecting to shard members directly...\n');

const connectTest = async () => {
  try {
    const conn = await mongoose.connect(fullUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      family: 4, // Force IPv4
    });

    console.log('\n✅ SUCCESS! MongoDB Connected');
    console.log('Host:', conn.connection.host);
    console.log('Database:', conn.connection.name);
    console.log('Ready State:', conn.connection.readyState);

    await mongoose.connection.close();
    console.log('\n✅ Connection test completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ CONNECTION FAILED');
    console.error('Error:', error.message);
    console.error('\nFull Error:', error);
    process.exit(1);
  }
};

connectTest();
