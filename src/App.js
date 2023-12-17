import React, { useState, useEffect, useRef, useCallback } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import ListenButton from './components/listen_button/listen_button';
import SubmitButton from './components/submit_button/submit_button';
import ChatLog from './components/chat_log/chat_log';
import './App.css';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;

function App() {
  const [text, setText] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  const submitMessage = useCallback(async (submittedText) => {
    if (submittedText.trim()) {
      const userMessage = {
        text: submittedText,
        timestamp: new Date(),
        sender: "Sir"
      };
      setChatMessages(currentMessages => [...currentMessages, userMessage]);

      setIsLoading(true);
      try {
        const response = await fetch('http://localhost:3001/api/chat/message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: submittedText }),
          
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.json();
        console.log("Received data from backend:", data);
        const aiResponse = {
          text: data.reply,
          timestamp: new Date(),
          sender: "JARVIS"
        };
        setChatMessages(currentMessages => [...currentMessages, aiResponse]);
      } catch (error) {
        console.error('Error fetching response:', error);
        setError('Failed to fetch response');
      }
      setIsLoading(false);
    }
    setText('');
  }, []);


  useEffect(() => {
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      setText(transcript);

      clearTimeout(timer.current);
      timer.current = setTimeout(() => submitMessage(transcript), 5000);
    };

    recognition.onend = () => setListening(false);
    recognition.onerror = (event) => setError(event.error);

    return () => {
      recognition.stop();
      clearTimeout(timer.current);
    };
  }, [submitMessage]);


  const toggleListen = () => {
    if (listening) {
      recognition.stop();
    } else {
      recognition.start();
    }
    setListening(!listening);
  };

  return (
    <div className="main-container">
      <div className="left-column"> {/* Left column content */} </div>
      <div className="center-column"> {/* Center column content */} </div>
      <div className="right-column">
        <div className="listen-area">
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="form-row">
              <TextareaAutosize
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Start speaking..."
                minRows={1}
                style={{ width: '100%' }}
              />
              <ListenButton onClick={toggleListen} listening={listening} />
            </div>
            <SubmitButton onClick={() => submitMessage(text)} />
          </form>
          {error && <p>Error: {error}</p>}
        </div>
        <ChatLog messages={chatMessages} />
      </div>
      {isLoading && <p>Loading...</p>}
    </div>
  );
}

export default App;
