import * as THREE from 'three';

// Predefined textures for planets (these would be in your 'public/textures' folder)
const textures = {
  mercury: 'exo-query/textures/2k_mercury.jpg',
  venus: 'exo-query/textures/2k_venus_surface.jpg',
  mars: 'exo-query/textures/2k_mars.jpg',
  jupiter: 'exo-query/textures/2k_jupiter.jpg',
  saturn: 'exo-query/textures/2k_saturn.jpg',
  uranus: 'exo-query/textures/2k_uranus.jpg',
  neptune: 'exo-query/textures/2k_neptune.jpg',
};

const temperatures = {
  terre: 288,     // Earth: Average surface temperature ~15°C (288K)
  mars: 210,      // Mars: Average surface temperature ~-60°C (210K)
  jupiter: 165,   // Jupiter: Upper atmosphere temperature ~-108°C (165K)
  saturne: 134,   // Saturn: Upper atmosphere temperature ~-139°C (134K)
  uranus: 76,     // Uranus: Upper atmosphere temperature ~-197°C (76K)
  neptune: 72,    // Neptune: Upper atmosphere temperature ~-200°C (72K)
  pluton: 44,     // Pluto: Average temperature ~-229°C (44K)
  haumea: 73,     // Haumea: Approximate surface temperature ~-200°C (73K)
  eris: 43,       // Eris: Average surface temperature ~-217°C (43K)
  null: null,     // No temperature data available for this
  eugenia: 90,    // Eugenia (asteroid): Approximate surface temperature ~-120°C (90K)
  sylvia: 90,     // Sylvia (asteroid): Approximate surface temperature ~-120°C (90K)
  orcus: 70,      // Orcus (dwarf planet): Approximate surface temperature ~-225°C (70K)
  ida: 200,       // Ida (asteroid): Approximate surface temperature ~-100°C (200K)
  kleopatra: 220, // Kleopatra (asteroid): Approximate surface temperature ~-50°C (220K)
  quaoar: 70,     // Quaoar (dwarf planet): Approximate surface temperature ~-220°C (70K)
  makemake: 75,   // Makemake (dwarf planet): Approximate surface temperature ~-239°C (75K)
};

// Function to select the closest texture based on the exoplanet's characteristics
function selectPlanetTexture(exoplanet) {
  let texturePath = textures.mercury; // Default to fallback texture

  if (exoplanet.bodyType === 'Gas Giant') {
    if (exoplanet.avgTemp > 500) {
      texturePath = textures.jupiter; // For hot gas giants, use Jupiter's texture
    } else {
      texturePath = textures.saturn; // Cooler gas giants, use Saturn's texture
    }
  } else if (exoplanet.bodyType === 'Rocky') {
    if (exoplanet.avgTemp > 300) {
      texturePath = textures.venus; // Hot rocky planet, use Venus's texture
    } else {
      texturePath = textures.mars; // Cooler rocky planet, use Mars's texture
    }
  }

  return texturePath;
}

// Function to map temperature to a color (from blue to red)
function temperatureToColor(avgTemp) {
  // Define the min and max temperature values for scaling
  const minTemp = 50;  // Coldest (Pluto)
  const maxTemp = 400; // Hottest (Hot planets)

  // Normalize the temperature value between 0 and 1
  const normalizedTemp = Math.min(Math.max((avgTemp - minTemp) / (maxTemp - minTemp), 0), 1);

  // Create a color using a hue-saturation-lightness (HSL) scale
  // 0 (blue) -> 1 (red)
  const color = new THREE.Color();
  color.setHSL(1 - normalizedTemp, 1, 0.5);  // Saturation = 100%, Lightness = 50% (bright colors)

  return color;
}

// Function to generate a more complex and specific planet texture with cloud layers
export function generatePlanetTexture(exoplanet) {
  return new Promise((resolve, reject) => {
    let { meanRadius, avgTemp, bodyType, density, axialTilt, aroundPlanet } = exoplanet;

    if (aroundPlanet && aroundPlanet.planet) {
      avgTemp = temperatures[aroundPlanet.planet];
    }

    // Use the temp ranges of known bodies
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const textureSize = 1024;  // Increase resolution for more detail

    canvas.width = textureSize;
    canvas.height = textureSize;

    // Step 1: Select the most appropriate texture
    const texturePath = selectPlanetTexture(exoplanet);

    // Load the selected base texture
    const textureLoader = new THREE.TextureLoader();
    console.log('Attempting to load texture from:', texturePath);
    textureLoader.load(
      texturePath, // Texture path
      (baseTexture) => {
        // Success callback
        console.log('Texture loaded successfully!');

        // Step 2: Start creating the texture using the base texture
        context.drawImage(baseTexture.image, 0, 0, textureSize, textureSize);

        // Step 3: Modify the texture based on the exoplanet's properties (Temperature, Density, Axial Tilt)
        let baseColor = temperatureToColor(avgTemp);  // Get color based on temperature

        // Adjust color for density (rocky vs gas giant)
        if (density > 5) {
          baseColor = baseColor.multiplyScalar(0.8); // Darker for higher density
        }

        // Apply axial tilt for polar ice caps (near the poles)
        const polarEffect = 0.4; // Threshold for the polar region
        const textureData = context.getImageData(0, 0, textureSize, textureSize);
        const data = textureData.data;

        for (let y = 0; y < textureSize; y++) {
          for (let x = 0; x < textureSize; x++) {
            const nx = x / textureSize - 0.5;
            const ny = y / textureSize - 0.5;

            // Apply axial tilt to make the poles more icy for planets with higher axial tilt
            if (Math.abs(ny) > polarEffect && Math.abs(nx) < 0.5) {
              if (axialTilt > 20) {
                const index = (y * textureSize + x) * 4;
                data[index] = 255;  // Ice cap (white)
                data[index + 1] = 255;
                data[index + 2] = 255;
              }
            }

            // Modify pixel color based on temperature and density
            const index = (y * textureSize + x) * 4;
            const color = new THREE.Color(
              data[index] / 255,  // Red
              data[index + 1] / 255,  // Green
              data[index + 2] / 255   // Blue
            );

            // Apply base color adjustment
            color.multiply(baseColor);

            // Update the pixel data
            data[index] = color.r * 255;
            data[index + 1] = color.g * 255;
            data[index + 2] = color.b * 255;
          }
        }

        context.putImageData(textureData, 0, 0);

        // Step 4: Return the final texture
        const texture = new THREE.CanvasTexture(canvas);
        texture.encoding = THREE.LinearSRGBColorSpace; // Correct color space encoding

        resolve(texture);  // Resolve the promise with the texture
      },
      undefined,  // No progress callback needed
      (error) => {
        // Error callback
        console.error(`Error loading texture at ${texturePath}:`, error.target?.src || error);

        // Use fallback texture
        textureLoader.load(
          textures.mercury,
          (fallbackTexture) => {
            console.warn('Using fallback texture.');
            resolve(fallbackTexture);
          },
          undefined,
          (fallbackError) => {
            console.error('Error loading fallback texture:', fallbackError);
            reject(fallbackError);
          }
        );
      }
    );
  });
}