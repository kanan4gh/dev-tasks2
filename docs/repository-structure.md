# リポジトリ構造定義書 (Repository Structure Document)

## プロジェクト構造

```
dev-tasks2/
├── src/                          # ソースコード
│   ├── cli/                      # CLIレイヤー（ユーザー入力・表示）
│   │   ├── index.ts              # エントリーポイント・Commander.js セットアップ
│   │   ├── commands/             # サブコマンド定義
│   │   │   ├── add.ts
│   │   │   ├── list.ts
│   │   │   ├── show.ts
│   │   │   ├── start.ts
│   │   │   ├── done.ts
│   │   │   ├── delete.ts
│   │   │   ├── archive.ts
│   │   │   ├── search.ts
│   │   │   ├── sync.ts
│   │   │   ├── import.ts
│   │   │   └── config.ts
│   │   └── Renderer.ts           # ターミナル表示（テーブル・カラー）
│   ├── services/                 # サービスレイヤー（ビジネスロジック）
│   │   ├── TaskManager.ts        # タスク CRUD・ステータス管理
│   │   ├── GitService.ts         # ブランチ操作・コミットフック
│   │   ├── GitHubService.ts      # GitHub Issues 同期・PR 作成
│   │   └── ConfigService.ts      # 設定の読み書き・バリデーション
│   ├── storage/                  # ストレージレイヤー（データ永続化）
│   │   ├── FileStorage.ts        # tasks.json の読み書き・バックアップ
│   │   └── ConfigStorage.ts      # config.json の読み書き
│   ├── types/                    # 型定義
│   │   └── index.ts              # Task / Config / AppError 等
│   └── utils/                    # 汎用ユーティリティ
│       └── slug.ts               # ブランチ名スラッグ変換
├── tests/                        # テストコード
│   ├── unit/                     # ユニットテスト
│   │   ├── services/
│   │   │   ├── TaskManager.test.ts
│   │   │   ├── GitService.test.ts
│   │   │   └── ConfigService.test.ts
│   │   ├── storage/
│   │   │   └── FileStorage.test.ts
│   │   ├── cli/
│   │   │   └── Renderer.test.ts
│   │   └── utils/
│   │       └── slug.test.ts
│   └── integration/              # 統合テスト
│       └── task-workflow.test.ts # add → start → done のフロー
├── docs/                         # プロジェクトドキュメント
│   ├── ideas/                    # 壁打ち・アイデアメモ
│   │   └── initial-requirements.md
│   ├── product-requirements.md   # プロダクト要求定義書
│   ├── functional-design.md      # 機能設計書
│   ├── architecture.md           # アーキテクチャ設計書
│   ├── repository-structure.md   # 本ドキュメント
│   ├── development-guidelines.md # 開発ガイドライン
│   └── glossary.md               # 用語集
├── .claude/                      # Claude Code 設定
│   ├── skills/                   # スキル定義
│   └── MEMORY.md                 # Claude の作業メモリ
├── .steering/                    # 作業単位のドキュメント
│   └── [YYYYMMDD]-[task-name]/
│       ├── requirements.md
│       ├── design.md
│       └── tasklist.md
├── .devcontainer/                # Dev Container 設定
│   └── devcontainer.json
├── .husky/                       # Git フック（husky 管理）
│   └── pre-commit
├── dist/                         # ビルド成果物（Git 管理外）
├── coverage/                     # テストカバレッジレポート（Git 管理外）
├── package.json
├── package-lock.json
├── tsconfig.json
├── eslint.config.js
├── .prettierrc
├── vitest.config.ts
├── CLAUDE.md                     # Claude Code プロジェクト指示
└── README.md
```

---

## ディレクトリ詳細

### `src/cli/`（CLIレイヤー）

**役割**: ユーザー入力の受付・引数バリデーション・結果の整形表示。ビジネスロジックを持たない。

**配置ファイル**:
- `index.ts`: Commander.js のルートプログラム定義。全サブコマンドを登録してパース・起動する
- `commands/*.ts`: サブコマンドごとの Commander.js 定義。引数バリデーションとサービス呼び出しのみ実装する
- `Renderer.ts`: ターミナルへの表示ロジック（テーブル・カラー・エラーフォーマット）

**命名規則**:
- コマンドファイル: `camelCase`（コマンド名と一致）例: `add.ts`, `list.ts`, `done.ts`
- クラスファイル: `PascalCase` 例: `Renderer.ts`

**依存関係**:
- 依存可能: `src/services/`, `src/types/`
- 依存禁止: `src/storage/`（ストレージへの直接アクセス禁止）

---

### `src/services/`（サービスレイヤー）

**役割**: ビジネスロジックの実装。タスク管理・Git 操作・GitHub 連携・設定管理を担う。

