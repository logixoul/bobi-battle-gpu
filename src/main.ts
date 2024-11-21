import * as THREE from 'three';
import { shade2, lx } from './shade';
import * as ImgProc from './ImgProc.js';
import { globals } from './Globals.js';
import './Input.js'; // for side fx
import * as util from './util';
import { Image } from "./Image.js";
import { FramerateCounter } from "./FramerateCounter";
import * as KeysHeld from './KeysHeld';
import * as PresentationForIashu from './presentationForIashu';

const ZOOM_FACTOR:number = 0.1;

function initStateTex() {
	var documentW = window.innerWidth;
	var documentH = window.innerHeight;
	
	var img = new Image(
		Math.trunc(documentW), Math.trunc(documentH),
		Float32Array);
		//Uint8Array);

	//img.forEach((x : number, y : number) => img.set(x, y, Math.random()));

	globals.stateTex = new THREE.DataTexture(img.data, img.width, img.height, THREE.RedFormat,
			THREE.FloatType);
			//THREE.UnsignedByteType);
	globals.stateTex.generateMipmaps = false;
	globals.stateTex.minFilter = THREE.LinearFilter;
	globals.stateTex.magFilter = THREE.LinearFilter;
	globals.stateTex.needsUpdate = true;

	globals.stateTex = shade2([globals.stateTex],
		`_out.r = fetch1();`, { itype:
			THREE.UnsignedByteType,
			//THREE.HalfFloatType,
			//THREE.FloatType,
		releaseFirstInputTex: true });

	util.renderer.setSize( window.innerWidth, window.innerHeight );
}

initStateTex();

//const backgroundPicTex = new THREE.TextureLoader().load( 'assets/background.jpg' );

document.defaultView!.addEventListener("resize", initStateTex);



