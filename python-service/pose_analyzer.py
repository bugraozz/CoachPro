"""
Pose Analyzer using MediaPipe Pose
Detects 33 body landmarks and calculates joint angles.
"""
import io
import math
import os
import urllib.request
import numpy as np

HAS_CV2 = False
HAS_MEDIAPIPE = False
mp_pose = None

try:
    import cv2
    HAS_CV2 = True
    print("OpenCV loaded successfully")
except ImportError:
    print("WARNING: OpenCV not found")

# Try to import MediaPipe with different methods
try:
    import mediapipe as mp
    
    # Method 1: Try the new Tasks API (MediaPipe 0.10+)
    try:
        from mediapipe.tasks import python as mp_tasks
        from mediapipe.tasks.python import vision
        from mediapipe.tasks.python.vision import PoseLandmarker, PoseLandmarkerOptions
        from mediapipe.tasks.python.core.base_options import BaseOptions
        HAS_MEDIAPIPE = True
        USE_TASKS_API = True
        print("MediaPipe Tasks API loaded successfully")
    except ImportError:
        USE_TASKS_API = False
        
        # Method 2: Try legacy solutions API
        try:
            import mediapipe.python.solutions.pose as mp_pose
            HAS_MEDIAPIPE = True
            print("MediaPipe legacy API loaded")
        except ImportError:
            try:
                # Method 3: Alternative import path
                from mediapipe.python.solutions import pose as mp_pose
                HAS_MEDIAPIPE = True
                print("MediaPipe legacy API loaded (alt path)")
            except ImportError:
                print("MediaPipe solutions not available")
                
except ImportError as e:
    print(f"WARNING: MediaPipe not found. Error: {e}")
    USE_TASKS_API = False


# MediaPipe landmark names
LANDMARK_NAMES = [
    "nose", "left_eye_inner", "left_eye", "left_eye_outer",
    "right_eye_inner", "right_eye", "right_eye_outer",
    "left_ear", "right_ear", "mouth_left", "mouth_right",
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_pinky", "right_pinky",
    "left_index", "right_index", "left_thumb", "right_thumb",
    "left_hip", "right_hip", "left_knee", "right_knee",
    "left_ankle", "right_ankle", "left_heel", "right_heel",
    "left_foot_index", "right_foot_index"
]


