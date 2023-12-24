import React from 'react';
import './listen_button.css' 

function ListenButton({ onClick, listening }) {
  return (
    <button className="listen-button" onClick={onClick}>
      {listening ? 'Stop' : 'Listen'}
    </button>
  );
}

export default ListenButton;

