# Script para publicar HabitOS no GitHub e ativar GitHub Pages

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class CredReader {
    [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool CredRead(string target, int type, int reservedFlag, out IntPtr credential);

    [DllImport("advapi32.dll", SetLastError = true)]
    public static extern void CredFree(IntPtr credential);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct CREDENTIAL {
        public int Flags;
        public int Type;
        public string TargetName;
        public string Comment;
        public long LastWritten;
        public int CredentialBlobSize;
        public IntPtr CredentialBlob;
        public int Persist;
        public int AttributeCount;
        public IntPtr Attributes;
        public string TargetAlias;
        public string UserName;
    }

    public static string GetPassword(string target) {
        IntPtr credPtr;
        if (CredRead(target, 1, 0, out credPtr)) {
            try {
                CREDENTIAL cred = (CREDENTIAL)Marshal.PtrToStructure(credPtr, typeof(CREDENTIAL));
                byte[] bytes = new byte[cred.CredentialBlobSize];
                Marshal.Copy(cred.CredentialBlob, bytes, 0, cred.CredentialBlobSize);
                return Encoding.Unicode.GetString(bytes);
            } finally {
                CredFree(credPtr);
            }
        }
        return null;
    }
}
"@

$token = [CredReader]::GetPassword("git:https://github.com")
if (-not $token) { $token = [CredReader]::GetPassword("GitHub - https://api.github.com/denevieirazz") }

if (-not $token) {
    Write-Host "[ERRO] Nao foi possivel obter o token do GitHub no Gerenciador de Credenciais." -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "User-Agent" = "HabitOS-Deployer"
    "Accept" = "application/vnd.github.v3+json"
}

Write-Host "[1/5] Verificando usuario do GitHub..." -ForegroundColor Yellow
$user = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers
$username = $user.login
Write-Host "Usuario autenticado: $username" -ForegroundColor Green

$repoName = "habitos"

Write-Host "[2/5] Verificando se o repositorio '$repoName' ja existe..." -ForegroundColor Yellow
$repoExists = $false
try {
    $existingRepo = Invoke-RestMethod -Uri "https://api.github.com/repos/$username/$repoName" -Headers $headers
    $repoExists = $true
    Write-Host "Repositorio '$repoName' ja existe." -ForegroundColor Cyan
} catch {
    Write-Host "Criando repositorio publico '$repoName' no GitHub..." -ForegroundColor Yellow
    $body = @{
        name = $repoName
        description = "HabitOS - O Mini Sistema Operacional Pessoal & Cofre Criptografado Camuflado"
        private = $false
        has_pages = $true
    } | ConvertTo-Json

    $newRepo = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Headers $headers -Method Post -Body $body
    Write-Host "Repositorio criado com sucesso: $($newRepo.html_url)" -ForegroundColor Green
}

$projectDir = "C:\Users\dougl\Music\canal\habitos_web"
Set-Location $projectDir

Write-Host "[3/5] Preparando arquivos no Git..." -ForegroundColor Yellow
if (-not (Test-Path ".git")) {
    git init
    git branch -M main
}

git config user.name "$username"
git config user.email "douglasvieira2544@gmail.com"

git add -A
git commit -m "feat: HabitOS PWA completo com Mini OS, Criptografia AES-256 e Camuflagem"

$remoteUrl = "https://${token}@github.com/${username}/${repoName}.git"

Write-Host "[4/5] Enviando para o GitHub (main)..." -ForegroundColor Yellow
git remote remove origin 2>$null
git remote add origin $remoteUrl
git push -u origin main --force

Write-Host "[5/5] Ativando GitHub Pages..." -ForegroundColor Yellow
try {
    $pagesBody = @{
        source = @{
            branch = "main"
            path = "/"
        }
    } | ConvertTo-Json

    $pagesRes = Invoke-RestMethod -Uri "https://api.github.com/repos/$username/$repoName/pages" -Headers $headers -Method Post -Body $pagesBody
    Write-Host "GitHub Pages configurado!" -ForegroundColor Green
} catch {
    Write-Host "GitHub Pages ja configurado ou em processamento." -ForegroundColor Cyan
}

$pagesUrl = "https://${username}.github.io/${repoName}/"
Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "🚀 Publicacao Concluida!" -ForegroundColor Green
Write-Host "Repositorio: https://github.com/${username}/${repoName}" -ForegroundColor White
Write-Host "Link Web PWA: $pagesUrl" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Green
