# 🔒 セキュリティガイドライン

## ⚠️ 重要: APIキーの管理

### ❌ 絶対にやってはいけないこと

1. **APIキーをコードに直接記述**
```javascript
// ❌ 絶対ダメ
const API_KEY = "YOUR_ACTUAL_API_KEY_HERE";
```

2. **デフォルト値としてAPIキーを設定**
```yaml
# ❌ docker-compose.yml
- VITE_GEMINI_API_KEY=${VITE_GEMINI_API_KEY:-YOUR_KEY_HERE}  # ダメ！
```

3. **.envファイルをGitにコミット**
```bash
# ❌ これは事故の元
git add .env
git commit -m "環境変数を追加"
```

### ✅ 正しいAPIキー管理

1. **環境変数ファイルの作成**
```bash
# .env.template をコピー
cp .env.template .env

# .env ファイルを編集
nano .env  # または好きなエディタで
```

2. **.gitignoreの確認**
```bash
# .env が無視されているか確認
grep "\.env" .gitignore
```

3. **APIキーの再生成（漏洩時）**
```
1. Google Cloud Console にアクセス
2. 古いAPIキーを無効化
3. 新しいAPIキーを生成
4. .env ファイルを更新
5. Docker イメージを再ビルド
```

## 📋 セキュリティチェックリスト

### 開発時
- [ ] `.env` ファイルが `.gitignore` に含まれている
- [ ] APIキーがコードに直接書かれていない
- [ ] デフォルト値にAPIキーが含まれていない
- [ ] コミット前に `git status` で確認

### デプロイ時
- [ ] 本番用の新しいAPIキーを生成
- [ ] SECRET_KEY を強力なランダム文字列に変更
- [ ] データベースパスワードを変更
- [ ] HTTPS を有効化
- [ ] CORS設定を本番環境に合わせて調整

## 🚨 漏洩時の対応

### APIキーが漏洩した場合

1. **即座に無効化**
   - Google Cloud Console で該当のAPIキーを無効化

2. **新しいキーの生成**
   - 新しいAPIキーを生成
   - .env ファイルを更新

3. **影響範囲の確認**
   - アクセスログを確認
   - 不正使用の有無を確認

4. **再発防止**
   - チーム内で共有
   - レビュープロセスの強化

## 🔐 環境別の設定

### 開発環境
```env
# .env.development
VITE_GEMINI_API_KEY=dev_key_here
VITE_API_URL=http://localhost:8000
```

### 本番環境
```env
# .env.production (サーバー上で直接設定)
GEMINI_API_KEY=prod_key_here
DATABASE_URL=postgresql://prod_user:strong_password@prod_db:5432/dance_analyzer
SECRET_KEY=<強力なランダム文字列>
```

## 📚 参考資料

- [Google Cloud API Keys Best Practices](https://cloud.google.com/docs/authentication/api-keys)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)

## 🆘 サポート

セキュリティに関する質問や懸念事項がある場合は、すぐにチームリーダーに報告してください。

---

**最終更新**: 2025年8月11日
**重要度**: 🔴 最高
EOF < /dev/null