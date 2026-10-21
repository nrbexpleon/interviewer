param location string = 'centralindia'
param appName string
param labTenantId string
param entraClientId string
param blockedTenantIds string = '3b0e7247-e0d5-44bf-8ed1-d01b18d16ca2'
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
        { name: 'DEPLOYMENT_MODE', value: 'lab' }
        { name: 'DATA_MODE', value: 'synthetic' }
        { name: 'AUTH_TENANT_ID', value: labTenantId }
        { name: 'ALLOWED_TENANT_ID', value: labTenantId }
        { name: 'BLOCKED_TENANT_IDS', value: blockedTenantIds }
        { name: 'ALLOW_MOCK_GRAPH', value: 'false' }
        { name: 'AZURE_OPENAI_ENDPOINT', value: azureOpenAiEndpoint }
        { name: 'AZURE_OPENAI_DEPLOYMENT', value: azureOpenAiDeployment }
        { name: 'AZURE_OPENAI_API_KEY', value: azureOpenAiApiKey }
      ]
    }
  }
}

resource auth 'Microsoft.Web/sites/config@2023-12-01' = {
  parent: app
  name: 'authsettingsV2'
  properties: {
    platform: { enabled: true, runtimeVersion: '~1' }
    globalValidation: { requireAuthentication: true, unauthenticatedClientAction: 'Return401' }
    identityProviders: {
      azureActiveDirectory: {
        enabled: true
        registration: {
          clientId: entraClientId
          openIdIssuer: 'https://login.microsoftonline.com/${labTenantId}/v2.0'
        }
        login: {
          loginParameters: [
            'scope=openid profile email offline_access https://graph.microsoft.com/User.Read https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/OnlineMeetings.ReadWrite'
          ]
        }
      }
    }
    login: { tokenStore: { enabled: true } }
    httpSettings: { requireHttps: true }
  }
}

output appUrl string = concat('https://', app.properties.defaultHostName)
