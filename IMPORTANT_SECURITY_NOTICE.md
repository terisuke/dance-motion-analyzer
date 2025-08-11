# ⚠️ 重要なセキュリティ通知

**日時**: 2025年8月11日  
**影響**: Gemini APIキー

## 📌 状況

SECURITY.mdファイルに例示用として記載されていたAPIキー形式の文字列が、実際のAPIキーに見える可能性がありました。

### 対応済み事項

1. ✅ SECURITY.mdの例示用コードを修正
2. ✅ cloudbuild.yamlのAPIキー直接記載を環境変数に変更
3. ✅ 修正をGitHubにプッシュ済み

### 確認事項

- 例示用のダミーキー: `AIzaSyA34R8aibn7f8E3GoIrUR9vrC-Wnf06V_E`（無効）
- 本番で使用中のキー: 環境変数経由で管理

## 🔐 推奨アクション

1. **Google Cloud Console**でAPIキーを確認
   - https://console.cloud.google.com/apis/credentials
   - 不審な使用がないか確認

2. **必要に応じてAPIキーを再生成**
   ```bash
   # 新しいAPIキーを取得後
   gcloud secrets update gemini-api-key \
       --data-file=- \
       --project=aipartner-426616
   ```

3. **Cloud Buildで使用する場合**
   ```bash
   gcloud builds submit \
       --substitutions=_GEMINI_API_KEY=新しいAPIキー \
       --project=aipartner-426616
   ```

## ✅ 現在のセキュリティ状態

- APIキーは全て環境変数/Secret Manager経由で管理
- 直接コードに記載されているAPIキーはなし
- Cloud Runデプロイ時はSecret Managerを使用推奨

## 📝 今後の対策

1. APIキーは必ずSecret Managerで管理
2. コードレビュー時にAPIキーの直接記載をチェック
3. 定期的なAPIキーのローテーション

---

**重要**: 実際に使用しているAPIキーが露出した疑いがある場合は、直ちに無効化して新しいキーを生成してください。