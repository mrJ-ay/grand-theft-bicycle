@echo off
chcp 65001 > nul
cls

echo ====================================================
echo    GRAND THEFT BICYCLE 깃허브 업로드 및 Render 자동 배포
echo ====================================================
echo.

git add -A
set /p msg="커밋 메시지 입력 (엔터 치면 자동생성): "
if "%msg%"=="" ( set msg=update: %date% %time% )

git commit -m "%msg%"
git push origin main

echo.
if %errorlevel% equ 0 (
    echo ====================================================
    echo [성공] 깃허브 업로드 완료! Render 자동 배포가 시작되었습니다.
    echo ====================================================
) else (
    echo [안내] 푸시 중 문제가 발생했거나 원격 저장소 설정이 필요합니다.
)
echo.
pause
