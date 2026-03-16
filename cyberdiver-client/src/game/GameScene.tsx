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
        camera={{ fov: 75, near: 0.1, far: 200 }}
        style={{ background: '#0a0a1a' }}
      >
        <ambientLight intensity={0.15} />
        <directionalLight
          position={[50, 50, 25]}
          intensity={0.3}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={150}
          shadow-camera-left={-60}
          shadow-camera-right={60}
          shadow-camera-top={60}
          shadow-camera-bottom={-60}
        />
        <hemisphereLight args={['#1a0a2e', '#0a1a2e', 0.3]} />

        <Sky
          distance={450000}
          sunPosition={[0, -1, 0]}
          inclination={0}
          azimuth={0.25}
          rayleigh={0.1}
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
