# RaveWatch - Watch Party TODO

## Backend
- [x] Schema: tabela `rooms` (código, videoUrl, videoState, createdAt)
- [x] Schema: tabela `messages` (roomCode, username, text, createdAt)
- [x] Migração SQL aplicada no banco
- [x] tRPC: criar sala (gera código único 6 chars)
- [x] tRPC: buscar sala por código
- [x] tRPC: atualizar videoUrl da sala
- [x] tRPC: listar mensagens da sala
- [x] tRPC: enviar mensagem
- [x] WebSocket (socket.io): servidor configurado em server/_core/index.ts
- [x] WebSocket: evento join-room (participante entra na sala)
- [x] WebSocket: evento leave-room (participante sai da sala)
- [x] WebSocket: evento video-sync (play/pause/seek sincronizado)
- [x] WebSocket: evento chat-message (mensagem em tempo real)
- [x] WebSocket: evento participants-update (contagem de participantes)
- [x] WebSocket: evento video-url-change (troca de vídeo)

## Frontend
- [x] Tema global rave: fundo escuro, neon roxo/rosa/ciano, tipografia impactante, efeitos glow
- [x] Fontes Google: Orbitron (títulos) + Inter (corpo)
- [x] Tela inicial (Home): logo animado, botão "Criar Sala", botão "Entrar na Sala"
- [x] Modal/form "Criar Sala": gera código e redireciona para sala
- [x] Modal/form "Entrar na Sala": campo de código + nome de usuário
- [x] Página da Sala (/room/:code)
- [x] Exibição do código da sala com botão de copiar
- [x] Campo para colar link de vídeo (YouTube, Drive, URL direta)
- [x] Player YouTube (iframe API) com controles sincronizados
- [x] Player de vídeo direto (tag <video>) com controles sincronizados
- [x] Player Google Drive (iframe embed) com controles básicos
- [x] Chat em tempo real (sem delay, histórico visível)
- [x] Indicador de participantes conectados
- [x] Botão "Sair da Sala" que retorna ao menu
- [x] Efeitos visuais: partículas/glow animados no fundo

## Testes
- [x] Teste vitest: criar sala retorna código válido
- [x] Teste vitest: buscar sala existente
- [x] Teste vitest: enviar e listar mensagens


## Reações com Emojis Flutuantes (Nova Feature)
- [x] WebSocket: evento reaction (enviar reação com emoji e posição)
- [x] WebSocket: evento reaction-broadcast (receber reação de outro usuário)
- [x] Componente ReactionPicker com emojis pré-definidos (❤️ 😂 🔥 👏 🎉 😍)
- [x] Componente FloatingReaction com animação de subida e fade-out
- [x] Integrar reações na Room com botão de reação no player
- [x] Teste vitest: enviar reação sincroniza para todos


## Fullscreen Player (Nova Feature)
- [x] Estado de fullscreen no Room.tsx
- [x] Botão fullscreen no player
- [x] Layout fullscreen: player ocupa tela inteira, chat escondido
- [x] Botão flutuante para abrir/fechar chat em fullscreen
- [x] Botão flutuante para ver reações em fullscreen
- [x] Transição suave entre modo normal e fullscreen
- [x] Escape key para sair do fullscreen


## Typing Indicator & App Name (Nova Feature)
- [x] Mudar nome do app para "Mitz Watch"
- [x] WebSocket: evento typing (enviar quando usuário está digitando)
- [x] WebSocket: evento typing-broadcast (receber indicador de digitação)
- [x] Componente TypingIndicator com animação de pontos
- [x] Mostrar "X está digitando..." no chat
- [x] Parar de enviar typing quando usuário para de digitar (timeout)


## Bugs Encontrados
- [x] Google Drive: vídeos não sincronizam entre usuários (adicionado aviso sobre limitações)
- [x] Reações: não aparecem em tempo real para outros usuários (coordenadas normalizadas ao player)


## Sistema de Liderança (Nova Feature)
- [x] Schema: adicionar campo `leaderName` na tabela `rooms`
- [x] Migração SQL para adicionar `leaderName`
- [x] tRPC: rota para transferir liderança
- [x] WebSocket: evento transfer-leadership
- [x] UI: mostrar quem é o líder no header com emoji 👑
- [x] UI: botão para transferir liderança (prompt com nome)
- [x] Desabilitar controles de vídeo para não-líderes
- [x] Indicador visual "Digitando..." no chat com nome do usuário
