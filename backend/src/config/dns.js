import dns from 'dns';
import { promisify } from 'util';

/**
 * Force Node.js to use Google DNS (8.8.8.8)
 * This bypasses Windows DNS completely
 */
export function forceGoogleDNS() {
  // Set DNS servers to Google DNS
  dns.setServers([
    '8.8.8.8',
    '8.8.4.4',
    '1.1.1.1', // Cloudflare as backup
    '1.0.0.1'
  ]);

  console.log('✅ Forced DNS to use Google DNS (8.8.8.8)');
  console.log('📡 DNS Servers:', dns.getServers());
}

/**
 * Test DNS resolution
 */
export async function testDNS() {
  const resolve4 = promisify(dns.resolve4);

  try {
    console.log('🧪 Testing DNS resolution...');

    // Test MongoDB
    const mongoIPs = await resolve4('hederapad.e5wmol7.mongodb.net');
    console.log('✅ MongoDB DNS works:', mongoIPs[0]);

    // Test Pinata
    const pinataIPs = await resolve4('api.pinata.cloud');
    console.log('✅ Pinata DNS works:', pinataIPs[0]);

    return true;
  } catch (error) {
    console.error('❌ DNS test failed:', error.message);
    return false;
  }
}

export default {
  forceGoogleDNS,
  testDNS
};
