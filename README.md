# Pebble & Thistle: stock list

A one-page web app that turns a shop's stock spreadsheet into a searchable list that works on a phone.

**Demo only.** Pebble & Thistle is a made-up shop, and every item, supplier and number is invented.

## What it does

- **Search** by item name, SKU or supplier
- **Filter** by category and supplier, or show only items that are low on stock
- **Sort** by any column (click a column heading on desktop, or use "Sort by" on a phone)
- **Low stock badges** on anything with fewer than 5 in stock. "Out of stock" and "Not counted" get their own badges
- **Summary line** showing how many items are listed and what that stock is worth at cost
- Shows **cards on a phone** and a **table on a computer**

## Where the data comes from

The data comes from one spreadsheet, [`data/stock-messy.xlsx`](data/stock-messy.xlsx). It was left messy on purpose, the way real sheets usually are. Each time the site is built, a small script ([`scripts/convert.mjs`](scripts/convert.mjs)) tidies it up:

| In the spreadsheet | In the app |
|---|---|
| "Kitchen", "kitchen ", "Kitchenware", "KITCHEN" | Kitchen |
| "Wrenfold Textiles Ltd" / "Wrenfold Textiles" | Wrenfold Textiles |
| `£12.50`, ` £ 12.50`, `12.5` | £12.50 |
| `03/09/26`, `2026-09-03`, `3 Sept`, real Excel dates | 3 Sep 2026 |
| `approx 20`, `12 ` | 20, 12 |
| Rows that appear twice | Kept once |
| Blank cells | Shown as "Not recorded" or "Not counted", never guessed |

## Updating the stock

1. Open the spreadsheet, change it as usual, and save it with the **same file name**.
2. On GitHub, open the `data` folder, choose **Add file → Upload files**, drop the spreadsheet in and click **Commit changes**.
3. The site rebuilds itself automatically within a minute or two.

Keep the columns in the same order: Item, Category, SKU, Supplier, Qty, Unit cost, Sale price, Last restocked. If you add a new category, the build log will list it, and it will appear in the app under the name you typed.

To change the low-stock level, edit `LOW_STOCK` at the top of `src/App.jsx`.

## Running it on your own computer (optional)

Needs [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

## How it's built

React + Vite. It is a static site with no server, database or login, hosted free on Vercel.
