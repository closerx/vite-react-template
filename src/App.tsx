import { useRef, useState } from 'react';
import './App.css';

function App() {
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);

  const handleTranscriptionToggle = async () => {
    if (isTranscribing) {
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      socketRef.current?.close();
      setIsTranscribing(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = mediaRecorder;

        const socket = new WebSocket('wss://api.deepgram.com/v1/listen?model=nova-3', [
          'token',
          import.meta.env.VITE_DEEPGRAM_API_KEY
        ]);
        socketRef.current = socket;

        socket.onopen = () => {
          mediaRecorder.addEventListener('dataavailable', (event) => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(event.data);
            }
          });
          mediaRecorder.start(250);
        };

        socket.onmessage = (message) => {
          const received = JSON.parse(message.data);
          const result = received.channel.alternatives[0]?.transcript;
          if (result) {
            setTranscript((prev) => prev + ' ' + result);
          }
        };

        setIsTranscribing(true);
      } catch (err) {
        console.error('Failed to start transcription:', err);
      }
    }
  };

  return (
    <div className="app">
      <h1 className="header">Real-Time Transcription</h1>
  
      <button onClick={handleTranscriptionToggle} className="toggle-button">
        {isTranscribing ? 'Stop Transcription' : 'Start Transcription'}
      </button>
  
      <div className="transcript-box">
        {transcript || (isTranscribing ? 'Listening...' : 'Click the button to begin')}
      </div>
    </div>
  );  
}

export default App;
