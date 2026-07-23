# HomerunChallenge LP

3店舗のホームラン累計、目標、達成率、残り本数を表示する静的サイトです。表示データは `data/latest.json` から読み込みます。

## ローカル確認

`site` フォルダで次を実行し、表示されたURLをブラウザで開きます。

```powershell
python -m http.server 8765
```

公開フォルダには静的表示に必要なファイルだけを置き、元CSV、ログ、認証情報、個人情報は保存しません。
