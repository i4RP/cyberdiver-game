import { Canvas } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import GameMap from './components/GameMap';
import FPSController from './components/FPSController';
import ShootingSystem from './components/ShootingSystem';
import CyberSouls from './components/CyberSouls';
import EnemyPlayers from './components/EnemyPlayers';
import WeaponView from './components/WeaponView';
import BattleTimer from './components/BattleTimer';
import Crosshair from './components/Crosshair';
import HUD from './components/HUD';
import Deployables from './components/Deployables';
import WebSocketSync from './systems/WebSocketSync';
import TouchControls from './components/TouchControls';

export default function GameScene() {
  return (
    <div className="w-full h-screen relative">
      <Canvas
        shadows
        camera={{ fov: 75, near: 0.1, far: 300 }}
        gl={{ antialias: true, toneMapping: 3, toneMappingExposure: 1.3 }}
        style={{ background: '#050510' }}
      >
        {/* Enhanced lighting for better visual quality */}
        <ambientLight intensity={0.3} color="#8899cc" />
        <directionalLight
          position={[60, 80, 30]}
          intensity={0.7}
          color="#eeddff"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={200}
          shadow-camera-left={-80}
          shadow-camera-right={80}
          shadow-camera-top={80}
          shadow-camera-bottom={-80}
          shadow-bias={-0.001}
        />
        {/* Fill light from opposite side */}
        <directionalLight
          position={[-40, 30, -20]}
          intensity={0.2}
          color="#4488ff"
        />
        <hemisphereLight args={['#334488', '#0a0a2e', 0.5]} />

        {/* Gradient sky */}
        <Sky
          distance={450000}
          sunPosition={[100, 20, 50]}
          inclination={0.52}
          azimuth={0.25}
          rayleigh={1.2}
          turbidity={6}
          mieCoefficient={0.005}
          mieDirectionalG={0.8}
        />

        <GameMap />
        <FPSController />
        <ShootingSystem />
        <CyberSouls />
        <EnemyPlayers />
        <WeaponView />
        <Deployables />
        <BattleTimer />
      </Canvas>
      <WebSocketSync />
      <Crosshair />
      <HUD />
      <TouchControls />
    </div>
  );
}
