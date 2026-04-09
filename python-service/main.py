"""
CoachPro Body Analysis Service
FastAPI server with MediaPipe Pose detection for body analysis.
"""
import io
import math
import base64
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from pose_analyzer import PoseAnalyzer
from posture_evaluator import PostureEvaluator
from video_processor import VideoProcessor
from video_processor import VideoProcessor

app = FastAPI(
    title="CoachPro Body Analysis API", 
    version="1.0.0",
    description="MediaPipe Pose detection for body analysis and posture evaluation"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pose_analyzer = PoseAnalyzer()
video_processor = VideoProcessor(pose_analyzer)
video_processor = VideoProcessor(pose_analyzer)
posture_evaluator = PostureEvaluator()


@app.get("/")
async def root():
    return {"status": "ok", "service": "CoachPro Body Analysis API"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


class Base64ImageRequest(BaseModel):
    image: str  # Base64 encoded image
    analysisType: Optional[str] = "front"  # front, back, side


@app.post("/analyze")
async def analyze_body(file: UploadFile = File(...)):
    try:
        contents = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Dosya okunamadı: {str(e)}")
        
    is_video = False
    if file.filename and file.filename.split(".")[-1].lower() in ["mp4", "mov", "avi", "mkv"]:
        is_video = True
    elif file.content_type and "video" in file.content_type:
        is_video = True

    if is_video:
        try:
            results = video_processor.process_video(contents, frame_skip=15)
            if "error" in results:
                raise HTTPException(status_code=400, detail=results["error"])
                
            if results["processedFrames"] == 0:
                raise HTTPException(status_code=400, detail="No frames processed")
                
            last_frame = results["frameAnalyses"][-1]
            return JSONResponse(
                status_code=200,
                content={
                    "success": True,
                    "landmarks": last_frame.get("landmarks", []),
                    "angles": last_frame.get("angles", {}),
                    "postureScore": results.get("averagePostureScore", 0),
                    "postureNotes": "Video analizi tamamlandi",
                    "postureIssues": [],
                    "muscleDensity": last_frame.get("muscleDensity", None)
                }
            )
        except Exception as e:
            if isinstance(e, HTTPException): raise e
            raise HTTPException(status_code=400, detail=f"Video analiz hatasi: {str(e)}")

    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Dosya boyutu cok buyuk. Maksimum 10MB.")

    landmarks = pose_analyzer.detect_pose(contents)

    if not landmarks:
        return JSONResponse(
            status_code=200,
            content={
                "success": False,
                "landmarks": [],
                "angles": {},
                "postureScore": None,
                "postureNotes": "Vücut tespit edilemedi. Lütfen tam vücut görünen, iyi aydınlatılmış bir fotoğraf yükleyin.",
                "postureIssues": [],
                "muscleDensity": None,
            }
        )

    # Calculate joint angles
    angles = pose_analyzer.calculate_angles(landmarks)

    # Evaluate posture
    posture_result = posture_evaluator.evaluate(landmarks, angles)

    # Estimate muscle density regions
    muscle_density = pose_analyzer.estimate_muscle_density(landmarks)

    return {
        "success": True,
        "landmarks": landmarks,
        "angles": angles,
        "postureScore": posture_result["score"],
        "postureNotes": posture_result["notes"],
        "postureIssues": posture_result["issues"],
        "muscleDensity": muscle_density,
        "landmarkCount": len(landmarks),
    }


@app.post("/analyze-base64")
async def analyze_body_base64(request: Base64ImageRequest):
    """
    Analyze a body image from base64 encoded string.
    Useful for frontend integrations.
    """
    try:
        # Remove data URL prefix if present
        image_data = request.image
        if "," in image_data:
            image_data = image_data.split(",")[1]
        
        contents = base64.b64decode(image_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Base64 decode hatası: {str(e)}")

    # Detect pose landmarks
    landmarks = pose_analyzer.detect_pose(contents)

    if not landmarks:
        return {
            "success": False,
            "landmarks": [],
            "angles": {},
            "postureScore": None,
            "postureNotes": "Vücut tespit edilemedi.",
            "postureIssues": [],
            "muscleDensity": None,
        }

    angles = pose_analyzer.calculate_angles(landmarks)
    posture_result = posture_evaluator.evaluate(landmarks, angles)
    muscle_density = pose_analyzer.estimate_muscle_density(landmarks)

    return {
        "success": True,
        "analysisType": request.analysisType,
        "landmarks": landmarks,
        "angles": angles,
        "postureScore": posture_result["score"],
        "postureNotes": posture_result["notes"],
        "postureIssues": posture_result["issues"],
        "muscleDensity": muscle_density,
    }


@app.post("/compare")
async def compare_analyses(data: dict):
    """Compare two body analyses and return differences."""
    return {
        "message": "Comparison endpoint - implement with stored analysis data",
        "analysis1": data.get("analysis1"),
        "analysis2": data.get("analysis2"),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
