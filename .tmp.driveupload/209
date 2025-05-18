#!/usr/bin/env python
import sys
import cv2
import mediapipe as mp
import subprocess
import os
import math
import numpy as np
import pyautogui
from ctypes import cast, POINTER
from comtypes import CLSCTX_ALL
from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
from tkinter import messagebox, Tk
import time
from flask import Flask, render_template
from flask_sock import Sock
import base64
import io
import json
from datetime import datetime

# Solution APIs
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles
mp_hands = mp.solutions.hands

# Volume Control Library Usage
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

# Global state variables for gestures
is_muted = False
pinch_start_time = None  # Track pinch hold start time for play/pause
last_index_x = None  # Track last index finger x for swipe detection
swipe_start_time = None  # Track swipe gesture hold for skip ads
full_screen_toggled = False  # To avoid repeated toggles rapidly
full_screen_last_action_time = 0  # Debounce time for full screen toggling

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
    if hand_landmarks.landmark[4].y >= hand_landmarks.landmark[3].y:  # Thumb is down
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
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    yuv[:,:,0] = clahe.apply(yuv[:,:,0])
    processed = cv2.cvtColor(yuv, cv2.COLOR_YUV2BGR)
    return processed

def case_1(hands, exit_flag):
    victory_detected = False
    victory_start_time = None
    countdown_started = False
    countdown_start_time = 0
    last_frame = None

    while cam.isOpened():
        if exit_flag[0]:
            break
        success, image = cam.read()
        if not success:
            print("Ignoring empty camera frame.")
            continue

        last_frame = image.copy()
        image = cv2.flip(image, 1)
        image = preprocess_frame_for_hands(image)
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = hands.process(image_rgb)

        if results.multi_hand_landmarks and not countdown_started:
            hand_landmarks = results.multi_hand_landmarks[0]
            mp_drawing.draw_landmarks(image, hand_landmarks, mp_hands.HAND_CONNECTIONS,
                                            mp_drawing_styles.get_default_hand_landmarks_style(),
                                            mp_drawing_styles.get_default_hand_connections_style())
            if not victory_detected:
                if is_victory(hand_landmarks):
                    if victory_start_time is None:
                        victory_start_time = time.time()
                    elif (time.time() - victory_start_time) >= 2:
                        victory_detected = True
                        countdown_started = True
                        countdown_start_time = time.time()
                else:
                    victory_start_time = None
                    cv2.putText(image, 'Show victory sign for 2 sec to start timer', (50, 100),
                                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0), 2)
        else:
            if not countdown_started:
                victory_start_time = None
                cv2.putText(image, 'Show victory sign for 2 sec to start timer', (50, 100),
                                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0), 2)

        if countdown_started:
            elapsed = time.time() - countdown_start_time
            countdown_sec = 5 - int(elapsed)
            if countdown_sec > 0:
                cv2.putText(image, f'Get Ready... Capturing in {countdown_sec}', (50, 100),
                                    cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 255), 3)
            else:
                filename = f"captured_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
                cv2.imwrite(filename, last_frame)
                cv2.putText(image, f'Captured: {filename}', (50, 150),
                                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 3)
                cv2.imshow("Captured Image", image)
                cv2.waitKey(2000)
                break

        cv2.imshow('Case 1 - Victory Photo Capture', image)
        if cv2.waitKey(5) & 0xFF == 27 or exit_flag[0]:
            break

