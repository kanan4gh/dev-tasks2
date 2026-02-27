# TaskCLI

ターミナルで完結する、開発者向け GTD タスク管理ツール。

## 特徴

- どのディレクトリからでも `task` コマンドで操作できるグローバルツール
- Inbox → プロジェクトへの GTD フロー対応
- タスクデータは `~/.task/` に保存（プロジェクト間で独立管理）

---

## インストール

### 前提条件

- Node.js v20 以上（開発環境: v24.11.0）
- npm

### 手順

```bash
# 1. リポジトリをクローン
git clone <このリポジトリのURL>
cd dev-tasks2

# 2. 依存パッケージをインストール
npm install

# 3. TypeScript をビルド
npm run build

# 4. グローバルにインストール
npm install -g .
```

インストール確認:

```bash
task --version
task --help
```

---

## アンインストール

```bash
npm uninstall -g dev-tasks2
```

タスクデータを完全に削除する場合:

```bash
rm -rf ~/.task
```

---

## 使い方

### クイックスタート

```bash
# 1. プロジェクトを作成してアクティブにする
task project create myapp
task project use myapp

# 2. タスクを追加する
task add "ログイン機能の実装"
task add "テストを書く" -d "ユニットテストとE2Eテストを追加"

# 3. タスク一覧を確認する
task list

# 4. 作業を開始する
task start 1

# 5. 完了にする
task done 1
```

---

### コマンド一覧

#### タスク操作

| コマンド | 説明 |
|---------|------|
| `task add <タイトル>` | タスクを作成する |
| `task list` | タスク一覧を表示する |
| `task list --all` | 全プロジェクト + Inbox のタスクを横断表示する |
| `task show <id>` | タスクの詳細を表示する |
| `task start <id>` | タスクを開始する（`in_progress` に変更） |
| `task done <id>` | タスクを完了にする（`completed` に変更） |
| `task archive <id>` | タスクをアーカイブする |
| `task delete <id>` | タスクを削除する（確認あり） |
| `task move <id> <プロジェクト名>` | タスクを別プロジェクトに移動する |
| `task move <id> inbox` | タスクを Inbox に戻す |

#### プロジェクト操作

| コマンド | 説明 |
|---------|------|
| `task project create <名前>` | プロジェクトを作成する |
| `task project list` | プロジェクト一覧を表示する（タスク数付き） |
| `task project use <名前>` | アクティブプロジェクトを切り替える |
| `task project remove <名前>` | プロジェクトをリストから削除する（データは保持） |
| `task inbox` | Inbox モードに切り替える |

---

### オプション

#### `task add`

```bash
task add <タイトル> [オプション]

オプション:
  -d, --description <テキスト>   タスクの説明を設定する
```

例:

```bash
task add "APIエンドポイントの設計" -d "RESTful API の仕様を決める"
```

#### `task list`

```bash
task list [オプション]

オプション:
  -s, --status <ステータス>   ステータスで絞り込む
                               (open|in_progress|completed|archived)
  --inbox                      Inbox のタスクを表示する
  --all                        全プロジェクト + Inbox を横断表示する
```

例:

```bash
task list                        # アクティブプロジェクトのタスクを表示
task list --status in_progress   # 作業中のタスクのみ表示
task list --inbox                # Inbox のタスクを表示
task list --all                  # 全プロジェクト + Inbox を横断表示
task list --all --status open    # 全プロジェクトの未着手タスクを表示
```

---

### ステータス遷移

```
open → in_progress → completed
 ↓                      ↓
archived            archived
```

- `open` / `completed` → `archived` に移行可能
- `in_progress` → `archived` は不可（先に `task done` で完了にする）
- 一度完了・アーカイブにしたタスクは再オープン不可

---

### Inbox とプロジェクト

起動直後はアクティブプロジェクトが未設定の **Inbox モード**です。
プロジェクトを作成・選択するまでは Inbox にタスクが蓄積されます。

```bash
# Inbox にタスクを追加（プロジェクト未設定の状態）
task add "あとで整理するメモ"

# プロジェクトを作成してタスクを移動
task project create myapp
task move 1 myapp

# プロジェクトに切り替え
task project use myapp
```

---

### データ保存先

```
~/.task/
├── config.json                    # グローバル設定（アクティブプロジェクト）
├── inbox/
│   └── tasks.json                 # Inbox のタスクデータ
└── projects/
    └── <プロジェクト名>/
        └── tasks.json             # プロジェクトのタスクデータ
```

---

## 開発者向け

```bash
npm run build          # TypeScript をビルド
npm run dev            # ウォッチモードでビルド
npm test               # テストを実行
npm run test:coverage  # カバレッジ付きテスト
npm run lint           # Lint チェック
npm run typecheck      # 型チェック
```
