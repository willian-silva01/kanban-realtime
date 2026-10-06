import React, { useEffect, useRef } from 'react';

/**
 * CursorsLayer — Engine de renderização de Cursores de Forma Direta e Nativa.
 * 
 * MOTIVAÇÃO: O React `useState` provoca re-reconciliação do Virtual DOM.
 * Despachar estados de mouse (> 30 updates por segundo, por usuário na sala)
 * destrói a main thread. Para resolver isso "Production-Level", abandonamos o estado 
 * do React para essa funcionalidade e manipulamos os Nodes do DOM diretamente 
 * via `useRef`, injetando mudanças exclusivas na GPU via propriedade `transform`.
 */
export default function CursorsLayer({ socket }) {
    const containerRef = useRef(null);
    const activeCursors = useRef({}); // Dicionário Ref que indexa Nodes HMTL para acesso veloz: { [userId]: HTMLDivElement }

    useEffect(() => {
        if (!socket || !containerRef.current) return;

        // Hash leve para gerar cor única persistente por usuário
        const stringToColor = (str) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
            return `hsl(${hash % 360}, 80%, 65%)`;
        };

        const onCursorMove = (data) => {
            const userId = data.userId;
            let cursorNode = activeCursors.current[userId];

            // 1. Instanciação Nativa Inicial (apenas na 1ª aparição do usuário)
            if (!cursorNode) {
                cursorNode = document.createElement('div');
                cursorNode.style.position = 'absolute';
                cursorNode.style.zIndex = '9999';
                cursorNode.style.pointerEvents = 'none';
                cursorNode.style.transition = 'transform 50ms linear';
                
                // Força o navegador colocar a transição exclusivamente direto na GPU (Hardware Acceleration)
                cursorNode.style.willChange = 'transform'; 

                const color = stringToColor(userId);
                
                // SVG Minimalista Premium injetado sem React Parser
                cursorNode.innerHTML = `
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1.5">
                       <path d="M5.65376 21.2592L23 11L1 1L9 23L5.65376 21.2592Z"/>
                    </svg>
                    <div style="
                       background: ${color}; color: white; padding: 4px 8px; border-radius: 16px;
                       font-size: 0.7rem; font-weight: bold; position: absolute; top: 20px; left: 16px;
                       white-space: nowrap; box-shadow: 0 4px 6px rgba(0,0,0,0.3); border: 2px solid white;
                       pointer-events: none; user-select: none;
                    ">${data.name}</div>
                `;
                
                containerRef.current.appendChild(cursorNode);
                activeCursors.current[userId] = cursorNode;
            }

            // 2. Translação Passiva (Não engatilha Layout Repaints, apenas Composite Render na placa de vídeo)
            cursorNode.style.transform = `translate(${data.x}px, ${data.y}px)`;
        };

        const onCursorRemove = ({ userId }) => {
            const cursorNode = activeCursors.current[userId];
            if (cursorNode) {
                if (containerRef.current.contains(cursorNode)) {
                    containerRef.current.removeChild(cursorNode);
                }
                delete activeCursors.current[userId];
            }
        };

        socket.on('cursor:move', onCursorMove);
        socket.on('cursor:remove', onCursorRemove);

        // Cleanup: remove os listeners e expurga nós orfãos do DOM da tela no unmount.
        return () => {
            socket.off('cursor:move', onCursorMove);
            socket.off('cursor:remove', onCursorRemove);
            Object.values(activeCursors.current).forEach(node => node.remove());
            activeCursors.current = {};
        };
    }, [socket]);

    return (
        <div 
            ref={containerRef} 
            className="cursors-native-layer" 
            style={{ 
                position: 'fixed', // Fixed é absoluto ao Viewport
                top: 0, left: 0, 
                pointerEvents: 'none', 
                width: '100%', height: '100%', 
                zIndex: 9999, 
                overflow: 'hidden' 
            }} 
        />
    );
}
