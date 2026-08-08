# Guia de Compilação e Instalação (Caderno)

Este documento contém os passos necessários para compilar a versão final do aplicativo e instalá-lo nativamente no Linux (Ubuntu, Debian, Pop!_OS, etc).

## 1. Como compilar (Build)

Sempre que você modificar o código fonte e quiser gerar uma nova versão para uso diário, execute o comando abaixo na pasta raiz do projeto:

```bash
npm run tauri build
```

*Nota: Esse processo pode demorar alguns minutos pois o Rust compilará o aplicativo com otimizações extremas de velocidade (Release Mode).*

## 2. Como instalar no sistema (Linux)

Após o build ser concluído, o instalador `.deb` será gerado. Ele já contém a logo e o nome do aplicativo.

Para instalar, execute:
```bash
sudo dpkg -i src-tauri/target/release/bundle/deb/caderno_1.0.0_amd64.deb
```
*(Se no futuro a versão no arquivo `tauri.conf.json` mudar para 1.0.1, lembre-se de alterar o nome do arquivo acima)*

**Vantagens do pacote `.deb`:**
- O Caderno aparecerá no menu iniciar do seu sistema com o ícone correto.
- Você pode fixá-mo na dock de aplicativos.

## 3. Como atualizar no futuro?

A atualização funciona da mesma maneira que a instalação inicial.

1. Faça as suas alterações no código.
2. Rode `npm run tauri build` para gerar o novo arquivo `.deb`.
3. Rode `sudo dpkg -i src-tauri/target/release/bundle/deb/caderno_1.0.0_amd64.deb` novamente.

O Linux é inteligente: ele detecta que o programa já existe e simplesmente substitui os arquivos antigos pelos novos. Não é necessário desinstalar a versão anterior.
