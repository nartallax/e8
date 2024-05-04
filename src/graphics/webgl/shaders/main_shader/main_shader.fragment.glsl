in vec2 texCoord;
out vec4 outColor;

void main() {
	outColor = texture(image, texCoord);
}