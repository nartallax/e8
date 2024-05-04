// this function converts ingame coords into camera space coords
vec4 applyCameraSettings(in vec2 position){
	// shifting to camera's position
	// neg y here because it's like that in physics engine, and we negate this effect in shader
	position = position - vec2(camera.x, -camera.y);

	// applying zoom and screen size multipliers
	// * 2 is here because opengl screen space goes from -1 to 1; that is screen has length of 2
	// and we define "zoom" as "one ingame unit screen size"
	position = position * camera.z * 2.0;

	// stretching as expected
	position = position / screenSize;

	return vec4(position, 0, 1);
}