$Token = "DKWINVCjMGbOra3anGoFTB5F"
$EnvVars = @{
    "SUPABASE_URL"             = "https://mclwqrweybyemzetlyke.supabase.co"
    "SUPABASE_KEY"             = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jbHdxcndleWJ5ZW16ZXRseWtlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDQ5NzM4NSwiZXhwIjoyMDg2MDczMzg1fQ.3JOoABqnMckuQ-Dtq4_xu--RH_R0vAPBBQqu_IG4220"
    "NEXT_PUBLIC_SUPABASE_URL" = "https://mclwqrweybyemzetlyke.supabase.co"
    "JWT_SECRET"               = "super_secret_jwt_key_xboost_2024"
    "GITHUB_CLIENT_ID"         = "Ov23lich6035nnlK0sCK"
    "GITHUB_CLIENT_SECRET"     = "da8c7a710177bdf039dc60ebf5682acbdf40cc33"
    "GOOGLE_CLIENT_ID"         = "889005816396-5lr91p16j7gqk3lhvt5cgelpkcgadps0.apps.googleusercontent.com"
    "GOOGLE_CLIENT_SECRET"     = "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"
}

# Ensure we are in the correct directory
Set-Location "f:\bot rbzin\Twitter_Bot"

Write-Host "Linking project 'xboost' to Vercel..."
# Try to link to existing project 'xboost'
cmd /c "npx -y vercel link --yes --project xboost --token $Token"

foreach ($key in $EnvVars.Keys) {
    Write-Host "Setting $key..."
    $val = $EnvVars[$key]
    
    [IO.File]::WriteAllText("$PWD\temp_val.txt", $val)
    
    # Try adding env var
    cmd /c "npx -y vercel env add $key production < temp_val.txt --token $Token"
    
    Start-Sleep -Seconds 2
}

Remove-Item "temp_val.txt" -ErrorAction SilentlyContinue

Write-Host "Triggering Final Redeploy..."
cmd /c "npx -y vercel --prod --token $Token"
