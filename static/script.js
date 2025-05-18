angular.module('gestureApp', []).controller('GestureController', function($scope) {
    let socket;
    let videoStream;
    let canvas;
    let context;
    const video = document.getElementById('webcamFeed');

    // Initialize selected case
    $scope.selectedCase = 2; // Default to Case 2

    // Function to select a case
    $scope.selectCase = function(caseNumber) {
        $scope.selectedCase = caseNumber;
        $scope.gestureResult = `Case ${caseNumber} selected.`;
        console.log("Selected Case:", $scope.selectedCase);
        // No need to restart WebSocket, just send the case number with the next frame
    };

    // Function to send video frame to backend via WebSocket
    function sendFrame(videoFrame) {
        if (socket && socket.readyState === WebSocket.OPEN) {
            // Draw the video frame onto the canvas
            context.drawImage(videoFrame, 0, 0, canvas.width, canvas.height);

            // Get the image data from the canvas as a data URL
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // Adjust quality as needed

            // Send the base64 data and the selected case number
            const message = {
                frame: dataUrl,
                case: $scope.selectedCase // Include the selected case number
            };
            socket.send(JSON.stringify(message));

            // Close the video frame to free up resources
            videoFrame.close();
        } else {
            videoFrame.close(); // Close frame even if socket is not open
        }
    }

    async function startWebcam() {
        try {
            videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
            // We won't set video.srcObject directly anymore, as we'll draw to canvas
            // video.srcObject = stream;

            // Create a canvas to draw video frames for sending AND receiving
            canvas = document.createElement('canvas');
            // Set canvas size based on desired output size (can match video element)
            canvas.width = video.width;
            canvas.height = video.height;
            context = canvas.getContext('2d');

            // Replace the video element with the canvas for display
            video.parentNode.replaceChild(canvas, video);

            // Get the video track to send frames from
            const videoTrack = videoStream.getVideoTracks()[0];
            const trackProcessor = new MediaStreamTrackProcessor(videoTrack);
            const transformer = new TransformStream({
                transform(videoFrame, controller) {
                    // Send the frame to the backend
                    sendFrame(videoFrame);
                    // Don't pass the frame through, as we'll display the processed frame from backend
                    videoFrame.close();
                }
            });

            trackProcessor.readable.pipeThrough(transformer);


        } catch (err) {
            console.error("Error accessing webcam: ", err);
            // Update scope variable for display
            $scope.$apply(function() {
                $scope.gestureResult = "Error accessing webcam. Please ensure you have a camera and grant permission.";
            });
        }
    }

    function initWebSocket() {
        // Use the same host and port as your Flask app
        const wsUrl = `ws://${window.location.host}/gesture_stream`;
        socket = new WebSocket(wsUrl);

        socket.onopen = (event) => {
            console.log("WebSocket connection opened:", event);
            startWebcam(); // Start webcam once socket is open
        };

        socket.onmessage = (event) => {
            // Handle messages from the backend (e.g., recognized gesture or annotated frame)
            console.log("Message from backend:", event.data);
            try {
                const data = JSON.parse(event.data);
                if (data.frame) {
                    // Received an annotated frame from the backend
                    const img = new Image();
                    img.onload = () => {
                        // Draw the received image onto the canvas for display
                        context.drawImage(img, 0, 0, canvas.width, canvas.height);
                    };
                    img.src = 'data:image/jpeg;base64,' + data.frame;
                }
                // You can also handle other messages here, e.g., gesture names
                if (data.gesture) {
                    // Update scope variable for display
                    $scope.$apply(function() {
                         $scope.gestureResult = "Gesture: " + data.gesture;
                    });
                }

            } catch (e) {
                console.error("Error parsing message from backend:", e);
            }
        };

        socket.onerror = (event) => {
            console.error("WebSocket error:", event);
             $scope.$apply(function() {
                $scope.gestureResult = "WebSocket error. Could not connect to backend.";
            });
        };

        socket.onclose = (event) => {
            console.log("WebSocket connection closed:", event);
            if (event.wasClean) {
                 $scope.$apply(function() {
                    $scope.gestureResult = `WebSocket connection closed cleanly, code=${event.code} reason=${event.reason}`;
                });
            } else {
                 $scope.$apply(function() {
                    $scope.gestureResult = 'WebSocket connection died';
                });
            }
            // Stop the webcam stream if it's running
            if (videoStream) {
                videoStream.getTracks().forEach(track => track.stop());
            }
            // Attempt to reconnect after a delay
            setTimeout(initWebSocket, 5000);
        };
    }

    // Initialize WebSocket connection when the controller loads
    initWebSocket();
});