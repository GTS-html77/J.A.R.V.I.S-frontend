import React, { useState, useEffect, useRef, useCallback } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import ListenButton from './components/listen_button/listen_button';
import SubmitButton from './components/submit_button/submit_button';
import ChatLog from './components/chat_log/chat_log';
import DOMPurify from 'dompurify';
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

  const formatText = (text) => {
    return text.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;');
  };

  const submitMessage = useCallback(async (submittedText) => {
    if (submittedText.trim()) {
      const formattedText = formatText(submittedText);
      const userMessage = {
        text: formattedText, // Use formatted text
        timestamp: new Date(),
        sender: "Sir"
      };
      setChatMessages(currentMessages => [...currentMessages, userMessage]);
      setText('');

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

        const sanitizedReply = DOMPurify.sanitize(data.reply);
        const aiResponse = {
          text: sanitizedReply,
          timestamp: new Date(),
          sender: "JARVIS"
        };
        setChatMessages(currentMessages => [...currentMessages, aiResponse]);
      } catch (error) {
        console.error('Error fetching response:', error);
        const sanitizedErrorMessage = DOMPurify.sanitize('Failed to fetch response. Please try again later.');
        const errorMessage = {
          text: sanitizedErrorMessage,
          timestamp: new Date(),
          sender: "JARVIS"
        };
        setChatMessages(currentMessages => [...currentMessages, errorMessage]);
      }
      setIsLoading(false);
    }
  }, []);


  useEffect(() => {
    const updateScrollableItemHeight = () => {
      const listenAreaHeight = document.querySelector('.listen-area').offsetHeight;
      const scrollableItem = document.querySelector('.chat-messages-area');
      const scrollbarBuffer = 20; // Buffer for scrollbar
      const availableHeight = window.innerHeight - listenAreaHeight - scrollbarBuffer;
      scrollableItem.style.maxHeight = `${availableHeight}px`;
    };

    window.addEventListener('resize', updateScrollableItemHeight);
    updateScrollableItemHeight(); // Initial call to set height

    return () => {
      window.removeEventListener('resize', updateScrollableItemHeight);
    };
  }, []);


  useEffect(() => {
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(result => result[0].transcript)
      .join('');
    setText(transcript);

    if (listening) {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (listening) {
          recognition.stop(); // Stop listening after 5 seconds of silence
          submitMessage(transcript); // Submit the message
          setText(''); // Clear the text area
        }
      }, 5000);
    }
  };

  recognition.onend = () => {
    setListening(false);
    clearTimeout(timer.current);
  };

  recognition.onerror = (event) => setError(event.error);

  return () => {
    recognition.stop();
    clearTimeout(timer.current);
  };
}, [submitMessage, listening]);

const toggleListen = () => {
  if (listening) {
    recognition.stop();
    clearTimeout(timer.current); // Clear the timeout when manually stopping
  } else {
    recognition.start();
    setListening(true);
  }
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
                maxRows={10}
                style={{ width: '100%' }}
              />
              <ListenButton onClick={toggleListen} listening={listening} />
            </div>
            <SubmitButton onClick={() => {
              clearTimeout(timer.current); // Clear the timeout
              submitMessage(text);
            }} />
          </form>
          {error && <p>Error: {error}</p>}
        </div>
        <div className="chat-messages-area">
          <ChatLog messages={chatMessages.map(msg => ({
            ...msg,
            text: <div dangerouslySetInnerHTML={{ __html: msg.text }} />
          }))} />
        </div>
      </div>
      {isLoading && <p>Loading...</p>}
    </div>
  );
}

export default App;
