out vec2 texCoord;
out vec4 tint;

void main() {
	texCoord = calculateTexCoord(vertex, texturePosition);

	float progress = (currentTime - particleTime[0]) / particleTime[1];
	if(progress > 1.0){
		gl_Position = vec4(1024.0 * 1024.0, 1024.0 * 1024.0, 0, 0);
		return;
	}

	vec2 size = mix(particleSize.xy, particleSize.zw, pow(progress, particleProgressPower[0]));
	vec2 position = mix(particlePosition.xy, particlePosition.zw, pow(progress, particleProgressPower[1]));
	float rotation = mix(particleRotation[0], particleRotation[1], pow(progress, particleProgressPower[2]));
	tint = mix(unpackUintColor(particleColor[0]), unpackUintColor(particleColor[1]), pow(progress, particleProgressPower[3]));

	vec2 pos = vertex.xy * size;
	pos = ((pos - (size / 2.0)) * getRotationMatrix(rotation));
	pos = pos + position;

	// this is required because in our physics engine Y axis is pointed down
	// and I got no better solution than just invert it in the shader
	pos = pos * vec2(1.0, -1.0);

	gl_Position = applyCameraSettings(pos);
}