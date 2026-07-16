# HyperSwitch Payment Processor Plugin for Medusa

<p align="center">
  <a href="https://hyperswitch.io">
    <img alt="HyperSwitch logo" src="https://hyperswitch.io/logos/juspay-hyperswitch.svg" width="350">
  </a>
</p>

Medusa v2 payment plugin for [HyperSwitch](https://hyperswitch.io) — unified checkout, webhooks, refunds, proxy support, and an admin configuration UI.

## Features

- Process payments through HyperSwitch's unified API
- Multiple payment methods with a unified checkout experience
- Webhook handling and payment status synchronization
- Manual and automatic capture modes
- Refund processing
- Admin UI for API keys, proxy, customization, and logging

## Prerequisites

- [Medusa](https://docs.medusajs.com/) **v2.15+**
- [Node.js](https://nodejs.org/) **v20+**
- A [HyperSwitch](https://hyperswitch.io/register) account and API keys

## Installation

Follow these steps **in your Medusa store project** (the app where you run `medusa develop`), not in this plugin repository.

### Step 1: Create a Medusa application (if you don't have one)

```bash
npx create-medusa-app@latest my-medusa-store
cd my-medusa-store
```

### Step 2: Install the plugin package

From your **Medusa application root directory**, install the plugin:

```bash
npm install medusa-payment-hyperswitch
```

Or with another package manager:

```bash
yarn add medusa-payment-hyperswitch
# or
pnpm add medusa-payment-hyperswitch
```

This installs the plugin and its runtime dependencies (`axios`, `axios-retry`, `https-proxy-agent`, and admin UI packages). Your Medusa app must already satisfy the plugin's peer dependencies.

> **Local development:** To test unpublished changes from this repo, use `npx medusa plugin:add medusa-payment-hyperswitch` after running `npx medusa plugin:publish` in the plugin repo. See [Local plugin development](#local-plugin-development).

### Step 3: Set the encryption key

Generate a 32-byte key for encrypting secrets stored by the plugin:

```bash
openssl rand -base64 32
```

Add it to your `.env`:

```env
HYPERSWITCH_HASH_KEY=your-generated-base64-key-here
```

### Step 4: Configure Medusa

Update `medusa-config.ts`:

```typescript
import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  modules: [
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            id: "hyperswitch",
            resolve: "medusa-payment-hyperswitch/providers/hyperswitch",
          },
        ],
      },
    },
  ],
  plugins: [
    {
      resolve: "medusa-payment-hyperswitch",
      options: {
        key: process.env.HYPERSWITCH_HASH_KEY,
      },
    },
  ],
})
```

### Step 5: Run migrations and start

```bash
npx medusa db:migrate
npm run dev
```

### Step 6: Configure in Admin

1. Open the Medusa Admin panel (e.g. `http://localhost:9000/app`)
2. Go to **Extensions → Hyperswitch**
3. Enter your HyperSwitch API keys, profile ID, and environment
4. Enable the payment provider for your region in **Settings → Regions**

## Storefront Integration (Next.js Starter)

Use this plugin with the storefront repo:  
**https://github.com/Ayyanaruto/hyperswitch-medusa-storefront**

### Storefront environment variables

In your storefront project's `.env.local`, set:

```env
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_
MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_BASE_URL=http://localhost:8000
NEXT_PUBLIC_HYPERSWITCH_KEY=pk_snd_
```
Enable HyperSwitch in the target region

In Medusa Admin:

1. Open **Settings → Regions**
2. Select your region
3. Add/enable **hyperswitch** payment provider
4. Save changes

### 4) Test checkout from the storefront

1. Start backend (`npm run dev` in your Medusa app)
2. Start storefront (`yarn dev` in your Next.js app)
3. Add a product to cart and proceed to checkout
4. Select HyperSwitch payment method and place an order

### 5) Validate webhooks (recommended)

For reliable payment state updates, configure HyperSwitch webhooks to point to your Medusa backend webhook endpoint and verify events are received in backend logs.

## Local plugin development

To work on the plugin itself and test it in a Medusa store:

```bash
git clone https://github.com/Ayyanaruto/hyperswitch-medusajs-plugin.git
cd hyperswitch-medusajs-plugin
pnpm install
pnpm build
npx medusa plugin:publish
```

In your Medusa store:

```bash
npx medusa plugin:add medusa-payment-hyperswitch
```

Keep `pnpm dev` running in the plugin repo during development so changes are republished automatically.

## Publishing to npm

From the plugin repository:

```bash
pnpm build
npm publish
```

The `prepublishOnly` script runs the build automatically before publish.

## Troubleshooting

- **Payment errors** — Check Medusa server logs and the plugin's logging dashboard in Admin
- **Webhooks** — Verify webhook URLs and signing in your HyperSwitch dashboard
- **API keys** — Confirm sandbox vs production keys match your configured environment
- **Proxy** — Configure proxy settings in the Admin UI if your server requires one

## Resources

- [HyperSwitch Documentation](https://hyperswitch.io/docs)
- [Plugin Repository](https://github.com/Ayyanaruto/hyperswitch-medusajs-plugin)
- [Medusa Plugin Guide](https://docs.medusajs.com/learn/fundamentals/plugins/create)
- [Report an Issue](https://github.com/Ayyanaruto/hyperswitch-medusajs-plugin/issues)

## License

MIT
