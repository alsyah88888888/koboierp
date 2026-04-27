@echo off
color 0A
echo ===================================================
echo   AUTO DEPLOY KOBOI ERP KE HOSTINGER VPS
echo ===================================================
echo.
echo Pastikan Anda sudah 'Save' dan melakukan 'git push'.
echo Script ini akan secara ajaib menarik kode terbaru dari GitHub
echo langsung ke Server Hostinger Anda tanpa perlu ribet.
echo.
echo Menghubungkan ke Server (76.13.20.44)...
echo Jika diminta Password, klik kanan (Paste) Root Password Anda lalu tekan Enter.
echo.
ssh -o StrictHostKeyChecking=no root@76.13.20.44 "cd ~/erp && git reset --hard HEAD && git pull && npx prisma db push && npm run build && pm2 restart erp"
echo.
echo ===================================================
echo   UPDATE SELESAI PADA SERVER PRODUCTION!
echo   Buka: http://76.13.20.44/
echo ===================================================
pause
