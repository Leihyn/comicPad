import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

// Load environment variables
dotenv.config();

// Force Google DNS
dns.setServers(['8.8.8.8', '8.8.4.4']);

console.log('🔍 Testing MongoDB Connection...\n');
console.log('MongoDB URI:', process.env.MONGODB_URI?.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'));
console.log('DNS Servers:', dns.getServers());
console.log('\n---\n');

// Test DNS resolution first
const hostname = process.env.MONGODB_URI?.match(/@([^/]+)/)?.[1];
if (hostname) {
  console.log(`Resolving DNS for: ${hostname}`);
  dns.resolve4(hostname, (err, addresses) => {
    if (err) {
      console.error('❌ DNS Resolution Failed:', err.message);
    } else {
      console.log('✅ DNS Resolved to:', addresses);
    }
  });
}

console.log('\nAttempting MongoDB connection...\n');

const connectWithTimeout = async () => {
  const timeout = setTimeout(() => {
    console.log('⏱️  Connection is taking longer than expected...');
  }, 10000);

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      family: 4,
    });

    clearTimeout(timeout);
    console.log('\n✅ SUCCESS! MongoDB Connected');
    console.log('Host:', conn.connection.host);
    console.log('Database:', conn.connection.name);
    console.log('Ready State:', conn.connection.readyState);

    await mongoose.connection.close();
    console.log('\n✅ Connection test completed successfully');
    process.exit(0);
  } catch (error) {
    clearTimeout(timeout);
    console.error('\n❌ CONNECTION FAILED');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);

    if (error.message.includes('IP') || error.message.includes('whitelist')) {
      console.error('\n💡 Solution: Check MongoDB Atlas IP whitelist');
    } else if (error.message.includes('authentication')) {
      console.error('\n💡 Solution: Check MongoDB username/password');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT')) {
      console.error('\n💡 Solution: Check your internet connection or MongoDB cluster status');
      console.error('   - Cluster might be paused (free tier clusters auto-pause after inactivity)');
      console.error('   - Visit https://cloud.mongodb.com/ to check cluster status');
    }

    console.error('\nFull Error:', error);
    process.exit(1);
  }
};

connectWithTimeout();
