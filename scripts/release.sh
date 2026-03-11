#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-}"

if [[ -z "$VERSION" ]]; then
  echo "使い方: npm run release <version>"
  echo "例:     npm run release 0.9.4"
  exit 1
fi

# 未コミットの変更があれば中断
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "エラー: 未コミットの変更があります。コミットまたはスタッシュしてから実行してください。"
  exit 1
fi

echo "🚀 v${VERSION} をリリースします..."

# 1. package.json のバージョンを更新（git タグは作らない）
npm version "${VERSION}" --no-git-tag-version

# 2. ビルド & テスト
npm run build
npm test

# 3. コミット & プッシュ
git add package.json package-lock.json
git commit -m "chore: バージョンを v${VERSION} に更新"
git push origin main

# 4. GitHub Release 作成
gh release create "v${VERSION}" --title "v${VERSION}" --generate-notes

echo "✅ v${VERSION} のリリース完了"
