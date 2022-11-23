precision highp float;


uniform float uPixelSize;
// varying vec2 vUv;
// uniform sampler2D uTexture;
/**
* uDitherMap
* 4*68px dithering texture
*/
uniform sampler2D uDitherMap;
// uniform float uAspect;
// uniform float uWindowHeight;


float map(float value, float min1, float max1, float min2, float max2) {
    return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

float ease(float t) {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453);
}
float random3(vec3 st) {
    return fract(sin(dot(st, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
}


vec4 dither(vec2 uv, float value){
    float width = 68.0;
    float height = 4.0;
    float steps = width / height;
    float offset = floor(value * steps) / steps;
    uv = floor(uv * height) / height;
    uv.x /= steps;
    uv.x += offset;
    vec4 color = vec4(uv.x, uv.y, 0., 1.);
    color = texture2D(uDitherMap, uv);
    return color;
}


// void main() {
//   vec2 uv = vUv;
//   uv.x = 1.0 - uv.x;
//   float size = uWindowHeight /32.;

//   vec2 pixel = floor(uv * size) / size;
//   vec2 pixelUv = fract(uv * size);

//   float circle = smoothstep(.5, .5 - .5 / size, length(pixelUv - .5));
  

//   vec4 color = vec4(uv.x, uv.y, 0., 1.0);
//   color = texture2D(uTexture, pixel);
  
//   float value = (color.r + color.g + color.b) / 3.0;
//   vec4 value4 = vec4(value, value, value, 1.0);
//   vec4 uv4 = vec4(pixel.x, pixel.y, 0., 1.0);
  
//   circle = 1.;

//   vec4 mixed = mix(dither(pixelUv,value), uv4, 1.- circle);

//   // gl_FragColor = dither(uv, value, size);
//   gl_FragColor = vec4(1., 0., 0., 1.0);
//   gl_FragColor = mixed;

// }
void mainImage(
  const in vec4 inputColor,
  const in vec2 vUv,
  out vec4 outputColor
){
  vec2 uv = vUv;
  // uv.x = 1.0 - uv.x;
  vec2 size = resolution / uPixelSize;


  vec2 pixel = floor(uv * size) / size;
  vec2 pixelUv = fract(uv * size);

  vec3 color = texture2D(inputBuffer, pixel).rgb;

  float value = (color.r + color.g + color.b) / 3.0;

  float factor = dither(pixelUv, value).x;


  outputColor = mix(
    vec4(color, 1.0),
    vec4(0.),
    1.-factor
  );
}
