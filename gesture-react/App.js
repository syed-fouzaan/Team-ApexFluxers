import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import WebcamFeed from './WebcamFeed'; // Import the WebcamFeed component
// import CaseSelector from './CaseSelector'; // We'll use inline buttons for now
// import GestureResult from './GestureResult'; // We'll use inline text for now

function App() {
  const [selectedCase, setSelectedCase] = useState(null);
  const [gestureResult, setGestureResult] = useState('');
  const websocketRef = useRef(null);

  // Function to handle case selection
  const handleCaseSelect = (caseNumber) => {
    setSelectedCase(caseNumber);
    setGestureResult(''); // Clear previous result when case changes
    // Send the selected case to the backend immediately if WebSocket is open
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({ case: caseNumber }));
    }
  };

  // Effect to manage WebSocket connection
  useEffect(() => {
    // Replace with your backend WebSocket URL
    const wsUrl = 'ws://localhost:5000/gesture_stream';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connection opened');
      websocketRef.current = ws;
      // Optionally send the initial selected case upon connection
      if (selectedCase !== null) {
         ws.send(JSON.stringify({ case: selectedCase }));
      }
    };

    ws.onmessage = (event) => {
      // Assuming the backend sends gesture results as text
      console.log("Received message:", event.data); // Log received message
      setGestureResult(event.data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setGestureResult('WebSocket Error');
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      websocketRef.current = null;
      setGestureResult('WebSocket Closed'); // Indicate connection closed
    };

    // Clean up the WebSocket connection when the component unmounts
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []); // Empty dependency array means this effect runs only once on mount

  return (
    <div className="App">
      <header className="App-header">
        <h1>Hand Gesture Recognition</h1>
      </header>
      <main>
        <div className="video-container">
          {/* Render the WebcamFeed component */}
          <WebcamFeed websocket={websocketRef.current} selectedCase={selectedCase} />
        </div>

        <div className="controls">
          <h2>Select Gesture Case</h2>
           <div>
             <button onClick={() => handleCaseSelect(1)} disabled={selectedCase === 1}>Case 1 (Photo Capture)</button>
             <button onClick={() => handleCaseSelect(2)} disabled={selectedCase === 2}>Case 2 (YouTube Control)</button>
             <button onClick={() => handleCaseSelect(3)} disabled={selectedCase === 3}>Case 3 (PowerPoint Control)</button>
           </div>
        </div>

        <div className="results">
          <h2>Gesture Result</h2>
          <p>{gestureResult || 'Awaiting gesture...'}</p>
        </div>
      </main>
    </div>
  );
}

export default App;