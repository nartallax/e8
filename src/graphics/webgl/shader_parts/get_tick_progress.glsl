// lirp-ing tick time
float getTickProgress(vec2 tickTime, float currentTime){
	float oldTickTime = tickTime[0];
	float newTickTime = tickTime[1];

	float timeSpan = newTickTime - oldTickTime;
	float timePassed = currentTime - oldTickTime;
	float progress = timePassed / timeSpan;
	return min(1.0, max(0.0, progress));
}