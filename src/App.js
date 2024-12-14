import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { getExoplanets } from './api';  // Import API function to fetch exoplanets
import { generatePlanetTexture } from './generatePlanetTexture.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';


const App = () => {
  const [exoplanets, setExoplanets] = useState([]);
  const [selectedExoplanet, setSelectedExoplanet] = useState(null);
  const [loading, setLoading] = useState(true);  // Loading state
  const [isCollapsed, setIsCollapsed] = useState(true);  // State to track if the details are collapsed
  const [meteorSize, setMeteorSize] = useState(10); // Default meteor size

  const canvasRef = useRef(null);
  const sceneRef = useRef(null); // Create a reference for the scene
  const rendererRef = useRef(null);
  const planetRef = useRef(null);  // Ref to track the 3D planet
  const cloudRef = useRef(null);  // Ref to track the cloud layer
  const meteorRef = useRef(null);  // Ref for meteor object
  const controlsRef = useRef(null);  // Ref for OrbitControls
  
  // console.log(new Set (exoplanets.map(planet => planet.bodyType)) )

  // Fetch exoplanets data
  useEffect(() => {
    const fetchExoplanets = async () => {
      try {
        const exoplanetData = await getExoplanets();
        setExoplanets(exoplanetData.bodies); // Assume data is an array of exoplanets
        setLoading(false);  // Set loading to false once data is fetched
      } catch (error) {
        console.error("Error fetching exoplanets:", error);
        setLoading(false);  // Set loading to false in case of error
      }
    };

    fetchExoplanets();
  }, []);

  // Randomly select an exoplanet from the list
  useEffect(() => {
    if (exoplanets.length > 0) {
      const randomIndex = Math.floor(Math.random() * exoplanets.length);
      setSelectedExoplanet(exoplanets[randomIndex]);
    }
  }, [exoplanets]);

  // Create Three.js scene when selectedExoplanet changes
  useEffect(() => {
    if (!selectedExoplanet) return;

    // Set up the Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current });
    renderer.setSize(window.innerWidth, window.innerHeight);
    rendererRef.current = renderer;  // Store renderer ref
    sceneRef.current = scene; // Save scene for cleanup

    // Planet's base radius and scaling
    const baseRadius = 5; // Base radius for Earth-like planets
    const planetRadius = selectedExoplanet.meanRadius || 1; // Default to 1 if not available
    const scaledRadius = baseRadius * planetRadius; // Scale the planet's radius

    // Create the geometry for the planet
    const geometry = new THREE.SphereGeometry(scaledRadius, 32, 32);

    // Use generatePlanetTexture to create a dynamic texture based on the exoplanet's data
    generatePlanetTexture(selectedExoplanet).then((texture) => {
      // Apply the texture to the planet material
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping; // Allow the texture to repeat
      const material = new THREE.MeshBasicMaterial({ map: texture, wireframe: false });

      // Create the planet mesh with the generated texture
      const planet = new THREE.Mesh(geometry, material);
      planetRef.current = planet; // Store planet ref
      scene.add(planet);

      // Create cloud layer (simpler and organic with soft clouds)
      const cloudGeometry = new THREE.SphereGeometry(scaledRadius * 1.05, 32, 32); // Slightly larger than planet
      const cloudMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0, // Soft, organic opacity
        wireframe: false, // Wireframe is disabled for smoother look
      });
      const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
      cloudRef.current = clouds;
      scene.add(clouds);

      // Adjust the camera position so that the planet fits perfectly within the view
      const distanceToPlanet = scaledRadius * 2; // Camera should be at least twice the planet's radius away
      camera.position.z = distanceToPlanet;

      // Set axial tilt (rotate planet mesh along X or Z axis depending on the tilt)
      const axialTilt = selectedExoplanet.axialTilt || 0;  // Default to 0 if not available
      planet.rotation.x = THREE.MathUtils.degToRad(axialTilt);  // Apply axial tilt

      // Adjust the field of view based on the planet's size
      const fovAdjustment = Math.max(40, 75 - (scaledRadius / 2)); // Limit FOV adjustment to a reasonable range
      camera.fov = fovAdjustment;
      camera.updateProjectionMatrix();

      // Add OrbitControls for user interaction
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true; // Enable damping (smooth movement)
      controls.dampingFactor = 0.25; // Damping factor
      controls.screenSpacePanning = false; // Disable screen space panning
      controls.maxPolarAngle = Math.PI / 2; // Prevent flipping the camera upside down
      controlsRef.current = controls; // Store controls reference

      // Animation loop
      const animate = () => {
        requestAnimationFrame(animate);

        // Update the controls
        controls.update();

        // Rotate the planet (scaled rotation speed)
        planet.rotation.y += 0.005; // Slow and organic rotation speed

        // Slowly rotate the cloud layer for a dynamic effect
        clouds.rotation.y += 0.001; // Cloud layer rotation is slower than the planet

        renderer.render(scene, camera);
      };

      // Start the animation loop
      animate();

      // Handle window resizing
      const handleResize = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        renderer.setSize(width, height); // Adjust the renderer size
        camera.aspect = width / height; // Adjust the camera aspect ratio
        camera.updateProjectionMatrix(); // Update the camera projection matrix
      };

      window.addEventListener('resize', handleResize);  // Attach the resize event listener

      // Cleanup function
      return () => {
        renderer.dispose(); // Cleanup the renderer
        window.removeEventListener('resize', handleResize);  // Remove the resize event listener
      };
    }).catch((error) => {
      console.error("Error loading texture:", error);
    });

  }, [selectedExoplanet]);  // Re-create scene on exoplanet change

  // Loading page (you can customize this further, e.g., adding a spinner)
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  // Handle random selection of an exoplanet
  const handleRandomExoplanet = () => {
    const randomIndex = Math.floor(Math.random() * exoplanets.length);
    setSelectedExoplanet(exoplanets[randomIndex]);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ position: 'relative', display: 'flex' }}>
        <canvas ref={canvasRef}></canvas>

        {/* Temperature Color Scale */}
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: 'linear-gradient(to right, blue, green, yellow, red)',
          height: '20px',
          width: '300px',
          borderRadius: '10px',
          boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 10px',
          fontSize: '12px',
          color: 'white',
        }}>
          <span>50K</span>
          <span>150K</span>
          <span>300K</span>
          <span>400K</span>
        </div>

        {/* Collapsible Details Section */}
        <div style={{
          position: 'absolute', top: '1%', right: '1%', background: 'rgba(255, 255, 255, 0.7)',
          padding: '10px', borderRadius: '8px', maxWidth: '300px', maxHeight: '80vh', overflowY: 'auto',
          transition: 'max-height 0.3s ease, padding 0.3s ease',
          maxHeight: isCollapsed ? '50px' : '80vh', paddingBottom: isCollapsed ? '5px' : '15px',
          paddingTop: '0px'
        }}>
          <h3>
            Details 
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)} 
              style={{ 
                background: 'transparent', 
                border: 'none', 
                cursor: 'pointer',
                fontSize: '16px',
                marginLeft: '10px'
              }}>
              {isCollapsed ? '>' : '<'}
            </button>
          </h3>

          {
            !isCollapsed && selectedExoplanet && (
              <div>
                <p><strong>Name:</strong> {selectedExoplanet.name || 'N/A'}</p>
                <p><strong>Alternative Name:</strong> {selectedExoplanet.alternativeName || 'N/A'}</p>
                <p><strong>Aphelion:</strong> {selectedExoplanet.aphelion || 'N/A'}</p>
                <p><strong>Around Planet:</strong> {selectedExoplanet.aroundPlanet && selectedExoplanet.aroundPlanet.planet || 'N/A'}</p>
                <p><strong>Avg Temp:</strong> {selectedExoplanet.avgTemp || 'N/A'}</p>
                <p><strong>Axil Tilt:</strong> {selectedExoplanet.axialTilt || 'N/A'}</p>
                <p><strong>Body Type:</strong> {selectedExoplanet.bodyType || 'N/A'}</p>
                <p><strong>Density:</strong> {selectedExoplanet.density || 'N/A'}</p>
                <p><strong>Discovery Date:</strong> {selectedExoplanet.discoveryDate || 'N/A'}</p>
                <p><strong>Discovered By:</strong> {selectedExoplanet.discoveredBy || 'N/A'}</p>
                <p><strong>Eccentricity:</strong> {selectedExoplanet.eccentricity || 'N/A'}</p>
                <p><strong>Mean Radius:</strong> {`${selectedExoplanet.meanRadius} R⊕` || 'N/A'}</p>
              </div>
            )
          }
        </div>

        {/* Dropdown for selecting exoplanets */}
        <div style={{
          position: 'absolute', top: '1%', left: '1%', background: 'rgba(255, 255, 255, 0.7)',
          padding: '10px', borderRadius: '8px'
        }}>
          <select 
            value={exoplanets.indexOf(selectedExoplanet)} 
            onChange={(e) => setSelectedExoplanet(exoplanets[e.target.selectedIndex])}>
            {exoplanets.map((exoplanet, index) => (
              <option key={index} value={index}>{exoplanet.name}</option>
            ))}
          </select>

          <button onClick={handleRandomExoplanet} style={{
            marginTop: '10px', padding: '2px 10px', cursor: 'pointer', background: '#007bff',
            color: 'white', border: 'none', borderRadius: '4px'
          }}>
            Random Exoplanet
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
