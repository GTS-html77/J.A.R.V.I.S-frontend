import React from 'react';
import './chat_log.css'; 

const ChatLog = ({ messages }) => {
  // Function to format the timestamp
  const formatTimestamp = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-log-container">
      {messages.map((message, index) => (
        <div key={index} className="chat-message">
          <div className="message-header">
            <span className="sender-name">{message.sender}</span>
            <span className="message-time">{formatTimestamp(message.timestamp)}</span>
          </div>
          <div className="message-text">{message.text}</div>
        </div>
      ))}
    </div>
  );
};

export default ChatLog;
