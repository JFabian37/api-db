#!/bin/bash
# Levanta una pila de prueba aislada, ejecuta un script en Chrome y la retira.
# Uso: correr-e2e.sh <script.js>
S="/c/Users/ALUMNO~1/AppData/Local/Temp/claude/a1150569d0d778cd/6d38b2f8-056a-408a-ba37-e92a2321a6d4/scratchpad"
M=/c/laragon/bin/mysql/mysql-8.0.30-winx64/bin
my() { "$M/mysql.exe" -h127.0.0.1 -P3306 -uroot "$@"; }
matar() { for port in 3106 5174; do pid=$(netstat -ano | grep -E "[:.]$port\s" | grep LISTEN | awk '{print $NF}' | sort -u | head -1); [ -n "$pid" ] && taskkill //PID "$pid" //T //F >/dev/null 2>&1; done; }

cd /c/laragon/www/api-db
my -e 'DROP DATABASE IF EXISTS api_db_test;'
DB_NAME=api_db_test npm run -s seed 2>&1 | grep -E 'Error'
(DB_NAME=api_db_test PORT=3106 RATE_LIMIT_MAX=100000 RATE_LIMIT_LOGIN_MAX=1000 CORS_ORIGINS=http://localhost:5174 node index.js > "$S/e2e-back.log" 2>&1 &)
cd /c/laragon/www/app-inventario
(VITE_API_URL=http://localhost:3106/api npx vite --port 5174 --strictPort > "$S/e2e-front.log" 2>&1 &)
for i in $(seq 1 25); do curl -s -o /dev/null http://localhost:3106/ && curl -s -o /dev/null http://localhost:5174/ && break; ping -n 2 127.0.0.1 >/dev/null; done

CLAVES=$(cd /c/laragon/www/api-db && node -e "require('dotenv').config({quiet:true});console.log(process.env.ADMIN_PASSWORD.trim()+' '+process.env.SEED_ALMACENERO_PASSWORD.trim())")
set -- $CLAVES "$1"
cd "$S/e2e"; CLAVE_ADMIN="$1" CLAVE_ALM="$2" node "$3" 2>&1; echo "exit e2e: $?"

matar; my -e 'DROP DATABASE IF EXISTS api_db_test;'
netstat -ano | grep -E ':(3106|5174)\s' | grep LISTEN || echo puertos-de-prueba-libres
sed 's/\x1b\[[0-9;]*m//g' "$S/e2e-back.log" | grep -cE ' 500 ' | sed 's/^/respuestas 500: /'
