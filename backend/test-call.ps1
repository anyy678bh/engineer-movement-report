$apiUrl = 'https://7rh6lrhed4.execute-api.us-east-1.amazonaws.com/Prod/reports'
$body = @{ tenantId='default'; userEmail='demo@example.com'; companyName='Acme'; location='Lagos'; transportType='Company Vehicle'; machineType='Generator'; serviceRendered='Routine service' } | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri $apiUrl -ContentType 'application/json' -Body $body