function animate(now: DOMHighResTimeStamp) {
	let tex2 = shade2([globals.stateTex],
		`

    //const vec2 zoomP = vec2(-.7451544,.1861545);
    const vec2 zoomP = vec2(-.7451544,.1853);
    const float zoomTime = 70.0;
	const float iTime = 0.0;
	vec2 iResolution = vec2(textureSize(tex1, 0));
    float tTime = 9.0 + abs(mod(iTime+zoomTime,zoomTime*2.0)-zoomTime);
    tTime = (145.5/(.0005*pow(tTime,5.0)));
    vec2 aspect = vec2(1,iResolution.y/iResolution.x);
    //vec2 mouseNorm = mouse / iResolution.x;//iMouse.xy/iResolution.x;
	vec2 mouseNorm = vec2(.5, .5);
    
    vec4 outs = vec4(0.0);
    
    for(int i = 0; i < samples; i++) {        
        vec2 fragment = (gl_FragCoord.xy+offsets[i])/iResolution.xy;    
        //vec2 uv = fragment*2.0 - vec2(0.5, 0.5);
		vec2 uv = vec2(
			mix(REAL_SET_start, REAL_SET_end, fragment.x),
			mix(IMAGINARY_SET_start, IMAGINARY_SET_end, fragment.y)
		);
        outs += mapColor(testMandelbrot(uv));
    }
	_out = outs/float(samples);

		`,
		{releaseFirstInputTex: false,
			uniforms: {
				REAL_SET_start: new THREE.Uniform(globals.REAL_SET.start),
				REAL_SET_end: new THREE.Uniform(globals.REAL_SET.end),
				IMAGINARY_SET_start: new THREE.Uniform(globals.IMAGINARY_SET.start),
				IMAGINARY_SET_end: new THREE.Uniform(globals.IMAGINARY_SET.end),
			},
			lib:
			`		// set samples from 1-16 for quality selection
const int samples = 1;
// set iterations from 1000 for speed to 3000 for completeness
const int iterations = 100;

vec2 complexMult(vec2 a, vec2 b) {
	return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x);
}
struct Complex {
    float real;
    float imag;
};

// Function to raise a complex number (base) to a complex power (exponent)
vec2 complexPow(vec2 base, vec2 exponent) {
    // Extract real and imaginary parts of the base and exponent
    float a = base.x;
    float b = base.y;
    float c = exponent.x;
    float d = exponent.y;

    // Calculate modulus and argument (angle) of the base
    float modulus = sqrt(a * a + b * b);
    float arg = atan(b, a);

    // Calculate log modulus and real and imaginary parts of the exponent term
    float logModulus = log(modulus);
    float realPart = exp(c * logModulus - d * arg);
    float imaginaryPart = c * arg + d * logModulus;

    // Calculate final real and imaginary parts using Euler's formula
    vec2 result;
    result.x = realPart * cos(imaginaryPart);
    result.y = realPart * sin(imaginaryPart);

    return result;
}

/*Complex conjugate(Complex c) {
	return Complex(c.real, -c.imag);
}*/

vec2 complexSin(vec2 z) {
    float realPart = sin(z.x) * cosh(z.y);
    float imagPart = cos(z.x) * sinh(z.y);
    return vec2(realPart, imagPart);
}

vec2 complexCos(vec2 z) {
    float realPart = cos(z.x) * cosh(z.y);
    float imagPart = -sin(z.x) * sinh(z.y);
    return vec2(realPart, imagPart);
}

vec2 complexExp(vec2 z) {
    float expReal = exp(z.x) * cos(z.y);
    float expImag = exp(z.x) * sin(z.y);
    return vec2(expReal, expImag);
}

vec2 complexLog(vec2 z) {
    float magnitude = length(z);
    float angle = atan(z.y, z.x);
    return vec2(log(magnitude), angle);
}

vec2 complexDiv(vec2 a, vec2 b) {
    float modulusSquared = b.x * b.x + b.y * b.y;
    return vec2((a.x * b.x + a.y * b.y) / modulusSquared,
                (a.y * b.x - a.x * b.y) / modulusSquared);
}

vec2 complexMul(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

vec2 complexSuperRoot(vec2 z) {
    vec2 w = vec2(1.0, 0.0); // Initial guess
    for (int i = 0; i < 10; i++) {
        vec2 wLogW = complexMul(w, complexLog(w)); // w * log(w)
        vec2 numerator = complexLog(z);
        numerator = complexDiv(numerator, complexLog(w));
        vec2 denominator = vec2(1.0, 0.0);
        w = complexDiv(w, numerator);
    }
    return w; // ?????????????
}

vec2 complexInverse(vec2 z) {
    float modulusSquared = z.x * z.x + z.y * z.y;
    return vec2(z.x / modulusSquared, -z.y / modulusSquared);
}

float testMandelbrot(vec2 coord) {
	//vec2 testPoint = vec2(0.0,0.0);
	
    vec2 z = coord;
	vec2 result = z;
	for (int i = 0; i < iterations; i++){
		result = complexPow(z, complexInverse(result));
		if(isnan(result.x)||isnan(result.y))
			//return 100.0;
			return float(i)/float(100);
		//if(result.x == 0.0 || result.y == 0.0)
		//	return 100.0;
		//if(length(result)>1000000.0)
		//	return 100.0;
		//z = complexMult(z, z);
		//z+= coord;

		//testPoint = z;
    
        /*float ndot = dot(testPoint,testPoint);
		if (ndot > 2.0) {
            float sl = float(i) - log2(log2(ndot))+4.0;
			return sl*.0025;
		}*/
	}
	//return 0.0;
	//return length(result);
	return 0.0;
}
vec4 palette( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d )
{
	return vec4(a + b*cos( 6.283185*(c*t+d) ), 1.0);
}
vec4 mapColor(float f) {
	//return vec4(vec3(mcol), 1.0);
	f = sqrt(f); // lx
	return vec4(0.5 + 0.5*cos(2.7+f*30.0 + vec3(0.0,.6,1.0)),1.0);
}
const float offsetsD = .5;
const float offsetsD2 = .25;
const float offsetsD3 = .125;
const float offsetsD4 = .075;
const vec2 offsets[16] = vec2[](
    vec2(-offsetsD,-offsetsD),
    vec2(offsetsD,offsetsD),
    vec2(-offsetsD,offsetsD),
    vec2(offsetsD,-offsetsD),
    vec2(-offsetsD2,-offsetsD2),
    vec2(offsetsD2,offsetsD2),
    vec2(-offsetsD2,offsetsD2),
    vec2(offsetsD2,-offsetsD2),
    vec2(-offsetsD3,-offsetsD3),
    vec2(offsetsD3,offsetsD3),
    vec2(-offsetsD3,offsetsD3),
    vec2(offsetsD3,-offsetsD3),
    vec2(-offsetsD4,-offsetsD4),
    vec2(offsetsD4,offsetsD4),
    vec2(-offsetsD4,offsetsD4),
    vec2(offsetsD4,-offsetsD4)
);
`
		}
	)
	
	//requestAnimationFrame( animate );
	setTimeout(animate, 100);
	
	if(KeysHeld.global_keysHeld["digit1"]) {
		var toDraw = shade2([tex2!], `
		float state = fetch1(tex1);
		//state = .5 * state;
		_out.r = state;`
		, {
			releaseFirstInputTex: true
		}
		);
		util.drawToScreen(toDraw, false);
		return;
	}

	shade2([tex2?.get()!], ` // todo: rm the ! and ? when I've migrated ImgProc to TS.
		float d = fetch1() - fetch1(tex1, tc - vec2(0, tsize1.y));
		_out.rgb = fetch3();
		float specular = max(-d, 0.0f);
		//_out.rgb += specular * vec3(1); // specular
		//if(d>0.0f)_out.rgb /= 1.0+d; // shadows
		//_out.rgb /= _out.rgb + 1.0f;
		//_out.rgb = pow(_out.rgb, vec3(1.0/2.2)); // gamma correction
		`, {
			toScreen: true,
			releaseFirstInputTex: true
		});
}
requestAnimationFrame(animate);
