# HyperSwitch Payment Processor Plugin for Medusa

<p align="center">
  <a href="https://hyperswitch.io">
    <img alt="HyperSwitch logo" src="https://hyperswitch.io/logos/juspay-hyperswitch.svg" width="350">
  </a>
</p>

## Overview

HyperSwitch payment processor plugin for Medusa enables seamless payment processing through the HyperSwitch platform. This plugin supports multiple payment methods and provides a unified checkout experience for your Medusa-powered e-commerce store.

## Features

- ✅ Process payments through HyperSwitch's unified API
- ✅ Support for multiple payment methods
- ✅ Unified checkout experience
- ✅ Webhook handling for payment events
- ✅ Payment status synchronization
- ✅ Refund processing

## Prerequisites

- [Medusa server](https://docs.medusajs.com/) version >= 2.4.0
- [Node.js](https://nodejs.org/en/) version 16 or later
- [HyperSwitch account](https://hyperswitch.io/register) and API keys

## Development Testing Guide

Follow these steps to integrate and test the plugin in your local environment:

### 1. Create a Medusa store

```bash
npx create-medusa-app@v2.4.0 medusa-test-store
cd medusa-test-store
```

> **Note**: This plugin has been verified with Medusa v2.4.0. Using other versions may require additional configuration.

### 2. Install required dependencies

```bash
yarn add https-proxy-agent@^7.0.5 lucide-react@^0.460.0 class-variance-authority@^0.7.0
```

### 3. Clone and prepare the plugin

```bash
git clone https://github.com/Ayyanaruto/hyperswitch-medusajs-plugin.git
cd hyperswitch-medusajs-plugin
git checkout develop-plugin
yarn install
yarn build
npx medusa plugin:publish
```

### 4. Add the plugin to your Medusa store

```bash
cd ../medusa-test-store
npx medusa plugin:add juspay-hyperswitch
```
### 5. Go to `.env` file and add a new variable `HYPERSWITCH_HASH_KEY`

- First, generate a **32-byte key** using either **OpenSSL** or **Node.js**.
- To generate it on **Mac** or **Linux**, use one of the following commands:

```bash
openssl rand -base64 32
```

or

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

- Then, in your `.env` file, create the variable and paste the generated key:

```env
HYPERSWITCH_HASH_KEY=your-generated-base64-key-here
```
### 6. Configure your Medusa server

Update your `medusa-config.ts` file:

```typescript
// medusa-config.ts
import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  modules:[
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            id: "hyperswitch",
            resolve: "juspay-hyperswitch/providers/hyperswitch",
          }
        ],
      },
    },
  ],
  plugins: [
    {
      resolve: "juspay-hyperswitch",
      // AES-256-GCM requires a 256-bit (32-byte) base64 key
      // Generate it using: openssl rand -base64 32 or run node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
      // Store this securely in your environment variables
      options: {
        key : process.env.HYPERSWITCH_HASH_KEY,
      },
    },
  ]
})
```

### 7. Start and test the integration

```bash
npm run start
```

### 8. Configure the payment provider

1. Access the Medusa Admin panel at `http://localhost:9000/app`
2. Navigate to **Extensions > Hyperswitch**
3. Configure the HyperSwitch plugin with your API keys from the HyperSwitch dashboard
4. Create a test product and complete a checkout to verify the payment flow

## Troubleshooting

If you encounter issues during integration:

- Check server logs for payment-related errors
- Verify webhook configurations in your HyperSwitch dashboard
- Use HyperSwitch test mode to simulate different payment scenarios
- Make sure your API keys are correctly configured in the Medusa admin panel
- Check network requests for any API communication errors
##TODO
- 
## Resources

- [HyperSwitch Documentation](https://hyperswitch.io/docs)
- [Plugin GitHub Repository](https://github.com/Ayyanaruto/hyperswitch-medusajs-plugin)
- [Medusa Documentation](https://docs.medusajs.com/learn/fundamentals/plugins/create)
- [Open an Issue](https://github.com/Ayyanaruto/hyperswitch-medusajs-plugin/issues)