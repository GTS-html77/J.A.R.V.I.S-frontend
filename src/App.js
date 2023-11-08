import React, { useState, useRef, useEffect } from 'react';
import ListenButton from './components/listen_button/listen_button';
import SubmitButton from './components/submit_button/submit_button';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.continuous = true; // Keep the recognition service going until it's stopped manually
recognition.interimResults = true; // Report interim results

function App() {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [error, setError] = useState(null);
  const finalTranscript = useRef('');
  const timer = useRef(null);

  recognition.onresult = (event) => {
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalTranscript.current += transcript;
      else interimTranscript += transcript;
    }

    setText(finalTranscript.current + interimTranscript);

    // Reset the timer every time a result is received
    clearTimeout(timer.current);
    timer.current = setTimeout(submit, 10000); // 10 seconds
  };

  recognition.onend = () => {
    setListening(false);
  };

  recognition.onerror = (event) => {
    // Handle the error event
    console.log('Speech recognition error:', event.error);
    setError(event.error);
  };

  const toggleListen = () => {
    if (listening) {
      recognition.stop();
      clearTimeout(timer.current);
    } else {
      finalTranscript.current = '';
      recognition.start();
    }

    setListening(!listening);
  };

  const submit = () => {
    // Here you would send the text to your backend
    console.log(text);
    finalTranscript.current = '';
    setText('');
  };

  useEffect(() => {
    return () => {
      // Clean up the timer when the component unmounts
      clearTimeout(timer.current);
    };
  }, []);

  return (
    <div>
      <form onSubmit={(e) => e.preventDefault()}>
        <input type="text" value={text} onChange={(e) => setText(e.target.value)} />
        <SubmitButton onClick={submit} />
      </form>
      <ListenButton onClick={toggleListen} listening={listening} />
      {error && <p>Error: {error}</p>}
    </div>
  );
}

export default App;
