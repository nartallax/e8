out vec2 texCoord;

void main() {
	texCoord = calculateTexCoord(vertex, texturePosition);

	float tickProgress = getTickProgress(tickTime, currentTime);
	float currentRotation = interpolateRotation(entityRotation[0], entityRotation[1], tickProgress);
	vec2 currentPosition = mix(entityPosition.xy, entityPosition.zw, tickProgress);
	// float currentRotation = interpolateRotation(entityRotation[0], entityRotation[1], 1.0);
	// vec2 currentPosition = mix(entityPosition.xy, entityPosition.zw, 1.0);
	
	vec2 pos = vertex.xy * entitySize;
	pos = ((pos - (entitySize / 2.0)) * getRotationMatrix(currentRotation));
	pos = pos + currentPosition;

	// this is required because in our physics engine Y axis is pointed down
	// and I got no better solution than just invert it in the shader
	pos = pos * vec2(1.0, -1.0);

	gl_Position = applyCameraSettings(pos);
}