mat2 getRotationMatrix(in float rotation){
	float m = mod(rotation, PI2);
	float s = sin(m);
	float c = cos(m);
	return mat2(c, -s, s, c);
}