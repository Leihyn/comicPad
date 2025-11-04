# Fix MongoDB Connection Issues - DNS Configuration

## Problem
Your MongoDB connection is experiencing intermittent DNS resolution failures causing:
- Slow connections (10+ seconds)
- Timeouts and failures
- Disconnections

## Solution: Use Google/Cloudflare DNS

### Windows - Quick Fix with PowerShell

1. Open PowerShell as Administrator
2. Run this command:

```powershell
# Set Google DNS (8.8.8.8, 8.8.4.4)
Set-DnsClientServerAddress -InterfaceAlias "Wi-Fi" -ServerAddresses ("8.8.8.8","8.8.4.4")

# If using Ethernet, replace "Wi-Fi" with "Ethernet"
```

### Verify DNS Change
```bash
ipconfig /all | findstr "DNS Servers"
```

### Flush DNS Cache
```bash
ipconfig /flushdns
```

### Test Connection Again
```bash
cd backend
node test-mongo-connection.js
```

## MongoDB Atlas Checklist

1. Go to https://cloud.mongodb.com
2. Check if cluster is paused (free tier pauses after inactivity) - Resume it
3. Network Access → Add 0.0.0.0/0 to allow all IPs (for testing)
4. Wait 2-3 minutes after making changes

## If Still Having Issues

Try adding this to your hosts file for faster resolution:
1. Open: C:\Windows\System32\drivers\etc\hosts (as Administrator)
2. Add these lines:

```
# MongoDB Atlas cluster nodes
159.41.89.20 ac-necythp-shard-00-01.e5wmol7.mongodb.net
159.41.89.37 ac-necythp-shard-00-02.e5wmol7.mongodb.net
```
