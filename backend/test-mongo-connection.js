import mongoose from 'mongoose';
import dns from 'dns';
import { promisify } from 'util';
import dotenv from 'dotenv';

dotenv.config();

const dnsLookup = promisify(dns.lookup);
const dnsResolve4 = promisify(dns.resolve4);

console.log('='.repeat(60));
console.log('MongoDB Connection Diagnostics');
console.log('='.repeat(60));

// Test 1: Check if MongoDB URI is set
console.log('\n✓ Test 1: Check MongoDB URI');
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in .env file');
  process.exit(1);
}
console.log('✓ MONGODB_URI is set');
console.log(`  URI: ${process.env.MONGODB_URI.replace(/:[^:@]+@/, ':****@')}`);

// Test 2: Extract and test DNS resolution
console.log('\n✓ Test 2: DNS Resolution Test');
const uriMatch = process.env.MONGODB_URI.match(/@([^/]+)/);
if (!uriMatch) {
  console.error('❌ Could not extract hostname from URI');
  process.exit(1);
}

const hostname = uriMatch[1].split(',')[0].split(':')[0];
console.log(`  Hostname: ${hostname}`);

try {
  console.log('  Testing DNS lookup...');
  const dnsResult = await dnsLookup(hostname);
  console.log(`  ✓ DNS Lookup successful: ${dnsResult.address} (${dnsResult.family})`);

  console.log('  Testing DNS resolve4...');
  const addresses = await dnsResolve4(hostname);
  console.log(`  ✓ DNS Resolve4 successful: ${addresses.join(', ')}`);
} catch (error) {
  console.error(`  ❌ DNS resolution failed: ${error.message}`);
  console.error('  This suggests a network or DNS issue.');
  console.error('  Possible fixes:');
  console.error('    - Check your internet connection');
  console.error('    - Try changing DNS servers (8.8.8.8, 1.1.1.1)');
  console.error('    - Check if a firewall is blocking DNS queries');
}

// Test 3: Test MongoDB connection
console.log('\n✓ Test 3: MongoDB Connection Test');
console.log('  Attempting to connect...');

const startTime = Date.now();
let connected = false;

mongoose.connection.on('connected', () => {
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`  ✓ Connected successfully in ${duration}s`);
  connected = true;
});

mongoose.connection.on('error', (err) => {
  console.error(`  ❌ Connection error: ${err.message}`);
});

try {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 20000,
    connectTimeoutMS: 15000,
    family: 4,
  });

  console.log(`  ✓ Connection successful!`);
  console.log(`  ✓ Host: ${mongoose.connection.host}`);
  console.log(`  ✓ Database: ${mongoose.connection.name}`);
  console.log(`  ✓ Ready State: ${mongoose.connection.readyState}`);

  // Test database operation
  console.log('\n✓ Test 4: Database Operation Test');
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log(`  ✓ Found ${collections.length} collections`);
  if (collections.length > 0) {
    console.log(`  Collections: ${collections.map(c => c.name).join(', ')}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✓ All tests passed! MongoDB is working correctly.');
  console.log('='.repeat(60));

} catch (error) {
  console.error(`  ❌ Connection failed: ${error.message}`);

  console.log('\n' + '='.repeat(60));
  console.log('❌ Connection Test Failed');
  console.log('='.repeat(60));

  console.log('\nPossible causes and solutions:');

  if (error.message.includes('ETIMEDOUT') || error.message.includes('ENOTFOUND')) {
    console.log('\n1. IP Whitelist Issue (Most Common):');
    console.log('   → Go to MongoDB Atlas → Network Access');
    console.log('   → Add your current IP address');
    console.log('   → OR add 0.0.0.0/0 (allows all IPs - for testing only)');
    console.log('   → Wait 2-3 minutes after adding IP');
  }

  if (error.message.includes('Authentication failed')) {
    console.log('\n2. Authentication Issue:');
    console.log('   → Check username and password in connection string');
    console.log('   → Ensure special characters are URL-encoded');
    console.log('   → Verify database user has correct permissions');
  }

  if (error.message.includes('ENOTFOUND')) {
    console.log('\n3. DNS Issue:');
    console.log('   → Check internet connection');
    console.log('   → Try using different DNS (8.8.8.8, 1.1.1.1)');
    console.log('   → Check if VPN is interfering');
  }

  console.log('\n4. MongoDB Atlas Cluster:');
  console.log('   → Ensure cluster is not paused (free tier pauses after inactivity)');
  console.log('   → Check MongoDB Atlas status page');
  console.log('   → Try creating a new cluster if issues persist');

  console.log('\n5. Network/Firewall:');
  console.log('   → Check if port 27017 is blocked by firewall');
  console.log('   → Try disabling firewall temporarily to test');
  console.log('   → Check corporate network restrictions');

} finally {
  if (connected) {
    await mongoose.connection.close();
    console.log('\n✓ Connection closed cleanly');
  }
  process.exit(connected ? 0 : 1);
}
