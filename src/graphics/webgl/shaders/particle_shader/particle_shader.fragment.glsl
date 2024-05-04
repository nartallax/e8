in vec2 texCoord;
in vec4 tint;
out vec4 outColor;

void main() {
	outColor = texture(image, texCoord) * tint;
}