**配置ファイル**:
- `TaskManager.ts`: タスクの CRUD・ステータス管理・検索・ID 採番
- `GitService.ts`: ブランチ作成/チェックアウト・コミットフックのインストール・プッシュ
- `GitHubService.ts`: GitHub Issues の同期/インポート・PR 作成
- `ConfigService.ts`: 設定値の読み書き・各キーのバリデーション

**命名規則**:
- クラスファイル: `PascalCase` + 役割接尾辞（`Manager` / `Service`）

**依存関係**:
- 依存可能: `src/storage/`, `src/types/`, `src/utils/`, 外部ライブラリ（`simple-git`, `fetch`）
- 依存禁止: `src/cli/`（CLIレイヤーへの依存禁止）

---

### `src/storage/`（ストレージレイヤー）

**役割**: ファイルシステムへのデータ読み書き。バックアップ・リストアを含む。

**配置ファイル**:
- `FileStorage.ts`: `.task/tasks.json` の読み書き・書き込み前バックアップ（`.bak`）・ディレクトリ自動作成
- `ConfigStorage.ts`: `.task/config.json` の読み書き・パーミッション `600` の設定

**命名規則**:
- クラスファイル: `PascalCase` + `Storage` 接尾辞

**依存関係**:
- 依存可能: `src/types/`, Node.js 標準モジュール（`fs`, `path`）
- 依存禁止: `src/cli/`, `src/services/`

---

### `src/types/`（型定義）

**役割**: プロジェクト全体で共有する型・インターフェース・エラークラスを一元管理。

**配置ファイル**:
- `index.ts`: `Task`, `TaskStatus`, `TaskPriority`, `Config`, `AppError`, `TaskFilter`, `CreateTaskInput`, `SyncResult` 等を export

**命名規則**:
- 型エクスポートは全て `index.ts` に集約（個別ファイルに分散させない）

**依存関係**:
- 依存可能: なし（他のどのレイヤーにも依存しない）
- 依存禁止: 全レイヤー（循環依存防止）

---

### `src/utils/`（汎用ユーティリティ）

**役割**: 複数のコンポーネントで使われる純粋関数を配置。ビジネスロジックを持たない。

**配置ファイル**:
- `slug.ts`: タイトル文字列をブランチ名スラッグに変換する関数（`formatBranchName`）

**命名規則**:
- ファイル名: `camelCase`（動詞または用途を表す名詞）
- 関数名: `camelCase`

**依存関係**:
- 依存可能: `src/types/`
- 依存禁止: `src/cli/`, `src/services/`, `src/storage/`

---

### `tests/`（テストディレクトリ）

**役割**: ユニットテスト・統合テストを `src/` と分離して管理。

#### `tests/unit/`

`src/` と同一のディレクトリ構造でテストファイルを配置する。

```
tests/unit/
├── services/
│   ├── TaskManager.test.ts     # CRUD・ステータス遷移・searchTasks
│   ├── GitService.test.ts      # formatBranchName のスラッグ変換
│   └── ConfigService.test.ts   # バリデーションロジック
├── storage/
│   └── FileStorage.test.ts     # バックアップ・リストアのロジック
├── cli/
│   └── Renderer.test.ts        # テーブル表示・長文トリミング・カラー
└── utils/
    └── slug.test.ts             # 変換ロジックの境界値テスト
```

#### `tests/integration/`

機能単位のフローテストを配置する。実ファイルシステム（`os.tmpdir()`）を使用。

```
tests/integration/
└── task-workflow.test.ts       # add → start → done の一連フロー
```

**命名規則**:
- ユニットテスト: `[テスト対象クラス名].test.ts`
- 統合テスト: `[機能フロー名].test.ts`（kebab-case）

---

### `docs/`（ドキュメントディレクトリ）

| ファイル | 内容 |
|---------|------|
| `ideas/initial-requirements.md` | 壁打ち・アイデアメモ（変更しない） |
| `product-requirements.md` | プロダクト要求定義書（PRD） |
| `functional-design.md` | 機能設計書 |
| `architecture.md` | アーキテクチャ設計書 |
| `repository-structure.md` | 本ドキュメント |
| `development-guidelines.md` | 開発ガイドライン |
| `glossary.md` | 用語集 |

---

### `.steering/`（作業単位のドキュメント）

**役割**: 特定の開発作業における「今回何をするか」を記録。作業ごとに新規作成し、履歴として保持。

**構造**:
```
.steering/
└── [YYYYMMDD]-[task-name]/     # 例: 20260301-add-task-crud
    ├── requirements.md          # 今回の作業の要求内容
    ├── design.md                # 実装アプローチ
    └── tasklist.md              # タスクリストと進捗
```

**命名規則**: `YYYYMMDD-kebab-case` 形式（例: `20260301-add-task-crud`）

---

## ファイル配置規則

### ソースファイル

