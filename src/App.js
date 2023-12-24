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
  const ws = useRef(null);
  const audioQueue = useRef([]); // Queue for audio blobs
  const isAudioPlaying = useRef(false); // Ref to track if audio is currently playing

  const formatText = (text) => {
    return text.replace(/\n/g, '<br>');
  };


  const resetRecognition = () => {
    if (recognition) {
      recognition.onend = () => {
        recognition.start(); // Start a new session only after the current one has ended
      };
      recognition.stop(); // Stop the current session
    }
  };

  const playNextAudio = useCallback(() => {
    if (audioQueue.current.length > 0 && !isAudioPlaying.current) {
      const nextAudioBlob = audioQueue.current.shift(); // Get the next audio blob from the queue
      console.log(`Playing audio. Queue length: ${audioQueue.current.length}`);
      const audioUrl = URL.createObjectURL(nextAudioBlob);
      const audio = new Audio(audioUrl);
      isAudioPlaying.current = true;
      audio.play();
      audio.onended = () => {
        console.log('Audio ended.');
        isAudioPlaying.current = false;
        playNextAudio(); // Play next audio when current one ends
      };
    }
  }, []);

  const sendElevenLabsSentence = useCallback(async (fullSentence) => {
    console.log(`Sending sentence to ElevenLabs: ${fullSentence}`);
    const startTime = performance.now();
    const voiceId = 'JVIMwpj84Lu2xX9j2NRf';
    const modelId = 'eleven_turbo_v2';
    const apiKey = '7572df870f36d7a01477c217973ea736';

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        voice_settings: { similarity_boost: 0.9, stability: 0.3 },
        model_id: modelId,
        text: fullSentence,
      })
    };

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, options);
      const endTime = performance.now();
      console.log(`Received response from ElevenLabs in ${(endTime - startTime).toFixed(2)} ms`);

      const audioStream = await response.blob();
      audioQueue.current.push(audioStream);
      console.log(`Queued audio. Current queue length: ${audioQueue.current.length}`);
      playNextAudio(); // Attempt to play audio
    } catch (err) {
      console.error(`Error in sending sentence to ElevenLabs: ${err}`);
    }
  }, [playNextAudio]);

  useEffect(() => {
    let accumulatedResponse = ''; // Local variable for accumulating responses

    ws.current = new WebSocket('ws://localhost:3001');

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.reply) {
        const sanitizedReply = DOMPurify.sanitize(data.reply);
        accumulatedResponse += sanitizedReply;

        if (/[.!?]/.test(accumulatedResponse.slice(-1))) {
          sendElevenLabsSentence(accumulatedResponse);
          console.log('Sentence sent:', accumulatedResponse);
          accumulatedResponse = ''; // Reset the local accumulated response
        }

        setChatMessages(currentMessages => {
          // If the last message is from JARVIS, append the new content
          if (currentMessages.length && currentMessages[currentMessages.length - 1].sender === "JARVIS") {
            let lastMessage = { ...currentMessages[currentMessages.length - 1] };
            lastMessage.text += sanitizedReply; // Append without a line break
            return [...currentMessages.slice(0, -1), lastMessage];
          } else {
            // Otherwise, add a new message
            return [...currentMessages, {
              text: sanitizedReply,
              timestamp: new Date(),
              sender: "JARVIS"
            }];
          }
        });
      }
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [sendElevenLabsSentence]);


  const submitMessage = useCallback(async (submittedText) => {
    if (submittedText.trim() && ws.current) {
      const formattedText = formatText(submittedText);
      const userMessage = {
        text: formattedText,
        timestamp: new Date(),
        sender: "Sir"
      };
      setChatMessages(currentMessages => [...currentMessages, userMessage]);
      setText('');

      // Send the message through WebSocket
      ws.current.send(submittedText);
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
      if (!listening) {
        return; // Ignore results if not listening
      }

      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      setText(transcript);

      if (listening) {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          submitMessage(transcript);
          resetRecognition(); // Reset the recognition to clear the transcript
        }, 2000); // Submit message after 2 seconds of silence
      }
    };

    recognition.onend = () => {
      setListening(false);
      clearTimeout(timer.current);
      console.log('Recognition ended');
    };



    recognition.onerror = (event) => {
      setError(event.error);
    };


  }, [submitMessage, listening, setText]);

  recognition.onerror = (event) => {
    if (event.error === "no-speech") {
      // Ignore the "no-speech" error, don't do anything
      console.log("No speech detected, ignoring the error."); // Optional: log for debugging
    } else {
      setError(event.error); // Handle other errors as usual
    }
  };


  const toggleListen = () => {
    console.log('toggleListen - before:', listening);
    if (listening) {
      // Stop recognition and wait for it to end before allowing it to start again
      recognition.stop();
      console.log('toggleListen - stopping');
      setListening(false);
    } else {
      // Start recognition only if it's not already in progress
      if (!recognition || recognition.state !== 'active') {
        recognition.start();
        setText(''); // Clear the text when starting new listening
        setListening(true);
        console.log('toggleListen - started');
      }
    }
  };




  const handleManualSubmit = () => {
    clearTimeout(timer.current); // Clear the timeout
    submitMessage(text);
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
            <SubmitButton onClick={handleManualSubmit} disabled={listening} />
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

    </div>
  );
}

export default App;
