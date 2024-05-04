// having a vertex coords and rectangle on atlas, get texture coordinates for that vertex
vec2 calculateTexCoord(vec2 vertex, vec4 texturePosition){
	return vec2(
		texturePosition.x + (vertex.x * texturePosition.z),
		texturePosition.y + ((1.0 - vertex.y) * texturePosition.w)
	);
}