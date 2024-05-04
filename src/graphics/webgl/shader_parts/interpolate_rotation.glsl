float interpolateRotation(float startRotation, float endRotation, float progress){
	// we should not make almost full circle when rotating from 179 deg to -179 deg 
	float diff = startRotation - endRotation;
	if(diff > PI){
		endRotation += PI * 2.0;
	} else if(diff < -PI){
		endRotation -= PI * 2.0;
	}
	return mix(startRotation, endRotation, progress);
}