# DNS FIX - CRITICAL ISSUE

## Problem
Your Windows DNS is not working. DNS lookups are timing out, preventing MongoDB connection.

## Evidence
```
nslookup hederapad.e5wmol7.mongodb.net
DNS request timed out.
```

## IMMEDIATE FIX - Change to Google DNS

### Method 1: PowerShell (Run as Administrator)
```powershell
# Open PowerShell as Administrator
# Run these commands:

# Get your network adapter name
Get-NetAdapter

# Replace "Ethernet" or "Wi-Fi" with your adapter name from above
Set-DnsClientServerAddress -InterfaceAlias "Ethernet" -ServerAddresses ("8.8.8.8","8.8.4.4")

# OR for Wi-Fi:
Set-DnsClientServerAddress -InterfaceAlias "Wi-Fi" -ServerAddresses ("8.8.8.8","8.8.4.4")

# Flush DNS
Clear-DnsClientCache

# Verify
nslookup hederapad.e5wmol7.mongodb.net 8.8.8.8
```

### Method 2: Windows Settings (GUI)
1. Press `Win + R`, type `ncpa.cpl`, press Enter
2. Right-click your network connection (Ethernet or Wi-Fi)
3. Click "Properties"
4. Select "Internet Protocol Version 4 (TCP/IPv4)"
5. Click "Properties"
6. Select "Use the following DNS server addresses:"
   - Preferred DNS server: `8.8.8.8`
   - Alternate DNS server: `8.8.4.4`
7. Click "OK" twice
8. Open Command Prompt and run: `ipconfig /flushdns`

### Method 3: Quick Test
Open Command Prompt as Administrator and run:
```cmd
ipconfig /flushdns
netsh interface ipv4 set dns "Ethernet" static 8.8.8.8
netsh interface ipv4 add dns "Ethernet" 8.8.4.4 index=2
```

Replace "Ethernet" with "Wi-Fi" if you're using wireless.

## Verification
After changing DNS, test with:
```bash
nslookup hederapad.e5wmol7.mongodb.net
```

You should see IP addresses returned instead of timeouts.

## Then Restart Backend
```bash
cd backend
npm run dev
```

You should see: "MongoDB Connected: hederapad-shard-00-00.e5wmol7.mongodb.net"

## Alternative: Use Cloudflare DNS
Instead of Google (8.8.8.8), you can use Cloudflare:
- Primary: `1.1.1.1`
- Secondary: `1.0.0.1`
