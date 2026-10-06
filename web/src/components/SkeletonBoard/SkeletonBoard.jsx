import React from 'react';
import './SkeletonBoard.css';

function SkeletonCard({ lines = 2 }) {
  return (
    <div className="sk-card">
      <div className="sk-line sk-line--title" />
      {lines >= 2 && <div className="sk-line sk-line--desc" />}
      {lines >= 3 && <div className="sk-line sk-line--desc sk-line--short" />}
    </div>
  );
}

function SkeletonColumn({ cardCount = 3 }) {
  return (
    <div className="sk-column">
      <div className="sk-column-header">
        <div className="sk-line sk-line--header" />
        <div className="sk-line sk-line--badge" />
      </div>
      <div className="sk-column-content">
        {Array.from({ length: cardCount }, (_, i) => (
          <SkeletonCard key={i} lines={i === 0 ? 3 : 2} />
        ))}
      </div>
    </div>
  );
}

export default function SkeletonBoard({ columns = 3 }) {
  return (
    <div className="sk-board">
      {Array.from({ length: columns }, (_, i) => (
        <SkeletonColumn key={i} cardCount={i === 1 ? 4 : 3} />
      ))}
    </div>
  );
}
