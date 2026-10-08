param location string = 'centralindia'
param appName string
param azureOpenAiEndpoint string
param azureOpenAiDeployment string = 'gpt-4.1'
@secure()
param azureOpenAiApiKey string

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: concat(appName, '-plan')
  location: location
  sku: { name: 'B1', tier: 'Basic' }
  kind: 'linux'
  properties: { reserved: true }
}
resource app 'Microsoft.Web/sites@2023-12-01' = {
  name: appName
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      http20Enabled: true
      alwaysOn: true
      appSettings: [
        { name: 'SCM_DO_BUILD_DURING_DEPLOYMENT', value: 'false' }
        { name: 'DATA_DIR', value: '/home/data' }
        { name: 'ALLOW_MOCK_GRAPH', value: 'false' }
        { name: 'AZURE_OPENAI_ENDPOINT', value: azureOpenAiEndpoint }
        { name: 'AZURE_OPENAI_DEPLOYMENT', value: azureOpenAiDeployment }
        { name: 'AZURE_OPENAI_API_KEY', value: azureOpenAiApiKey }
      ]
    }
  }
}
output appUrl string = concat('https://', app.properties.defaultHostName)
