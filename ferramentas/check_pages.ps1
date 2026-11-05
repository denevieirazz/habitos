param()

$code = @"
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

Add-Type -TypeDefinition $code
$token = [CredReader]::GetPassword("git:https://github.com")
$headers = @{ "Authorization" = "Bearer $token"; "User-Agent" = "HabitOS-Deployer"; "Accept" = "application/vnd.github.v3+json" }

try {
    $pages = Invoke-RestMethod -Uri "https://api.github.com/repos/denevieirazz/habitos/pages" -Headers $headers
    Write-Host "Pages Status: $($pages.status)" -ForegroundColor Green
    Write-Host "Pages URL: $($pages.html_url)" -ForegroundColor Cyan
} catch {
    Write-Host "Pages API: $($_.Exception.Message)" -ForegroundColor Yellow
}

try {
    $runs = Invoke-RestMethod -Uri "https://api.github.com/repos/denevieirazz/habitos/actions/runs" -Headers $headers
    $runs.workflow_runs | Select-Object name, status, conclusion | Format-Table -AutoSize
} catch {
    Write-Host "Actions API: $($_.Exception.Message)" -ForegroundColor Yellow
}
