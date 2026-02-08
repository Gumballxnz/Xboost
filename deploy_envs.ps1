$Token = "DKWINVCjMGbOra3anGoFTB5F"
$EnvVars = @{
    "NEXTAUTH_URL" = "https://xboost-zeta.vercel.app"
    "NEXTAUTH_SECRET" = "xboost_super_secret_key_2024_vercel"
    "GITHUB_CLIENT_ID" = "Ov23lich6035nnlK0sCK"
    "GITHUB_CLIENT_SECRET" = "da8c7a710177bdf039dc60ebf5682acbdf40cc33"
    "GOOGLE_CLIENT_ID" = "889005816396-5lr91p16j7gqk3lhvt5cgelpkcgadps0.apps.googleusercontent.com"
    "GOOGLE_CLIENT_SECRET" = "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"
    "NEXT_PUBLIC_SUPABASE_URL" = "https://gjjqpbcexbsmohfhikao.supabase.co"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqanFwYmNleGJzbW9oZmhpa2FvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY0MzUyNjgsImV4cCI6MjA1MjAxMTI2OH0.v1L1sQ__4ZntHLWj-WxKpBq-4RJQE8xD5MRYOg"
}

Set-Location "src/saas/xboost-saas"

foreach ($key in $EnvVars.Keys) {
    Write-Host "Adding $key..."
    $val = $EnvVars[$key]
    $val | Out-File -FilePath "temp_val.txt" -Encoding ascii -NoNewline
    cmd /c "npx -y vercel env add $key production < temp_val.txt --token $Token"
    Start-Sleep -Seconds 1
}

Remove-Item "temp_val.txt" -ErrorAction SilentlyContinue

Write-Host "Deploying..."
npx -y vercel --prod --token $Token
