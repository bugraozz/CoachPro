
import cv2
import numpy as np
import tempfile
from typing import List, Dict

class VideoProcessor:
    def __init__(self, pose_analyzer):
        self.pose_analyzer = pose_analyzer
    
    def process_video(self, video_bytes: bytes, frame_skip: int = 5) -> Dict:
        # Write bytes to temp file
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp_file:
            tmp_file.write(video_bytes)
            tmp_path = tmp_file.name
        
        try:
            cap = cv2.VideoCapture(tmp_path)
            if not cap.isOpened():
                return {"error": "Video could not be opened"}
            fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            frame_count = 0
            processed_count = 0
            frame_analyses = []
            
            # If no frames or not video
            if total_frames <= 0:
                total_frames = 1
                
            # ensure valid fps
            if fps <= 0:
                fps = 30
                
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Process every nth frame
                if frame_count % frame_skip == 0:
                    _, buffer = cv2.imencode(".jpg", frame)
                    frame_bytes = buffer.tobytes()
                    
                    landmarks = self.pose_analyzer.detect_pose(frame_bytes)
                    if landmarks:
                        angles = self.pose_analyzer.calculate_angles(landmarks)
                        muscle_density = self.pose_analyzer.estimate_muscle_density(landmarks)
                        
                        frame_analyses.append({
                            "frameNumber": frame_count,
                            "timestamp": frame_count / fps,
                            "landmarks": landmarks,
                            "angles": angles,
                            "muscleDensity": muscle_density
                        })
                        processed_count += 1
                
                frame_count += 1
            
            cap.release()
            
            avg_posture_score = 0 # Dummy calculation, can add if postureScore was there
            return {
                "totalFrames": total_frames,
                "processedFrames": processed_count,
                "frameAnalyses": frame_analyses,
                "averagePostureScore": round(avg_posture_score, 2),
                "timelineData": self._create_timeline(frame_analyses, fps)
            }
        finally:
            import os
            try:
                os.unlink(tmp_path)
            except:
                pass
    
    def _create_timeline(self, analyses: List, fps: float) -> List[Dict]:
        return [{
            "frameNumber": a["frameNumber"],
            "timestamp": a["timestamp"],
            "quality": len(a["landmarks"]) / 33 * 100
        } for a in analyses]

