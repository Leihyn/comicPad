@echo off
echo ========================================
echo DNS FIX SCRIPT FOR COMICPAD
echo ========================================
echo.
echo This will set your DNS to Google DNS (8.8.8.8)
echo.
pause

echo Detecting network adapters...
netsh interface show interface

echo.
echo ========================================
echo OPTION 1: Fix Ethernet
echo ========================================
netsh interface ipv4 set dns "Ethernet" static 8.8.8.8
netsh interface ipv4 add dns "Ethernet" 8.8.4.4 index=2

echo.
echo ========================================
echo OPTION 2: Fix Wi-Fi
echo ========================================
netsh interface ipv4 set dns "Wi-Fi" static 8.8.8.8
netsh interface ipv4 add dns "Wi-Fi" 8.8.4.4 index=2

echo.
echo Flushing DNS cache...
ipconfig /flushdns

echo.
echo ========================================
echo Testing DNS...
echo ========================================
nslookup hederapad.e5wmol7.mongodb.net 8.8.8.8

echo.
echo ========================================
echo DONE! If you see IP addresses above, DNS is fixed.
echo Now restart your backend server.
echo ========================================
pause
