import { useState, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import api from '../services/api';

type Tab = 'overview' | 'wallet' | 'rewards' | 'history';

interface EconomyDashboard {
  total_pool_matic: number;
  monthly_pool_matic: number;
  total_distributed_matic: number;
  total_margin_matic: number;
  monthly_active_players: number;
  monthly_battles: number;
  current_margin_percent: number;
  distributions: Array<{
    id: string;
    period_start: string;
    period_end: string;
    total_pool_matic: number;
    margin_percent: number;
    distributed_at: string;
  }>;
}

interface EconomyProfile {
  wallet: { address: string | null; balance_matic: number };
  total_bp: number;
  total_wagered_matic: number;
  total_earned_matic: number;
  net_profit_matic: number;
  wins: number;
  losses: number;
  total_battles: number;
  win_rate: number;
  transactions: Array<{
    id: string;
    tx_type: string;
    amount_matic: number;
    status: string;
    created_at: string;
  }>;
  pending_rewards: Array<{
    id: string;
    payout_matic: number;
    bp_total: number;
    bp_share_percent: number;
    period_start: string;
    period_end: string;
  }>;
  claimed_rewards: Array<{
    id: string;
    payout_matic: number;
    bp_total: number;
    period_start: string;
    period_end: string;
  }>;
  monthly_stats: Array<{
    month: string;
    bp: number;
    wagered: number;
    battles: number;
  }>;
}

interface TokenInfo {
  name: string;
  symbol: string;
  network: string;
  description: string;
  total_supply: string;
  distribution_model: string;
  margin_schedule: Array<{
    phase: string;
    margin_percent: number;
    note: string;
  }>;
}

export default function EconomyPage() {
  const setScreen = useGameStore((s) => s.setScreen);
  const user = useGameStore((s) => s.user);
  const [tab, setTab] = useState<Tab>('overview');
  const [dashboard, setDashboard] = useState<EconomyDashboard | null>(null);
  const [profile, setProfile] = useState<EconomyProfile | null>(null);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dash, prof, token] = await Promise.all([
        api.getEconomyDashboard().catch(() => null),
        api.getEconomyProfile().catch(() => null),
        api.getTokenInfo().catch(() => null),
      ]);
      if (dash) setDashboard(dash);
      if (prof) setProfile(prof);
      if (token) setTokenInfo(token);
    } catch (err) {
      console.error('Failed to load economy data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimAll = async () => {
    setClaiming(true);
    setMessage('');
    try {
      const result = await api.claimAllRewards();
      setMessage(result.message || 'Rewards claimed!');
      await loadData();
    } catch (err: unknown) {
      const error = err as Error;
      setMessage(error.message || 'Failed to claim rewards');
    } finally {
      setClaiming(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !withdrawAddress) return;
    setWithdrawing(true);
    setMessage('');
    try {
      const result = await api.withdraw(parseFloat(withdrawAmount), withdrawAddress);
      setMessage(result.message || 'Withdrawal initiated');
      setWithdrawAmount('');
      setWithdrawAddress('');
      await loadData();
    } catch (err: unknown) {
      const error = err as Error;
      setMessage(error.message || 'Withdrawal failed');
    } finally {
      setWithdrawing(false);
    }
  };

  const formatMatic = (v: number) => (v ?? 0).toFixed(4);
  const formatDate = (d: string) => d?.split('T')[0] || d?.split(' ')[0] || d;

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      {/* Header */}
      <header className="border-b border-cyan-900/50 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setScreen('lobby')}
              className="text-gray-400 hover:text-cyan-400 text-sm transition-colors"
            >
              &larr; LOBBY
            </button>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500">
              GameFi Economy
            </h1>
          </div>
          <div className="text-right">
            <div className="text-sm text-cyan-400">{user?.display_name || user?.username}</div>
            <div className="text-xs text-yellow-400 font-mono">
              {formatMatic(profile?.wallet?.balance_matic ?? 0)} MATIC
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6 pt-4">
        <div className="flex gap-1 border-b border-gray-800">
          {(['overview', 'wallet', 'rewards', 'history'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-mono uppercase transition-colors border-b-2 ${
                tab === t
                  ? 'text-cyan-400 border-cyan-400'
                  : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="max-w-7xl mx-auto px-6 pt-3">
          <div className="bg-cyan-900/20 border border-cyan-700/50 text-cyan-300 text-sm rounded px-4 py-2">
            {message}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-cyan-400 animate-pulse text-lg">Loading economy data...</div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-6 py-6">
          {tab === 'overview' && <OverviewTab dashboard={dashboard} tokenInfo={tokenInfo} profile={profile} />}
          {tab === 'wallet' && (
            <WalletTab
              profile={profile}
              withdrawAmount={withdrawAmount}
              setWithdrawAmount={setWithdrawAmount}
              withdrawAddress={withdrawAddress}
              setWithdrawAddress={setWithdrawAddress}
              withdrawing={withdrawing}
              onWithdraw={handleWithdraw}
            />
          )}
          {tab === 'rewards' && (
            <RewardsTab
              profile={profile}
              claiming={claiming}
              onClaimAll={handleClaimAll}
            />
          )}
          {tab === 'history' && <HistoryTab profile={profile} formatDate={formatDate} />}
        </div>
      )}
    </div>
  );
}

// --- Overview Tab ---
function OverviewTab({
  dashboard,
  tokenInfo,
  profile,
}: {
  dashboard: EconomyDashboard | null;
  tokenInfo: TokenInfo | null;
  profile: EconomyProfile | null;
}) {
  return (
    <div className="space-y-6">
      {/* Zero-Sum Model Explanation */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-yellow-700/50 rounded-lg p-6">
        <h2 className="text-lg font-bold text-yellow-400 mb-2 uppercase tracking-wider">
          Zero-Sum GameFi Model
        </h2>
        <p className="text-gray-300 text-sm leading-relaxed">
          All MATIC wagered in battles goes into a monthly pool. At the end of each month, the pool
          (minus operating margin) is distributed to all players proportionally based on their Battle Points (BP).
          The better you play, the larger your share.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-4">
          <div className="text-center bg-black/30 rounded p-3">
            <div className="text-xs text-gray-500 uppercase">Wager Pool</div>
            <div className="text-xl font-bold text-yellow-400">100%</div>
          </div>
          <div className="text-center bg-black/30 rounded p-3">
            <div className="text-xs text-gray-500 uppercase">Margin</div>
            <div className="text-xl font-bold text-red-400">{dashboard?.current_margin_percent ?? 3.5}%</div>
          </div>
          <div className="text-center bg-black/30 rounded p-3">
            <div className="text-xs text-gray-500 uppercase">To Players</div>
            <div className="text-xl font-bold text-green-400">{(100 - (dashboard?.current_margin_percent ?? 3.5)).toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Global Economy Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Pool" value={`${(dashboard?.total_pool_matic ?? 0).toFixed(2)} MATIC`} color="text-yellow-400" />
        <StatCard label="This Month" value={`${(dashboard?.monthly_pool_matic ?? 0).toFixed(2)} MATIC`} color="text-cyan-400" />
        <StatCard label="Total Distributed" value={`${(dashboard?.total_distributed_matic ?? 0).toFixed(2)} MATIC`} color="text-green-400" />
        <StatCard label="Monthly Players" value={String(dashboard?.monthly_active_players ?? 0)} color="text-white" />
      </div>

      {/* Your Stats */}
      {profile && (
        <div className="bg-gray-900/80 border border-cyan-800/50 rounded-lg p-6">
          <h3 className="text-sm font-bold text-cyan-400 mb-3 uppercase tracking-wider">Your Economy Stats</h3>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard label="Total BP" value={profile.total_bp.toFixed(1)} color="text-cyan-400" small />
            <StatCard label="Wagered" value={`${profile.total_wagered_matic.toFixed(4)} MATIC`} color="text-yellow-400" small />
            <StatCard label="Earned" value={`${profile.total_earned_matic.toFixed(4)} MATIC`} color="text-green-400" small />
            <StatCard label="Net P/L" value={`${profile.net_profit_matic >= 0 ? '+' : ''}${profile.net_profit_matic.toFixed(4)}`} color={profile.net_profit_matic >= 0 ? 'text-green-400' : 'text-red-400'} small />
            <StatCard label="Win Rate" value={`${profile.win_rate}%`} color="text-white" small />
          </div>
        </div>
      )}

      {/* Token Info */}
      {tokenInfo && (
        <div className="bg-gray-900/80 border border-yellow-800/50 rounded-lg p-6">
          <h3 className="text-sm font-bold text-yellow-400 mb-3 uppercase tracking-wider">
            {tokenInfo.name} ({tokenInfo.symbol})
          </h3>
          <p className="text-gray-400 text-sm mb-3">{tokenInfo.description}</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="text-xs"><span className="text-gray-500">Network:</span> <span className="text-white">{tokenInfo.network}</span></div>
            <div className="text-xs"><span className="text-gray-500">Supply:</span> <span className="text-white">{tokenInfo.total_supply}</span></div>
          </div>
          <h4 className="text-xs text-gray-400 uppercase mb-2">Margin Schedule</h4>
          <div className="flex gap-2">
            {tokenInfo.margin_schedule.map((s) => (
              <div key={s.phase} className="flex-1 bg-black/30 rounded p-2 text-center">
                <div className="text-xs text-gray-500">{s.phase}</div>
                <div className="text-sm font-bold text-yellow-400">{s.margin_percent}%</div>
                <div className="text-xs text-gray-600">{s.note}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Distribution History */}
      {dashboard && dashboard.distributions.length > 0 && (
        <div className="bg-gray-900/80 border border-cyan-800/50 rounded-lg p-6">
          <h3 className="text-sm font-bold text-cyan-400 mb-3 uppercase tracking-wider">Distribution History</h3>
          <div className="space-y-2">
            {dashboard.distributions.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <div>
                  <div className="text-sm text-white">{d.period_start} to {d.period_end}</div>
                  <div className="text-xs text-gray-500">Margin: {d.margin_percent}%</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-yellow-400">{d.total_pool_matic.toFixed(4)} MATIC</div>
                  <div className="text-xs text-gray-500">{d.distributed_at?.split(' ')[0]}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Wallet Tab ---
function WalletTab({
  profile,
  withdrawAmount,
  setWithdrawAmount,
  withdrawAddress,
  setWithdrawAddress,
  withdrawing,
  onWithdraw,
}: {
  profile: EconomyProfile | null;
  withdrawAmount: string;
  setWithdrawAmount: (v: string) => void;
  withdrawAddress: string;
  setWithdrawAddress: (v: string) => void;
  withdrawing: boolean;
  onWithdraw: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Wallet Info */}
      <div className="bg-gray-900/80 border border-cyan-800/50 rounded-lg p-6">
        <h3 className="text-sm font-bold text-cyan-400 mb-4 uppercase tracking-wider">Polygon Wallet</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-xs text-gray-500 uppercase mb-1">Address</div>
            <div className="text-sm text-white font-mono bg-black/30 rounded p-2 break-all">
              {profile?.wallet?.address || 'No wallet connected'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase mb-1">Balance</div>
            <div className="text-3xl font-bold text-yellow-400 font-mono">
              {(profile?.wallet?.balance_matic ?? 0).toFixed(4)}
              <span className="text-lg text-gray-400 ml-1">MATIC</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Wagered" value={`${(profile?.total_wagered_matic ?? 0).toFixed(4)} MATIC`} color="text-yellow-400" />
        <StatCard label="Total Earned" value={`${(profile?.total_earned_matic ?? 0).toFixed(4)} MATIC`} color="text-green-400" />
        <StatCard
          label="Net P/L"
          value={`${(profile?.net_profit_matic ?? 0) >= 0 ? '+' : ''}${(profile?.net_profit_matic ?? 0).toFixed(4)} MATIC`}
          color={(profile?.net_profit_matic ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}
        />
      </div>

      {/* Withdraw */}
      <div className="bg-gray-900/80 border border-red-800/50 rounded-lg p-6">
        <h3 className="text-sm font-bold text-red-400 mb-4 uppercase tracking-wider">Withdraw MATIC</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 uppercase block mb-1">Amount (MATIC)</label>
            <input
              type="number"
              min="0"
              step="0.001"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm w-full focus:outline-none focus:border-red-500"
              placeholder="0.0"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase block mb-1">To Address</label>
            <input
              type="text"
              value={withdrawAddress}
              onChange={(e) => setWithdrawAddress(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm w-full font-mono focus:outline-none focus:border-red-500"
              placeholder="0x..."
            />
          </div>
          <div className="text-xs text-gray-500">Estimated gas fee: ~0.001 MATIC</div>
          <button
            onClick={onWithdraw}
            disabled={withdrawing || !withdrawAmount || !withdrawAddress}
            className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-2 px-6 rounded transition-all disabled:opacity-50 uppercase text-sm tracking-wider"
          >
            {withdrawing ? 'PROCESSING...' : 'WITHDRAW'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Rewards Tab ---
function RewardsTab({
  profile,
  claiming,
  onClaimAll,
}: {
  profile: EconomyProfile | null;
  claiming: boolean;
  onClaimAll: () => void;
}) {
  const pendingTotal = profile?.pending_rewards?.reduce((s, r) => s + r.payout_matic, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Pending Rewards */}
      <div className="bg-gray-900/80 border border-green-800/50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-green-400 uppercase tracking-wider">Pending Rewards</h3>
          {pendingTotal > 0 && (
            <button
              onClick={onClaimAll}
              disabled={claiming}
              className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold py-2 px-4 rounded text-xs transition-all disabled:opacity-50 uppercase tracking-wider"
            >
              {claiming ? 'CLAIMING...' : `CLAIM ALL (${pendingTotal.toFixed(4)} MATIC)`}
            </button>
          )}
        </div>
        {!profile?.pending_rewards?.length ? (
          <div className="text-gray-500 text-sm py-4 text-center">
            No pending rewards. Play battles to earn BP and qualify for monthly distributions!
          </div>
        ) : (
          <div className="space-y-2">
            {profile.pending_rewards.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <div>
                  <div className="text-sm text-white">Period: {r.period_start} to {r.period_end}</div>
                  <div className="text-xs text-gray-500">BP: {r.bp_total?.toFixed(1)} | Share: {r.bp_share_percent?.toFixed(2)}%</div>
                </div>
                <div className="text-green-400 font-mono font-bold">{r.payout_matic?.toFixed(4)} MATIC</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Monthly BP breakdown */}
      {profile?.monthly_stats && profile.monthly_stats.length > 0 && (
        <div className="bg-gray-900/80 border border-cyan-800/50 rounded-lg p-6">
          <h3 className="text-sm font-bold text-cyan-400 mb-3 uppercase tracking-wider">Monthly Performance</h3>
          <div className="space-y-2">
            {profile.monthly_stats.map((m) => (
              <div key={m.month} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <div>
                  <div className="text-sm text-white font-mono">{m.month}</div>
                  <div className="text-xs text-gray-500">{m.battles} battles</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-cyan-400 font-mono">{m.bp?.toFixed(1)} BP</div>
                  <div className="text-xs text-yellow-400">{m.wagered?.toFixed(4)} MATIC wagered</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Claimed rewards */}
      {profile?.claimed_rewards && profile.claimed_rewards.length > 0 && (
        <div className="bg-gray-900/80 border border-gray-700/50 rounded-lg p-6">
          <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Claimed Rewards</h3>
          <div className="space-y-2">
            {profile.claimed_rewards.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <div>
                  <div className="text-sm text-gray-300">{r.period_start} to {r.period_end}</div>
                  <div className="text-xs text-gray-500">BP: {r.bp_total?.toFixed(1)}</div>
                </div>
                <div className="text-gray-400 font-mono">{r.payout_matic?.toFixed(4)} MATIC</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- History Tab ---
function HistoryTab({
  profile,
  formatDate,
}: {
  profile: EconomyProfile | null;
  formatDate: (d: string) => string;
}) {
  const getTxColor = (type: string) => {
    switch (type) {
      case 'deposit': return 'text-green-400';
      case 'withdrawal': return 'text-red-400';
      case 'wager_escrow': return 'text-yellow-400';
      case 'wager_refund': return 'text-cyan-400';
      case 'reward_claim':
      case 'reward_claim_batch': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getTxLabel = (type: string) => {
    switch (type) {
      case 'deposit': return 'Deposit';
      case 'withdrawal': return 'Withdrawal';
      case 'wager_escrow': return 'Wager (Escrow)';
      case 'wager_refund': return 'Wager Refund';
      case 'reward_claim': return 'Reward Claim';
      case 'reward_claim_batch': return 'Reward Claim (Batch)';
      default: return type;
    }
  };

  const getTxSign = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'wager_refund':
      case 'reward_claim':
      case 'reward_claim_batch': return '+';
      case 'withdrawal':
      case 'wager_escrow': return '-';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-900/80 border border-cyan-800/50 rounded-lg p-6">
        <h3 className="text-sm font-bold text-cyan-400 mb-4 uppercase tracking-wider">Transaction History</h3>
        {!profile?.transactions?.length ? (
          <div className="text-gray-500 text-sm py-4 text-center">No transactions yet.</div>
        ) : (
          <div className="space-y-1">
            {profile.transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${tx.status === 'confirmed' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <div>
                    <div className={`text-sm font-mono ${getTxColor(tx.tx_type)}`}>{getTxLabel(tx.tx_type)}</div>
                    <div className="text-xs text-gray-500">{formatDate(tx.created_at)}</div>
                  </div>
                </div>
                <div className={`font-mono font-bold ${getTxColor(tx.tx_type)}`}>
                  {getTxSign(tx.tx_type)}{tx.amount_matic?.toFixed(4)} MATIC
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Battle History Summary */}
      {profile && (
        <div className="bg-gray-900/80 border border-cyan-800/50 rounded-lg p-6">
          <h3 className="text-sm font-bold text-cyan-400 mb-4 uppercase tracking-wider">Battle Record</h3>
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Total Battles" value={String(profile.total_battles)} color="text-white" small />
            <StatCard label="Wins" value={String(profile.wins)} color="text-green-400" small />
            <StatCard label="Losses" value={String(profile.losses)} color="text-red-400" small />
            <StatCard label="Win Rate" value={`${profile.win_rate}%`} color="text-cyan-400" small />
          </div>
        </div>
      )}
    </div>
  );
}

// --- Stat Card Component ---
function StatCard({ label, value, color, small }: { label: string; value: string; color: string; small?: boolean }) {
  return (
    <div className="bg-black/30 rounded-lg p-3 text-center">
      <div className="text-xs text-gray-500 uppercase mb-1">{label}</div>
      <div className={`font-bold font-mono ${color} ${small ? 'text-sm' : 'text-lg'}`}>{value}</div>
    </div>
  );
}
