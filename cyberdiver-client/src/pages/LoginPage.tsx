import { usePrivy } from '@privy-io/react-auth';

export default function LoginPage() {
  const { login } = usePrivy();

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-red-500 mb-3">
            CYBERDIVER
          </h1>
          <p className="text-gray-400 text-sm tracking-widest uppercase">5vs5 FPS MOBA × Blockchain</p>
        </div>

        {/* Login button */}
        <button
          onClick={login}
          className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-bold py-4 rounded-lg transition-all uppercase tracking-widest text-lg shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40"
        >
          LOG IN / SIGN UP
        </button>

        <p className="text-center text-gray-600 text-xs mt-6">
          Powered by Polygon Blockchain
        </p>
      </div>
    </div>
  );
}
