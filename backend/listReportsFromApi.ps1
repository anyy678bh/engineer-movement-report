$apiUrl = 'https://7rh6lrhed4.execute-api.us-east-1.amazonaws.com/Prod/reports?tenantId=default'
Invoke-RestMethod -Method Get -Uri $apiUrl
