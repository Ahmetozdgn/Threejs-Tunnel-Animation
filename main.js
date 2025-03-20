import * as THREE from "https://esm.sh/three";

// 🚀 1. Sahne, Kamera ve Renderer Kurulumu
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 0;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x141414); // Arka plan rengi koyu gri
document.body.appendChild(renderer.domElement);

// 🎨 2. Shader için Uniform Değerleri (Materyal Özellikleri)
const uniforms = {
  uSmoothness: { value: 1.0 }, // Grid çizgilerinin yumuşaklığı
  uGridDensity: { value: 26.0 }, // Grid yoğunluğu
  uNoiseScale: { value: 10.0 }, // Perlin noise ölçeği (frekansı)
  uNoiseSpeed: { value: 0.5 }, // Noise animasyon hızı
  uNoiseStrength: { value: 0.15 }, // Noise etkisinin şiddeti
  uEnableDisplacement: { value: true }, // Noise etkisini aç/kapat
  uTime: { value: 0.0 }, // Noise animasyonu için zaman
  uWireColor: { value: new THREE.Color(0xffffff) }, // Tel kafes çizgi rengi (Beyaz)
  uBaseColor: { value: new THREE.Color(0x141414) }, // Arka plan rengi (Koyu gri)
};

// 🧵 3. Shader Materyali (Tel Kafes Efekti ve Noise Değişkenleri)
const wireframeMaterial = new THREE.ShaderMaterial({
  uniforms: uniforms,
  vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv; // UV koordinatlarını fragment shadera aktarıyoruz
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
  fragmentShader: `
        uniform float uSmoothness;
        uniform float uGridDensity;
        uniform float uNoiseScale;
        uniform float uNoiseSpeed;
        uniform float uNoiseStrength;
        uniform bool uEnableDisplacement;
        uniform float uTime;
        uniform vec3 uWireColor;
        uniform vec3 uBaseColor;

        varying vec2 vUv;

        // 🔢 Basit Perlin Noise Fonksiyonu (Noise Efekti İçin)
        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }

        float noise(vec2 st) {
            vec2 i = floor(st);
            vec2 f = fract(st);

            float a = random(i);
            float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0));
            float d = random(i + vec2(1.0, 1.0));

            vec2 u = f * f * (3.0 - 2.0 * f);

            return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        void main() {
            // 🕸️ Grid Çizgilerini Oluştur
            vec2 grid = abs(fract(vUv * uGridDensity - 0.5) - 0.5);
            vec2 gridWidth = fwidth(vUv * uGridDensity);
            float lineX = smoothstep(0.0, gridWidth.x * uSmoothness, grid.x);
            float lineY = smoothstep(0.0, gridWidth.y * uSmoothness, grid.y);
            float line = 1.0 - min(lineX, lineY);

            // 🌊 Perlin Noise Efekti (Dalgalanma)
            float noiseValue = 0.0;
            if (uEnableDisplacement) {
                noiseValue = noise(vUv * uNoiseScale + uTime * uNoiseSpeed) * uNoiseStrength;
            }

            // 🌈 Renk Karışımı (Tel Kafes + Noise)
            vec3 finalColor = mix(uBaseColor, uWireColor, line);
            finalColor += noiseValue; // Noise etkisini ekle

            gl_FragColor = vec4(finalColor, 1.0);
        }
    `,
  side: THREE.BackSide, // Tünelin iç kısmını göster
});

// 🔄 4. Tünelin Şekli (Spline Path ve Tube Geometry Kullanımı)
const path = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, -10),
  new THREE.Vector3(3, 2, -20),
  new THREE.Vector3(-3, -2, -30),
  new THREE.Vector3(0, 0, -40),
  new THREE.Vector3(2, 1, -50),
  new THREE.Vector3(-2, -1, -60),
  new THREE.Vector3(0, 0, -70),
]);

const geometry = new THREE.TubeGeometry(path, 300, 2, 32, false);
const tube = new THREE.Mesh(geometry, wireframeMaterial);
scene.add(tube);

// 🎮 5. Mouse Hareketi ile Kamera Sarsıntısı Efekti
const mouse = { x: 0, y: 0 };

window.addEventListener("mousemove", (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

// 📌 6. GSAP Kullanarak Kamera Hareketi
let percentage = { value: 0 };
gsap.to(percentage, {
  value: 1,
  duration: 10,
  ease: "linear",
  repeat: -1,
  onUpdate: () => {
    const p1 = path.getPointAt(percentage.value);
    const p2 = path.getPointAt((percentage.value + 0.01) % 1);

    // 🌀 Hafif Mouse Shake Efekti
    const shakeX = mouse.x * 0.3;
    const shakeY = mouse.y * 0.3;

    camera.position.set(p1.x + shakeX, p1.y + shakeY, p1.z);
    camera.lookAt(p2);
  },
});

// ▶️ 7. Animasyon Döngüsü
function render() {
  uniforms.uTime.value += 0.01; // Noise için zaman arttır
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

render();

// 🔄 8. Pencere Boyut Değişimine Duyarlılık
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ✅ 9. Noise Efektini Aç/Kapatma Fonksiyonu
function toggleDisplacement(enable) {
  uniforms.uEnableDisplacement.value = enable;
  console.log("Displacement Enabled:", enable);
}

// Noise efekti kapalı başlatılıyor
toggleDisplacement(false);
