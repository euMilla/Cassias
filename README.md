# Cassia's Doces

Versao estatica do site da Cassia's Doces para publicar na Vercel sem pastas, sem Node e sem MySQL.

## Arquivos para enviar ao Git

Envie estes arquivos da raiz:

- `index.html`
- `logo-cassias.png`
- `coxinhas.jpg`
- `salgados.jpg`
- `bolos.jpg`
- `docinhos.jpg`
- `vercel.json`
- `README.md`

O site salva uma copia do pedido no navegador e abre o WhatsApp com a mensagem pronta.

## Subir para o GitHub

```bash
git init
git add .
git commit -m "Site Cassia's Doces"
git branch -M main
git remote add origin URL_DO_SEU_REPOSITORIO
git push -u origin main
```

Depois, importe o repositorio na Vercel. Nao precisa configurar build, variaveis de ambiente ou banco.

## Trocar contatos

No `index.html`, procure por:

- `cassiasdoces`
- `5513999999999`

Troque pelo Instagram e WhatsApp reais.
