@echo off
echo ========================================
echo FIXING DNS - PLEASE WAIT
echo ========================================
echo.

REM Flush DNS cache
echo Flushing DNS cache...
ipconfig /flushdns

REM Try to set DNS for Wi-Fi
echo Setting DNS for Wi-Fi adapter...
netsh interface ipv4 set dns "Wi-Fi" static 8.8.8.8 primary
netsh interface ipv4 add dns "Wi-Fi" 8.8.4.4 index=2

REM Try for Ethernet too in case
echo Setting DNS for Ethernet adapter...
netsh interface ipv4 set dns "Ethernet" static 8.8.8.8 primary
netsh interface ipv4 add dns "Ethernet" 8.8.4.4 index=2

REM Try for WLAN too
echo Setting DNS for WLAN adapter...
netsh interface ipv4 set dns "WLAN" static 8.8.8.8 primary
netsh interface ipv4 add dns "WLAN" 8.8.4.4 index=2

REM Flush again
echo Flushing DNS cache again...
ipconfig /flushdns

REM Release and renew IP
echo Releasing and renewing IP address...
ipconfig /release
ipconfig /renew

echo.
echo ========================================
echo Testing DNS...
echo ========================================
nslookup api.pinata.cloud 8.8.8.8

echo.
echo ========================================
echo DONE! If you see IP addresses above, DNS is fixed.
echo If not, you need to run this as Administrator.
echo ========================================
pause
