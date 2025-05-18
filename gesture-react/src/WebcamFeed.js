import React, { useRef, useEffect } from 'react';

function WebcamFeed({ websocket, selectedCase }) {
  // We need both videoRef (to get the raw stream) and canvasRef (to draw/send/display)
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const frameIntervalRef = useRef(null);
  // Use a ref to store the video stream itself for cleanup
  const videoStreamRef = useRef(null);


  useEffect(() => {
    console.log('WebcamFeed: Initial mount effect running.');
    // Function to start the webcam stream
    const startWebcam = async () => {
      try {
        console.log('WebcamFeed: Requesting webcam access...');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoStreamRef.current = stream; // Store stream in ref for cleanup
        console.log('WebcamFeed: Webcam stream obtained.');
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("WebcamFeed: Error accessing webcam:", err);
        alert("Could not access the webcam. Please ensure you have a camera connected and grant permission.");
      }
    };

    startWebcam();

    // Cleanup function to stop the webcam stream and interval
    return () => {
      console.log('WebcamFeed: Cleaning up webcam stream and interval.');
      // Capture the current stream value for cleanup
      const currentStream = videoStreamRef.current;
      if (currentStream) {
        const tracks = currentStream.getTracks();
        tracks.forEach(track => track.stop());
      }
      // Clear the interval using the ref
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
    };
  }, []); // Empty dependency array means this effect runs only once on mount

  useEffect(() => {
    console.log('WebcamFeed: WebSocket or selectedCase changed. Checking conditions...');
    console.log('WebcamFeed: websocket:', websocket, 'selectedCase:', selectedCase);

    // Effect to send frames when WebSocket is connected and a case is selected
    if (websocket && websocket.readyState === WebSocket.OPEN && selectedCase !== null) {
      console.log(`WebcamFeed: Conditions met. Starting frame sending for case ${selectedCase}`);

      // Clear any existing interval before starting a new one
      if (frameIntervalRef.current) {
        console.log('WebcamFeed: Clearing existing frame interval.');
        clearInterval(frameIntervalRef.current);
      }

      // Store the new interval ID in the ref
      frameIntervalRef.current = setInterval(() => {
        if (videoRef.current && canvasRef.current) {
          const context = canvasRef.current.getContext('2d');
          // Set canvas dimensions to match video feed
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;

          // Draw the current video frame onto the canvas for sending
          // Draw the frame mirrored horizontally
          context.save();
          context.scale(-1, 1);
          context.drawImage(videoRef.current, -canvasRef.current.width, 0, canvasRef.current.width, canvasRef.current.height);
          context.restore();


          // Get image data from the canvas as a Base64 data URL
          const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.7); // Specify image format and quality

          // Inside your frame processing and sending logic (e.g., in a setInterval or requestAnimationFrame loop)
          if (websocket && websocket.readyState === WebSocket.OPEN) {
              // Assume dataUrl is the base64 string of the current frame
              // Assume selectedCase is the currently selected case number (e.g., 1, 2, or 3)
          
              const dataToSend = {
                case: selectedCase,
                frame: dataUrl // Use dataUrl here
              };
          
              websocket.send(JSON.stringify(dataToSend));
          }

        } else {
            console.log('WebcamFeed: Cannot capture frame. videoRef or canvasRef not ready.');
        }
      }, 200); // Send frame every 200ms (adjust as needed) // Changed from 100 to 200

      // Add WebSocket message listener here
      websocket.onmessage = (event) => {
        try {
          console.log("WebcamFeed: Raw message received:", event.data); // Log the raw message
          const data = JSON.parse(event.data);
          console.log("WebcamFeed: Parsed message data:", data); // Log the parsed data
          console.log("WebcamFeed: Received frame data:", data.frame ? "Exists" : "Does not exist"); // Check if frame exists
          console.log("WebcamFeed: Canvas ref current:", canvasRef.current); // Check if canvas ref is available

          if (data.frame && canvasRef.current) {
            console.log("WebcamFeed: Received frame data and canvas is ready. Attempting to draw.");
            // Received an annotated frame from the backend
            const img = new Image();
            img.onload = () => {
              console.log("WebcamFeed: Image loaded. Drawing to canvas."); // Log when image is loaded
              const context = canvasRef.current.getContext('2d');
              // Clear the canvas before drawing the new frame
              context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              // Draw the received image onto the canvas for display
              // Ensure canvas size matches the received image size if necessary,
              // or draw the image scaled to the current canvas size.
              // For simplicity, let's assume backend sends frames at the canvas size.
              context.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
              console.log("WebcamFeed: Image drawn to canvas."); // Log after drawing
            };
            img.onerror = (e) => {
                console.error("WebcamFeed: Error loading image:", e); // Log image loading errors
            };
            img.src = 'data:image/jpeg;base64,' + data.frame;
          }
          // You can also handle other messages here, e.g., gesture names
          // This part might be better handled in the parent App component
          // and passed down as a prop if needed, but for now, we'll just log.
          if (data.gesture) {
              console.log("WebcamFeed: Received gesture:", data.gesture);
              // If you want to display gesture result here, you'd need a state/prop
          }

        } catch (e) {
          console.error("WebcamFeed: Error parsing message from backend:", e);
        }
      };


    } else {
      // Stop sending frames if WebSocket is not open or no case is selected
      console.log("WebcamFeed: Conditions not met. Stopping frame sending.");
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null; // Reset interval ID
      }
       // Remove the message listener when conditions are not met
       if (websocket) {
           websocket.onmessage = null; // Or set to a default handler
       }
    }

    // Cleanup function to clear the interval and message listener
    return () => {
      console.log('WebcamFeed: Cleanup effect running. Clearing frame interval and message listener.');
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null; // Reset interval ID
      }
      if (websocket) {
          websocket.onmessage = null; // Remove the message listener
      }
    };

  }, [websocket, selectedCase]); // Effect runs when websocket or selectedCase changes

  return (
    <div>
      {/* The video element is hidden, used only to get the raw stream */}
      <video ref={videoRef} autoPlay playsInline style={{ display: 'none' }}></video>
      {/* The canvas element is used to capture frames for sending AND display the processed feed */}
      {/* Remove the display: 'none' style */}
      <canvas ref={canvasRef} style={{ width: '100%', height: 'auto' }}></canvas>
    </div>
  );
}

export default WebcamFeed;