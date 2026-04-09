"""
Posture Evaluator
Analyzes body posture from MediaPipe landmarks and calculates a posture score.
Detects common posture issues like lateral tilt, forward head, and pelvic tilt.
"""
import math


class PostureEvaluator:
    def evaluate(self, landmarks: list, angles: dict) -> dict:
        """
        Evaluate posture from landmarks and return a score with notes.

        Returns:
            dict with 'score' (0-100), 'notes' (str), 'issues' (list)
        """
        if len(landmarks) < 33:
            return {
                "score": None,
                "notes": "Yetersiz landmark verisi",
                "issues": [],
            }

        score = 100
        issues = []
        deductions = []

        # 1. Shoulder Level Check (lateral tilt)
        left_shoulder = landmarks[11]
        right_shoulder = landmarks[12]
        shoulder_diff = abs(left_shoulder["y"] - right_shoulder["y"])

        if shoulder_diff > 0.03:
            penalty = min(15, shoulder_diff * 300)
            score -= penalty
            side = "sol" if left_shoulder["y"] < right_shoulder["y"] else "sağ"
            issues.append(f"Omuz seviye farkı ({side} omuz daha yüksek)")
            deductions.append(f"Omuz: -{penalty:.0f}")

        # 2. Hip Level Check
        left_hip = landmarks[23]
        right_hip = landmarks[24]
        hip_diff = abs(left_hip["y"] - right_hip["y"])

        if hip_diff > 0.02:
            penalty = min(10, hip_diff * 250)
            score -= penalty
            side = "sol" if left_hip["y"] < right_hip["y"] else "sağ"
            issues.append(f"Kalça seviye farkı ({side} kalça daha yüksek)")
            deductions.append(f"Kalça: -{penalty:.0f}")

        # 3. Forward Head Posture
        nose = landmarks[0]
        mid_shoulder_x = (left_shoulder["x"] + right_shoulder["x"]) / 2
        head_forward = nose["x"] - mid_shoulder_x

        if abs(head_forward) > 0.05:
            penalty = min(15, abs(head_forward) * 200)
            score -= penalty
            issues.append("İleri baş pozisyonu (Forward Head Posture)")
            deductions.append(f"Baş: -{penalty:.0f}")

        # 4. Spine Alignment (vertical alignment of nose, mid-shoulders, mid-hips)
        mid_hip_x = (left_hip["x"] + right_hip["x"]) / 2
        spine_deviation = abs(mid_shoulder_x - mid_hip_x)

        if spine_deviation > 0.03:
            penalty = min(15, spine_deviation * 300)
            score -= penalty
            direction = "sağa" if mid_shoulder_x > mid_hip_x else "sola"
            issues.append(f"Omurga hizalama sorunu ({direction} eğilme)")
            deductions.append(f"Omurga: -{penalty:.0f}")

        # 5. Shoulder Symmetry (one shoulder forward/back)
        shoulder_z_diff = abs(left_shoulder.get("z", 0) - right_shoulder.get("z", 0))
        if shoulder_z_diff > 0.05:
            penalty = min(10, shoulder_z_diff * 100)
            score -= penalty
            issues.append("Omuz asimetrisi (bir omuz daha ileride)")
            deductions.append(f"Omuz asimetri: -{penalty:.0f}")

        # 6. Knee Alignment Check
        if "Sol Diz" in angles and "Sağ Diz" in angles:
            knee_diff = abs(angles["Sol Diz"] - angles["Sağ Diz"])
            if knee_diff > 10:
                penalty = min(10, knee_diff * 0.5)
                score -= penalty
                issues.append("Diz açıları asimetrik")
                deductions.append(f"Diz: -{penalty:.0f}")

        # 7. Pelvic Tilt Assessment
        left_hip_y = left_hip["y"]
        left_knee_y = landmarks[25]["y"]
        pelvis_angle = abs(left_hip_y - left_knee_y)

        # 8. Overall body lean
        nose_x = nose["x"]
        mid_ankle_x = (landmarks[27]["x"] + landmarks[28]["x"]) / 2
        body_lean = abs(nose_x - mid_ankle_x)

        if body_lean > 0.08:
            penalty = min(10, body_lean * 100)
            score -= penalty
            lean_direction = "ileriye" if nose_x < mid_ankle_x else "geriye"
            issues.append(f"Genel vücut eğikliği ({lean_direction})")
            deductions.append(f"Eğilme: -{penalty:.0f}")

        score = max(0, min(100, score))

        # Generate notes
        if score >= 90:
            rating = "Mükemmel"
        elif score >= 75:
            rating = "İyi"
        elif score >= 60:
            rating = "Orta"
        elif score >= 40:
            rating = "Dikkat Gerekli"
        else:
            rating = "Düzeltme Gerekli"

        notes_parts = [f"Postür Değerlendirmesi: {rating} ({score:.0f}/100)"]
        if issues:
            notes_parts.append("Tespit edilen sorunlar:")
            for issue in issues:
                notes_parts.append(f"  • {issue}")
        else:
            notes_parts.append("Belirgin bir postür sorunu tespit edilmedi.")

        if deductions:
            notes_parts.append(f"Puan kırılımları: {', '.join(deductions)}")

        return {
            "score": round(score, 1),
            "notes": "\n".join(notes_parts),
            "issues": issues,
        }