class PoseAnalyzer:
    def __init__(self):
        self.pose = None
        self.pose_landmarker = None
        self.use_tasks_api = False
        
        if HAS_CV2 and HAS_MEDIAPIPE:
            try:
                if USE_TASKS_API:
                    # Use temp directory to avoid path issues with special characters
                    import tempfile
                    temp_dir = tempfile.gettempdir()
                    model_path = os.path.join(temp_dir, "pose_landmarker_heavy.task")
                    
                    if not os.path.exists(model_path):
                        print(f"Downloading pose landmarker model to {model_path}...")
                        model_url = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task"
                        urllib.request.urlretrieve(model_url, model_path)
                        print("Model downloaded successfully")
                    else:
                        print(f"Using existing model at {model_path}")
                    
                    options = PoseLandmarkerOptions(
                        base_options=BaseOptions(model_asset_path=model_path),
                        output_segmentation_masks=False,
                        num_poses=1
                    )
                    self.pose_landmarker = PoseLandmarker.create_from_options(options)
                    self.use_tasks_api = True
                    print("PoseAnalyzer initialized with MediaPipe Tasks API")
                elif mp_pose is not None:
                    self.pose = mp_pose.Pose(
                        static_image_mode=True,
                        model_complexity=2,
                        enable_segmentation=True,
                        min_detection_confidence=0.5,
                    )
                    print("PoseAnalyzer initialized with MediaPipe legacy API")
            except Exception as e:
                print(f"Error initializing MediaPipe Pose: {e}")
                import traceback
                traceback.print_exc()
                self.pose = None
                self.pose_landmarker = None
        else:
            print("PoseAnalyzer running in mock mode (MediaPipe not available)")

    def detect_pose(self, image_bytes: bytes) -> list:
        """
        Detect pose landmarks from image bytes.
        Returns list of 33 landmarks with normalized coordinates.
        """
        if not HAS_CV2:
            return self._get_mock_landmarks()
        
        # If no pose detector available, use mock
        if self.pose is None and self.pose_landmarker is None:
            return self._get_mock_landmarks()
        
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if image is None:
                print("ERROR: Could not decode image")
                return []

            # Resize if image is too large (for performance)
            max_dimension = 1280
            height, width = image.shape[:2]
            if max(height, width) > max_dimension:
                scale = max_dimension / max(height, width)
                image = cv2.resize(image, None, fx=scale, fy=scale)

            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Use Tasks API if available
            if self.use_tasks_api and self.pose_landmarker:
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
                results = self.pose_landmarker.detect(mp_image)
                
                if not results.pose_landmarks or len(results.pose_landmarks) == 0:
                    print("WARNING: No pose landmarks detected in image")
                    return []
                
                landmarks = []
                pose_landmarks = results.pose_landmarks[0]  # Get first pose
                for idx, lm in enumerate(pose_landmarks):
                    landmarks.append({
                        "id": idx,
                        "name": LANDMARK_NAMES[idx] if idx < len(LANDMARK_NAMES) else f"landmark_{idx}",
                        "x": round(lm.x, 6),
                        "y": round(lm.y, 6),
                        "z": round(lm.z, 6),
                        "visibility": round(lm.visibility if hasattr(lm, 'visibility') else 0.9, 4),
                    })
                return landmarks
                
            # Use legacy API
            elif self.pose:
                results = self.pose.process(image_rgb)
                if not results.pose_landmarks:
                    print("WARNING: No pose landmarks detected in image")
                    return []
                    
                landmarks = []
                for idx, lm in enumerate(results.pose_landmarks.landmark):
                    landmarks.append({
                        "id": idx,
                        "name": LANDMARK_NAMES[idx] if idx < len(LANDMARK_NAMES) else f"landmark_{idx}",
                        "x": round(lm.x, 6),
                        "y": round(lm.y, 6),
                        "z": round(lm.z, 6),
                        "visibility": round(lm.visibility, 4),
                    })
                return landmarks
            else:
                return self._get_mock_landmarks()
                
        except Exception as e:
            print(f"ERROR in pose detection: {e}")
            import traceback
            traceback.print_exc()
            return []

    def _get_mock_landmarks(self) -> list:
        print("Returning MOCK landmarks because CV2/MediaPipe is missing")
        landmarks = []
        for i in range(33):
            # Generate a somewhat human-like mock pose centered around (0.5, 0.5)
            x_offset = 0.5
            y_offset = (i / 33.0) * 0.8 + 0.1 # Spread from top to bottom
            if getattr(self, '_mock_call_count', 0) % 2 == 0:
                pass
            landmarks.append({
                "id": i,
                "name": LANDMARK_NAMES[i] if i < len(LANDMARK_NAMES) else f"landmark_{i}",
                "x": round(x_offset + (math.sin(i)*0.1), 4),
                "y": round(y_offset, 4),
                "z": 0.0,
                "visibility": 0.9,
            })
        self._mock_call_count = getattr(self, '_mock_call_count', 0) + 1
        return landmarks

    def calculate_angles(self, landmarks: list) -> dict:
        """Calculate key joint angles from detected landmarks."""
        if len(landmarks) < 33:
            return {}

        angles = {}

        # Helper function
        def calc_angle(a, b, c):
            """Calculate angle at point b given three points."""
            ax, ay = a["x"], a["y"]
            bx, by = b["x"], b["y"]
            cx, cy = c["x"], c["y"]

            ba = (ax - bx, ay - by)
            bc = (cx - bx, cy - by)

            dot = ba[0] * bc[0] + ba[1] * bc[1]
            mag_ba = math.sqrt(ba[0]**2 + ba[1]**2)
            mag_bc = math.sqrt(bc[0]**2 + bc[1]**2)

            if mag_ba * mag_bc == 0:
                return 0

            cos_angle = max(-1, min(1, dot / (mag_ba * mag_bc)))
            return round(math.degrees(math.acos(cos_angle)), 1)

        # Key angles
        try:
            # Left elbow angle
            angles["Sol Dirsek"] = calc_angle(
                landmarks[11], landmarks[13], landmarks[15]
            )
            # Right elbow angle
            angles["Sağ Dirsek"] = calc_angle(
                landmarks[12], landmarks[14], landmarks[16]
            )
            # Left shoulder angle
            angles["Sol Omuz"] = calc_angle(
                landmarks[13], landmarks[11], landmarks[23]
            )
            # Right shoulder angle
            angles["Sağ Omuz"] = calc_angle(
                landmarks[14], landmarks[12], landmarks[24]
            )
            # Left hip angle
            angles["Sol Kalça"] = calc_angle(
                landmarks[11], landmarks[23], landmarks[25]
            )
            # Right hip angle
            angles["Sağ Kalça"] = calc_angle(
                landmarks[12], landmarks[24], landmarks[26]
            )
            # Left knee angle
            angles["Sol Diz"] = calc_angle(
                landmarks[23], landmarks[25], landmarks[27]
            )
            # Right knee angle
            angles["Sağ Diz"] = calc_angle(
                landmarks[24], landmarks[26], landmarks[28]
            )
        except (IndexError, KeyError):
            pass

        return angles

    def estimate_muscle_density(self, landmarks: list) -> dict:
        """
        Estimate muscle density per region based on landmark positions.
        This is a simplified heuristic based on proportions.
        Returns scores from 1-10 for each muscle group.
        """
        if len(landmarks) < 33:
            return {}

        density = {}

        try:
            # Upper body width ratio (shoulder to hip ratio indicates upper body development)
            shoulder_width = abs(landmarks[11]["x"] - landmarks[12]["x"])
            hip_width = abs(landmarks[23]["x"] - landmarks[24]["x"])
            upper_ratio = shoulder_width / max(hip_width, 0.001)

            # Arm proportions
            left_upper_arm = math.sqrt(
                (landmarks[11]["x"] - landmarks[13]["x"])**2 +
                (landmarks[11]["y"] - landmarks[13]["y"])**2
            )
            left_forearm = math.sqrt(
                (landmarks[13]["x"] - landmarks[15]["x"])**2 +
                (landmarks[13]["y"] - landmarks[15]["y"])**2
            )

            right_upper_arm = math.sqrt(
                (landmarks[12]["x"] - landmarks[14]["x"])**2 +
                (landmarks[12]["y"] - landmarks[14]["y"])**2
            )

            # Leg proportions
            left_thigh = math.sqrt(
                (landmarks[23]["x"] - landmarks[25]["x"])**2 +
                (landmarks[23]["y"] - landmarks[25]["y"])**2
            )
            left_calf = math.sqrt(
                (landmarks[25]["x"] - landmarks[27]["x"])**2 +
                (landmarks[25]["y"] - landmarks[27]["y"])**2
            )

            # Score calculations (normalized to 1-10 scale)
            density["Göğüs"] = min(10, max(1, round(upper_ratio * 5)))
            density["Sırt"] = min(10, max(1, round(upper_ratio * 4.5)))
            density["Omuz"] = min(10, max(1, round(shoulder_width * 20)))
            density["Sol Biceps"] = min(10, max(1, round(left_upper_arm * 15)))
            density["Sağ Biceps"] = min(10, max(1, round(right_upper_arm * 15)))
            density["Sol Triceps"] = min(10, max(1, round(left_upper_arm * 14)))
            density["Sağ Triceps"] = min(10, max(1, round(right_upper_arm * 14)))
            density["Karın"] = min(10, max(1, round((1 / max(hip_width, 0.001)) * 2)))
            density["Sol Quadriceps"] = min(10, max(1, round(left_thigh * 18)))
            density["Sağ Quadriceps"] = min(10, max(1, round(left_thigh * 18)))
            density["Sol Hamstring"] = min(10, max(1, round(left_thigh * 16)))
            density["Sağ Hamstring"] = min(10, max(1, round(left_thigh * 16)))
            density["Sol Baldır"] = min(10, max(1, round(left_calf * 20)))
            density["Sağ Baldır"] = min(10, max(1, round(left_calf * 20)))

        except (IndexError, KeyError, ZeroDivisionError):
            # Return default values if calculation fails
            for muscle in ["Göğüs", "Sırt", "Omuz", "Sol Biceps", "Sağ Biceps",
                          "Karın", "Sol Quadriceps", "Sağ Quadriceps",
                          "Sol Baldır", "Sağ Baldır"]:
                density[muscle] = 5

        return density
