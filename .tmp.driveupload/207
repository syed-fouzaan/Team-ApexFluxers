#!/usr/bin/env python
import gevent.monkey
gevent.monkey.patch_all()

import sys
import cv2
import mediapipe as mp
import subprocess
import os
import math
import numpy as np
from ctypes import cast, POINTER
from comtypes import CLSCTX_ALL
from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
from tkinter import messagebox, Tk
import time

# Import Flask and Sock here
from flask import Flask, render_template
from flask_sock import Sock

# Import the json module
import json

# Solution APIs
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles
mp_hands = mp.solutions.hands

# Volume Control Library Usage (Note: This controls the server's volume, not the user's)
devices = AudioUtilities.GetSpeakers()
interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
volume = cast(interface, POINTER(IAudioEndpointVolume))
volRange = volume.GetVolumeRange()
minVol, maxVol = volRange[0], volRange[1]

# Webcam Setup
wCam, hCam = 640, 480
cam = cv2.VideoCapture(0)  # Change to use the default camera
cam.set(3, wCam)
cam.set(4, hCam)

# Global state variables for gestures (These will be managed per WebSocket connection if needed)
is_muted = False
pinch_start_time = None
last_index_x = None
swipe_start_time = None
full_screen_toggled = False
full_screen_last_action_time = 0
last_x_case3 = None  # To track last X position for case 3

def show_permission_dialog(case_number):
    root = Tk()
    root.withdraw()  # Hide the main window
    response = messagebox.askyesno("Camera Permission", f"Do you want to execute Case {case_number}?")
    root.destroy()
    return response

def launch_dino_game():
    chrome_path = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    if os.path.exists(chrome_path):
        subprocess.Popen([chrome_path, "chrome://dino"])
    else:
        print("Please install Google Chrome to play the Dino game.")

def count_fingers(hand_landmarks):
    fingers_down = 0
    # Thumb
    if hand_landmarks.landmark[4].y >= hand_landmarks.landmark[3].y:
        fingers_down += 1
    # Other fingers
    for i in range(1, 5):
        if hand_landmarks.landmark[i * 4 + 2].y >= hand_landmarks.landmark[i * 4].y:
            fingers_down += 1
    return fingers_down

def is_victory(hand_landmarks):
    index_finger_up = hand_landmarks.landmark[8].y < hand_landmarks.landmark[6].y
    middle_finger_up = hand_landmarks.landmark[12].y < hand_landmarks.landmark[10].y
    ring_finger_down = hand_landmarks.landmark[16].y >= hand_landmarks.landmark[14].y
    pinky_finger_down = hand_landmarks.landmark[20].y >= hand_landmarks.landmark[18].y
    return index_finger_up and middle_finger_up and ring_finger_down and pinky_finger_down

def is_fist(hand_landmarks):
    for i in range(1, 5):
        if hand_landmarks.landmark[i * 4 + 2].y < hand_landmarks.landmark[i * 4].y:
            return False
    if hand_landmarks.landmark[4].y > hand_landmarks.landmark[3].y:
        return False
    return True

def preprocess_frame_for_hands(image):
    yuv = cv2.cvtColor(image, cv2.COLOR_BGR2YUV)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    yuv[:, :, 0] = clahe.apply(yuv[:, :, 0])
    processed = cv2.cvtColor(yuv, cv2.COLOR_YUV2BGR)
    return processed

def handle_case_1(results, hands, ws):
    # Case 1 logic (Victory Photo Capture)
    if results.multi_hand_landmarks:
        for hand_landmarks in results.multi_hand_landmarks:
            if is_victory(hand_landmarks):
                print("Victory gesture detected (backend) - Case 1")
                try:
                    ws.send(json.dumps({"gesture": "victory", "case": 1}))
                except Exception as e:
                    print(f"Error sending victory gesture event: {e}")

