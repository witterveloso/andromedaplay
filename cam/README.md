# Andromeda Cam

PWA para celular — câmera de contribuição do sistema Andromeda Live.

## Arquitetura

```
cam/
├── docs/           ← GitHub Pages (cam.html, CSS, JS)
│   ├── index.html
│   ├── cam.css
│   ├── cam.js      ← lógica WebRTC + sinalização (não modificar)
│   ├── config.js   ← gerado pelo CI com GATEWAY_URL
│   ├── manifest.json
│   └── icon.svg
├── server.cjs      ← servidor Node.js (sinalização + relay)
├── package.json
└── .github/workflows/cam-pages.yml
```

## Publicação (GitHub Pages)

1. No repositório, vá em **Settings → Pages** e selecione **GitHub Actions** como origem.
2. Adicione a variável de repositório `GATEWAY_URL` com a origem HTTPS do gateway (ex.: `https://seu-gateway.exemplo.com`).
3. Execute o workflow **Publish Andromeda Cam** ou faça push em `main`.
4. O link gerado pelo GitHub Pages é o endereço que você envia para os celulares.

## Ativar conexão

1. Implante `server.cjs` no VPS/nuvem com `node server.cjs` (exige Node 18+).
2. No `.env` do servidor, configure:
   - `CAM_PAGE_URL` — URL completa do site publicado (incluindo barra final).
   - `TURN_SECRET` — segredo do servidor TURN para geração de credenciais temporárias.
3. Reinicie o serviço. O servidor passa a gerar convites apontando para a página e aceitar aquela origem via CORS.
4. No painel da mesa, clique em **Gerar convite** e compartilhe o link com o operador do celular.

## Teste local (sem mesa)

Abra a URL com `?teste=1` para ativar a câmera real sem precisar de convite nem gateway.

## Segurança

Nunca adicione `CLOUD_TOKEN`, `TURN_SECRET` ou outras credenciais ao repositório.  
O arquivo `cam/docs/config.js` não deve conter segredos — apenas a URL pública do gateway.