| ファイル種別 | 配置先 | 命名規則 | 例 |
|------------|--------|---------|-----|
| コマンド定義 | `src/cli/commands/` | `camelCase.ts` | `add.ts`, `done.ts` |
| 表示クラス | `src/cli/` | `PascalCase.ts` | `Renderer.ts` |
| サービスクラス | `src/services/` | `PascalCase + Manager/Service.ts` | `TaskManager.ts` |
| ストレージクラス | `src/storage/` | `PascalCase + Storage.ts` | `FileStorage.ts` |
| 型定義 | `src/types/index.ts` | — | — |
| ユーティリティ関数 | `src/utils/` | `camelCase.ts` | `slug.ts` |

### テストファイル

| テスト種別 | 配置先 | 命名規則 | 例 |
|-----------|--------|---------|-----|
| ユニットテスト | `tests/unit/<レイヤー>/` | `[対象].test.ts` | `TaskManager.test.ts` |
| 統合テスト | `tests/integration/` | `[フロー名].test.ts` | `task-workflow.test.ts` |

### 設定ファイル（プロジェクトルート）

| ファイル | 用途 |
|---------|------|
| `tsconfig.json` | TypeScript コンパイラ設定 |
| `eslint.config.js` | ESLint ルール定義 |
| `.prettierrc` | Prettier フォーマット設定 |
| `vitest.config.ts` | Vitest テスト設定 |
| `package.json` | 依存関係・npm スクリプト |
| `CLAUDE.md` | Claude Code のプロジェクト指示 |

---

## 命名規則

### ディレクトリ名

| 種別 | 規則 | 例 |
|-----|------|-----|
| レイヤーディレクトリ | 複数形・kebab-case | `services/`, `storage/`, `commands/` |
| 機能ディレクトリ | 複数形・kebab-case | `utils/`, `types/` |
| 作業ディレクトリ | `YYYYMMDD-kebab-case` | `20260301-add-task-crud/` |

### ファイル名

| 種別 | 規則 | 例 |
|-----|------|-----|
| クラスファイル | PascalCase + 役割接尾辞 | `TaskManager.ts`, `FileStorage.ts` |
| コマンドファイル | camelCase | `add.ts`, `done.ts` |
| ユーティリティ関数ファイル | camelCase | `slug.ts` |
| テストファイル | `[対象].test.ts` | `TaskManager.test.ts` |
| 型定義集約ファイル | `index.ts` | `src/types/index.ts` |

---

## 依存関係のルール

### レイヤー間の依存（一方向のみ許可）

```
src/cli/          ──→  src/services/  ──→  src/storage/
     │                      │                    │
     └──→ src/types/  ←─────┘  ←─────────────────┘
          src/utils/  ←─────────────────────────────
```

**許可される依存**:
- `cli/` → `services/`, `types/`
- `services/` → `storage/`, `types/`, `utils/`
- `storage/` → `types/`
- `utils/` → `types/`

**禁止される依存**:
- `storage/` → `services/` / `cli/` ❌
- `services/` → `cli/` ❌
- `types/` → 全レイヤー ❌（型定義は依存しない）
- 同レイヤー内の循環依存 ❌

### 循環依存の防止

同レイヤー内でサービス間に循環が発生する場合は、共通インターフェースを `src/types/index.ts` に抽出して解決する。

```typescript
// ❌ 悪い例: 循環依存
// services/GitService.ts
import { TaskManager } from './TaskManager';

// services/TaskManager.ts
import { GitService } from './GitService';  // 循環！

// ✅ 良い例: インターフェースを types/ に抽出
// types/index.ts
export interface ITaskManager { getTask(id: number): Task; }

// services/GitService.ts
import type { ITaskManager } from '../types';
```

---

## スケーリング戦略

### 機能追加時の配置方針

| 規模 | 方針 | 例 |
|-----|------|-----|
| 小規模（コマンド追加） | 既存ディレクトリに 1 ファイル追加 | `src/cli/commands/reopen.ts` |
| 中規模（新サービス） | 既存レイヤーにファイル追加 | `src/services/GitLabService.ts` |
| 大規模（チーム機能等） | レイヤー内にサブディレクトリを作成 | `src/services/team/TeamService.ts` |

### ファイルサイズの目安

- 300 行以下: 推奨範囲
- 300〜500 行: リファクタリングを検討
- 500 行以上: 責務に応じてファイルを分割する

---

## 除外設定

### `.gitignore`

```
node_modules/
dist/
coverage/
.task/
*.log
.DS_Store
```

> `.task/` は GitHub Token 等の機密情報を含む可能性があるため Git 管理外とする。初回 `task add` 実行時に `.gitignore` への追記を案内する。

### `.prettierignore` / `eslint.config.js`（除外対象）

```
dist/
node_modules/
coverage/
.steering/
```
