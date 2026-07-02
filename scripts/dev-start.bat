@echo off
echo Stopping Node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo Clearing Next.js cache...
if exist .next rmdir /s /q .next

echo Syncing database...
call npx prisma generate
call npx prisma db push

echo Starting dev server...
npm run dev
