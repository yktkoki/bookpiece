@echo off
setlocal
rem ブックピースを公開リポ (yktkoki/bookpiece) へデプロイするスクリプト
rem このフォルダ自体は family リポの一部なので、直接 git push しないこと！
rem 公開リポのローカルクローン（%USERPROFILE%\Apps\bookpiece）へファイルを同期してから push する
rem molkky フォルダはモルック点数アプリ（apps/モルック点数管理アプリ の deploy.bat が置く）なので同期から除外する

set "SRC=%~dp0"
set "DEST=%USERPROFILE%\Apps\bookpiece"
set "msg=%~1"
if "%msg%"=="" set "msg=update"

if not exist "%DEST%\.git" (
    echo 公開リポのクローンが見つからないので、クローンします...
    git clone https://github.com/yktkoki/bookpiece.git "%DEST%"
    if errorlevel 1 (
        echo クローンに失敗しました。ネットワークやGitHubの認証を確認してください。
        exit /b 1
    )
)

echo ファイルを同期しています...
robocopy "%SRC%." "%DEST%" /MIR /XD .git molkky /XF deploy.bat /NFL /NDL /NJH /NJS
if errorlevel 8 (
    echo ファイルの同期に失敗しました。
    exit /b 1
)

cd /d "%DEST%"
git add -A
git diff --cached --quiet
if not errorlevel 1 (
    echo 変更がないので、デプロイをスキップしました。
    exit /b 0
)
git commit -m "%msg%"
git push origin main
if errorlevel 1 (
    echo push に失敗しました。GitHubの認証を確認してください。
    exit /b 1
)

echo.
echo デプロイ完了！反映まで30〜60秒待ってからリロードしてください。
echo https://yktkoki.github.io/bookpiece/
