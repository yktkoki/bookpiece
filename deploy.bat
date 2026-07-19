@echo off
cd /d "%~dp0"
set "msg=%~1"
if "%msg%"=="" set "msg=update"
git add .
git commit -m "%msg%"
git push origin main
echo.
echo デプロイ完了！反映まで30〜60秒待ってからリロードしてください。