def handle_case_2(results, hands, ws):
    global pinch_start_time, last_index_x, swipe_start_time, full_screen_toggled, full_screen_last_action_time

    current_time = time.time()
    debounce_interval = 1.5

    hands_list = results.multi_hand_landmarks

    # Play/Pause: Pinch held 0.5s
    pinch_threshold = 0.04
    pinch_detected_this_frame = False
    if hands_list:
        for hand_landmarks in hands_list:
            thumb_tip = hand_landmarks.landmark[4]
            index_tip = hand_landmarks.landmark[8]
            distance = math.dist([thumb_tip.x, thumb_tip.y], [index_tip.x, index_tip.y])
            if distance < pinch_threshold:
                pinch_detected_this_frame = True
                break

    if pinch_detected_this_frame:
        if pinch_start_time is None:
            pinch_start_time = current_time
        elif (current_time - pinch_start_time) >= 0.2:
            print("Play/Pause gesture detected (backend) - Case 2")
            # Use pyautogui to press 'k' for play/pause
            pyautogui.press('k')
            pinch_start_time = None
    else:
        pinch_start_time = None

    # Skip Ads: Swipe right held 0.5 seconds before skip
    right_hand_landmarks = None
    if hasattr(results, 'multi_handedness'):
        for idx, handedness in enumerate(results.multi_handedness):
            if handedness.classification[0].label == "Right":
                right_hand_landmarks = hands_list[idx]
                break
    if right_hand_landmarks is None and hands_list:
        right_hand_landmarks = hands_list[0]

    if right_hand_landmarks:
        index_x = right_hand_landmarks.landmark[8].x
        swipe_threshold = 0.15

        if last_index_x is not None:
            diff = index_x - last_index_x
            if diff > swipe_threshold:
                if swipe_start_time is None:
                    swipe_start_time = current_time
                elif (current_time - swipe_start_time) >= 0.05:
                    print("Ad skipped gesture detected (backend) - Case 2")
                    # Use pyautogui to press 'l' to skip ads
                    pyautogui.press('l')
                    swipe_start_time = None
            else:
                swipe_start_time = None
            if diff < -swipe_threshold:
                swipe_start_time = None
        else:
            swipe_start_time = None

        last_index_x = index_x
    else:
        last_index_x = None

    # Full Screen: 3D distance between wrists
    left_x = left_y = left_z = None
    right_x = right_y = right_z = None

    if hasattr(results, 'multi_handedness') and results.multi_handedness:
        for idx, handedness in enumerate(results.multi_handedness):
            label = handedness.classification[0].label
            hand_landmarks = hands_list[idx]
            if label == "Left":
                left_x = hand_landmarks.landmark[0].x
                left_y = hand_landmarks.landmark[0].y
                left_z = hand_landmarks.landmark[0].z
            elif label == "Right":
                right_x = hand_landmarks.landmark[0].x
                right_y = hand_landmarks.landmark[0].y
                right_z = hand_landmarks.landmark[0].z

    if None not in (left_x, left_y, left_z, right_x, right_y, right_z):
        dist = math.sqrt((left_x - right_x) ** 2 + (left_y - right_y) ** 2 + (left_z - right_z) ** 2)
        close_threshold = 0.1
        apart_threshold = 0.4

        if dist < close_threshold and full_screen_toggled and (current_time - full_screen_last_action_time > debounce_interval):
            print("Exited full screen gesture detected (backend) - Case 2")
            # Use pyautogui to press 'f' to exit full screen
            pyautogui.press('f')
            full_screen_toggled = False
            full_screen_last_action_time = current_time
        elif dist > apart_threshold and not full_screen_toggled and (current_time - full_screen_last_action_time > debounce_interval):
            print("Entered full screen gesture detected (backend) - Case 2")
            # Use pyautogui to press 'f' to enter full screen
            pyautogui.press('f')
            full_screen_toggled = True
            full_screen_last_action_time = current_time

def handle_case_3(results, hands, ws):
    global last_x_case3
    if results.multi_hand_landmarks and len(results.multi_hand_landmarks) == 1:
        hand_landmarks = results.multi_hand_landmarks[0]
        index_x = hand_landmarks.landmark[8].x
        swipe_threshold = 0.15

        if last_x_case3 is not None:
            if index_x - last_x_case3 > swipe_threshold:
                print("PowerPoint 'right' gesture detected (backend) - Case 3")
                # Use pyautogui to press 'right'
                pyautogui.press('right')
            elif index_x - last_x_case3 < -swipe_threshold:
                print("PowerPoint 'left' gesture detected (backend) - Case 3")
                # Use pyautogui to press 'left'
                pyautogui.press('left')
        last_x_case3 = index_x

        if is_fist(hand_landmarks):
            print("PowerPoint 'esc' gesture detected (backend) - Case 3")
            # Use pyautogui to press 'esc'
            pyautogui.press('esc')

