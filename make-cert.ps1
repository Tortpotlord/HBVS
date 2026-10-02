$ip="192.168.135.32"
Write-Host "Creating cert for $ip..."
$cert = New-SelfSignedCertificate -DnsName $ip,"localhost" -CertStoreLocation Cert:\LocalMachine\My -NotAfter (Get-Date).AddDays(825) -KeyLength 2048
$pfxPath="C:\HBVS\temp.pfx"
$pwdSec=ConvertTo-SecureString -String "hbvs" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $pwdSec | Out-Null
$pfx = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($pfxPath,"hbvs","Exportable")
$rsa = $pfx.GetRSAPrivateKey()
$keyBytes = $rsa.ExportPkcs8PrivateKey()
$keyB64 = [Convert]::ToBase64String($keyBytes, [Base64FormattingOptions]::InsertLineBreaks)
$certB64 = [Convert]::ToBase64String($pfx.RawData, [Base64FormattingOptions]::InsertLineBreaks)
Set-Content -Path "C:\HBVS\key.pem" -Value "-----BEGIN PRIVATE KEY-----`n$keyB64`n-----END PRIVATE KEY-----"
Set-Content -Path "C:\HBVS\cert.pem" -Value "-----BEGIN CERTIFICATE-----`n$certB64`n-----END CERTIFICATE-----"
Remove-Item $pfxPath -Force
Write-Host "DONE! cert.pem and key.pem created in C:\HBVS" -ForegroundColor Green
