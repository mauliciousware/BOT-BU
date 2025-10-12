## Quick start (macOS)

1) Install Node.js 18+ and a package manager
- If you have pnpm (recommended): `pnpm -v`
- Or use npm that comes with Node

2) Install dependencies
```bash
# using pnpm (recommended)
pnpm install

# or using npm
npm install
```

3) Add your API key
Create a file named `.env.local` in the project root with your Google Generative AI key:
```bash
echo "GOOGLE_AI_API_KEY=your_api_key_here" > .env.local
```

4) Run the app
```bash
# dev server (http://localhost:3000)
pnpm dev
# or
npm run dev
```

## Build and run (production)
```bash
# build
pnpm build
# start
pnpm start

# (npm)
npm run build && npm start
```