# Flask app and WebSocket setup
app = Flask(__name__)
sock = Sock(app)

@app.route('/')
def index():
    return render_template('index.html')

@sock.route('/gesture_stream')
def gesture_stream(ws):
    print("WebSocket connection opened")
    with mp_hands.Hands(
        model_complexity=0,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5) as hands:
        while True:
            try:
                message = ws.receive()
                if message is None:
                    print("WebSocket connection closed by client")
                    break

                # Attempt to parse the incoming message as JSON
                try:
                    data = json.loads(message)
                    selected_case = data.get('case')
                    base64_frame = data.get('frame')

                    if selected_case is None or base64_frame is None:
                        print("Received message missing 'case' or 'frame'")
                        # Optionally send an error back to the client
                        # ws.send(json.dumps({"error": "Invalid message format"}))
                        continue # Skip processing this invalid message

                except json.JSONDecodeError:
                    print(f"Failed to decode JSON message: {message[:100]}...") # Log start of message
                    # Optionally send an error back to the client
                    # ws.send(json.dumps({"error": "Invalid JSON"}))
                    continue # Skip processing this invalid message
                except Exception as e:
                    print(f"An unexpected error occurred during message parsing: {e}")
                    # Optionally send an error back to the client
                    # ws.send(json.dumps({"error": "Backend parsing error"}))
                    continue # Skip processing this message

                # Process the frame if we have a case and frame data
                if selected_case is not None and base64_frame:
                    try:
                        # Decode the base64 image
                        # The base64 string includes a prefix like 'data:image/jpeg;base64,'
                        # We need to remove this prefix before decoding
                        prefix, base64_data = base64_frame.split(',', 1)
                        img_bytes = base64.b64decode(base64_data)
                        np_arr = np.frombuffer(img_bytes, np.uint8)
                        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

                        if frame is None:
                            print("Failed to decode image from base64")
                            # Optionally send an error back to the client
                            # ws.send(json.dumps({"error": "Failed to decode image"}))
                            continue # Skip processing this frame

                        # Process the frame with MediaPipe
                        processed_frame = preprocess_frame_for_hands(frame)
                        results = hands.process(cv2.cvtColor(processed_frame, cv2.COLOR_BGR2RGB))

                        # Handle gestures based on the selected case
                        if selected_case == 1:
                            handle_case_1(results, hands, ws)
                        elif selected_case == 2:
                            handle_case_2(results, hands, ws)
                        elif selected_case == 3:
                            handle_case_3(results, hands, ws)
                        else:
                            print(f"Unknown case received: {selected_case}")
                            # Optionally send an error back to the client
                            # ws.send(json.dumps({"error": "Unknown case"}))

                        # Optionally send the processed frame back to the frontend
                        # This part depends on whether you want to display the annotated frame
                        # If you do, you'll need to encode the processed frame back to base64
                        # and send it back via ws.send()

                    except Exception as e:
                        print(f"An error occurred during frame processing for case {selected_case}: {e}")
                        # Log the traceback for more details
                        import traceback
                        traceback.print_exc()
                        # Optionally send an error back to the client
                        # ws.send(json.dumps({"error": f"Backend processing error for case {selected_case}"}))
                        # Continue the loop to process the next message

            except Exception as e:
                # Catch any other unexpected errors during the WebSocket communication loop
                print(f"An unexpected error occurred in the WebSocket loop: {e}")
                import traceback
                traceback.print_exc()
                break # Break the loop on critical errors

    print("WebSocket connection closed")

    # Reset global state variables when connection closes
    last_x_case3 = None
    pinch_start_time = None
    last_index_x = None
    swipe_start_time = None
    full_screen_toggled = False
    full_screen_last_action_time = 0


if __name__ == "__main__":
    print("Starting Flask server...")
    from gevent.pywsgi import WSGIServer
    from geventwebsocket.handler import WebSocketHandler
    http_server = WSGIServer(('127.0.0.1', 5000), app, handler_class=WebSocketHandler)
    print("Server started on http://127.0.0.1:5000")
    http_server.serve_forever()
