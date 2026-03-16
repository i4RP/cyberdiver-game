const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('cyberdiver_token', token);
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('cyberdiver_token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('cyberdiver_token');
  }

  private async request(path: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Request failed');
    }

    return res.json();
  }

  // Auth
  async register(username: string, password: string, displayName?: string) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, display_name: displayName }),
    });
  }

  async login(username: string, password: string) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async guestLogin(displayName?: string) {
    return this.request('/api/auth/guest', {
      method: 'POST',
      body: JSON.stringify({ display_name: displayName }),
    });
  }

  async privyAuth(privyToken: string) {
    return this.request('/api/auth/privy', {
      method: 'POST',
      body: JSON.stringify({ privy_token: privyToken }),
    });
  }

  async getProfile() {
    return this.request('/api/auth/me');
  }

  // Wallet
  async getWallet() {
    return this.request('/api/wallet/');
  }

  async deposit(amount: number) {
    return this.request('/api/wallet/deposit', {
      method: 'POST',
      body: JSON.stringify({ amount_matic: amount }),
    });
  }

  // Battle
  async matchmake(betAmount: number = 0) {
    return this.request('/api/battle/matchmake', {
      method: 'POST',
      body: JSON.stringify({ bet_amount_matic: betAmount }),
    });
  }

  async createBattle(betAmount: number = 0) {
    return this.request('/api/battle/create', {
      method: 'POST',
      body: JSON.stringify({ bet_amount_matic: betAmount }),
    });
  }

  async joinBattle(battleId: string, betAmount: number = 0) {
    return this.request('/api/battle/join', {
      method: 'POST',
      body: JSON.stringify({ battle_id: battleId, bet_amount_matic: betAmount }),
    });
  }

  async chooseGate(battleId: string, gate: string) {
    return this.request('/api/battle/gate', {
      method: 'POST',
      body: JSON.stringify({ battle_id: battleId, gate }),
    });
  }

  async getBattleInfo(battleId: string) {
    return this.request(`/api/battle/info/${battleId}`);
  }

  async getActiveBattles() {
    return this.request('/api/battle/active');
  }

  async getBattleHistory() {
    return this.request('/api/battle/history');
  }

  async endBattle(battleId: string) {
    return this.request(`/api/battle/end/${battleId}`, { method: 'POST' });
  }

  // Rewards
  async getLeaderboard() {
    return this.request('/api/rewards/leaderboard');
  }

  async getStats() {
    return this.request('/api/rewards/stats');
  }

  // Economy
  async getEconomyDashboard() {
    return this.request('/api/economy/dashboard');
  }

  async getEconomyProfile() {
    return this.request('/api/economy/profile');
  }

  async placeWager(amount: number) {
    return this.request('/api/economy/wager', {
      method: 'POST',
      body: JSON.stringify({ amount_matic: amount }),
    });
  }

  async claimReward(payoutId: string) {
    return this.request('/api/economy/claim-reward', {
      method: 'POST',
      body: JSON.stringify({ payout_id: payoutId }),
    });
  }

  async claimAllRewards() {
    return this.request('/api/economy/claim-all-rewards', {
      method: 'POST',
    });
  }

  async withdraw(amount: number, toAddress: string) {
    return this.request('/api/economy/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount_matic: amount, to_address: toAddress }),
    });
  }

  async getTokenInfo() {
    return this.request('/api/economy/token-info');
  }

  async syncWalletBalance() {
    return this.request('/api/wallet/sync-balance', { method: 'POST' });
  }

  async getMyRewards() {
    return this.request('/api/rewards/my');
  }

  async getTransactions() {
    return this.request('/api/wallet/transactions');
  }

  // WebSocket
  getBattleWsUrl(battleId: string): string {
    const wsUrl = API_URL.replace('http', 'ws');
    return `${wsUrl}/api/battle/ws/${battleId}`;
  }
}

export const api = new ApiClient();
export default api;
