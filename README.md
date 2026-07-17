# NomadSpot チェッカー 開発仕様・導入ドキュメント

快適な作業スペースを探すノマドワーカーのための、リアルタイム混雑状況＆作業環境共有マップアプリケーションの完全な構築手順とコード一式です。

---

## 🛠️ 1. 必要なパッケージのインストール手順

新しい環境や別のパソコンでセットアップする際は、ターミナルで以下のコマンドを順番に実行してください。

### ステップ1: プロジェクト作成と移動
```bash
npm create vite@latest nomad-app -- --template react
cd nomad-app
```

### ステップ2: 必要なライブラリの一括インストール
```bash
npm install maplibre-gl tailwindcss @tailwindcss/postcss @tailwindcss/vite
```
## 📂 2. プロジェクトのファイル階層（配置構成）
VS Code上で、フォルダとファイルが以下の階層になっていることを確認してください。配置場所がずれるとエラーになるので一番重要です！
```bash
nomad-app/
├── node_modules/
├── public/
├── src/
│   ├── App.jsx           <-- 4.のアプリケーションコードで上書き
│   ├── index.css         <-- 3.の@tailwind 3行を記述
│   └── main.jsx
├── index.html
├── package.json
├── tailwind.config.js    <-- 3.の設定を記述
├── vite.config.js        <-- 3.の設定を記述
└── README.md             <-- 5.のドキュメントを記述
```
## ⚙️ 3. 各種設定ファイルの中身
vite.config.js
Tailwind v4とReactを正常に繋ぐための設定です。
```bash
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
})
```
### tailwind.config.js
デザイン（Tailwind CSS）の適用範囲を指定します。
```bash
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```
### src/index.css
Tailwindのスタイルを読み込むためのファイルです。中身はこれだけにしてください。
```bash
@tailwind base;
@tailwind components;
@tailwind utilities;
```
## 📝 4. 完全版 README.md
# 📍 NomadSpot チェッカー (NomadSpot Checker)

快適な作業スペースを探すノマドワーカーのための、リアルタイム混雑状況＆作業環境共有マップアプリケーションです。

## 🚀 主な機能

1. **🗺️ リアルタイムインタラクティブマップ**
   - MapLibre GL を使用した軽量で滑らかな地図表示。
   - 混雑状況（空席あり / やや混雑 / 満席）に応じてピンの色がリアルタイムに変化。
2. **🔍 スポットの検索・絞り込みフィルター**
   - 「⚡ 電源あり」「🟢 空席のみ」の条件で、目的に合った作業スポットを一瞬で絞り込み可能。
3. **📍 現在地へのジャンプ機能**
   - ブラウザのGPS（位置情報）と連動し、ワンクリックで今いる場所へ地図をスムーズに移動。
4. **➕ マップへの新規スポット登録**
   - 地図上の好きな場所をクリックするだけで、新しいノマドスポットをその場にピン留めして登録可能。
5. **💬 リアルタイム口コミ・コメント機能**
   - 各スポットに対して「Wi-Fi速度」や「店内の雰囲気」などの口コミを自由に投稿・蓄積。

## 🛠️ 使用技術 (Tech Stack)

- **Frontend**: React (JSX)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (v4)
- **Map Library**: MapLibre GL

## 💻 起動方法

1. **パッケージのインストール**
   ```bash
   npm install
   ```
開発サーバーの起動
```bash
npm run dev
```
## 📖 アプリの使いかた
スポットの詳細を見る: 地図上のピンをクリックすると、画面下部から詳細パネルが出現します。
混雑状況を報告する: 詳細パネル内のボタンを押すことで、リアルタイムに混雑度を更新できます。
口コミを投稿する: 詳細パネルの最下部にあるフォームから、店内の感想を自由に書き込めます。
新しい場所を登録する: 地図上の開いている場所をクリックすると、新規追加フォームが出現し、新しい作業スペースをマップに登録できます。

