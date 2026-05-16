import React from 'react';
import './ConnectionStatus.css';

export default function ConnectionStatus({ isConnected, isReconnecting }) {
  const status = isConnected ? 'connected' : isReconnecting ? 'reconnecting' : 'offline';
  const label  = isConnected ? 'Sincronizado' : isReconnecting ? 'Reconectando...' : 'Offline';

  return (
    <div className={`conn-status conn-status--${status}`}>
      <div className="conn-status__dot" />
      <span className="conn-status__label">{label}</span>
    </div>
  );
}
