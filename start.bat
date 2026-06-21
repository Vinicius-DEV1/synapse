@echo off
title Caderno
color 0D

echo ===================================
echo   CADERNO - INICIANDO
echo ===================================

if not exist node_modules (
    echo [!] Dependencias nao encontradas.
    echo [!] Baixando e instalando pacotes ^(isso pode demorar na primeira vez^)...
    call npm install
)

if not exist "dist-app\win-unpacked\Caderno.exe" (
    echo [!] Compilando o aplicativo para producao pela primeira vez...
    echo [!] Isso garantira que nenhuma janela de terminal fique aberta.
    call npm run build
)

echo [V] Tudo pronto! Iniciando aplicativo...
start "" "dist-app\win-unpacked\Caderno.exe"
exit