def case_2(hands, exit_flag):
    global pinch_start_time, last_index_x, swipe_start_time, full_screen_toggled, full_screen_last_action_time
    pinch_start_time = None
    last_index_x = None
    swipe_start_time = None
    full_screen_toggled = False
    full_screen_last_action_time = 0

    with mp_hands.Hands(min_detection_confidence=0.8,  # Increased detection confidence
                       min_tracking_confidence=0.7,  # Increased tracking confidence
                       model_complexity=1) as hands_local:
        cv2.namedWindow('YouTube Gesture Control - Case 2')
        button_height = 50
        button_width = 100
        button_color = (0, 0, 255)
        button_text_color = (255, 255, 255)

        def mouse_callback(event, x, y, flags, param):
            if event == cv2.EVENT_LBUTTONDOWN:
                # No flipping of x because the image is flipped before showing
                if 10 <= x <= 10 + button_width and 10 <= y <= 10 + button_height:
                    param['exit_flag'][0] = True

        cv2.setMouseCallback('YouTube Gesture Control - Case 2', mouse_callback, {'exit_flag': exit_flag})

        while cam.isOpened():
            if exit_flag[0]:
                break
            success, image = cam.read()
            if not success:
                print("Ignoring empty camera frame.")
                continue

            image = cv2.flip(image, 1)
            image = preprocess_frame_for_hands(image)
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            results = hands_local.process(image_rgb)
            image = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)

            if results.multi_hand_landmarks:
                handle_case_2(results, hands_local)

                for hand_landmarks in results.multi_hand_landmarks:
                    mp_drawing.draw_landmarks(image, hand_landmarks, mp_hands.HAND_CONNECTIONS,
                                                            mp_drawing_styles.get_default_hand_landmarks_style(),
                                                            mp_drawing_styles.get_default_hand_connections_style())

            cv2.rectangle(image, (10, 10), (10 + button_width, 10 + button_height), button_color, -1)
            cv2.putText(image, 'Exit', (30, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, button_text_color, 2)

            cv2.imshow('YouTube Gesture Control - Case 2', image)
            key = cv2.waitKey(5) & 0xFF
            if key == 27 or exit_flag[0]:
                break

        cv2.destroyWindow('YouTube Gesture Control - Case 2')

def handle_case_2(results, hands):
    global pinch_start_time, last_index_x, swipe_start_time, full_screen_toggled, full_screen_last_action_time

    current_time = time.time()
    debounce_interval = 1.5  # seconds between fullscreen toggles

    hands_list = results.multi_hand_landmarks

    # Play/Pause: Pinch held 0.5s
    pinch_threshold = 0.04 # Reduced threshold for more precision
    pinch_detected_this_frame = False
    if hands_list: # Check if any hand is detected.
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
            pyautogui.press('space')
            print("Play/Pause toggled")
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
    if right_hand_landmarks is None and hands_list:  # Make sure hands_list is not empty
        right_hand_landmarks = hands_list[0]

    if right_hand_landmarks: # Check if right_hand_landmarks is not None
        index_x = right_hand_landmarks.landmark[8].x
        swipe_threshold = 0.25  # Increased threshold for more robust swipe

        if last_index_x is not None:
            diff = index_x - last_index_x
            if diff > swipe_threshold:
                if swipe_start_time is None:
                    swipe_start_time = current_time
                elif (current_time - swipe_start_time) >= 0.05:
                    pyautogui.press('l')
                    print("Ad skipped")
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

    if hasattr(results, 'multi_handedness') and results.multi_handedness: # Check if multi_handedness exists and is not empty
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
        dist = math.sqrt((left_x - right_x)**2 + (left_y - right_y)**2 + (left_z - right_z)**2)
        close_threshold = 0.08 # Reduced close threshold
        apart_threshold = 0.4 # Increased apart threshold

        if dist < close_threshold and full_screen_toggled and (current_time - full_screen_last_action_time > debounce_interval):
            pyautogui.press('f')
            print("Exited full screen")
            full_screen_toggled = False
            full_screen_last_action_time = current_time
        elif dist > apart_threshold and not full_screen_toggled and (current_time - full_screen_last_action_time > debounce_interval):
            pyautogui.press('f')
            print("Entered full screen")
            full_screen_toggled = True
            full_screen_last_action_time = current_time

def handle_case_1(results, hands):
    pass

def handle_case_3(results, hands):
    if results.multi_hand_landmarks and len(results.multi_hand_landmarks) == 1:
        hand_landmarks = results.multi_hand_landmarks[0]
        index_x = hand_landmarks.landmark[8].x

        if index_x > 0.7:
            pyautogui.press('right')
        elif index_x < 0.3:
            pyautogui.press('left')

        if is_fist(hand_landmarks):
            pyautogui.press('esc')

def case_3(hands):
    last_x = None
    swipe_threshold = 0.15 # Increased swipe threshold

    while cam.isOpened():
        success, image = cam.read()
        if not success:
            print("Ignoring empty camera frame.")
            continue

        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = hands.process(image)
        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

        if results.multi_hand_landmarks and len(results.multi_hand_landmarks) == 1:
            hand_landmarks = results.multi_hand_landmarks[0]
            mp_drawing.draw_landmarks(
                image,
                hand_landmarks,
                mp_hands.HAND_CONNECTIONS,
                mp_drawing_styles.get_default_hand_landmarks_style(),
                mp_drawing_styles.get_default_hand_connections_style()
            )

            wrist_x = hand_landmarks.landmark[0].x
            index_x = hand_landmarks.landmark[8].x

            if last_x is not None:
                if index_x - last_x > swipe_threshold:
                    pyautogui.press('right')
                elif index_x - last_x < -swipe_threshold:
                    pyautogui.press('left')

            last_x = index_x

            if is_fist(hand_landmarks):
                pyautogui.press('esc')

        cv2.imshow('PowerPoint Control - Case 3', image)
        if cv2.waitKey(5) & 0xFF == 27:
            break

app = Flask(__name__)
sock = Sock(app)

@app.route('/')
def index():
    return render_template('index.html')

@sock.route('/gesture_stream')
def gesture_stream(ws):
    with mp_hands.Hands(min_detection_confidence=0.8,  # Increased detection confidence
                       min_tracking_confidence=0.7,  # Increased tracking confidence
                       model_complexity=1) as hands:
        while True:
            try:
                data = json.loads(ws.receive())
                case_number = data['case']
                frame_data = data['frame']

                nparr = np.frombuffer(frame_data, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                if frame is None:
                    continue

                frame = preprocess_frame_for_hands(frame)

                image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = hands.process(image)

                if results.multi_hand_landmarks:
                    if case_number == 1:
                        handle_case_1(results, hands)
                    elif case_number == 2:
                        handle_case_2(results, hands)
                    elif case_number == 3:
                        handle_case_3(results, hands)

            except Exception as e:
                print(f"Error processing frame: {e}")
                break

def original_main_loop_logic():
    global exit_flag
    with mp_hands.Hands(min_detection_confidence=0.8,  # Increased detection confidence
                       min_tracking_confidence=0.7,  # Increased tracking confidence
                       model_complexity=1) as hands_instance:
        cv2.namedWindow('Hand Gesture Recognition')
        button_height = 50
        button_width = 100
        button_color = (0, 0, 255)
        button_text_color = (255, 255, 255)

        def mouse_callback(event, x, y, flags, param):
            if event == cv2.EVENT_LBUTTONDOWN:
                # Since image is flipped horizontally,
                # the mouse x coordinate corresponds directly.
                if 10 <= x <= 10 + button_width and 10 <= y <= 10 + button_height:
                    param['exit_flag'][0] = True

        cv2.setMouseCallback('Hand Gesture Recognition', mouse_callback, {'exit_flag': exit_flag})

        while cam.isOpened():
            if exit_flag[0]:
                break
            success, image = cam.read()
            if not success:
                print("Ignoring empty camera frame.")
                continue

            image = cv2.flip(image, 1)  # Mirror image (selfie view)

            # Draw the exit button
            cv2.rectangle(image, (10, 10), (10 + button_width, 10 + button_height), button_color, -1)
            cv2.putText(image, 'Exit', (30, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, button_text_color, 2)

            image = preprocess_frame_for_hands(image)
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            results = hands_instance.process(image_rgb)
            image = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)

            if results.multi_hand_landmarks:
                num_hands = len(results.multi_hand_landmarks)
                if num_hands > 2:
                    messagebox.showinfo("Hand Limit", f"{num_hands} hands are locked. No more hands recognized for this case.")
                    continue

                for hand_landmarks in results.multi_hand_landmarks:
                    mp_drawing.draw_landmarks(
                        image,
                        hand_landmarks,
                        mp_hands.HAND_CONNECTIONS,
                        mp_drawing_styles.get_default_hand_landmarks_style(),
                        mp_drawing_styles.get_default_hand_connections_style()
                    )
                    finger_count = count_fingers(hand_landmarks)
                    cv2.putText(image, f'Fingers: {finger_count}', (10, 70),
                                            cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 255, 0), 2)

                    if exit_flag[0]:
                        break  # Break loop if exit pressed

                    if finger_count == 1 and show_permission_dialog(1):
                        case_1(hands_instance, exit_flag)
                    elif finger_count == 2 and show_permission_dialog(2):
                        case_2(hands_instance, exit_flag)
                        if exit_flag[0]:
                            break
                    elif finger_count == 3 and show_permission_dialog(3):
                        case_3(hands_instance)
                    if exit_flag[0]:
                        break

            cv2.imshow('Hand Gesture Recognition', image)
            key = cv2.waitKey(5) & 0xFF
            if key == 27 or exit_flag[0]:
                break

        cam.release()
        cv2.destroyAllWindows()
        sys.exit()

if __name__ == "__main__":
    if not cam.isOpened():
        print("Cannot open camera")
        sys.exit()

    exit_flag = [False]  # Global exit flag to propagate exit command

    with mp_hands.Hands(min_detection_confidence=0.8,  # Increased detection confidence
                       min_tracking_confidence=0.7,  # Increased tracking confidence
                       model_complexity=1) as hands_instance:
        original_main_loop_logic()

