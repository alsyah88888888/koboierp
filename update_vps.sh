#!/bin/bash

# ===================================================
#   AUTO DEPLOY KOBOI ERP KE HOSTINGER VPS (macOS)
# ===================================================

SERVER_IP="76.13.20.44"
REMOTE_USER="root"
REMOTE_PATH="~/erp"

echo "==================================================="
echo "   MENGHUBUNGKAN KE SERVER ($SERVER_IP)..."
echo "==================================================="
echo ""

# Melakukan update ke server via SSH
ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${SERVER_IP} "
    cd ${REMOTE_PATH} && \
    git reset --hard HEAD && \
    git pull && \
    npm run build && \
    pm2 restart erp
"

echo ""
echo "==================================================="
echo "   UPDATE SELESAI PADA SERVER PRODUCTION!"
echo "   Buka: http://${SERVER_IP}/"
echo "==================================================="
